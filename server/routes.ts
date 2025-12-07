import type { Express } from "express";
import { createServer, type Server } from "http";
import { Server as SocketIOServer } from "socket.io";
import { storage } from "./storage";
import {
  authMiddleware,
  requireRole,
  signToken,
  hashPassword,
  comparePassword,
  verifyToken,
  createApprovalMiddleware,
  type AuthenticatedRequest,
} from "./auth";
import {
  loginSchema,
  registerSchema,
  insertServiceSchema,
  insertBookingSchema,
  insertMessageSchema,
  insertTaskSchema,
  bookingStatusEnum,
  taskStatusEnum,
  serviceCategoryEnum,
  updateProfileSchema,
  type ServiceCategory,
} from "@shared/schema";
import { z } from "zod";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { cloudinaryService } from "./cloudinary";
import { emailService } from "./email";
import { whatsappService } from "./whatsapp";
import multer from "multer";

const updateBookingStatusSchema = z.object({
  status: z.enum(bookingStatusEnum.enumValues),
});

const assignBookingSchema = z.object({
  staffId: z.string().min(1),
});

const updateTaskStatusSchema = z.object({
  status: z.enum(taskStatusEnum.enumValues),
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  const requireApproval = createApprovalMiddleware((id) => storage.getUser(id));
  
  const io = new SocketIOServer(httpServer, {
    path: "/ws",
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error("Authentication required"));
    }
    const payload = verifyToken(token);
    if (!payload) {
      return next(new Error("Invalid token"));
    }
    socket.data.user = payload;
    next();
  });

  io.on("connection", (socket) => {
    const user = socket.data.user;
    console.log(`User ${user.email} connected`);

    socket.on("join_chat", (chatId: string) => {
      socket.join(`chat:${chatId}`);
    });

    socket.on("leave_chat", (chatId: string) => {
      socket.leave(`chat:${chatId}`);
    });

    socket.on("disconnect", () => {
      console.log(`User ${user.email} disconnected`);
    });
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const data = registerSchema.parse(req.body);
      
      const existingUser = await storage.getUserByEmail(data.email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already registered" });
      }

      const hashedPassword = await hashPassword(data.password);
      const isAdmin = data.role === "admin";
      
      const user = await storage.createUser({
        email: data.email,
        password: hashedPassword,
        name: data.name,
        phone: data.phone,
        role: data.role || "customer",
        approved: isAdmin,
      });

      if (!isAdmin) {
        const admins = await storage.getUsersByRole("admin");
        for (const admin of admins) {
          await storage.createNotification({
            userId: admin.id,
            type: "approval",
            title: "New User Registration",
            content: `${user.name} (${user.email}) has registered and awaits approval.`,
          });
        }
        res.json({
          user: { ...user, password: undefined },
          message: "Registration successful. Please wait for admin approval.",
          pendingApproval: true,
        });
      } else {
        const token = signToken(user);
        res.json({
          user: { ...user, password: undefined },
          token,
        });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const data = loginSchema.parse(req.body);
      
      const user = await storage.getUserByEmail(data.email);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const validPassword = await comparePassword(data.password, user.password);
      if (!validPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      if (!user.approved && user.role !== "admin") {
        return res.status(403).json({ message: "Account pending approval" });
      }

      const token = signToken(user);
      res.json({
        user: { ...user, password: undefined },
        token,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/auth/me", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const user = await storage.getUser(req.user!.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({ ...user, password: undefined });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/change-password", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current and new password are required" });
      }
      
      if (newPassword.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }
      
      const user = await storage.getUser(req.user!.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const validPassword = await comparePassword(currentPassword, user.password);
      if (!validPassword) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }
      
      const hashedPassword = await hashPassword(newPassword);
      await storage.updateUserPassword(user.id, hashedPassword);
      
      res.json({ message: "Password changed successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/profile", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const data = updateProfileSchema.parse(req.body);
      
      const updatedUser = await storage.updateUserProfile(req.user!.userId, data);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({ 
        user: { 
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
          phone: updatedUser.phone,
          profilePhoto: updatedUser.profilePhoto,
          role: updatedUser.role,
          approved: updatedUser.approved,
        },
        message: "Profile updated successfully" 
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/system/status", authMiddleware, requireRole("admin", "staff"), async (req: AuthenticatedRequest, res) => {
    try {
      res.json({
        email: {
          enabled: emailService.isEnabled(),
          configured: emailService.isEnabled(),
        },
        whatsapp: {
          enabled: whatsappService.isEnabled(),
          configured: whatsappService.isEnabled(),
        },
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/services", async (req, res) => {
    try {
      const category = req.query.category as ServiceCategory | undefined;
      const search = req.query.search as string | undefined;
      
      if (category || search) {
        const services = await storage.getActiveServicesFiltered(category, search);
        res.json(services);
      } else {
        const services = await storage.getActiveServices();
        res.json(services);
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/services/categories", async (req, res) => {
    res.json(serviceCategoryEnum.enumValues);
  });

  app.get("/api/services/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const service = await storage.getService(id);
      if (!service || !service.isActive) {
        return res.status(404).json({ message: "Service not found" });
      }
      res.json(service);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/admin/services", authMiddleware, requireRole("admin"), async (req, res) => {
    try {
      const services = await storage.getServices();
      res.json(services);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/services", authMiddleware, requireRole("admin"), async (req: AuthenticatedRequest, res) => {
    try {
      const data = insertServiceSchema.parse(req.body);
      const service = await storage.createService(data);
      res.json(service);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/services/:id", authMiddleware, requireRole("admin"), async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const updates = insertServiceSchema.partial().parse(req.body);
      const service = await storage.updateService(id, updates);
      if (!service) {
        return res.status(404).json({ message: "Service not found" });
      }
      res.json(service);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/bookings", authMiddleware, requireApproval, async (req: AuthenticatedRequest, res) => {
    try {
      const user = req.user!;
      let bookings;
      
      if (user.role === "admin") {
        bookings = await storage.getBookings();
      } else if (user.role === "staff") {
        bookings = await storage.getBookingsByStaff(user.userId);
      } else {
        bookings = await storage.getBookingsByCustomer(user.userId);
      }
      
      res.json(bookings);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/bookings/export", authMiddleware, requireRole("admin"), async (req: AuthenticatedRequest, res) => {
    try {
      const bookings = await storage.getBookings();
      
      const csvHeaders = [
        "Booking ID",
        "Customer Name",
        "Customer Email",
        "Service Name",
        "Service Category",
        "Status",
        "Scheduled Date",
        "Notes",
        "Assigned Staff",
        "Created Date"
      ];
      
      const escapeCSV = (value: string): string => {
        const str = String(value);
        if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      const csvRows = bookings.map((booking) => [
        booking.id,
        booking.customer.name,
        booking.customer.email,
        booking.service.name,
        booking.service.category || "",
        booking.status,
        booking.scheduledDate ? new Date(booking.scheduledDate).toISOString().split('T')[0] : "",
        booking.notes || "",
        booking.assignedStaff?.name || "",
        new Date(booking.createdAt).toISOString().split('T')[0]
      ]);
      
      const csvContent = [
        csvHeaders.map(h => escapeCSV(h)).join(','),
        ...csvRows.map(row => row.map(cell => escapeCSV(String(cell))).join(','))
      ].join('\n');
      
      const date = new Date().toISOString().split('T')[0];
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="bookings-export-${date}.csv"`);
      res.send(csvContent);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/bookings/:id", authMiddleware, requireApproval, async (req: AuthenticatedRequest, res) => {
    try {
      const booking = await storage.getBooking(req.params.id);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      res.json(booking);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/bookings", authMiddleware, requireApproval, async (req: AuthenticatedRequest, res) => {
    try {
      const data = insertBookingSchema.parse({
        ...req.body,
        customerId: req.user!.userId,
      });
      
      const booking = await storage.createBooking(data);
      const chat = await storage.createChat({ bookingId: booking.id });

      const admins = await storage.getUsersByRole("admin");
      for (const admin of admins) {
        await storage.createNotification({
          userId: admin.id,
          type: "booking",
          title: "New Booking",
          content: `A new service booking has been created.`,
        });
      }

      const bookingWithDetails = await storage.getBooking(booking.id);
      if (bookingWithDetails) {
        emailService.sendBookingConfirmation(
          bookingWithDetails.customer.email,
          bookingWithDetails.customer.name,
          bookingWithDetails.service.name,
          bookingWithDetails.scheduledDate,
          booking.id
        );
        if (whatsappService.isEnabled() && bookingWithDetails.customer.phone) {
          whatsappService.sendBookingConfirmation(
            bookingWithDetails.customer.phone,
            bookingWithDetails.customer.name,
            bookingWithDetails.service.name,
            bookingWithDetails.scheduledDate,
            booking.id
          );
        }
      }

      res.json({ booking, chat });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/bookings/:id/status", authMiddleware, requireRole("admin", "staff"), async (req: AuthenticatedRequest, res) => {
    try {
      const data = updateBookingStatusSchema.parse(req.body);
      const booking = await storage.updateBookingStatus(req.params.id, data.status);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      await storage.createNotification({
        userId: booking.customerId,
        type: "booking",
        title: "Booking Updated",
        content: `Your booking status has been updated to ${data.status}.`,
      });

      const bookingWithDetails = await storage.getBooking(booking.id);
      if (bookingWithDetails) {
        emailService.sendBookingStatusUpdate(
          bookingWithDetails.customer.email,
          bookingWithDetails.customer.name,
          bookingWithDetails.service.name,
          data.status,
          booking.id
        );
        if (whatsappService.isEnabled() && bookingWithDetails.customer.phone) {
          whatsappService.sendBookingStatusUpdate(
            bookingWithDetails.customer.phone,
            bookingWithDetails.customer.name,
            bookingWithDetails.service.name,
            data.status,
            booking.id
          );
        }
      }

      // Auto-close chat when booking is completed
      if (data.status === "completed") {
        const chat = await storage.getChatByBooking(req.params.id);
        if (chat && chat.isOpen) {
          await storage.closeChat(chat.id);
          io.to(`chat:${chat.id}`).emit("chat_closed", chat);
        }
      }

      res.json(booking);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/bookings/:id/assign", authMiddleware, requireRole("admin"), async (req: AuthenticatedRequest, res) => {
    try {
      const data = assignBookingSchema.parse(req.body);
      const booking = await storage.assignBookingToStaff(req.params.id, data.staffId);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      // Automatically create a task for the assigned staff
      const bookingWithDetails = await storage.getBooking(booking.id);
      if (bookingWithDetails) {
        await storage.createTask({
          bookingId: booking.id,
          staffId: data.staffId,
          description: `Service: ${bookingWithDetails.service.name} - Complete service for ${bookingWithDetails.customer.name}`,
        });
      }

      await storage.createNotification({
        userId: data.staffId,
        type: "task",
        title: "New Task Assigned",
        content: `You have been assigned a new task for booking.`,
      });

      await storage.createNotification({
        userId: booking.customerId,
        type: "booking",
        title: "Staff Assigned",
        content: `A staff member has been assigned to your booking.`,
      });

      const staff = await storage.getUser(data.staffId);
      if (bookingWithDetails && staff) {
        emailService.sendStaffAssignment(
          staff.email,
          staff.name,
          bookingWithDetails.service.name,
          bookingWithDetails.customer.name,
          bookingWithDetails.scheduledDate
        );
        if (whatsappService.isEnabled() && staff.phone) {
          whatsappService.sendStaffAssignment(
            staff.phone,
            staff.name,
            bookingWithDetails.service.name,
            bookingWithDetails.customer.name,
            bookingWithDetails.scheduledDate
          );
        }
      }

      res.json(booking);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/admin/users", authMiddleware, requireRole("admin"), async (req, res) => {
    try {
      const users = await storage.getUsers();
      res.json(users.map((u) => ({ ...u, password: undefined })));
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/admin/users/staff", authMiddleware, requireRole("admin"), async (req, res) => {
    try {
      const staff = await storage.getUsersByRole("staff");
      res.json(staff.map((u) => ({ ...u, password: undefined })));
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/admin/users/:id/approve", authMiddleware, requireRole("admin"), async (req: AuthenticatedRequest, res) => {
    try {
      const user = await storage.approveUser(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      await storage.createNotification({
        userId: user.id,
        type: "approval",
        title: "Account Approved",
        content: "Your account has been approved. You can now access all features.",
      });

      emailService.sendUserApproval(user.email, user.name);
      if (whatsappService.isEnabled() && user.phone) {
        whatsappService.sendUserApproval(user.phone, user.name);
      }

      res.json({ ...user, password: undefined });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/chats/:id", authMiddleware, requireApproval, async (req: AuthenticatedRequest, res) => {
    try {
      const chat = await storage.getChat(req.params.id);
      if (!chat) {
        return res.status(404).json({ message: "Chat not found" });
      }
      res.json(chat);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/chats/booking/:bookingId", authMiddleware, requireApproval, async (req: AuthenticatedRequest, res) => {
    try {
      const chat = await storage.getChatByBooking(req.params.bookingId);
      if (!chat) {
        return res.status(404).json({ message: "Chat not found" });
      }
      res.json(chat);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/chats/:id/messages", authMiddleware, requireApproval, async (req: AuthenticatedRequest, res) => {
    try {
      const user = req.user!;
      const isStaff = user.role === "admin" || user.role === "staff";
      const messages = await storage.getMessages(req.params.id, user.userId, isStaff);
      res.json(messages);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/chats/:id/messages", authMiddleware, requireApproval, async (req: AuthenticatedRequest, res) => {
    try {
      const chat = await storage.getChat(req.params.id);
      if (!chat) {
        return res.status(404).json({ message: "Chat not found" });
      }

      if (!chat.isOpen) {
        return res.status(400).json({ message: "Chat is closed" });
      }

      const data = insertMessageSchema.parse({
        ...req.body,
        chatId: req.params.id,
        senderId: req.user!.userId,
      });

      const message = await storage.createMessage(data);
      const sender = await storage.getUser(req.user!.userId);

      const messageWithSender = { ...message, sender: sender! };

      io.to(`chat:${req.params.id}`).emit("new_message", messageWithSender);

      if (message.isQuotation && message.quotationAmount) {
        const booking = await storage.getBooking(chat.bookingId);
        if (booking) {
          emailService.sendQuotation(
            booking.customer.email,
            booking.customer.name,
            booking.service.name,
            message.quotationAmount,
            message.content
          );
          if (whatsappService.isEnabled() && booking.customer.phone) {
            whatsappService.sendQuotation(
              booking.customer.phone,
              booking.customer.name,
              booking.service.name,
              message.quotationAmount,
              message.content
            );
          }
        }
      }

      res.json(messageWithSender);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/chats/:id/close", authMiddleware, requireRole("admin", "staff"), async (req: AuthenticatedRequest, res) => {
    try {
      const chat = await storage.closeChat(req.params.id);
      if (!chat) {
        return res.status(404).json({ message: "Chat not found" });
      }
      
      io.to(`chat:${req.params.id}`).emit("chat_closed", chat);
      
      res.json(chat);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/chats/:id/transcript", authMiddleware, requireRole("admin"), async (req: AuthenticatedRequest, res) => {
    try {
      const chat = await storage.getChat(req.params.id);
      if (!chat) {
        return res.status(404).json({ message: "Chat not found" });
      }

      const booking = await storage.getBooking(chat.bookingId);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      const user = req.user!;
      const isStaff = user.role === "admin" || user.role === "staff";
      const messages = await storage.getMessages(req.params.id, user.userId, isStaff);

      const formatDate = (date: Date) => {
        return new Date(date).toLocaleString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      };

      let transcript = `CHAT TRANSCRIPT\n`;
      transcript += `${'='.repeat(60)}\n\n`;
      transcript += `Booking ID: ${booking.id}\n`;
      transcript += `Customer: ${booking.customer.name} (${booking.customer.email})\n`;
      transcript += `Service: ${booking.service.name}\n`;
      transcript += `Status: ${chat.isOpen ? 'Open' : 'Closed'}\n`;
      transcript += `Generated: ${formatDate(new Date())}\n\n`;
      transcript += `${'='.repeat(60)}\n`;
      transcript += `MESSAGES\n`;
      transcript += `${'='.repeat(60)}\n\n`;

      if (messages.length === 0) {
        transcript += `No messages in this chat.\n`;
      } else {
        for (const msg of messages) {
          const timestamp = formatDate(new Date(msg.createdAt));
          const senderName = msg.sender?.name || 'Unknown';
          const privateTag = msg.isPrivate ? ' [PRIVATE]' : '';
          const quotationTag = msg.isQuotation ? ` [QUOTATION: $${msg.quotationAmount}]` : '';
          const attachmentTag = msg.attachmentUrl ? ` [ATTACHMENT: ${msg.attachmentType || 'file'}]` : '';
          
          transcript += `[${timestamp}] ${senderName}${privateTag}${quotationTag}${attachmentTag}\n`;
          transcript += `${msg.content}\n\n`;
        }
      }

      transcript += `${'='.repeat(60)}\n`;
      transcript += `END OF TRANSCRIPT\n`;

      const date = new Date().toISOString().split('T')[0];
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="chat-transcript-${req.params.id.slice(0, 8)}-${date}.txt"`);
      res.send(transcript);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/tasks", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const user = req.user!;
      let tasks;
      
      if (user.role === "admin") {
        tasks = await storage.getTasks();
      } else {
        tasks = await storage.getTasksByStaff(user.userId);
      }
      
      res.json(tasks);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/tasks", authMiddleware, requireRole("admin"), async (req: AuthenticatedRequest, res) => {
    try {
      const data = insertTaskSchema.parse(req.body);
      const task = await storage.createTask(data);

      await storage.createNotification({
        userId: data.staffId,
        type: "task",
        title: "New Task Assigned",
        content: `You have been assigned a new task: ${data.description}`,
      });

      const staff = await storage.getUser(data.staffId);
      const booking = await storage.getBooking(data.bookingId);
      if (staff && booking) {
        emailService.sendTaskAssignment(
          staff.email,
          staff.name,
          data.description,
          data.bookingId,
          booking.customer.name
        );
        if (whatsappService.isEnabled() && staff.phone) {
          whatsappService.sendTaskAssignment(
            staff.phone,
            staff.name,
            data.description,
            data.bookingId,
            booking.customer.name
          );
        }
      }

      res.json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/tasks/:id", authMiddleware, requireRole("admin", "staff"), async (req: AuthenticatedRequest, res) => {
    try {
      const data = updateTaskStatusSchema.parse(req.body);
      const task = await storage.updateTaskStatus(req.params.id, data.status);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      res.json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/notifications", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const notifications = await storage.getNotifications(req.user!.userId);
      res.json(notifications);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/notifications/:id/read", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const notification = await storage.markNotificationRead(req.params.id);
      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }
      res.json(notification);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/notifications/mark-all-read", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      await storage.markAllNotificationsRead(req.user!.userId);
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/admin/email-status", authMiddleware, requireRole("admin"), async (req: AuthenticatedRequest, res) => {
    try {
      res.json({
        configured: emailService.isEnabled(),
        message: emailService.isEnabled()
          ? "Email service is configured and ready to send emails"
          : "Email service is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and SMTP_FROM environment variables to enable email notifications.",
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/admin/whatsapp-status", authMiddleware, requireRole("admin"), async (req: AuthenticatedRequest, res) => {
    try {
      res.json({
        configured: whatsappService.isEnabled(),
        message: whatsappService.isEnabled()
          ? "WhatsApp service is configured and ready to send messages"
          : "WhatsApp service is not configured. Set WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN environment variables to enable WhatsApp notifications.",
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/admin/analytics/overview", authMiddleware, requireRole("admin"), async (req: AuthenticatedRequest, res) => {
    try {
      const allBookings = await storage.getBookings();
      const allUsers = await storage.getUsers();
      const allTasks = await storage.getTasks();
      const allServices = await storage.getServices();

      const totalBookings = allBookings.length;
      const completedBookings = allBookings.filter(b => b.status === "completed").length;
      const activeBookings = allBookings.filter(b => !["completed", "cancelled"].includes(b.status)).length;
      const cancelledBookings = allBookings.filter(b => b.status === "cancelled").length;

      const totalUsers = allUsers.length;
      const customers = allUsers.filter(u => u.role === "customer").length;
      const staff = allUsers.filter(u => u.role === "staff").length;
      const admins = allUsers.filter(u => u.role === "admin").length;
      const pendingApprovals = allUsers.filter(u => !u.approved).length;

      const totalTasks = allTasks.length;
      const completedTasks = allTasks.filter(t => t.status === "completed").length;
      const pendingTasks = allTasks.filter(t => t.status === "pending").length;
      const inProgressTasks = allTasks.filter(t => t.status === "in_progress").length;

      const activeServices = allServices.filter(s => s.isActive).length;

      res.json({
        bookings: { total: totalBookings, completed: completedBookings, active: activeBookings, cancelled: cancelledBookings },
        users: { total: totalUsers, customers, staff, admins, pendingApprovals },
        tasks: { total: totalTasks, completed: completedTasks, pending: pendingTasks, inProgress: inProgressTasks },
        services: { total: allServices.length, active: activeServices },
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/admin/analytics/bookings", authMiddleware, requireRole("admin"), async (req: AuthenticatedRequest, res) => {
    try {
      const allBookings = await storage.getBookings();
      
      const statusCounts: Record<string, number> = {};
      const categoryCounts: Record<string, number> = {};
      const monthlyTrends: Record<string, number> = {};

      for (const booking of allBookings) {
        statusCounts[booking.status] = (statusCounts[booking.status] || 0) + 1;
        
        const category = booking.service?.category || "Uncategorized";
        categoryCounts[category] = (categoryCounts[category] || 0) + 1;

        const month = new Date(booking.createdAt).toLocaleString('en-US', { month: 'short', year: '2-digit' });
        monthlyTrends[month] = (monthlyTrends[month] || 0) + 1;
      }

      const statusData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));
      const categoryData = Object.entries(categoryCounts).map(([name, value]) => ({ name, value }));
      const trendData = Object.entries(monthlyTrends)
        .map(([month, count]) => ({ month, count }))
        .sort((a, b) => {
          const parseMonth = (m: string) => {
            const [mon, yr] = m.split(' ');
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            return parseInt(`20${yr}`) * 12 + months.indexOf(mon);
          };
          return parseMonth(a.month) - parseMonth(b.month);
        });

      res.json({ statusData, categoryData, trendData });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/admin/analytics/staff", authMiddleware, requireRole("admin"), async (req: AuthenticatedRequest, res) => {
    try {
      const allTasks = await storage.getTasks();
      const staffUsers = await storage.getUsersByRole("staff");

      const staffPerformance = staffUsers.map(staffMember => {
        const staffTasks = allTasks.filter(t => t.staff?.id === staffMember.id);
        const completed = staffTasks.filter(t => t.status === "completed").length;
        const pending = staffTasks.filter(t => t.status === "pending").length;
        const inProgress = staffTasks.filter(t => t.status === "in_progress").length;

        return {
          id: staffMember.id,
          name: staffMember.name,
          email: staffMember.email,
          totalTasks: staffTasks.length,
          completed,
          pending,
          inProgress,
          completionRate: staffTasks.length > 0 ? Math.round((completed / staffTasks.length) * 100) : 0,
        };
      });

      res.json(staffPerformance);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

  app.post("/api/upload/cloudinary", authMiddleware, requireApproval, upload.single("file"), async (req: AuthenticatedRequest, res) => {
    try {
      if (!cloudinaryService.isConfigured()) {
        return res.status(503).json({ message: "Cloudinary is not configured. Please add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET." });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No file provided" });
      }

      const result = await cloudinaryService.uploadFromBuffer(req.file.buffer, {
        resource_type: "auto",
      });

      res.json({
        url: result.secure_url,
        publicId: result.public_id,
        resourceType: result.resource_type,
        format: result.format,
      });
    } catch (error) {
      console.error("Error uploading to Cloudinary:", error);
      res.status(500).json({ message: "Failed to upload file" });
    }
  });

  app.get("/api/upload/status", authMiddleware, async (req: AuthenticatedRequest, res) => {
    res.json({ configured: cloudinaryService.isConfigured() });
  });

  app.get("/api/admin/notification-settings", authMiddleware, requireRole("admin"), async (req: AuthenticatedRequest, res) => {
    try {
      const settings = await storage.getNotificationSettings();
      res.json(settings);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/admin/notification-settings/:type", authMiddleware, requireRole("admin"), async (req: AuthenticatedRequest, res) => {
    try {
      const { type } = req.params;
      if (type !== "email" && type !== "whatsapp") {
        return res.status(400).json({ message: "Invalid notification type" });
      }
      const setting = await storage.getNotificationSettingByType(type);
      if (!setting) {
        return res.json({ type, enabled: false, config: null });
      }
      res.json(setting);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/admin/notification-settings/:type", authMiddleware, requireRole("admin"), async (req: AuthenticatedRequest, res) => {
    try {
      const { type } = req.params;
      if (type !== "email" && type !== "whatsapp") {
        return res.status(400).json({ message: "Invalid notification type" });
      }
      const { enabled, config } = req.body;
      const setting = await storage.upsertNotificationSetting({
        type,
        enabled: enabled ?? false,
        config: config ? JSON.stringify(config) : null,
      });
      res.json(setting);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  return httpServer;
}

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
  staffId: z.string().min(1).optional(),
  staffIds: z.array(z.string().min(1)).optional(),
}).refine(
  (data) => data.staffId || (data.staffIds && data.staffIds.length > 0),
  { message: "Please select at least one staff member" }
);

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

    socket.join(`user-${user.userId}`);

    socket.on("join", (room: string) => {
      socket.join(room);
    });

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
      
      // Create audit log for login
      try {
        await storage.createAuditLog({
          action: "login",
          actorId: user.id,
          actorEmail: user.email,
          actorRole: user.role,
          ipAddress: req.ip || req.headers["x-forwarded-for"]?.toString(),
          userAgent: req.headers["user-agent"],
        });
      } catch (e) {
        console.error("Failed to create audit log:", e);
      }
      
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

  app.delete("/api/services/:id", authMiddleware, requireRole("admin"), async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      
      // Delete associated bookings and their related data first
      const bookings = await storage.getBookings();
      const serviceBookings = bookings.filter(b => b.serviceId === id);
      
      for (const booking of serviceBookings) {
        // Delete tasks associated with the booking
        const tasks = await storage.getTasksByBooking(booking.id);
        for (const task of tasks) {
          await storage.deleteTask(task.id);
        }
        
        // Delete chat and messages associated with the booking
        if (booking.chat) {
          const messages = await storage.getMessagesByChat(booking.chat.id);
          for (const message of messages) {
            await storage.deleteMessage(message.id);
          }
          await storage.deleteChat(booking.chat.id);
        }
        
        // Delete the booking itself
        await storage.deleteBooking(booking.id);
      }
      
      const deleted = await storage.deleteService(id);
      if (!deleted) {
        return res.status(404).json({ message: "Service not found" });
      }
      res.json({ message: "Service deleted successfully" });
    } catch (error) {
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
      const user = req.user!;
      const booking = await storage.getBooking(req.params.id);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      // Access control: customers can only see their own bookings, staff can only see assigned bookings
      if (user.role === "customer" && booking.customer.id !== user.userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      if (user.role === "staff") {
        // Check if staff is primary assignee OR has any task for this booking
        const staffTasks = await storage.getTasksByBooking(req.params.id);
        const isAssigned = booking.assignedStaff?.id === user.userId || 
                           staffTasks.some(t => t.staffId === user.userId);
        if (!isAssigned) {
          return res.status(403).json({ message: "Access denied" });
        }
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

  app.patch("/api/bookings/:id/status", authMiddleware, requireRole("admin"), async (req: AuthenticatedRequest, res) => {
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
      
      // Support both single staffId and array of staffIds
      const staffIdsToAssign = data.staffIds || (data.staffId ? [data.staffId] : []);
      
      if (staffIdsToAssign.length === 0) {
        return res.status(400).json({ message: "Please select at least one staff member" });
      }

      const bookingWithDetails = await storage.getBooking(req.params.id);
      if (!bookingWithDetails) {
        return res.status(404).json({ message: "Booking not found" });
      }

      // Get existing tasks for this booking to avoid duplicates
      const existingTasks = await storage.getTasksByBooking(req.params.id);
      const existingStaffIds = new Set(existingTasks.map(t => t.staffId));

      // Filter to only new staff assignments
      const newStaffIds = staffIdsToAssign.filter(id => !existingStaffIds.has(id));

      // If no new staff to assign, return success (idempotent) with updated booking
      if (newStaffIds.length === 0) {
        const updatedBooking = await storage.getBooking(req.params.id);
        return res.json(updatedBooking);
      }

      // Update primary assigned staff if not already set, or keep existing
      if (!bookingWithDetails.assignedStaff) {
        await storage.assignBookingToStaff(req.params.id, newStaffIds[0]);
      }

      // Create tasks and notifications for each new staff member
      for (const staffId of newStaffIds) {
        await storage.createTask({
          bookingId: req.params.id,
          staffId: staffId,
          description: `Service: ${bookingWithDetails.service.name} - Complete service for ${bookingWithDetails.customer.name}`,
        });

        await storage.createNotification({
          userId: staffId,
          type: "task",
          title: "New Task Assigned",
          content: `You have been assigned a new task for booking.`,
        });

        const staff = await storage.getUser(staffId);
        if (staff) {
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
      }

      await storage.createNotification({
        userId: bookingWithDetails.customer.id,
        type: "booking",
        title: "Staff Assigned",
        content: `${newStaffIds.length} staff member(s) have been assigned to your booking.`,
      });

      const updatedBooking = await storage.getBooking(req.params.id);
      res.json(updatedBooking);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Remove staff from booking
  app.delete("/api/bookings/:id/staff/:staffId", authMiddleware, requireRole("admin"), async (req: AuthenticatedRequest, res) => {
    try {
      const { id: bookingId, staffId } = req.params;

      const booking = await storage.getBooking(bookingId);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      // Find all tasks for this staff member in this booking
      const tasks = await storage.getTasksByBooking(bookingId);
      const tasksToDelete = tasks.filter(t => t.staffId === staffId);
      
      if (tasksToDelete.length === 0) {
        return res.status(404).json({ message: "Staff is not assigned to this booking" });
      }

      // Delete all tasks for this staff member
      for (const task of tasksToDelete) {
        await storage.deleteTask(task.id);
      }

      // If this was the primary assigned staff, update to another assigned staff or clear
      if (booking.assignedStaff?.id === staffId) {
        const remainingTasks = tasks.filter(t => t.staffId !== staffId);
        if (remainingTasks.length > 0) {
          await storage.assignBookingToStaff(bookingId, remainingTasks[0].staffId);
        } else {
          await storage.assignBookingToStaff(bookingId, undefined);
        }
      }

      // Notify the removed staff member
      await storage.createNotification({
        userId: staffId,
        type: "task",
        title: "Task Removed",
        content: `You have been removed from a booking task.`,
      });

      res.json({ message: "Staff removed from booking" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get assigned staff for a booking (via tasks)
  app.get("/api/bookings/:id/assigned-staff", authMiddleware, requireRole("admin"), async (req: AuthenticatedRequest, res) => {
    try {
      const booking = await storage.getBooking(req.params.id);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      const tasks = await storage.getTasksByBooking(req.params.id);
      const assignedStaff = await Promise.all(
        tasks.map(async (task) => {
          const user = await storage.getUser(task.staffId);
          return user ? { ...user, password: undefined, taskId: task.id, taskStatus: task.status } : null;
        })
      );

      res.json(assignedStaff.filter(Boolean));
    } catch (error) {
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

  // Admin update user
  app.patch("/api/admin/users/:id", authMiddleware, requireRole("admin"), async (req: AuthenticatedRequest, res) => {
    try {
      const { name, email, phone, role, approved, leaveDaysQuota } = req.body;
      const updates: { name?: string; email?: string; phone?: string; role?: string; approved?: boolean; leaveDaysQuota?: number } = {};
      
      if (name !== undefined) updates.name = name;
      if (email !== undefined) updates.email = email;
      if (phone !== undefined) updates.phone = phone;
      if (role !== undefined && ["customer", "admin", "staff"].includes(role)) updates.role = role;
      if (approved !== undefined) updates.approved = approved;
      if (leaveDaysQuota !== undefined && typeof leaveDaysQuota === "number" && leaveDaysQuota >= 0) updates.leaveDaysQuota = leaveDaysQuota;

      const user = await storage.updateUserByAdmin(req.params.id, updates as any);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ ...user, password: undefined });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Admin delete user
  app.delete("/api/admin/users/:id", authMiddleware, requireRole("admin"), async (req: AuthenticatedRequest, res) => {
    try {
      // Prevent admin from deleting themselves
      if (req.params.id === req.user!.userId) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }

      const deleted = await storage.deleteUser(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ message: "User deleted successfully" });
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

      // When admin/staff replies, update booking status to in_progress
      if (req.user!.role === "admin" || req.user!.role === "staff") {
        const booking = await storage.getBooking(chat.bookingId);
        if (booking && (booking.status === "pending" || booking.status === "confirmed")) {
          await storage.updateBookingStatus(chat.bookingId, "in_progress");
        }
      }

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
      
      // When work is approved (chat closed), update booking status to completed
      if (chat.bookingId) {
        await storage.updateBookingStatus(chat.bookingId, "completed");
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

  // Schema for multi-staff task creation
  const createMultiTaskSchema = z.object({
    staffIds: z.array(z.string().min(1)).min(1, "Please select at least one staff member").optional(),
    staffId: z.string().min(1).optional(),
    title: z.string().optional(),
    description: z.string().min(1, "Description is required"),
    bookingId: z.string().optional(),
    attachments: z.array(z.string()).optional(),
  }).refine(
    (data) => (data.staffIds && data.staffIds.length > 0) || data.staffId,
    { message: "Please select at least one staff member", path: ["staffIds"] }
  );

  app.post("/api/tasks", authMiddleware, requireRole("admin"), async (req: AuthenticatedRequest, res) => {
    try {
      // Validate request body once with proper schema
      const validatedData = createMultiTaskSchema.parse(req.body);
      
      // Support both staffIds (array) and staffId (single) for backward compatibility
      const staffIdsToAssign: string[] = validatedData.staffIds && validatedData.staffIds.length > 0
        ? validatedData.staffIds 
        : validatedData.staffId 
          ? [validatedData.staffId] 
          : [];

      const createdTasks = [];
      const taskTitle = validatedData.title || validatedData.description.slice(0, 50);
      
      for (const sid of staffIdsToAssign) {
        const taskData = {
          staffId: sid,
          title: validatedData.title,
          description: validatedData.description,
          bookingId: validatedData.bookingId,
          attachments: validatedData.attachments,
        };
        
        const parsedData = insertTaskSchema.parse(taskData);
        const task = await storage.createTask(parsedData);
        createdTasks.push(task);

        await storage.createNotification({
          userId: sid,
          type: "task",
          title: "New Task Assigned",
          content: `You have been assigned a new task: ${taskTitle}`,
        });

        const staff = await storage.getUser(sid);
        if (staff && validatedData.bookingId) {
          const booking = await storage.getBooking(validatedData.bookingId);
          if (booking) {
            emailService.sendTaskAssignment(
              staff.email,
              staff.name,
              validatedData.description,
              validatedData.bookingId,
              booking.customer.name
            );
            if (whatsappService.isEnabled() && staff.phone) {
              whatsappService.sendTaskAssignment(
                staff.phone,
                staff.name,
                validatedData.description,
                validatedData.bookingId,
                booking.customer.name
              );
            }
          }
        }
      }

      // Always return first task for backward compatibility with existing consumers
      res.json(createdTasks[0]);
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
      
      // When task is completed, check if ALL tasks for this booking are completed
      if (data.status === "completed" && task.bookingId) {
        const bookingTasks = await storage.getTasksByBooking(task.bookingId);
        const allTasksCompleted = bookingTasks.every(t => t.status === "completed");
        if (allTasksCompleted) {
          await storage.updateBookingStatus(task.bookingId, "completed");
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

  // Admin broadcast notifications with attachments
  app.post("/api/admin/notifications/broadcast", authMiddleware, requireRole("admin"), async (req: AuthenticatedRequest, res) => {
    try {
      const { title, content, attachments, targetRole } = req.body;
      
      if (!title || !content) {
        return res.status(400).json({ message: "Title and content are required" });
      }

      // Validate attachments is an array of strings (URLs)
      const validatedAttachments: string[] = [];
      if (attachments) {
        if (!Array.isArray(attachments)) {
          return res.status(400).json({ message: "Attachments must be an array" });
        }
        for (const attachment of attachments) {
          if (typeof attachment !== "string") {
            return res.status(400).json({ message: "Each attachment must be a valid URL string" });
          }
          validatedAttachments.push(attachment);
        }
      }

      // Get target users based on role filter (default to all customers)
      const users = await storage.getUsers();
      const targetUsers = users.filter(u => {
        if (targetRole === "all") return u.role !== "admin";
        if (targetRole === "staff") return u.role === "staff";
        return u.role === "customer"; // default to customers
      });

      // Create notifications for all target users
      const notifications = await Promise.all(
        targetUsers.map(user => 
          storage.createNotification({
            userId: user.id,
            type: "broadcast",
            title,
            content,
            attachments: validatedAttachments,
          })
        )
      );

      // Create audit log for broadcast
      try {
        await storage.createAuditLog({
          action: "notification_broadcast",
          actorId: req.user!.userId,
          actorEmail: req.user!.email,
          actorRole: req.user!.role,
          targetType: "notification",
          metadata: JSON.stringify({ targetRole, recipientCount: notifications.length, title }),
        });
      } catch (e) {
        console.error("Failed to create audit log:", e);
      }

      res.json({ 
        success: true, 
        message: `Notification sent to ${notifications.length} users`,
        count: notifications.length 
      });
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

  app.get("/api/site-settings", async (req, res) => {
    try {
      const settings = await storage.getSiteSettings();
      res.json(settings);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/admin/site-settings", authMiddleware, requireRole("admin"), async (req: AuthenticatedRequest, res) => {
    try {
      const settings = await storage.getSiteSettings();
      res.json(settings);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/admin/site-settings", authMiddleware, requireRole("admin"), async (req: AuthenticatedRequest, res) => {
    try {
      const { siteName, siteDescription, logoUrl, faviconUrl, metaTitle, metaDescription } = req.body;
      
      const settingsToUpdate: { key: string; value: string | null }[] = [
        { key: "siteName", value: siteName ?? null },
        { key: "siteDescription", value: siteDescription ?? null },
        { key: "logoUrl", value: logoUrl ?? null },
        { key: "faviconUrl", value: faviconUrl ?? null },
        { key: "metaTitle", value: metaTitle ?? null },
        { key: "metaDescription", value: metaDescription ?? null },
      ];

      for (const setting of settingsToUpdate) {
        await storage.upsertSiteSetting(setting.key, setting.value);
      }

      const updatedSettings = await storage.getSiteSettings();
      res.json(updatedSettings);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/public/services", async (req, res) => {
    try {
      const { category, search, page = "1", limit = "12" } = req.query;
      const pageNum = Math.max(1, parseInt(page as string) || 1);
      const limitNum = Math.min(50, Math.max(1, parseInt(limit as string) || 12));
      const offset = (pageNum - 1) * limitNum;
      
      const [paginatedServices, total] = await Promise.all([
        storage.getServicesWithRatings(
          category as ServiceCategory | undefined,
          search as string | undefined,
          limitNum,
          offset
        ),
        storage.getServicesCount(
          category as ServiceCategory | undefined,
          search as string | undefined
        ),
      ]);
      
      const totalPages = Math.ceil(total / limitNum);
      
      res.json({
        services: paginatedServices,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages,
          hasMore: pageNum < totalPages,
        },
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/public/services/featured", async (req, res) => {
    try {
      const { limit = "6" } = req.query;
      const limitNum = Math.min(12, Math.max(1, parseInt(limit as string) || 6));
      const services = await storage.getFeaturedServices(limitNum);
      res.json(services);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/public/services/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const service = await storage.getService(id);
      
      if (!service || !service.isActive) {
        return res.status(404).json({ message: "Service not found" });
      }
      
      const reviews = await storage.getPublicReviewsByService(id);
      const rating = await storage.getServiceRating(id);
      
      res.json({
        ...service,
        avgRating: rating.avgRating,
        reviewCount: rating.reviewCount,
        reviews,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/services/:id/reviews", authMiddleware, requireApproval, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const service = await storage.getService(id);
      
      if (!service) {
        return res.status(404).json({ message: "Service not found" });
      }
      
      const hasCompleted = await storage.hasCompletedBooking(req.user!.userId, id);
      
      if (!hasCompleted) {
        return res.status(403).json({ message: "You can only review services you have completed" });
      }
      
      const reviewData = {
        serviceId: id,
        userId: req.user!.userId,
        rating: Math.min(5, Math.max(1, parseInt(req.body.rating) || 5)),
        title: req.body.title || null,
        body: req.body.body || null,
      };
      
      const review = await storage.createReview(reviewData);
      res.status(201).json(review);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  const contactFormSchema = z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Valid email is required"),
    phone: z.string().optional(),
    subject: z.string().min(1, "Subject is required"),
    message: z.string().min(10, "Message must be at least 10 characters"),
  });

  app.post("/api/public/contact", async (req, res) => {
    try {
      const data = contactFormSchema.parse(req.body);
      const contactMessage = await storage.createContactMessage(data);
      
      const admins = await storage.getUsersByRole("admin");
      for (const admin of admins) {
        await storage.createNotification({
          userId: admin.id,
          type: "message",
          title: "New Contact Form Submission",
          content: `${data.name} (${data.email}) sent a message: "${data.subject}"`,
        });
      }
      
      res.status(201).json({ 
        message: "Thank you for your message. We'll get back to you soon.",
        id: contactMessage.id,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/admin/contact-messages", authMiddleware, requireRole("admin"), async (req: AuthenticatedRequest, res) => {
    try {
      const messages = await storage.getContactMessages();
      res.json(messages);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/admin/contact-messages/:id/status", authMiddleware, requireRole("admin"), async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      if (!["pending", "read", "replied", "closed"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      
      const message = await storage.updateContactMessageStatus(id, status);
      if (!message) {
        return res.status(404).json({ message: "Message not found" });
      }
      
      res.json(message);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/public/page-content/:page", async (req, res) => {
    try {
      const { page } = req.params;
      if (!["about", "contact"].includes(page)) {
        return res.status(400).json({ message: "Invalid page" });
      }
      const content = await storage.getPageContent(page);
      res.json(content);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/admin/page-content/:page", authMiddleware, requireRole("admin"), async (req: AuthenticatedRequest, res) => {
    try {
      const { page } = req.params;
      if (!["about", "contact"].includes(page)) {
        return res.status(400).json({ message: "Invalid page" });
      }
      const content = await storage.getPageContent(page);
      res.json(content);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/admin/page-content/:page/:section", authMiddleware, requireRole("admin"), async (req: AuthenticatedRequest, res) => {
    try {
      const { page, section } = req.params;
      if (!["about", "contact"].includes(page)) {
        return res.status(400).json({ message: "Invalid page" });
      }
      const content = req.body;
      if (!content || typeof content !== "object") {
        return res.status(400).json({ message: "Content is required" });
      }
      const updated = await storage.upsertPageContent(page, section, content);
      res.json(updated);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // =====================
  // ATTENDANCE ROUTES
  // =====================

  // Clock in for staff
  app.post("/api/attendance/clock-in", authMiddleware, requireApproval, requireRole("staff"), async (req: AuthenticatedRequest, res) => {
    try {
      const staffId = req.user!.userId;
      const today = new Date().toISOString().split('T')[0];
      
      // Check if already clocked in today
      const existingAttendance = await storage.getTodayAttendance(staffId);
      if (existingAttendance) {
        if (existingAttendance.clockInTime) {
          return res.status(400).json({ message: "Already clocked in today" });
        }
      }
      
      const { latitude, longitude, address } = req.body;
      
      const attendanceData = {
        staffId,
        date: today,
        clockInTime: new Date(),
        clockInLatitude: latitude || null,
        clockInLongitude: longitude || null,
        clockInAddress: address || null,
        status: "present" as const,
      };
      
      const attendance = await storage.createAttendance(attendanceData);
      res.status(201).json(attendance);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Clock out for staff
  app.post("/api/attendance/clock-out", authMiddleware, requireApproval, requireRole("staff"), async (req: AuthenticatedRequest, res) => {
    try {
      const staffId = req.user!.userId;
      
      // Get today's attendance record
      const existingAttendance = await storage.getTodayAttendance(staffId);
      if (!existingAttendance) {
        return res.status(400).json({ message: "No clock-in record found for today" });
      }
      
      if (existingAttendance.clockOutTime) {
        return res.status(400).json({ message: "Already clocked out today" });
      }
      
      const { latitude, longitude, address } = req.body;
      
      const updated = await storage.updateAttendance(existingAttendance.id, {
        clockOutTime: new Date(),
        clockOutLatitude: latitude || null,
        clockOutLongitude: longitude || null,
        clockOutAddress: address || null,
      });
      
      res.json(updated);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get my attendance records (staff)
  app.get("/api/attendance/my", authMiddleware, requireApproval, requireRole("staff"), async (req: AuthenticatedRequest, res) => {
    try {
      const staffId = req.user!.userId;
      const records = await storage.getAttendanceByStaffId(staffId);
      res.json(records);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get today's attendance status (staff)
  app.get("/api/attendance/today", authMiddleware, requireApproval, requireRole("staff"), async (req: AuthenticatedRequest, res) => {
    try {
      const staffId = req.user!.userId;
      const attendance = await storage.getTodayAttendance(staffId);
      res.json(attendance || null);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get all attendance records (admin)
  app.get("/api/admin/attendance", authMiddleware, requireRole("admin"), async (req: AuthenticatedRequest, res) => {
    try {
      const { startDate, endDate } = req.query;
      const records = await storage.getAllAttendance(
        startDate as string | undefined,
        endDate as string | undefined
      );
      res.json(records);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Admin create attendance record
  const adminAttendanceSchema = z.object({
    staffId: z.string(),
    date: z.string(),
    clockInTime: z.string().optional(),
    clockOutTime: z.string().optional(),
    status: z.enum(["present", "absent", "late", "half_day"]).optional(),
  });

  app.post("/api/admin/attendance", authMiddleware, requireRole("admin"), async (req: AuthenticatedRequest, res) => {
    try {
      const parsed = adminAttendanceSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid attendance data", errors: parsed.error.errors });
      }

      const { staffId, date, clockInTime, clockOutTime, status } = parsed.data;

      const attendanceData: any = {
        staffId,
        date,
        status: status || "present",
      };

      if (clockInTime) {
        attendanceData.clockInTime = new Date(clockInTime);
      }
      if (clockOutTime) {
        attendanceData.clockOutTime = new Date(clockOutTime);
      }

      const attendance = await storage.createAttendance(attendanceData);

      await storage.createAuditLog({
        action: "attendance_clock_in",
        actorId: req.user!.userId,
        actorEmail: req.user!.email,
        actorRole: "admin",
        targetId: attendance.id,
        targetType: "attendance",
        metadata: JSON.stringify({ staffId, date, createdByAdmin: true }),
      });

      res.status(201).json(attendance);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Admin update attendance record
  const adminAttendanceUpdateSchema = z.object({
    clockInTime: z.string().optional().nullable(),
    clockOutTime: z.string().optional().nullable(),
    status: z.enum(["present", "absent", "late", "half_day"]).optional(),
  }).refine(
    (data) => data.clockInTime !== undefined || data.clockOutTime !== undefined || data.status !== undefined,
    { message: "At least one field (clockInTime, clockOutTime, or status) must be provided" }
  );

  app.put("/api/admin/attendance/:id", authMiddleware, requireRole("admin"), async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const parsed = adminAttendanceUpdateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid attendance data", errors: parsed.error.errors });
      }

      const updates: any = {};
      const { clockInTime, clockOutTime, status } = parsed.data;

      if (clockInTime !== undefined) {
        updates.clockInTime = clockInTime ? new Date(clockInTime) : null;
      }
      if (clockOutTime !== undefined) {
        updates.clockOutTime = clockOutTime ? new Date(clockOutTime) : null;
      }
      if (status !== undefined) {
        updates.status = status;
      }

      const updated = await storage.updateAttendance(id, updates);
      if (!updated) {
        return res.status(404).json({ message: "Attendance record not found" });
      }

      await storage.createAuditLog({
        action: "attendance_clock_out",
        actorId: req.user!.userId,
        actorEmail: req.user!.email,
        actorRole: "admin",
        targetId: id,
        targetType: "attendance",
        metadata: JSON.stringify({ updates, editedByAdmin: true }),
      });

      res.json(updated);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // =====================
  // LEAVE REQUEST ROUTES
  // =====================

  const insertLeaveRequestSchema = z.object({
    leaveType: z.enum(["annual", "sick", "personal", "unpaid"] as const),
    startDate: z.string(),
    endDate: z.string(),
    reason: z.string().optional(),
  });

  // Create leave request (staff)
  // Get leave quota for staff
  app.get("/api/leave-quota", authMiddleware, requireApproval, requireRole("staff"), async (req: AuthenticatedRequest, res) => {
    try {
      const staffId = req.user!.userId;
      const staff = await storage.getUser(staffId);
      if (!staff) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({
        leaveDaysQuota: staff.leaveDaysQuota,
        leaveDaysUsed: staff.leaveDaysUsed,
        leaveDaysRemaining: staff.leaveDaysQuota - staff.leaveDaysUsed,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/leave-requests", authMiddleware, requireApproval, requireRole("staff"), async (req: AuthenticatedRequest, res) => {
    try {
      const staffId = req.user!.userId;
      const data = insertLeaveRequestSchema.parse(req.body);
      
      // Validate dates
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);
      if (start > end) {
        return res.status(400).json({ message: "End date must be after start date" });
      }
      
      // Calculate requested leave days
      const requestedDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      
      // Check leave quota (only for non-unpaid leave)
      if (data.leaveType !== "unpaid") {
        const staff = await storage.getUser(staffId);
        if (staff) {
          const remaining = staff.leaveDaysQuota - staff.leaveDaysUsed;
          if (remaining <= 0) {
            return res.status(400).json({ message: "Your leave days quota has been exhausted. You can only request unpaid leave.", quotaExhausted: true });
          }
          if (requestedDays > remaining) {
            return res.status(400).json({ message: `You only have ${remaining} leave days remaining. Please reduce your request or select unpaid leave.`, remaining });
          }
        }
      }
      
      const leaveRequest = await storage.createLeaveRequest({
        staffId,
        leaveType: data.leaveType,
        startDate: data.startDate,
        endDate: data.endDate,
        reason: data.reason || null,
      });
      
      // Notify admins
      const admins = await storage.getUsersByRole("admin");
      const staff = await storage.getUser(staffId);
      for (const admin of admins) {
        await storage.createNotification({
          userId: admin.id,
          type: "task",
          title: "New Leave Request",
          content: `${staff?.name || "A staff member"} has requested ${data.leaveType} leave from ${data.startDate} to ${data.endDate}`,
        });
      }
      
      res.status(201).json(leaveRequest);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get my leave requests (staff)
  app.get("/api/leave-requests/my", authMiddleware, requireApproval, requireRole("staff"), async (req: AuthenticatedRequest, res) => {
    try {
      const staffId = req.user!.userId;
      const requests = await storage.getLeaveRequestsByStaffId(staffId);
      res.json(requests);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get all leave requests (admin)
  app.get("/api/admin/leave-requests", authMiddleware, requireRole("admin"), async (req: AuthenticatedRequest, res) => {
    try {
      const requests = await storage.getAllLeaveRequests();
      res.json(requests);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update leave request status (admin)
  app.patch("/api/admin/leave-requests/:id/status", authMiddleware, requireRole("admin"), async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const { status, adminNotes } = req.body;
      
      if (!["approved", "rejected"].includes(status)) {
        return res.status(400).json({ message: "Status must be 'approved' or 'rejected'" });
      }
      
      const leaveRequest = await storage.getLeaveRequest(id);
      if (!leaveRequest) {
        return res.status(404).json({ message: "Leave request not found" });
      }
      
      if (leaveRequest.status !== "pending") {
        return res.status(400).json({ message: "Can only update pending leave requests" });
      }
      
      // Calculate number of leave days
      const startDate = new Date(leaveRequest.startDate);
      const endDate = new Date(leaveRequest.endDate);
      const leaveDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      
      // If approved, deduct from leave quota
      if (status === "approved") {
        const staff = await storage.getUser(leaveRequest.staffId);
        if (staff) {
          const newUsed = staff.leaveDaysUsed + leaveDays;
          await storage.updateUserLeaveQuota(leaveRequest.staffId, newUsed);
        }
      }
      
      const updated = await storage.updateLeaveRequestStatus(
        id,
        status,
        req.user!.userId,
        adminNotes
      );
      
      // Notify staff member
      await storage.createNotification({
        userId: leaveRequest.staffId,
        type: "task",
        title: `Leave Request ${status === "approved" ? "Approved" : "Rejected"}`,
        content: `Your ${leaveRequest.leaveType} leave request from ${leaveRequest.startDate} to ${leaveRequest.endDate} has been ${status}${adminNotes ? `. Note: ${adminNotes}` : ""}`,
      });
      
      res.json(updated);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Logout endpoint with audit logging
  app.post("/api/auth/logout", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      await storage.createAuditLog({
        action: "logout",
        actorId: req.user!.userId,
        actorEmail: req.user!.email,
        actorRole: req.user!.role,
        ipAddress: req.ip || req.headers["x-forwarded-for"]?.toString(),
        userAgent: req.headers["user-agent"],
      });
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.json({ success: true }); // Still return success even if audit log fails
    }
  });

  // Get unread broadcasts for popup
  app.get("/api/notifications/unread-broadcasts", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const broadcasts = await storage.getUnreadBroadcasts(req.user!.userId);
      res.json(broadcasts);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get all broadcasts for user
  app.get("/api/notifications/broadcasts", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const broadcasts = await storage.getBroadcastNotifications(req.user!.userId);
      res.json(broadcasts);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Admin audit logs endpoints
  app.get("/api/admin/audit-logs", authMiddleware, requireRole("admin"), async (req: AuthenticatedRequest, res) => {
    try {
      const { action, actorRole, startDate, endDate, limit = "50", offset = "0" } = req.query;
      
      const filters: any = {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      };
      
      if (action && action !== "all") filters.action = action;
      if (actorRole && actorRole !== "all") filters.actorRole = actorRole;
      if (startDate) filters.startDate = startDate;
      if (endDate) filters.endDate = endDate;

      const [logs, totalCount] = await Promise.all([
        storage.getAuditLogs(filters),
        storage.getAuditLogsCount(filters),
      ]);

      res.json({
        logs,
        pagination: {
          total: totalCount,
          limit: filters.limit,
          offset: filters.offset,
        },
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Staff dashboard data endpoint
  app.get("/api/staff/dashboard", authMiddleware, requireRole("staff"), async (req: AuthenticatedRequest, res) => {
    try {
      const staffId = req.user!.userId;
      
      const [tasks, todayAttendance, leaveRequests, broadcasts, user] = await Promise.all([
        storage.getTasksByStaff(staffId),
        storage.getTodayAttendance(staffId),
        storage.getLeaveRequestsByStaffId(staffId),
        storage.getBroadcastNotifications(staffId),
        storage.getUser(staffId),
      ]);

      res.json({
        tasks,
        attendance: todayAttendance,
        leaveRequests: leaveRequests.slice(0, 5), // Recent 5 leave requests
        broadcasts: broadcasts.slice(0, 5), // Recent 5 broadcasts
        leaveQuota: user ? {
          total: user.leaveDaysQuota,
          used: user.leaveDaysUsed,
          remaining: user.leaveDaysQuota - user.leaveDaysUsed,
        } : null,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Internal chat routes (staff and admin only)
  const requireStaffOrAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || (req.user.role !== "staff" && req.user.role !== "admin")) {
      return res.status(403).json({ message: "Staff or admin access required" });
    }
    next();
  };

  // Get all internal chats for current user
  app.get("/api/internal-chats", authMiddleware, requireStaffOrAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const chats = await storage.getInternalChats(req.user!.userId);
      res.json(chats);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get staff and admin users (for starting new chats)
  app.get("/api/internal-chats/users", authMiddleware, requireStaffOrAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const users = await storage.getStaffAndAdminUsers();
      res.json(users.filter(u => u.id !== req.user!.userId));
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create or get existing direct chat with another user
  app.post("/api/internal-chats", authMiddleware, requireStaffOrAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const { participantId } = req.body;
      if (!participantId) {
        return res.status(400).json({ message: "Participant ID is required" });
      }

      const participant = await storage.getUser(participantId);
      if (!participant || (participant.role !== "staff" && participant.role !== "admin")) {
        return res.status(400).json({ message: "Invalid participant" });
      }

      const currentUserId = req.user!.userId;
      const participantIds = [currentUserId, participantId].sort();
      
      const existingChat = await storage.getInternalChatByParticipants(participantIds);
      if (existingChat) {
        const chatDetails = await storage.getInternalChat(existingChat.id);
        return res.json(chatDetails);
      }

      const chat = await storage.createInternalChat(
        { type: "direct", createdById: currentUserId },
        participantIds
      );
      const chatDetails = await storage.getInternalChat(chat.id);
      
      io.to(`user-${participantId}`).emit("internal-chat-created", chatDetails);
      
      res.status(201).json(chatDetails);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get messages for a chat
  app.get("/api/internal-chats/:chatId/messages", authMiddleware, requireStaffOrAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const { chatId } = req.params;
      
      const isParticipant = await storage.isInternalChatParticipant(chatId, req.user!.userId);
      if (!isParticipant) {
        return res.status(403).json({ message: "Not a participant of this chat" });
      }

      const messages = await storage.getInternalMessages(chatId);
      await storage.markInternalChatRead(chatId, req.user!.userId);
      
      res.json(messages);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Send message in a chat
  app.post("/api/internal-chats/:chatId/messages", authMiddleware, requireStaffOrAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const { chatId } = req.params;
      const { content } = req.body;
      
      if (!content?.trim()) {
        return res.status(400).json({ message: "Message content is required" });
      }

      const isParticipant = await storage.isInternalChatParticipant(chatId, req.user!.userId);
      if (!isParticipant) {
        return res.status(403).json({ message: "Not a participant of this chat" });
      }

      const message = await storage.createInternalMessage({
        chatId,
        senderId: req.user!.userId,
        content: content.trim(),
      });

      const sender = await storage.getUser(req.user!.userId);
      const messageWithSender = { ...message, sender: sender! };

      const chat = await storage.getInternalChat(chatId);
      if (chat) {
        chat.participants.forEach(p => {
          if (p.userId !== req.user!.userId) {
            io.to(`user-${p.userId}`).emit("internal-message", messageWithSender);
          }
        });
      }

      await storage.markInternalChatRead(chatId, req.user!.userId);

      res.status(201).json(messageWithSender);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Mark chat as read
  app.post("/api/internal-chats/:chatId/read", authMiddleware, requireStaffOrAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const { chatId } = req.params;
      
      const isParticipant = await storage.isInternalChatParticipant(chatId, req.user!.userId);
      if (!isParticipant) {
        return res.status(403).json({ message: "Not a participant of this chat" });
      }

      await storage.markInternalChatRead(chatId, req.user!.userId);
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  return httpServer;
}

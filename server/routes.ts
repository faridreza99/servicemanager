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
} from "@shared/schema";
import { z } from "zod";

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

  app.get("/api/services", async (req, res) => {
    try {
      const services = await storage.getActiveServices();
      res.json(services);
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

      await storage.createNotification({
        userId: data.staffId,
        type: "booking",
        title: "New Assignment",
        content: `You have been assigned to a new booking.`,
      });

      await storage.createNotification({
        userId: booking.customerId,
        type: "booking",
        title: "Staff Assigned",
        content: `A staff member has been assigned to your booking.`,
      });

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

  return httpServer;
}

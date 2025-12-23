import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, timestamp, integer, pgEnum, date, doublePrecision } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const userRoleEnum = pgEnum("user_role", ["customer", "admin", "staff"]);
export const bookingStatusEnum = pgEnum("booking_status", ["pending", "confirmed", "in_progress", "completed", "cancelled"]);
export const taskStatusEnum = pgEnum("task_status", ["pending", "in_progress", "completed"]);
export const notificationTypeEnum = pgEnum("notification_type", ["booking", "message", "task", "approval", "broadcast"]);

// Audit log action types
export const auditActionEnum = pgEnum("audit_action", [
  "login",
  "logout",
  "user_register",
  "user_approve",
  "user_reject",
  "user_update",
  "user_delete",
  "booking_create",
  "booking_update",
  "booking_assign",
  "booking_delete",
  "task_create",
  "task_update",
  "task_complete",
  "leave_request",
  "leave_approve",
  "leave_reject",
  "attendance_clock_in",
  "attendance_clock_out",
  "service_create",
  "service_update",
  "service_delete",
  "notification_broadcast",
  "settings_update",
  "file_upload"
]);

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  phone: text("phone"),
  profilePhoto: text("profile_photo"),
  role: userRoleEnum("role").notNull().default("customer"),
  approved: boolean("approved").notNull().default(false),
  leaveDaysQuota: integer("leave_days_quota").notNull().default(0),
  leaveDaysUsed: integer("leave_days_used").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  bookings: many(bookings),
  messages: many(messages),
  tasks: many(tasks),
  notifications: many(notifications),
}));

export const serviceCategoryEnum = pgEnum("service_category", [
  "hardware",
  "software", 
  "network",
  "security",
  "cloud",
  "consulting",
  "maintenance",
  "other"
]);

export const services = pgTable("services", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description").notNull(),
  category: serviceCategoryEnum("category").notNull().default("other"),
  imageUrl: text("image_url"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const servicesRelations = relations(services, ({ many }) => ({
  bookings: many(bookings),
}));

export const bookings = pgTable("bookings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull().references(() => users.id),
  serviceId: varchar("service_id").notNull().references(() => services.id),
  status: bookingStatusEnum("status").notNull().default("pending"),
  scheduledDate: timestamp("scheduled_date"),
  notes: text("notes"),
  assignedStaffId: varchar("assigned_staff_id").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  customer: one(users, {
    fields: [bookings.customerId],
    references: [users.id],
    relationName: "customerBookings",
  }),
  service: one(services, {
    fields: [bookings.serviceId],
    references: [services.id],
  }),
  assignedStaff: one(users, {
    fields: [bookings.assignedStaffId],
    references: [users.id],
    relationName: "staffAssignments",
  }),
  chat: one(chats),
  tasks: many(tasks),
}));

export const chats = pgTable("chats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  bookingId: varchar("booking_id").notNull().references(() => bookings.id).unique(),
  isOpen: boolean("is_open").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  closedAt: timestamp("closed_at"),
});

export const chatsRelations = relations(chats, ({ one, many }) => ({
  booking: one(bookings, {
    fields: [chats.bookingId],
    references: [bookings.id],
  }),
  messages: many(messages),
}));

export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  chatId: varchar("chat_id").notNull().references(() => chats.id),
  senderId: varchar("sender_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  isPrivate: boolean("is_private").notNull().default(false),
  isQuotation: boolean("is_quotation").notNull().default(false),
  quotationAmount: integer("quotation_amount"),
  attachmentUrl: text("attachment_url"),
  attachmentType: text("attachment_type"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const messagesRelations = relations(messages, ({ one }) => ({
  chat: one(chats, {
    fields: [messages.chatId],
    references: [chats.id],
  }),
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  }),
}));

export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  bookingId: varchar("booking_id").references(() => bookings.id),
  staffId: varchar("staff_id").notNull().references(() => users.id),
  title: text("title"),
  description: text("description").notNull(),
  status: taskStatusEnum("status").notNull().default("pending"),
  attachments: text("attachments").array().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const tasksRelations = relations(tasks, ({ one }) => ({
  booking: one(bookings, {
    fields: [tasks.bookingId],
    references: [bookings.id],
  }),
  staff: one(users, {
    fields: [tasks.staffId],
    references: [users.id],
  }),
}));

export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  type: notificationTypeEnum("type").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  read: boolean("read").notNull().default(false),
  attachments: text("attachments").array().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  approved: true,
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const updateProfileSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  phone: z.string().optional().nullable(),
  profilePhoto: z.string().optional().nullable(),
});

export type UpdateProfile = z.infer<typeof updateProfileSchema>;

export const registerSchema = insertUserSchema.extend({
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().optional(),
}).refine((data) => !data.confirmPassword || data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const insertServiceSchema = createInsertSchema(services).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBookingSchema = createInsertSchema(bookings).omit({
  id: true,
  createdAt: true,
  status: true,
  assignedStaffId: true,
});

export const insertChatSchema = createInsertSchema(chats).omit({
  id: true,
  createdAt: true,
  closedAt: true,
  isOpen: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
  completedAt: true,
  status: true,
});

const baseNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
  read: true,
  attachments: true,
});

export const insertNotificationSchema = baseNotificationSchema.extend({
  attachments: z.array(z.string()).optional(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Service = typeof services.$inferSelect;
export type InsertService = z.infer<typeof insertServiceSchema>;
export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Chat = typeof chats.$inferSelect;
export type InsertChat = z.infer<typeof insertChatSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

export type UserRole = "customer" | "admin" | "staff";
export type BookingStatus = "pending" | "confirmed" | "in_progress" | "completed" | "cancelled";
export type TaskStatus = "pending" | "in_progress" | "completed";
export type NotificationType = "booking" | "message" | "task" | "approval" | "broadcast";
export type ServiceCategory = "hardware" | "software" | "network" | "security" | "cloud" | "consulting" | "maintenance" | "other";

export const SERVICE_CATEGORIES: { value: ServiceCategory; label: string }[] = [
  { value: "hardware", label: "Hardware" },
  { value: "software", label: "Software" },
  { value: "network", label: "Network" },
  { value: "security", label: "Security" },
  { value: "cloud", label: "Cloud" },
  { value: "consulting", label: "Consulting" },
  { value: "maintenance", label: "Maintenance" },
  { value: "other", label: "Other" },
];

export const notificationSettingTypeEnum = pgEnum("notification_setting_type", ["email", "whatsapp"]);

export const notificationSettings = pgTable("notification_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: notificationSettingTypeEnum("type").notNull().unique(),
  enabled: boolean("enabled").notNull().default(false),
  config: text("config"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertNotificationSettingSchema = createInsertSchema(notificationSettings).omit({
  id: true,
  updatedAt: true,
});

export type NotificationSetting = typeof notificationSettings.$inferSelect;
export type InsertNotificationSetting = z.infer<typeof insertNotificationSettingSchema>;
export type NotificationSettingType = "email" | "whatsapp";

export type BookingWithDetails = Booking & {
  customer: User;
  service: Service;
  assignedStaff?: User;
  chat?: Chat;
};

export type MessageWithSender = Message & {
  sender: User;
};

export type TaskWithDetails = Task & {
  booking?: BookingWithDetails | null;
  staff: User;
};

export const siteSettings = pgTable("site_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(),
  value: text("value"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertSiteSettingSchema = createInsertSchema(siteSettings).omit({
  id: true,
  updatedAt: true,
});

export type SiteSetting = typeof siteSettings.$inferSelect;
export type InsertSiteSetting = z.infer<typeof insertSiteSettingSchema>;

export type SiteSettingsData = {
  siteName: string;
  siteDescription: string;
  logoUrl: string;
  faviconUrl: string;
  metaTitle: string;
  metaDescription: string;
};

export const contactMessageStatusEnum = pgEnum("contact_message_status", ["pending", "read", "replied", "closed"]);

export const reviews = pgTable("reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  serviceId: varchar("service_id").notNull().references(() => services.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  rating: integer("rating").notNull(),
  title: text("title"),
  body: text("body"),
  isPublished: boolean("is_published").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const reviewsRelations = relations(reviews, ({ one }) => ({
  service: one(services, {
    fields: [reviews.serviceId],
    references: [services.id],
  }),
  user: one(users, {
    fields: [reviews.userId],
    references: [users.id],
  }),
}));

export const contactMessages = pgTable("contact_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  status: contactMessageStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertReviewSchema = createInsertSchema(reviews).omit({
  id: true,
  createdAt: true,
  isPublished: true,
});

export const insertContactMessageSchema = createInsertSchema(contactMessages).omit({
  id: true,
  createdAt: true,
  status: true,
});

export type Review = typeof reviews.$inferSelect;
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type ContactMessage = typeof contactMessages.$inferSelect;
export type InsertContactMessage = z.infer<typeof insertContactMessageSchema>;
export type ContactMessageStatus = "pending" | "read" | "replied" | "closed";

export type ReviewWithUser = Review & {
  user: User;
};

export type ServiceWithRating = Service & {
  avgRating: number;
  reviewCount: number;
};

export const pageContent = pgTable("page_content", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  pageKey: text("page_key").notNull(),
  sectionKey: text("section_key").notNull(),
  content: text("content").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertPageContentSchema = createInsertSchema(pageContent).omit({
  id: true,
  updatedAt: true,
});

export type PageContent = typeof pageContent.$inferSelect;
export type InsertPageContent = z.infer<typeof insertPageContentSchema>;

export type AboutPageContent = {
  mission?: {
    title: string;
    description: string;
    secondaryDescription?: string;
    highlights: string[];
  };
  values?: Array<{
    icon: string;
    title: string;
    description: string;
  }>;
  team?: Array<{
    name: string;
    role: string;
    initials: string;
  }>;
  stats?: Array<{
    value: string;
    label: string;
  }>;
  cta?: {
    title: string;
    description: string;
    badges: string[];
  };
};

export type ContactPageContent = {
  contactInfo?: {
    email: string;
    phone: string;
    address: string;
  };
  businessHours?: Array<{
    day: string;
    hours: string;
  }>;
};

// Attendance and Leave Management Enums
export const attendanceStatusEnum = pgEnum("attendance_status", ["present", "absent", "late", "half_day"]);
export const leaveTypeEnum = pgEnum("leave_type", ["annual", "sick", "personal", "unpaid"]);
export const leaveStatusEnum = pgEnum("leave_status", ["pending", "approved", "rejected"]);

// Attendance table for staff clock in/out with geolocation
export const attendance = pgTable("attendance", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  staffId: varchar("staff_id").notNull().references(() => users.id),
  date: date("date").notNull(),
  clockInTime: timestamp("clock_in_time"),
  clockInLatitude: doublePrecision("clock_in_latitude"),
  clockInLongitude: doublePrecision("clock_in_longitude"),
  clockInAddress: text("clock_in_address"),
  clockOutTime: timestamp("clock_out_time"),
  clockOutLatitude: doublePrecision("clock_out_latitude"),
  clockOutLongitude: doublePrecision("clock_out_longitude"),
  clockOutAddress: text("clock_out_address"),
  status: attendanceStatusEnum("status").notNull().default("present"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const attendanceRelations = relations(attendance, ({ one }) => ({
  staff: one(users, {
    fields: [attendance.staffId],
    references: [users.id],
  }),
}));

// Leave requests table for staff leave management
export const leaveRequests = pgTable("leave_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  staffId: varchar("staff_id").notNull().references(() => users.id),
  leaveType: leaveTypeEnum("leave_type").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  reason: text("reason"),
  status: leaveStatusEnum("status").notNull().default("pending"),
  approvedBy: varchar("approved_by").references(() => users.id),
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const leaveRequestsRelations = relations(leaveRequests, ({ one }) => ({
  staff: one(users, {
    fields: [leaveRequests.staffId],
    references: [users.id],
    relationName: "staffLeaveRequests",
  }),
  approver: one(users, {
    fields: [leaveRequests.approvedBy],
    references: [users.id],
    relationName: "approvedLeaveRequests",
  }),
}));

// Insert schemas for attendance and leave requests
export const insertAttendanceSchema = createInsertSchema(attendance).omit({
  id: true,
  createdAt: true,
});

export const insertLeaveRequestSchema = createInsertSchema(leaveRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  status: true,
  approvedBy: true,
  adminNotes: true,
});

// Types for attendance and leave requests
export type Attendance = typeof attendance.$inferSelect;
export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;
export type LeaveRequest = typeof leaveRequests.$inferSelect;
export type InsertLeaveRequest = z.infer<typeof insertLeaveRequestSchema>;

export type AttendanceStatus = "present" | "absent" | "late" | "half_day";
export type LeaveType = "annual" | "sick" | "personal" | "unpaid";
export type LeaveStatus = "pending" | "approved" | "rejected";

// Extended types with user details
export type AttendanceWithStaff = Attendance & {
  staff: User;
};

export type LeaveRequestWithDetails = LeaveRequest & {
  staff: User;
  approver?: User;
};

export const LEAVE_TYPES: { value: LeaveType; label: string }[] = [
  { value: "annual", label: "Annual Leave" },
  { value: "sick", label: "Sick Leave" },
  { value: "personal", label: "Personal Leave" },
  { value: "unpaid", label: "Unpaid Leave" },
];

// Audit logs table for tracking all user actions
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  action: auditActionEnum("action").notNull(),
  actorId: varchar("actor_id").references(() => users.id),
  actorEmail: text("actor_email"),
  actorRole: userRoleEnum("actor_role"),
  targetId: varchar("target_id"),
  targetType: text("target_type"),
  metadata: text("metadata"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  actor: one(users, {
    fields: [auditLogs.actorId],
    references: [users.id],
  }),
}));

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true,
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;

export type AuditAction = 
  | "login"
  | "logout"
  | "user_register"
  | "user_approve"
  | "user_reject"
  | "user_update"
  | "user_delete"
  | "booking_create"
  | "booking_update"
  | "booking_assign"
  | "booking_delete"
  | "task_create"
  | "task_update"
  | "task_complete"
  | "leave_request"
  | "leave_approve"
  | "leave_reject"
  | "attendance_clock_in"
  | "attendance_clock_out"
  | "service_create"
  | "service_update"
  | "service_delete"
  | "notification_broadcast"
  | "settings_update"
  | "file_upload";

export type AuditLogWithActor = AuditLog & {
  actor?: User;
};

// Internal Chat System (Staff/Admin only)
export const internalChatTypeEnum = pgEnum("internal_chat_type", ["direct", "group"]);

export const internalChats = pgTable("internal_chats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: internalChatTypeEnum("type").notNull().default("direct"),
  title: text("title"),
  createdById: varchar("created_by_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const internalChatsRelations = relations(internalChats, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [internalChats.createdById],
    references: [users.id],
  }),
  participants: many(internalChatParticipants),
  messages: many(internalMessages),
}));

export const internalChatParticipants = pgTable("internal_chat_participants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  chatId: varchar("chat_id").notNull().references(() => internalChats.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  lastReadAt: timestamp("last_read_at"),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
});

export const internalChatParticipantsRelations = relations(internalChatParticipants, ({ one }) => ({
  chat: one(internalChats, {
    fields: [internalChatParticipants.chatId],
    references: [internalChats.id],
  }),
  user: one(users, {
    fields: [internalChatParticipants.userId],
    references: [users.id],
  }),
}));

export const internalMessages = pgTable("internal_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  chatId: varchar("chat_id").notNull().references(() => internalChats.id),
  senderId: varchar("sender_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  attachmentUrl: text("attachment_url"),
  attachmentType: text("attachment_type"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const internalMessagesRelations = relations(internalMessages, ({ one }) => ({
  chat: one(internalChats, {
    fields: [internalMessages.chatId],
    references: [internalChats.id],
  }),
  sender: one(users, {
    fields: [internalMessages.senderId],
    references: [users.id],
  }),
}));

export const insertInternalChatSchema = createInsertSchema(internalChats).omit({
  id: true,
  createdAt: true,
});

export const insertInternalChatParticipantSchema = createInsertSchema(internalChatParticipants).omit({
  id: true,
  joinedAt: true,
  lastReadAt: true,
});

export const insertInternalMessageSchema = createInsertSchema(internalMessages).omit({
  id: true,
  createdAt: true,
});

export type InternalChat = typeof internalChats.$inferSelect;
export type InsertInternalChat = z.infer<typeof insertInternalChatSchema>;
export type InternalChatParticipant = typeof internalChatParticipants.$inferSelect;
export type InsertInternalChatParticipant = z.infer<typeof insertInternalChatParticipantSchema>;
export type InternalMessage = typeof internalMessages.$inferSelect;
export type InsertInternalMessage = z.infer<typeof insertInternalMessageSchema>;
export type InternalChatType = "direct" | "group";

export type InternalChatWithDetails = InternalChat & {
  participants: (InternalChatParticipant & { user: User })[];
  lastMessage?: InternalMessage & { sender: User };
  unreadCount?: number;
};

export type InternalMessageWithSender = InternalMessage & {
  sender: User;
};

// Team Chat - Broadcast messages visible to all staff and admin
export const teamMessages = pgTable("team_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  senderId: varchar("sender_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  attachmentUrl: varchar("attachment_url"),
  attachmentType: varchar("attachment_type"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const teamMessagesRelations = relations(teamMessages, ({ one }) => ({
  sender: one(users, {
    fields: [teamMessages.senderId],
    references: [users.id],
  }),
}));

export const insertTeamMessageSchema = createInsertSchema(teamMessages).omit({
  id: true,
  createdAt: true,
});

export type TeamMessage = typeof teamMessages.$inferSelect;
export type InsertTeamMessage = z.infer<typeof insertTeamMessageSchema>;
export type TeamMessageWithSender = TeamMessage & {
  sender: User;
};

import { eq, and, desc, or, ilike, avg, count, sql, gte, lte } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "./db";
import {
  users,
  services,
  bookings,
  chats,
  messages,
  tasks,
  notifications,
  notificationSettings,
  siteSettings,
  reviews,
  contactMessages,
  pageContent,
  attendance,
  leaveRequests,
  auditLogs,
  internalChats,
  internalChatParticipants,
  internalMessages,
  teamMessages,
  type User,
  type InsertUser,
  type Service,
  type InsertService,
  type Booking,
  type InsertBooking,
  type Chat,
  type InsertChat,
  type Message,
  type InsertMessage,
  type Task,
  type InsertTask,
  type Notification,
  type InsertNotification,
  type NotificationSetting,
  type InsertNotificationSetting,
  type SiteSetting,
  type InsertSiteSetting,
  type SiteSettingsData,
  type BookingWithDetails,
  type MessageWithSender,
  type TaskWithDetails,
  type UserRole,
  type BookingStatus,
  type TaskStatus,
  type ServiceCategory,
  type UpdateProfile,
  type NotificationSettingType,
  type Review,
  type InsertReview,
  type ReviewWithUser,
  type ContactMessage,
  type InsertContactMessage,
  type ContactMessageStatus,
  type ServiceWithRating,
  type PageContent,
  type Attendance,
  type InsertAttendance,
  type AttendanceWithStaff,
  type LeaveRequest,
  type InsertLeaveRequest,
  type LeaveRequestWithDetails,
  type LeaveStatus,
  type AuditLog,
  type InsertAuditLog,
  type AuditLogWithActor,
  type AuditAction,
  type InternalChat,
  type InsertInternalChat,
  type InternalChatParticipant,
  type InsertInternalChatParticipant,
  type InternalMessage,
  type InsertInternalMessage,
  type TeamMessage,
  type InsertTeamMessage,
  type TeamMessageWithSender,
  type InternalChatWithDetails,
  type InternalMessageWithSender,
} from "@shared/schema";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser & { approved?: boolean }): Promise<User>;
  getUsers(): Promise<User[]>;
  getUsersByRole(role: UserRole): Promise<User[]>;
  approveUser(id: string): Promise<User | undefined>;
  updateUserPassword(id: string, hashedPassword: string): Promise<User | undefined>;
  updateUserProfile(id: string, profile: UpdateProfile): Promise<User | undefined>;
  updateUserByAdmin(id: string, updates: { name?: string; email?: string; phone?: string; role?: UserRole; approved?: boolean; leaveDaysQuota?: number }): Promise<User | undefined>;
  updateUserLeaveQuota(id: string, leaveDaysUsed: number): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;

  getServices(): Promise<Service[]>;
  getActiveServices(): Promise<Service[]>;
  getActiveServicesFiltered(category?: ServiceCategory, search?: string): Promise<Service[]>;
  getService(id: string): Promise<Service | undefined>;
  createService(service: InsertService): Promise<Service>;
  updateService(id: string, updates: Partial<InsertService>): Promise<Service | undefined>;
  deleteService(id: string): Promise<boolean>;

  getBookings(): Promise<BookingWithDetails[]>;
  getBookingsByCustomer(customerId: string): Promise<BookingWithDetails[]>;
  getBookingsByStaff(staffId: string): Promise<BookingWithDetails[]>;
  getBooking(id: string): Promise<BookingWithDetails | undefined>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  updateBookingStatus(id: string, status: BookingStatus): Promise<Booking | undefined>;
  assignBookingToStaff(bookingId: string, staffId: string): Promise<Booking | undefined>;
  deleteBooking(id: string): Promise<boolean>;

  getChat(id: string): Promise<Chat | undefined>;
  getChatByBooking(bookingId: string): Promise<Chat | undefined>;
  createChat(chat: InsertChat): Promise<Chat>;
  closeChat(id: string): Promise<Chat | undefined>;
  deleteChat(id: string): Promise<boolean>;

  getMessages(chatId: string, userId: string, isStaff: boolean): Promise<MessageWithSender[]>;
  getMessagesByChat(chatId: string): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  getMessageByAttachmentUrl(attachmentUrl: string): Promise<Message | undefined>;
  deleteMessage(id: string): Promise<boolean>;

  getTasks(): Promise<TaskWithDetails[]>;
  getTasksByStaff(staffId: string): Promise<TaskWithDetails[]>;
  getTasksByBooking(bookingId: string): Promise<Task[]>;
  getTask(id: string): Promise<TaskWithDetails | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTaskStatus(id: string, status: TaskStatus): Promise<Task | undefined>;
  deleteTask(id: string): Promise<boolean>;

  getNotifications(userId: string): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationRead(id: string): Promise<Notification | undefined>;
  markAllNotificationsRead(userId: string): Promise<void>;

  getNotificationSettings(): Promise<NotificationSetting[]>;
  getNotificationSettingByType(type: NotificationSettingType): Promise<NotificationSetting | undefined>;
  upsertNotificationSetting(setting: InsertNotificationSetting): Promise<NotificationSetting>;

  getSiteSettings(): Promise<SiteSettingsData>;
  getSiteSetting(key: string): Promise<SiteSetting | undefined>;
  upsertSiteSetting(key: string, value: string | null): Promise<SiteSetting>;

  getPublicReviewsByService(serviceId: string): Promise<ReviewWithUser[]>;
  getServiceRating(serviceId: string): Promise<{ avgRating: number; reviewCount: number }>;
  getServicesWithRatings(category?: ServiceCategory, search?: string, limit?: number, offset?: number): Promise<ServiceWithRating[]>;
  getServicesCount(category?: ServiceCategory, search?: string): Promise<number>;
  getFeaturedServices(limit?: number): Promise<ServiceWithRating[]>;
  hasCompletedBooking(userId: string, serviceId: string): Promise<boolean>;
  createReview(review: InsertReview): Promise<Review>;

  getContactMessages(): Promise<ContactMessage[]>;
  getContactMessage(id: string): Promise<ContactMessage | undefined>;
  createContactMessage(message: InsertContactMessage): Promise<ContactMessage>;
  updateContactMessageStatus(id: string, status: ContactMessageStatus): Promise<ContactMessage | undefined>;

  getPageContent(pageKey: string): Promise<Record<string, any>>;
  getPageSection(pageKey: string, sectionKey: string): Promise<any | undefined>;
  upsertPageContent(pageKey: string, sectionKey: string, content: any): Promise<PageContent>;

  // Attendance methods
  createAttendance(data: Partial<InsertAttendance>): Promise<Attendance>;
  getAttendanceByStaffId(staffId: string): Promise<AttendanceWithStaff[]>;
  getTodayAttendance(staffId: string): Promise<Attendance | undefined>;
  updateAttendance(id: string, updates: Partial<Attendance>): Promise<Attendance | undefined>;
  getAllAttendance(startDate?: string, endDate?: string): Promise<AttendanceWithStaff[]>;

  // Leave request methods
  createLeaveRequest(data: InsertLeaveRequest): Promise<LeaveRequest>;
  getLeaveRequestsByStaffId(staffId: string): Promise<LeaveRequestWithDetails[]>;
  getLeaveRequest(id: string): Promise<LeaveRequestWithDetails | undefined>;
  getAllLeaveRequests(): Promise<LeaveRequestWithDetails[]>;
  updateLeaveRequestStatus(id: string, status: LeaveStatus, approvedBy: string, adminNotes?: string): Promise<LeaveRequest | undefined>;

  // Audit log methods
  createAuditLog(data: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(filters?: { action?: AuditAction; actorRole?: UserRole; startDate?: string; endDate?: string; limit?: number; offset?: number }): Promise<AuditLogWithActor[]>;
  getAuditLogsCount(filters?: { action?: AuditAction; actorRole?: UserRole; startDate?: string; endDate?: string }): Promise<number>;

  // Broadcast notification methods
  getBroadcastNotifications(userId: string): Promise<Notification[]>;
  getUnreadBroadcasts(userId: string): Promise<Notification[]>;

  // Internal chat methods (staff/admin only)
  getInternalChats(userId: string): Promise<InternalChatWithDetails[]>;
  getInternalChat(chatId: string): Promise<InternalChatWithDetails | undefined>;
  createInternalChat(data: InsertInternalChat, participantIds: string[]): Promise<InternalChat>;
  getInternalChatByParticipants(participantIds: string[]): Promise<InternalChat | undefined>;
  isInternalChatParticipant(chatId: string, userId: string): Promise<boolean>;
  getInternalMessages(chatId: string): Promise<InternalMessageWithSender[]>;
  createInternalMessage(data: InsertInternalMessage): Promise<InternalMessage>;
  markInternalChatRead(chatId: string, userId: string): Promise<void>;
  getStaffAndAdminUsers(): Promise<User[]>;
  
  // Team Chat (broadcast to all staff/admin)
  getTeamMessages(limit?: number): Promise<TeamMessageWithSender[]>;
  createTeamMessage(data: InsertTeamMessage): Promise<TeamMessage>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser & { approved?: boolean }): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getUsersByRole(role: UserRole): Promise<User[]> {
    return db.select().from(users).where(eq(users.role, role));
  }

  async approveUser(id: string): Promise<User | undefined> {
    const [user] = await db.update(users).set({ approved: true }).where(eq(users.id, id)).returning();
    return user;
  }

  async updateUserPassword(id: string, hashedPassword: string): Promise<User | undefined> {
    const [user] = await db.update(users).set({ password: hashedPassword }).where(eq(users.id, id)).returning();
    return user;
  }

  async updateUserProfile(id: string, profile: UpdateProfile): Promise<User | undefined> {
    const updateData: Partial<{ name: string; phone: string | null; profilePhoto: string | null }> = {};
    if (profile.name !== undefined) updateData.name = profile.name;
    if (profile.phone !== undefined) updateData.phone = profile.phone;
    if (profile.profilePhoto !== undefined) updateData.profilePhoto = profile.profilePhoto;
    
    const [user] = await db.update(users).set(updateData).where(eq(users.id, id)).returning();
    return user;
  }

  async updateUserByAdmin(id: string, updates: { name?: string; email?: string; phone?: string; role?: UserRole; approved?: boolean; leaveDaysQuota?: number }): Promise<User | undefined> {
    const updateData: Partial<{ name: string; email: string; phone: string | null; role: UserRole; approved: boolean; leaveDaysQuota: number }> = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.email !== undefined) updateData.email = updates.email;
    if (updates.phone !== undefined) updateData.phone = updates.phone;
    if (updates.role !== undefined) updateData.role = updates.role;
    if (updates.approved !== undefined) updateData.approved = updates.approved;
    if (updates.leaveDaysQuota !== undefined) updateData.leaveDaysQuota = updates.leaveDaysQuota;
    
    const [user] = await db.update(users).set(updateData).where(eq(users.id, id)).returning();
    return user;
  }

  async updateUserLeaveQuota(id: string, leaveDaysUsed: number): Promise<User | undefined> {
    const [user] = await db.update(users).set({ leaveDaysUsed }).where(eq(users.id, id)).returning();
    return user;
  }

  async deleteUser(id: string): Promise<boolean> {
    // Use a transaction to ensure all-or-nothing deletion
    return await db.transaction(async (tx) => {
      // Delete related records first to avoid foreign key constraint violations
      // Order matters: delete dependent tables first
      
      // Delete attendance records for staff
      await tx.delete(attendance).where(eq(attendance.staffId, id));
      
      // Delete leave requests for staff
      await tx.delete(leaveRequests).where(eq(leaveRequests.staffId, id));
      
      // Delete notifications for user
      await tx.delete(notifications).where(eq(notifications.userId, id));
      
      // Delete reviews by user
      await tx.delete(reviews).where(eq(reviews.userId, id));
      
      // Delete tasks assigned to staff
      await tx.delete(tasks).where(eq(tasks.staffId, id));
      
      // Delete messages sent by user
      await tx.delete(messages).where(eq(messages.senderId, id));
      
      // For bookings where user is customer, we need to handle chats and related data
      // Get bookings where user is customer
      const customerBookings = await tx.select().from(bookings).where(eq(bookings.customerId, id));
      for (const booking of customerBookings) {
        // Delete messages in chat
        const bookingChats = await tx.select().from(chats).where(eq(chats.bookingId, booking.id));
        for (const chat of bookingChats) {
          await tx.delete(messages).where(eq(messages.chatId, chat.id));
        }
        // Delete chats
        await tx.delete(chats).where(eq(chats.bookingId, booking.id));
        // Delete tasks
        await tx.delete(tasks).where(eq(tasks.bookingId, booking.id));
      }
      // Delete bookings where user is customer
      await tx.delete(bookings).where(eq(bookings.customerId, id));
      
      // Unassign staff from bookings (set assignedStaffId to null)
      await tx.update(bookings).set({ assignedStaffId: null }).where(eq(bookings.assignedStaffId, id));
      
      // Clear approvedBy in leave requests (set to null)
      await tx.update(leaveRequests).set({ approvedBy: null }).where(eq(leaveRequests.approvedBy, id));
      
      // Now delete the user
      const result = await tx.delete(users).where(eq(users.id, id)).returning();
      return result.length > 0;
    });
  }

  async getServices(): Promise<Service[]> {
    return db.select().from(services).orderBy(desc(services.createdAt));
  }

  async getActiveServices(): Promise<Service[]> {
    return db.select().from(services).where(eq(services.isActive, true));
  }

  async getActiveServicesFiltered(category?: ServiceCategory, search?: string): Promise<Service[]> {
    const conditions = [eq(services.isActive, true)];
    
    if (category) {
      conditions.push(eq(services.category, category));
    }
    
    if (search) {
      conditions.push(
        or(
          ilike(services.name, `%${search}%`),
          ilike(services.description, `%${search}%`)
        )!
      );
    }
    
    return db.select().from(services).where(and(...conditions)).orderBy(services.name);
  }

  async getService(id: string): Promise<Service | undefined> {
    const [service] = await db.select().from(services).where(eq(services.id, id));
    return service;
  }

  async createService(service: InsertService): Promise<Service> {
    const [created] = await db.insert(services).values(service).returning();
    return created;
  }

  async updateService(id: string, updates: Partial<InsertService>): Promise<Service | undefined> {
    const [service] = await db
      .update(services)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(services.id, id))
      .returning();
    return service;
  }

  async deleteService(id: string): Promise<boolean> {
    const [deleted] = await db.delete(services).where(eq(services.id, id)).returning();
    return !!deleted;
  }

  async getBookings(): Promise<BookingWithDetails[]> {
    const staffUsers = alias(users, "staff_users");
    const result = await db
      .select()
      .from(bookings)
      .leftJoin(users, eq(bookings.customerId, users.id))
      .leftJoin(staffUsers, eq(bookings.assignedStaffId, staffUsers.id))
      .leftJoin(services, eq(bookings.serviceId, services.id))
      .leftJoin(chats, eq(chats.bookingId, bookings.id))
      .orderBy(desc(bookings.createdAt));

    return result.map((row) => this.mapBookingWithDetails(row, staffUsers));
  }

  async getBookingsByCustomer(customerId: string): Promise<BookingWithDetails[]> {
    const staffUsers = alias(users, "staff_users");
    const result = await db
      .select()
      .from(bookings)
      .leftJoin(users, eq(bookings.customerId, users.id))
      .leftJoin(staffUsers, eq(bookings.assignedStaffId, staffUsers.id))
      .leftJoin(services, eq(bookings.serviceId, services.id))
      .leftJoin(chats, eq(chats.bookingId, bookings.id))
      .where(eq(bookings.customerId, customerId))
      .orderBy(desc(bookings.createdAt));

    return result.map((row) => this.mapBookingWithDetails(row, staffUsers));
  }

  async getBookingsByStaff(staffId: string): Promise<BookingWithDetails[]> {
    const staffUsers = alias(users, "staff_users");
    const result = await db
      .select()
      .from(bookings)
      .leftJoin(users, eq(bookings.customerId, users.id))
      .leftJoin(staffUsers, eq(bookings.assignedStaffId, staffUsers.id))
      .leftJoin(services, eq(bookings.serviceId, services.id))
      .leftJoin(chats, eq(chats.bookingId, bookings.id))
      .where(eq(bookings.assignedStaffId, staffId))
      .orderBy(desc(bookings.createdAt));

    return result.map((row) => this.mapBookingWithDetails(row, staffUsers));
  }

  async getBooking(id: string): Promise<BookingWithDetails | undefined> {
    const staffUsers = alias(users, "staff_users");
    const result = await db
      .select()
      .from(bookings)
      .leftJoin(users, eq(bookings.customerId, users.id))
      .leftJoin(staffUsers, eq(bookings.assignedStaffId, staffUsers.id))
      .leftJoin(services, eq(bookings.serviceId, services.id))
      .leftJoin(chats, eq(chats.bookingId, bookings.id))
      .where(eq(bookings.id, id));

    if (result.length === 0) return undefined;
    return this.mapBookingWithDetails(result[0], staffUsers);
  }

  private mapBookingWithDetails(row: any, staffAlias: any): BookingWithDetails {
    const booking = row.bookings;
    return {
      ...booking,
      customer: row.users,
      service: row.services,
      chat: row.chats || undefined,
      assignedStaff: row.staff_users || undefined,
    };
  }

  async createBooking(booking: InsertBooking): Promise<Booking> {
    const [created] = await db.insert(bookings).values(booking).returning();
    return created;
  }

  async updateBookingStatus(id: string, status: BookingStatus): Promise<Booking | undefined> {
    const [booking] = await db
      .update(bookings)
      .set({ status })
      .where(eq(bookings.id, id))
      .returning();
    return booking;
  }

  async assignBookingToStaff(bookingId: string, staffId: string): Promise<Booking | undefined> {
    const [booking] = await db
      .update(bookings)
      .set({ assignedStaffId: staffId, status: "confirmed" })
      .where(eq(bookings.id, bookingId))
      .returning();
    return booking;
  }

  async deleteBooking(id: string): Promise<boolean> {
    const result = await db.delete(bookings).where(eq(bookings.id, id)).returning();
    return result.length > 0;
  }

  async getChat(id: string): Promise<Chat | undefined> {
    const [chat] = await db.select().from(chats).where(eq(chats.id, id));
    return chat;
  }

  async getChatByBooking(bookingId: string): Promise<Chat | undefined> {
    const [chat] = await db.select().from(chats).where(eq(chats.bookingId, bookingId));
    return chat;
  }

  async createChat(chat: InsertChat): Promise<Chat> {
    const [created] = await db.insert(chats).values(chat).returning();
    return created;
  }

  async closeChat(id: string): Promise<Chat | undefined> {
    const [chat] = await db
      .update(chats)
      .set({ isOpen: false, closedAt: new Date() })
      .where(eq(chats.id, id))
      .returning();
    return chat;
  }

  async deleteChat(id: string): Promise<boolean> {
    const result = await db.delete(chats).where(eq(chats.id, id)).returning();
    return result.length > 0;
  }

  async getMessages(chatId: string, userId: string, isStaff: boolean): Promise<MessageWithSender[]> {
    let result;
    
    if (isStaff) {
      result = await db
        .select()
        .from(messages)
        .leftJoin(users, eq(messages.senderId, users.id))
        .where(eq(messages.chatId, chatId))
        .orderBy(messages.createdAt);
    } else {
      result = await db
        .select()
        .from(messages)
        .leftJoin(users, eq(messages.senderId, users.id))
        .where(
          and(
            eq(messages.chatId, chatId),
            or(eq(messages.isPrivate, false), eq(messages.senderId, userId))
          )
        )
        .orderBy(messages.createdAt);
    }

    return result.map((row) => ({
      ...row.messages,
      sender: row.users!,
    }));
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [created] = await db.insert(messages).values(message).returning();
    return created;
  }

  async getMessageByAttachmentUrl(attachmentUrl: string): Promise<Message | undefined> {
    const [message] = await db.select().from(messages).where(eq(messages.attachmentUrl, attachmentUrl));
    return message;
  }

  async getMessagesByChat(chatId: string): Promise<Message[]> {
    return await db.select().from(messages).where(eq(messages.chatId, chatId));
  }

  async deleteMessage(id: string): Promise<boolean> {
    const result = await db.delete(messages).where(eq(messages.id, id)).returning();
    return result.length > 0;
  }

  async getTasks(): Promise<TaskWithDetails[]> {
    const staffUsers = alias(users, "staffUsers");
    const customerUsers = alias(users, "customerUsers");
    const result = await db
      .select()
      .from(tasks)
      .leftJoin(bookings, eq(tasks.bookingId, bookings.id))
      .leftJoin(staffUsers, eq(tasks.staffId, staffUsers.id))
      .leftJoin(customerUsers, eq(bookings.customerId, customerUsers.id))
      .leftJoin(services, eq(bookings.serviceId, services.id))
      .leftJoin(chats, eq(bookings.id, chats.bookingId))
      .orderBy(desc(tasks.createdAt));

    return this.mapTasksWithDetails(result);
  }

  async getTasksByStaff(staffId: string): Promise<TaskWithDetails[]> {
    const staffUsers = alias(users, "staffUsers");
    const customerUsers = alias(users, "customerUsers");
    const result = await db
      .select()
      .from(tasks)
      .leftJoin(bookings, eq(tasks.bookingId, bookings.id))
      .leftJoin(staffUsers, eq(tasks.staffId, staffUsers.id))
      .leftJoin(customerUsers, eq(bookings.customerId, customerUsers.id))
      .leftJoin(services, eq(bookings.serviceId, services.id))
      .leftJoin(chats, eq(bookings.id, chats.bookingId))
      .where(eq(tasks.staffId, staffId))
      .orderBy(desc(tasks.createdAt));

    return this.mapTasksWithDetails(result);
  }

  async getTask(id: string): Promise<TaskWithDetails | undefined> {
    const staffUsers = alias(users, "staffUsers");
    const customerUsers = alias(users, "customerUsers");
    const result = await db
      .select()
      .from(tasks)
      .leftJoin(bookings, eq(tasks.bookingId, bookings.id))
      .leftJoin(staffUsers, eq(tasks.staffId, staffUsers.id))
      .leftJoin(customerUsers, eq(bookings.customerId, customerUsers.id))
      .leftJoin(services, eq(bookings.serviceId, services.id))
      .leftJoin(chats, eq(bookings.id, chats.bookingId))
      .where(eq(tasks.id, id));

    if (result.length === 0) return undefined;
    return this.mapTasksWithDetails(result)[0];
  }

  private mapTasksWithDetails(rows: any[]): TaskWithDetails[] {
    return rows.map((row) => ({
      ...row.tasks,
      booking: row.bookings ? {
        ...row.bookings,
        service: row.services,
        customer: row.customerUsers,
        chat: row.chats || undefined,
      } : null,
      staff: row.staffUsers!,
    }));
  }

  async createTask(task: InsertTask): Promise<Task> {
    const [created] = await db.insert(tasks).values(task).returning();
    return created;
  }

  async updateTaskStatus(id: string, status: TaskStatus): Promise<Task | undefined> {
    const [task] = await db
      .update(tasks)
      .set({
        status,
        completedAt: status === "completed" ? new Date() : null,
      })
      .where(eq(tasks.id, id))
      .returning();
    return task;
  }

  async getTasksByBooking(bookingId: string): Promise<Task[]> {
    return await db.select().from(tasks).where(eq(tasks.bookingId, bookingId));
  }

  async deleteTask(id: string): Promise<boolean> {
    const result = await db.delete(tasks).where(eq(tasks.id, id)).returning();
    return result.length > 0;
  }

  async getNotifications(userId: string): Promise<Notification[]> {
    return db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [created] = await db.insert(notifications).values(notification).returning();
    return created;
  }

  async markNotificationRead(id: string): Promise<Notification | undefined> {
    const [notification] = await db
      .update(notifications)
      .set({ read: true })
      .where(eq(notifications.id, id))
      .returning();
    return notification;
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    await db
      .update(notifications)
      .set({ read: true })
      .where(eq(notifications.userId, userId));
  }

  async getNotificationSettings(): Promise<NotificationSetting[]> {
    return db.select().from(notificationSettings);
  }

  async getNotificationSettingByType(type: NotificationSettingType): Promise<NotificationSetting | undefined> {
    const [setting] = await db.select().from(notificationSettings).where(eq(notificationSettings.type, type));
    return setting;
  }

  async upsertNotificationSetting(setting: InsertNotificationSetting): Promise<NotificationSetting> {
    const existing = await this.getNotificationSettingByType(setting.type);
    if (existing) {
      const [updated] = await db
        .update(notificationSettings)
        .set({ ...setting, updatedAt: new Date() })
        .where(eq(notificationSettings.type, setting.type))
        .returning();
      return updated;
    }
    const [created] = await db.insert(notificationSettings).values(setting).returning();
    return created;
  }

  async getSiteSettings(): Promise<SiteSettingsData> {
    const settings = await db.select().from(siteSettings);
    const settingsMap: Record<string, string> = {};
    settings.forEach(s => {
      if (s.value) settingsMap[s.key] = s.value;
    });
    return {
      siteName: settingsMap.siteName || "IT Service Management",
      siteDescription: settingsMap.siteDescription || "Professional IT service management platform",
      logoUrl: settingsMap.logoUrl || "",
      faviconUrl: settingsMap.faviconUrl || "",
      metaTitle: settingsMap.metaTitle || "IT Service Management",
      metaDescription: settingsMap.metaDescription || "Book and manage IT services with ease",
    };
  }

  async getSiteSetting(key: string): Promise<SiteSetting | undefined> {
    const [setting] = await db.select().from(siteSettings).where(eq(siteSettings.key, key));
    return setting;
  }

  async upsertSiteSetting(key: string, value: string | null): Promise<SiteSetting> {
    const existing = await this.getSiteSetting(key);
    if (existing) {
      const [updated] = await db
        .update(siteSettings)
        .set({ value, updatedAt: new Date() })
        .where(eq(siteSettings.key, key))
        .returning();
      return updated;
    }
    const [created] = await db.insert(siteSettings).values({ key, value }).returning();
    return created;
  }

  async getPublicReviewsByService(serviceId: string): Promise<ReviewWithUser[]> {
    const result = await db
      .select()
      .from(reviews)
      .leftJoin(users, eq(reviews.userId, users.id))
      .where(and(eq(reviews.serviceId, serviceId), eq(reviews.isPublished, true)))
      .orderBy(desc(reviews.createdAt));
    
    return result.map((row) => ({
      ...row.reviews,
      user: row.users!,
    }));
  }

  async getServiceRating(serviceId: string): Promise<{ avgRating: number; reviewCount: number }> {
    const result = await db
      .select({
        avgRating: avg(reviews.rating),
        reviewCount: count(reviews.id),
      })
      .from(reviews)
      .where(and(eq(reviews.serviceId, serviceId), eq(reviews.isPublished, true)));
    
    return {
      avgRating: result[0]?.avgRating ? Number(result[0].avgRating) : 0,
      reviewCount: result[0]?.reviewCount || 0,
    };
  }

  async getServicesWithRatings(category?: ServiceCategory, search?: string, limit?: number, offset?: number): Promise<ServiceWithRating[]> {
    const conditions = [eq(services.isActive, true)];
    
    if (category) {
      conditions.push(eq(services.category, category));
    }
    
    if (search) {
      conditions.push(
        or(
          ilike(services.name, `%${search}%`),
          ilike(services.description, `%${search}%`)
        )!
      );
    }
    
    const result = await db
      .select({
        id: services.id,
        name: services.name,
        description: services.description,
        category: services.category,
        isActive: services.isActive,
        createdAt: services.createdAt,
        updatedAt: services.updatedAt,
        avgRating: sql<number>`COALESCE(AVG(CASE WHEN reviews.is_published = true THEN reviews.rating END), 0)`,
        reviewCount: sql<number>`COUNT(CASE WHEN reviews.is_published = true THEN reviews.id END)`,
      })
      .from(services)
      .leftJoin(reviews, eq(services.id, reviews.serviceId))
      .where(and(...conditions))
      .groupBy(services.id, services.name, services.description, services.category, services.isActive, services.createdAt, services.updatedAt)
      .orderBy(services.name)
      .limit(limit || 1000)
      .offset(offset || 0);
    
    return result.map((row) => ({
      ...row,
      avgRating: Number(row.avgRating) || 0,
      reviewCount: Number(row.reviewCount) || 0,
    }));
  }

  async getServicesCount(category?: ServiceCategory, search?: string): Promise<number> {
    const conditions = [eq(services.isActive, true)];
    
    if (category) {
      conditions.push(eq(services.category, category));
    }
    
    if (search) {
      conditions.push(
        or(
          ilike(services.name, `%${search}%`),
          ilike(services.description, `%${search}%`)
        )!
      );
    }
    
    const result = await db
      .select({ count: count(services.id) })
      .from(services)
      .where(and(...conditions));
    
    return result[0]?.count || 0;
  }

  async getFeaturedServices(limit: number = 6): Promise<ServiceWithRating[]> {
    const result = await db
      .select({
        id: services.id,
        name: services.name,
        description: services.description,
        category: services.category,
        isActive: services.isActive,
        createdAt: services.createdAt,
        updatedAt: services.updatedAt,
        avgRating: sql<number>`COALESCE(AVG(CASE WHEN reviews.is_published = true THEN reviews.rating END), 0)`,
        reviewCount: sql<number>`COUNT(CASE WHEN reviews.is_published = true THEN reviews.id END)`,
      })
      .from(services)
      .leftJoin(reviews, eq(services.id, reviews.serviceId))
      .where(eq(services.isActive, true))
      .groupBy(services.id, services.name, services.description, services.category, services.isActive, services.createdAt, services.updatedAt)
      .orderBy(sql`COALESCE(AVG(CASE WHEN reviews.is_published = true THEN reviews.rating END), 0) DESC`)
      .limit(limit);
    
    return result.map((row) => ({
      ...row,
      avgRating: Number(row.avgRating) || 0,
      reviewCount: Number(row.reviewCount) || 0,
    }));
  }

  async hasCompletedBooking(userId: string, serviceId: string): Promise<boolean> {
    const result = await db
      .select({ count: count(bookings.id) })
      .from(bookings)
      .where(
        and(
          eq(bookings.customerId, userId),
          eq(bookings.serviceId, serviceId),
          eq(bookings.status, "completed")
        )
      );
    return (result[0]?.count || 0) > 0;
  }

  async createReview(review: InsertReview): Promise<Review> {
    const [created] = await db.insert(reviews).values(review).returning();
    return created;
  }

  async getContactMessages(): Promise<ContactMessage[]> {
    return db.select().from(contactMessages).orderBy(desc(contactMessages.createdAt));
  }

  async getContactMessage(id: string): Promise<ContactMessage | undefined> {
    const [message] = await db.select().from(contactMessages).where(eq(contactMessages.id, id));
    return message;
  }

  async createContactMessage(message: InsertContactMessage): Promise<ContactMessage> {
    const [created] = await db.insert(contactMessages).values(message).returning();
    return created;
  }

  async updateContactMessageStatus(id: string, status: ContactMessageStatus): Promise<ContactMessage | undefined> {
    const [message] = await db
      .update(contactMessages)
      .set({ status })
      .where(eq(contactMessages.id, id))
      .returning();
    return message;
  }

  async getPageContent(pageKey: string): Promise<Record<string, any>> {
    const rows = await db.select().from(pageContent).where(eq(pageContent.pageKey, pageKey));
    const result: Record<string, any> = {};
    rows.forEach((row) => {
      try {
        result[row.sectionKey] = JSON.parse(row.content);
      } catch {
        result[row.sectionKey] = row.content;
      }
    });
    return result;
  }

  async getPageSection(pageKey: string, sectionKey: string): Promise<any | undefined> {
    const [row] = await db
      .select()
      .from(pageContent)
      .where(and(eq(pageContent.pageKey, pageKey), eq(pageContent.sectionKey, sectionKey)));
    if (!row) return undefined;
    try {
      return JSON.parse(row.content);
    } catch {
      return row.content;
    }
  }

  async upsertPageContent(pageKey: string, sectionKey: string, content: any): Promise<PageContent> {
    const contentStr = typeof content === "string" ? content : JSON.stringify(content);
    const existing = await db
      .select()
      .from(pageContent)
      .where(and(eq(pageContent.pageKey, pageKey), eq(pageContent.sectionKey, sectionKey)));
    
    if (existing.length > 0) {
      const [updated] = await db
        .update(pageContent)
        .set({ content: contentStr, updatedAt: new Date() })
        .where(and(eq(pageContent.pageKey, pageKey), eq(pageContent.sectionKey, sectionKey)))
        .returning();
      return updated;
    }
    
    const [created] = await db.insert(pageContent).values({ pageKey, sectionKey, content: contentStr }).returning();
    return created;
  }

  // Attendance methods
  async createAttendance(data: Partial<InsertAttendance>): Promise<Attendance> {
    const [created] = await db.insert(attendance).values(data as InsertAttendance).returning();
    return created;
  }

  async getAttendanceByStaffId(staffId: string): Promise<AttendanceWithStaff[]> {
    const result = await db
      .select()
      .from(attendance)
      .leftJoin(users, eq(attendance.staffId, users.id))
      .where(eq(attendance.staffId, staffId))
      .orderBy(desc(attendance.date));

    return result.map((row) => ({
      ...row.attendance,
      staff: row.users!,
    }));
  }

  async getTodayAttendance(staffId: string): Promise<Attendance | undefined> {
    const today = new Date().toISOString().split('T')[0];
    const [record] = await db
      .select()
      .from(attendance)
      .where(and(eq(attendance.staffId, staffId), eq(attendance.date, today)));
    return record;
  }

  async updateAttendance(id: string, updates: Partial<Attendance>): Promise<Attendance | undefined> {
    const [updated] = await db
      .update(attendance)
      .set(updates)
      .where(eq(attendance.id, id))
      .returning();
    return updated;
  }

  async getAllAttendance(startDate?: string, endDate?: string): Promise<AttendanceWithStaff[]> {
    const conditions = [];
    
    if (startDate) {
      conditions.push(gte(attendance.date, startDate));
    }
    if (endDate) {
      conditions.push(lte(attendance.date, endDate));
    }

    const result = await db
      .select()
      .from(attendance)
      .leftJoin(users, eq(attendance.staffId, users.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(attendance.date));

    return result.map((row) => ({
      ...row.attendance,
      staff: row.users!,
    }));
  }

  // Leave request methods
  async createLeaveRequest(data: InsertLeaveRequest): Promise<LeaveRequest> {
    const [created] = await db.insert(leaveRequests).values(data).returning();
    return created;
  }

  async getLeaveRequestsByStaffId(staffId: string): Promise<LeaveRequestWithDetails[]> {
    const approverUsers = alias(users, "approver_users");
    const result = await db
      .select()
      .from(leaveRequests)
      .leftJoin(users, eq(leaveRequests.staffId, users.id))
      .leftJoin(approverUsers, eq(leaveRequests.approvedBy, approverUsers.id))
      .where(eq(leaveRequests.staffId, staffId))
      .orderBy(desc(leaveRequests.createdAt));

    return result.map((row) => ({
      ...row.leave_requests,
      staff: row.users!,
      approver: row.approver_users || undefined,
    }));
  }

  async getLeaveRequest(id: string): Promise<LeaveRequestWithDetails | undefined> {
    const approverUsers = alias(users, "approver_users");
    const result = await db
      .select()
      .from(leaveRequests)
      .leftJoin(users, eq(leaveRequests.staffId, users.id))
      .leftJoin(approverUsers, eq(leaveRequests.approvedBy, approverUsers.id))
      .where(eq(leaveRequests.id, id));

    if (result.length === 0) return undefined;
    return {
      ...result[0].leave_requests,
      staff: result[0].users!,
      approver: result[0].approver_users || undefined,
    };
  }

  async getAllLeaveRequests(): Promise<LeaveRequestWithDetails[]> {
    const approverUsers = alias(users, "approver_users");
    const result = await db
      .select()
      .from(leaveRequests)
      .leftJoin(users, eq(leaveRequests.staffId, users.id))
      .leftJoin(approverUsers, eq(leaveRequests.approvedBy, approverUsers.id))
      .orderBy(desc(leaveRequests.createdAt));

    return result.map((row) => ({
      ...row.leave_requests,
      staff: row.users!,
      approver: row.approver_users || undefined,
    }));
  }

  async updateLeaveRequestStatus(id: string, status: LeaveStatus, approvedBy: string, adminNotes?: string): Promise<LeaveRequest | undefined> {
    const [updated] = await db
      .update(leaveRequests)
      .set({ status, approvedBy, adminNotes, updatedAt: new Date() })
      .where(eq(leaveRequests.id, id))
      .returning();
    return updated;
  }

  // Audit log methods
  async createAuditLog(data: InsertAuditLog): Promise<AuditLog> {
    const [created] = await db.insert(auditLogs).values(data).returning();
    return created;
  }

  async getAuditLogs(filters?: { action?: AuditAction; actorRole?: UserRole; startDate?: string; endDate?: string; limit?: number; offset?: number }): Promise<AuditLogWithActor[]> {
    const conditions: any[] = [];
    
    if (filters?.action) {
      conditions.push(eq(auditLogs.action, filters.action));
    }
    if (filters?.actorRole) {
      conditions.push(eq(auditLogs.actorRole, filters.actorRole));
    }
    if (filters?.startDate) {
      conditions.push(gte(auditLogs.createdAt, new Date(filters.startDate)));
    }
    if (filters?.endDate) {
      conditions.push(lte(auditLogs.createdAt, new Date(filters.endDate)));
    }

    const query = db
      .select()
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.actorId, users.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(auditLogs.createdAt));

    if (filters?.limit) {
      query.limit(filters.limit);
    }
    if (filters?.offset) {
      query.offset(filters.offset);
    }

    const result = await query;
    return result.map((row) => ({
      ...row.audit_logs,
      actor: row.users || undefined,
    }));
  }

  async getAuditLogsCount(filters?: { action?: AuditAction; actorRole?: UserRole; startDate?: string; endDate?: string }): Promise<number> {
    const conditions: any[] = [];
    
    if (filters?.action) {
      conditions.push(eq(auditLogs.action, filters.action));
    }
    if (filters?.actorRole) {
      conditions.push(eq(auditLogs.actorRole, filters.actorRole));
    }
    if (filters?.startDate) {
      conditions.push(gte(auditLogs.createdAt, new Date(filters.startDate)));
    }
    if (filters?.endDate) {
      conditions.push(lte(auditLogs.createdAt, new Date(filters.endDate)));
    }

    const result = await db
      .select({ count: count() })
      .from(auditLogs)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    return result[0]?.count || 0;
  }

  // Broadcast notification methods
  async getBroadcastNotifications(userId: string): Promise<Notification[]> {
    return db
      .select()
      .from(notifications)
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.type, "broadcast")
      ))
      .orderBy(desc(notifications.createdAt));
  }

  async getUnreadBroadcasts(userId: string): Promise<Notification[]> {
    return db
      .select()
      .from(notifications)
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.type, "broadcast"),
        eq(notifications.read, false)
      ))
      .orderBy(desc(notifications.createdAt));
  }

  // Internal chat methods
  async getInternalChats(userId: string): Promise<InternalChatWithDetails[]> {
    const userChats = await db
      .select({ chatId: internalChatParticipants.chatId })
      .from(internalChatParticipants)
      .where(eq(internalChatParticipants.userId, userId));

    const chatIds = userChats.map(c => c.chatId);
    if (chatIds.length === 0) return [];

    const chatsData = await db
      .select()
      .from(internalChats)
      .where(sql`${internalChats.id} IN ${chatIds}`)
      .orderBy(desc(internalChats.createdAt));

    const result: InternalChatWithDetails[] = [];
    for (const chat of chatsData) {
      const participantsData = await db
        .select()
        .from(internalChatParticipants)
        .leftJoin(users, eq(internalChatParticipants.userId, users.id))
        .where(eq(internalChatParticipants.chatId, chat.id));

      const participants = participantsData.map(p => ({
        ...p.internal_chat_participants,
        user: p.users!,
      }));

      const [lastMessageData] = await db
        .select()
        .from(internalMessages)
        .leftJoin(users, eq(internalMessages.senderId, users.id))
        .where(eq(internalMessages.chatId, chat.id))
        .orderBy(desc(internalMessages.createdAt))
        .limit(1);

      const currentParticipant = participants.find(p => p.userId === userId);
      const unreadCountResult = await db
        .select({ count: count() })
        .from(internalMessages)
        .where(and(
          eq(internalMessages.chatId, chat.id),
          currentParticipant?.lastReadAt
            ? sql`${internalMessages.createdAt} > ${currentParticipant.lastReadAt}`
            : sql`1=1`
        ));

      result.push({
        ...chat,
        participants,
        lastMessage: lastMessageData ? {
          ...lastMessageData.internal_messages,
          sender: lastMessageData.users!,
        } : undefined,
        unreadCount: unreadCountResult[0]?.count || 0,
      });
    }

    return result.sort((a, b) => {
      const aTime = a.lastMessage?.createdAt || a.createdAt;
      const bTime = b.lastMessage?.createdAt || b.createdAt;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });
  }

  async getInternalChat(chatId: string): Promise<InternalChatWithDetails | undefined> {
    const [chat] = await db.select().from(internalChats).where(eq(internalChats.id, chatId));
    if (!chat) return undefined;

    const participantsData = await db
      .select()
      .from(internalChatParticipants)
      .leftJoin(users, eq(internalChatParticipants.userId, users.id))
      .where(eq(internalChatParticipants.chatId, chat.id));

    const participants = participantsData.map(p => ({
      ...p.internal_chat_participants,
      user: p.users!,
    }));

    const [lastMessageData] = await db
      .select()
      .from(internalMessages)
      .leftJoin(users, eq(internalMessages.senderId, users.id))
      .where(eq(internalMessages.chatId, chat.id))
      .orderBy(desc(internalMessages.createdAt))
      .limit(1);

    return {
      ...chat,
      participants,
      lastMessage: lastMessageData ? {
        ...lastMessageData.internal_messages,
        sender: lastMessageData.users!,
      } : undefined,
    };
  }

  async createInternalChat(data: InsertInternalChat, participantIds: string[]): Promise<InternalChat> {
    const [chat] = await db.insert(internalChats).values(data).returning();
    
    for (const participantId of participantIds) {
      await db.insert(internalChatParticipants).values({
        chatId: chat.id,
        userId: participantId,
      });
    }
    
    return chat;
  }

  async getInternalChatByParticipants(participantIds: string[]): Promise<InternalChat | undefined> {
    if (participantIds.length !== 2) return undefined;

    const chatsWithBothParticipants = await db.execute(sql`
      SELECT ic.* FROM internal_chats ic
      WHERE ic.type = 'direct'
      AND (
        SELECT COUNT(*) FROM internal_chat_participants icp 
        WHERE icp.chat_id = ic.id 
        AND icp.user_id IN (${participantIds[0]}, ${participantIds[1]})
      ) = 2
      AND (
        SELECT COUNT(*) FROM internal_chat_participants icp 
        WHERE icp.chat_id = ic.id
      ) = 2
      LIMIT 1
    `);

    if (chatsWithBothParticipants.rows.length > 0) {
      const row = chatsWithBothParticipants.rows[0] as any;
      return {
        id: row.id,
        type: row.type,
        title: row.title,
        createdById: row.created_by_id,
        createdAt: row.created_at,
      };
    }
    return undefined;
  }

  async isInternalChatParticipant(chatId: string, userId: string): Promise<boolean> {
    const [participant] = await db
      .select()
      .from(internalChatParticipants)
      .where(and(
        eq(internalChatParticipants.chatId, chatId),
        eq(internalChatParticipants.userId, userId)
      ));
    return !!participant;
  }

  async getInternalMessages(chatId: string): Promise<InternalMessageWithSender[]> {
    const messagesData = await db
      .select()
      .from(internalMessages)
      .leftJoin(users, eq(internalMessages.senderId, users.id))
      .where(eq(internalMessages.chatId, chatId))
      .orderBy(internalMessages.createdAt);

    return messagesData.map(m => ({
      ...m.internal_messages,
      sender: m.users!,
    }));
  }

  async createInternalMessage(data: InsertInternalMessage): Promise<InternalMessage> {
    const [message] = await db.insert(internalMessages).values(data).returning();
    return message;
  }

  async markInternalChatRead(chatId: string, userId: string): Promise<void> {
    await db
      .update(internalChatParticipants)
      .set({ lastReadAt: new Date() })
      .where(and(
        eq(internalChatParticipants.chatId, chatId),
        eq(internalChatParticipants.userId, userId)
      ));
  }

  async getStaffAndAdminUsers(): Promise<User[]> {
    return db
      .select()
      .from(users)
      .where(and(
        or(eq(users.role, "admin"), eq(users.role, "staff")),
        eq(users.approved, true)
      ))
      .orderBy(users.name);
  }

  async getTeamMessages(limit: number = 100): Promise<TeamMessageWithSender[]> {
    const messagesData = await db
      .select()
      .from(teamMessages)
      .leftJoin(users, eq(teamMessages.senderId, users.id))
      .orderBy(teamMessages.createdAt)
      .limit(limit);

    return messagesData.map(m => ({
      ...m.team_messages,
      sender: m.users!,
    }));
  }

  async createTeamMessage(data: InsertTeamMessage): Promise<TeamMessage> {
    const [message] = await db.insert(teamMessages).values(data).returning();
    return message;
  }
}

export const storage = new DatabaseStorage();

import { eq, and, desc, or, ilike } from "drizzle-orm";
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

  getServices(): Promise<Service[]>;
  getActiveServices(): Promise<Service[]>;
  getActiveServicesFiltered(category?: ServiceCategory, search?: string): Promise<Service[]>;
  getService(id: string): Promise<Service | undefined>;
  createService(service: InsertService): Promise<Service>;
  updateService(id: string, updates: Partial<InsertService>): Promise<Service | undefined>;

  getBookings(): Promise<BookingWithDetails[]>;
  getBookingsByCustomer(customerId: string): Promise<BookingWithDetails[]>;
  getBookingsByStaff(staffId: string): Promise<BookingWithDetails[]>;
  getBooking(id: string): Promise<BookingWithDetails | undefined>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  updateBookingStatus(id: string, status: BookingStatus): Promise<Booking | undefined>;
  assignBookingToStaff(bookingId: string, staffId: string): Promise<Booking | undefined>;

  getChat(id: string): Promise<Chat | undefined>;
  getChatByBooking(bookingId: string): Promise<Chat | undefined>;
  createChat(chat: InsertChat): Promise<Chat>;
  closeChat(id: string): Promise<Chat | undefined>;

  getMessages(chatId: string, userId: string, isStaff: boolean): Promise<MessageWithSender[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  getMessageByAttachmentUrl(attachmentUrl: string): Promise<Message | undefined>;

  getTasks(): Promise<TaskWithDetails[]>;
  getTasksByStaff(staffId: string): Promise<TaskWithDetails[]>;
  getTask(id: string): Promise<TaskWithDetails | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTaskStatus(id: string, status: TaskStatus): Promise<Task | undefined>;

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
      booking: {
        ...row.bookings,
        service: row.services,
        customer: row.customerUsers,
        chat: row.chats || undefined,
      },
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
}

export const storage = new DatabaseStorage();

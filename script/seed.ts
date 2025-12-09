import { db } from "../server/db";
import { users, services, bookings, chats, notifications } from "../shared/schema";
import bcrypt from "bcrypt";

async function seed() {
  console.log("Seeding database...");

  // Create admin user
  const adminPassword = await bcrypt.hash("admin123", 10);
  const [admin] = await db.insert(users).values({
    email: "admin@company.com",
    password: adminPassword,
    name: "System Admin",
    phone: "+1234567890",
    role: "admin",
    approved: true,
  }).returning();
  console.log("Created admin user:", admin.email);

  // Create staff users
  const staffPassword = await bcrypt.hash("staff123", 10);
  const [staff1] = await db.insert(users).values({
    email: "john@company.com",
    password: staffPassword,
    name: "John Smith",
    phone: "+1234567891",
    role: "staff",
    approved: true,
  }).returning();

  const [staff2] = await db.insert(users).values({
    email: "sarah@company.com",
    password: staffPassword,
    name: "Sarah Johnson",
    phone: "+1234567892",
    role: "staff",
    approved: true,
  }).returning();
  console.log("Created staff users:", staff1.email, staff2.email);

  // Create customer users
  const customerPassword = await bcrypt.hash("customer123", 10);
  const [customer1] = await db.insert(users).values({
    email: "customer1@example.com",
    password: customerPassword,
    name: "Alice Brown",
    phone: "+1234567893",
    role: "customer",
    approved: true,
  }).returning();

  const [customer2] = await db.insert(users).values({
    email: "customer2@example.com",
    password: customerPassword,
    name: "Bob Wilson",
    phone: "+1234567894",
    role: "customer",
    approved: true,
  }).returning();
  console.log("Created customer users:", customer1.email, customer2.email);

  // Create services
  const servicesData = [
    { name: "Computer Repair", description: "Diagnosis and repair of hardware and software issues for desktops and laptops.", category: "hardware" as const },
    { name: "Network Setup", description: "Professional installation and configuration of home or office networks.", category: "network" as const },
    { name: "Virus Removal", description: "Complete malware, spyware, and virus removal with security hardening.", category: "security" as const },
    { name: "Data Recovery", description: "Recovery of lost or corrupted data from hard drives, SSDs, and other storage media.", category: "hardware" as const },
    { name: "Software Installation", description: "Installation and configuration of operating systems and applications.", category: "software" as const },
    { name: "Cloud Migration", description: "Migration of data and applications to cloud platforms like AWS, Azure, or Google Cloud.", category: "cloud" as const },
    { name: "IT Consulting", description: "Strategic IT planning and consultation for businesses of all sizes.", category: "consulting" as const },
    { name: "System Maintenance", description: "Regular maintenance and optimization to keep systems running smoothly.", category: "maintenance" as const },
  ];

  const createdServices = [];
  for (const serviceData of servicesData) {
    const [service] = await db.insert(services).values(serviceData).returning();
    createdServices.push(service);
  }
  console.log("Created", createdServices.length, "services");

  // Create bookings
  const [booking1] = await db.insert(bookings).values({
    customerId: customer1.id,
    serviceId: createdServices[0].id,
    status: "pending",
    notes: "Laptop won't turn on, need urgent repair",
  }).returning();

  const [booking2] = await db.insert(bookings).values({
    customerId: customer1.id,
    serviceId: createdServices[2].id,
    status: "confirmed",
    notes: "Computer is running very slow, suspect virus",
    assignedStaffId: staff1.id,
  }).returning();

  const [booking3] = await db.insert(bookings).values({
    customerId: customer2.id,
    serviceId: createdServices[1].id,
    status: "in_progress",
    notes: "Need to set up office network for 10 computers",
    assignedStaffId: staff2.id,
  }).returning();
  console.log("Created 3 bookings");

  // Create chats for bookings
  await db.insert(chats).values({ bookingId: booking1.id });
  await db.insert(chats).values({ bookingId: booking2.id });
  await db.insert(chats).values({ bookingId: booking3.id });
  console.log("Created chats for bookings");

  // Create notifications
  await db.insert(notifications).values({
    userId: admin.id,
    title: "New Booking",
    content: "Alice Brown has requested Computer Repair service.",
    type: "booking",
  });

  await db.insert(notifications).values({
    userId: staff1.id,
    title: "Task Assigned",
    content: "You have been assigned to handle virus removal for Alice Brown.",
    type: "task",
  });
  console.log("Created sample notifications");

  console.log("\n=== Database seeded successfully! ===");
  console.log("\nLogin credentials:");
  console.log("Admin: admin@company.com / admin123");
  console.log("Staff: john@company.com / staff123");
  console.log("Staff: sarah@company.com / staff123");
  console.log("Customer: customer1@example.com / customer123");
  console.log("Customer: customer2@example.com / customer123");
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exit(1);
  });

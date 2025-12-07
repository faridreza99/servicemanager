import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { storage } from "./storage";

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

class EmailService {
  private transporter: Transporter | null = null;
  private config: EmailConfig | null = null;
  private isConfigured: boolean = false;
  private lastConfigCheck: number = 0;
  private configCheckInterval: number = 60000; // Check config every 60 seconds

  constructor() {
    this.initializeFromEnv();
  }

  private initializeFromEnv() {
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM;

    if (host && port && user && pass && from) {
      this.setConfig({
        host,
        port: parseInt(port, 10),
        secure: parseInt(port, 10) === 465,
        user,
        pass,
        from,
      });
      console.log("Email service configured from environment variables");
    } else {
      console.log("Email service not configured - missing SMTP environment variables");
    }
  }

  private setConfig(config: EmailConfig) {
    this.config = config;
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.pass,
      },
    });
    this.isConfigured = true;
  }

  async refreshConfigFromDatabase(): Promise<void> {
    try {
      const setting = await storage.getNotificationSettingByType("email");
      if (setting && setting.enabled && setting.config) {
        const dbConfig = JSON.parse(setting.config);
        if (dbConfig.host && dbConfig.port && dbConfig.user && dbConfig.pass && dbConfig.from) {
          this.setConfig({
            host: dbConfig.host,
            port: parseInt(dbConfig.port, 10),
            secure: parseInt(dbConfig.port, 10) === 465,
            user: dbConfig.user,
            pass: dbConfig.pass,
            from: dbConfig.from,
          });
          console.log("Email service configured from database settings");
          return;
        }
      } else if (setting && !setting.enabled) {
        this.isConfigured = false;
        this.transporter = null;
        this.config = null;
        return;
      }
      
      // Fall back to env vars if database config is incomplete
      this.initializeFromEnv();
    } catch (error) {
      console.warn("Failed to load email config from database:", error);
      this.initializeFromEnv();
    }
  }

  private async ensureConfigFresh(): Promise<void> {
    const now = Date.now();
    if (now - this.lastConfigCheck > this.configCheckInterval) {
      this.lastConfigCheck = now;
      await this.refreshConfigFromDatabase();
    }
  }

  isEnabled(): boolean {
    return this.isConfigured;
  }

  async sendEmail(options: SendEmailOptions): Promise<boolean> {
    await this.ensureConfigFresh();
    
    if (!this.transporter || !this.config) {
      return false;
    }

    try {
      await this.transporter.sendMail({
        from: this.config.from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || this.htmlToPlainText(options.html),
      });
      console.log(`[EMAIL] Sent: ${options.subject} to ${options.to}`);
      return true;
    } catch (error) {
      console.warn(`[EMAIL] FAILED: ${options.subject} to ${options.to}`, error instanceof Error ? error.message : error);
      return false;
    }
  }

  private htmlToPlainText(html: string): string {
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<\/div>/gi, "\n")
      .replace(/<\/h[1-6]>/gi, "\n\n")
      .replace(/<li>/gi, "- ")
      .replace(/<\/li>/gi, "\n")
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  async sendBookingConfirmation(
    customerEmail: string,
    customerName: string,
    serviceName: string,
    scheduledDate: Date | null,
    bookingId: string
  ): Promise<boolean> {
    const dateStr = scheduledDate
      ? new Date(scheduledDate).toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "To be scheduled";

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
          .highlight { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb; }
          .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #64748b; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Booking Confirmation</h1>
          </div>
          <div class="content">
            <p>Hello ${customerName},</p>
            <p>Thank you for your booking! We've received your service request and our team will be in touch soon.</p>
            <div class="highlight">
              <p><strong>Service:</strong> ${serviceName}</p>
              <p><strong>Scheduled Date:</strong> ${dateStr}</p>
              <p><strong>Booking ID:</strong> ${bookingId.slice(0, 8).toUpperCase()}</p>
              <p><strong>Status:</strong> Pending</p>
            </div>
            <p>You can track your booking status and communicate with our team through your dashboard.</p>
            <p>If you have any questions, feel free to reach out through the chat feature in your booking.</p>
          </div>
          <div class="footer">
            <p>IT Service Management Platform</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: customerEmail,
      subject: `Booking Confirmation - ${serviceName}`,
      html,
    });
  }

  async sendBookingStatusUpdate(
    customerEmail: string,
    customerName: string,
    serviceName: string,
    newStatus: string,
    bookingId: string
  ): Promise<boolean> {
    const statusMessages: Record<string, string> = {
      pending: "Your booking is pending review.",
      confirmed: "Great news! Your booking has been confirmed.",
      in_progress: "Your service is now in progress.",
      completed: "Your service has been completed. Thank you for choosing us!",
      cancelled: "Your booking has been cancelled.",
    };

    const statusColors: Record<string, string> = {
      pending: "#f59e0b",
      confirmed: "#10b981",
      in_progress: "#2563eb",
      completed: "#059669",
      cancelled: "#ef4444",
    };

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: ${statusColors[newStatus] || "#2563eb"}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
          .highlight { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .status-badge { display: inline-block; padding: 8px 16px; background: ${statusColors[newStatus] || "#2563eb"}; color: white; border-radius: 20px; font-weight: bold; text-transform: capitalize; }
          .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #64748b; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Booking Status Update</h1>
          </div>
          <div class="content">
            <p>Hello ${customerName},</p>
            <p>${statusMessages[newStatus] || "Your booking status has been updated."}</p>
            <div class="highlight">
              <p><strong>Service:</strong> ${serviceName}</p>
              <p><strong>Booking ID:</strong> ${bookingId.slice(0, 8).toUpperCase()}</p>
              <p><strong>New Status:</strong> <span class="status-badge">${newStatus.replace("_", " ")}</span></p>
            </div>
            <p>Log in to your dashboard to view more details or communicate with our team.</p>
          </div>
          <div class="footer">
            <p>IT Service Management Platform</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: customerEmail,
      subject: `Booking Status Update - ${newStatus.replace("_", " ").toUpperCase()}`,
      html,
    });
  }

  async sendTaskAssignment(
    staffEmail: string,
    staffName: string,
    taskDescription: string,
    bookingId: string,
    customerName: string
  ): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #7c3aed; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
          .highlight { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #7c3aed; }
          .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #64748b; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>New Task Assignment</h1>
          </div>
          <div class="content">
            <p>Hello ${staffName},</p>
            <p>You have been assigned a new task. Please review the details below and take action accordingly.</p>
            <div class="highlight">
              <p><strong>Task:</strong> ${taskDescription}</p>
              <p><strong>Customer:</strong> ${customerName}</p>
              <p><strong>Booking ID:</strong> ${bookingId.slice(0, 8).toUpperCase()}</p>
            </div>
            <p>Log in to your staff dashboard to view more details and update the task status.</p>
          </div>
          <div class="footer">
            <p>IT Service Management Platform</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: staffEmail,
      subject: `New Task Assignment - ${taskDescription.slice(0, 50)}`,
      html,
    });
  }

  async sendStaffAssignment(
    staffEmail: string,
    staffName: string,
    serviceName: string,
    customerName: string,
    scheduledDate: Date | null
  ): Promise<boolean> {
    const dateStr = scheduledDate
      ? new Date(scheduledDate).toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "To be scheduled";

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #0891b2; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
          .highlight { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0891b2; }
          .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #64748b; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>New Booking Assignment</h1>
          </div>
          <div class="content">
            <p>Hello ${staffName},</p>
            <p>You have been assigned to a new booking. Please review the details and prepare accordingly.</p>
            <div class="highlight">
              <p><strong>Service:</strong> ${serviceName}</p>
              <p><strong>Customer:</strong> ${customerName}</p>
              <p><strong>Scheduled Date:</strong> ${dateStr}</p>
            </div>
            <p>Log in to your staff dashboard to view more details and communicate with the customer.</p>
          </div>
          <div class="footer">
            <p>IT Service Management Platform</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: staffEmail,
      subject: `New Booking Assignment - ${serviceName}`,
      html,
    });
  }

  async sendUserApproval(
    userEmail: string,
    userName: string
  ): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
          .cta-button { display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 20px; }
          .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #64748b; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Account Approved</h1>
          </div>
          <div class="content">
            <p>Hello ${userName},</p>
            <p>Great news! Your account has been approved and you now have full access to the IT Service Management Platform.</p>
            <p>You can now:</p>
            <ul>
              <li>Browse and book IT services</li>
              <li>Track your bookings</li>
              <li>Communicate with our team through chat</li>
              <li>Receive quotations and updates</li>
            </ul>
            <p>Log in to your account to get started!</p>
          </div>
          <div class="footer">
            <p>IT Service Management Platform</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: userEmail,
      subject: "Your Account Has Been Approved",
      html,
    });
  }

  async sendQuotation(
    customerEmail: string,
    customerName: string,
    serviceName: string,
    quotationAmount: number,
    message: string
  ): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #059669; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
          .price-box { background: #059669; color: white; padding: 30px; border-radius: 8px; text-align: center; margin: 20px 0; }
          .price { font-size: 48px; font-weight: bold; }
          .highlight { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #64748b; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>New Quotation</h1>
          </div>
          <div class="content">
            <p>Hello ${customerName},</p>
            <p>You've received a quotation for your service request.</p>
            <div class="highlight">
              <p><strong>Service:</strong> ${serviceName}</p>
            </div>
            <div class="price-box">
              <p>Quoted Amount</p>
              <p class="price">$${quotationAmount.toFixed(2)}</p>
            </div>
            ${message ? `<div class="highlight"><p><strong>Message:</strong> ${message}</p></div>` : ""}
            <p>Log in to your dashboard to respond to this quotation through the chat.</p>
          </div>
          <div class="footer">
            <p>IT Service Management Platform</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: customerEmail,
      subject: `Quotation Received - $${quotationAmount.toFixed(2)} for ${serviceName}`,
      html,
    });
  }
}

export const emailService = new EmailService();

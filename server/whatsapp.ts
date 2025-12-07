interface WhatsAppConfig {
  phoneNumberId: string;
  accessToken: string;
  apiVersion: string;
}

interface SendWhatsAppOptions {
  to: string;
  message: string;
}

class WhatsAppService {
  private config: WhatsAppConfig | null = null;
  private isConfigured: boolean = false;
  private apiUrl: string = "";

  constructor() {
    this.initialize();
  }

  private initialize() {
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const apiVersion = process.env.WHATSAPP_API_VERSION || "v18.0";

    if (phoneNumberId && accessToken) {
      this.config = {
        phoneNumberId,
        accessToken,
        apiVersion,
      };
      this.apiUrl = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;
      this.isConfigured = true;
      console.log("WhatsApp service configured successfully");
    } else {
      console.log("WhatsApp service not configured - missing environment variables");
    }
  }

  isEnabled(): boolean {
    return this.isConfigured;
  }

  async sendMessage(options: SendWhatsAppOptions): Promise<boolean> {
    if (!this.config) {
      return false;
    }

    try {
      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.accessToken}`,
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: options.to,
          type: "text",
          text: { body: options.message },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.warn(`[WHATSAPP] FAILED to send message to ${options.to}:`, error);
        return false;
      }

      console.log(`[WHATSAPP] Sent message to ${options.to}`);
      return true;
    } catch (error) {
      console.warn(
        `[WHATSAPP] FAILED to send message to ${options.to}:`,
        error instanceof Error ? error.message : error
      );
      return false;
    }
  }

  async sendBookingConfirmation(
    customerPhone: string,
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

    const message = `Hi ${customerName}!

Your booking has been confirmed.

Service: ${serviceName}
Scheduled: ${dateStr}
Booking ID: ${bookingId.slice(0, 8).toUpperCase()}

Thank you for choosing our IT Service Management Platform. You can track your booking status through your dashboard.`;

    return this.sendMessage({ to: customerPhone, message });
  }

  async sendBookingStatusUpdate(
    customerPhone: string,
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

    const message = `Hi ${customerName}!

${statusMessages[newStatus] || "Your booking status has been updated."}

Service: ${serviceName}
Booking ID: ${bookingId.slice(0, 8).toUpperCase()}
New Status: ${newStatus.replace("_", " ").toUpperCase()}

Log in to your dashboard for more details.`;

    return this.sendMessage({ to: customerPhone, message });
  }

  async sendTaskAssignment(
    staffPhone: string,
    staffName: string,
    taskDescription: string,
    bookingId: string,
    customerName: string
  ): Promise<boolean> {
    const message = `Hi ${staffName}!

You have been assigned a new task.

Task: ${taskDescription}
Customer: ${customerName}
Booking ID: ${bookingId.slice(0, 8).toUpperCase()}

Please log in to your staff dashboard to view details and update the task status.`;

    return this.sendMessage({ to: staffPhone, message });
  }

  async sendStaffAssignment(
    staffPhone: string,
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

    const message = `Hi ${staffName}!

You have been assigned to a new booking.

Service: ${serviceName}
Customer: ${customerName}
Scheduled: ${dateStr}

Please log in to your staff dashboard to view details.`;

    return this.sendMessage({ to: staffPhone, message });
  }

  async sendUserApproval(userPhone: string, userName: string): Promise<boolean> {
    const message = `Hi ${userName}!

Great news! Your account has been approved.

You now have full access to the IT Service Management Platform. You can:
- Browse and book IT services
- Track your bookings
- Communicate with our team through chat
- Receive quotations and updates

Log in to your account to get started!`;

    return this.sendMessage({ to: userPhone, message });
  }

  async sendQuotation(
    customerPhone: string,
    customerName: string,
    serviceName: string,
    quotationAmount: number,
    additionalMessage: string
  ): Promise<boolean> {
    let message = `Hi ${customerName}!

You've received a new quotation.

Service: ${serviceName}
Quoted Amount: $${quotationAmount.toFixed(2)}`;

    if (additionalMessage) {
      message += `\n\nMessage: ${additionalMessage}`;
    }

    message += `\n\nLog in to your dashboard to respond to this quotation.`;

    return this.sendMessage({ to: customerPhone, message });
  }
}

export const whatsappService = new WhatsAppService();

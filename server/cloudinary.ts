import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  resource_type: string;
  format: string;
}

export class CloudinaryService {
  isConfigured(): boolean {
    return !!(
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    );
  }

  async generateUploadSignature(): Promise<{
    timestamp: number;
    signature: string;
    cloudName: string;
    apiKey: string;
    folder: string;
  }> {
    if (!this.isConfigured()) {
      throw new Error("Cloudinary is not configured");
    }

    const timestamp = Math.round(new Date().getTime() / 1000);
    const folder = "chat-uploads";
    
    const signature = cloudinary.utils.api_sign_request(
      {
        timestamp,
        folder,
      },
      process.env.CLOUDINARY_API_SECRET!
    );

    return {
      timestamp,
      signature,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME!,
      apiKey: process.env.CLOUDINARY_API_KEY!,
      folder,
    };
  }

  async uploadFromBuffer(
    buffer: Buffer,
    options?: { folder?: string; resource_type?: "image" | "video" | "raw" | "auto" }
  ): Promise<CloudinaryUploadResult> {
    if (!this.isConfigured()) {
      throw new Error("Cloudinary is not configured");
    }

    return new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder: options?.folder || "chat-uploads",
            resource_type: options?.resource_type || "auto",
          },
          (error, result) => {
            if (error) {
              reject(error);
            } else if (result) {
              resolve({
                secure_url: result.secure_url,
                public_id: result.public_id,
                resource_type: result.resource_type,
                format: result.format,
              });
            } else {
              reject(new Error("No result from Cloudinary"));
            }
          }
        )
        .end(buffer);
    });
  }

  async deleteImage(publicId: string): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error("Cloudinary is not configured");
    }

    await cloudinary.uploader.destroy(publicId);
  }
}

export const cloudinaryService = new CloudinaryService();

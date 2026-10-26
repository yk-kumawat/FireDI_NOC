import { v2 as cloudinary } from "cloudinary";
import { Readable } from "stream";
import crypto from "crypto";

export interface StorageConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

export interface UploadOptions {
  folder?: string;
  resourceType?: "auto" | "image" | "raw" | "video";
  deliveryType?: "private" | "authenticated";
  allowedFormats?: string[];
  maxFileSize?: number; // in bytes
  maxPages?: number; // for PDFs
}

export interface UploadResult {
  publicId: string;
  resourceType: string;
  deliveryType: string;
  format: string;
  bytes: number;
  width?: number;
  height?: number;
  pages?: number;
  secureUrl: string;
  checksum?: string;
}

export interface StorageService {
  upload(
    fileBuffer: Buffer,
    options: UploadOptions
  ): Promise<UploadResult>;
  delete(publicId: string, resourceType?: string): Promise<void>;
  generateSignedUrl(
    publicId: string,
    options: {
      resourceType?: string;
      deliveryType?: string;
      expiresIn?: number; // seconds
      attachment?: boolean;
    }
  ): string;
  validateConfig(): boolean;
}

export class CloudinaryStorageService implements StorageService {
  private config: StorageConfig;
  private initialized = false;

  constructor(config: StorageConfig) {
    this.config = config;
  }

  initialize(): void {
    if (this.initialized) return;

    cloudinary.config({
      cloud_name: this.config.cloudName,
      api_key: this.config.apiKey,
      api_secret: this.config.apiSecret,
      secure: true,
    });

    this.initialized = true;
  }

  validateConfig(): boolean {
    return !!(
      this.config.cloudName &&
      this.config.apiKey &&
      this.config.apiSecret
    );
  }

  async upload(
    fileBuffer: Buffer,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    if (!this.initialized) {
      this.initialize();
    }

    const {
      folder = "fire-noc-documents",
      resourceType = "auto",
      deliveryType = "private",
      allowedFormats,
      maxFileSize,
      maxPages,
    } = options;

    // Validate file size before upload
    if (maxFileSize && fileBuffer.length > maxFileSize) {
      throw new StorageError(
        `File size exceeds maximum allowed size of ${maxFileSize} bytes`,
        "FILE_TOO_LARGE"
      );
    }

    // Generate checksum for integrity verification
    const checksum = crypto
      .createHash("sha256")
      .update(fileBuffer)
      .digest("hex");

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: resourceType,
          type: deliveryType,
          allowed_formats: allowedFormats,
          pages: maxPages,
          use_filename: false,
          unique_filename: true,
          overwrite: false,
          invalidate: true,
          context: {
            checksum,
          },
        },
        (error, result) => {
          if (error) {
            reject(new StorageError(error.message, "UPLOAD_FAILED", error));
            return;
          }

          if (!result) {
            reject(new StorageError("No result from Cloudinary", "NO_RESULT"));
            return;
          }

          resolve({
            publicId: result.public_id,
            resourceType: result.resource_type,
            deliveryType: result.type,
            format: result.format,
            bytes: result.bytes,
            width: result.width,
            height: result.height,
            pages: result.pages,
            secureUrl: result.secure_url,
            checksum,
          });
        }
      );

      const readableStream = new Readable();
      readableStream.push(fileBuffer);
      readableStream.push(null);
      readableStream.pipe(uploadStream);
    });
  }

  async delete(
    publicId: string,
    resourceType: string = "auto"
  ): Promise<void> {
    if (!this.initialized) {
      this.initialize();
    }

    return new Promise((resolve, reject) => {
      cloudinary.uploader.destroy(
        publicId,
        { resource_type: resourceType, invalidate: true },
        (error, result) => {
          if (error) {
            reject(new StorageError(error.message, "DELETE_FAILED", error));
            return;
          }
          if (result.result !== "ok" && result.result !== "not found") {
            reject(
              new StorageError(
                `Delete failed: ${result.result}`,
                "DELETE_FAILED"
              )
            );
            return;
          }
          resolve();
        }
      );
    });
  }

  generateSignedUrl(
    publicId: string,
    options: {
      resourceType?: string;
      deliveryType?: string;
      expiresIn?: number;
      attachment?: boolean;
    } = {}
  ): string {
    if (!this.initialized) {
      this.initialize();
    }

    const {
      resourceType = "auto",
      deliveryType = "private",
      expiresIn = 3600, // 1 hour default
      attachment = false,
    } = options;

    const type = deliveryType === "private" ? "private" : "authenticated";

    // Use cloudinary.url with sign_url for private/authenticated delivery
    return cloudinary.url(publicId, {
      resource_type: resourceType,
      type,
      sign_url: true,
      expires_at: Math.floor(Date.now() / 1000) + expiresIn,
      attachment,
      format: undefined, // auto-detect
    });
  }
}

export class StorageError extends Error {
  code: string;
  originalError?: Error;

  constructor(message: string, code: string, originalError?: Error) {
    super(message);
    this.name = "StorageError";
    this.code = code;
    this.originalError = originalError;
  }
}

// Factory function to create storage service from environment
export function createStorageService(): StorageService {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      "Cloudinary configuration missing. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET"
    );
  }

  return new CloudinaryStorageService({ cloudName, apiKey, apiSecret });
}
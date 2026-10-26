import mongoose from "mongoose";

export const connectDatabase = async (): Promise<void> => {
  try {
    const mongoUri = process.env.MONGODB_URI;

    if (!mongoUri) {
      throw new Error("MONGODB_URI is not defined in .env");
    }

    // Validate Cloudinary configuration
    const cloudinaryVars = [
      "CLOUDINARY_CLOUD_NAME",
      "CLOUDINARY_API_KEY",
      "CLOUDINARY_API_SECRET",
    ];
    const missingCloudinary = cloudinaryVars.filter((v) => !process.env[v]);
    if (missingCloudinary.length > 0) {
      console.warn(
        `Cloudinary configuration incomplete. Missing: ${missingCloudinary.join(
          ", "
        )}. Document uploads will not work until configured.`
      );
    }

    await mongoose.connect(mongoUri);

    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection failed:", error);
    process.exit(1);
  }
};
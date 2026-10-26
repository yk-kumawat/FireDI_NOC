import "dotenv/config";
import { v2 as cloudinary } from "cloudinary";

console.log("Testing Cloudinary...");
console.log("Cloud name:", process.env.CLOUDINARY_CLOUD_NAME);
console.log("API Key:", process.env.CLOUDINARY_API_KEY?.substring(0, 10) + "...");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

async function test() {
  try {
    const buffer = Buffer.from("test file content");
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: "test", resource_type: "raw" },
        (error, result) => error ? reject(error) : resolve(result)
      );
      stream.end(buffer);
    });
    
    console.log("✅ Cloudinary upload successful!");
    console.log("  Public ID:", result.public_id);
    console.log("  URL:", result.secure_url);
    console.log("  Resource type:", result.resource_type);
    
    // Clean up
    await cloudinary.uploader.destroy(result.public_id, { resource_type: "raw" });
    console.log("  Test file cleaned up");
  } catch (error: any) {
    console.error("❌ Cloudinary failed:", error.message);
    console.error("  HTTP code:", error.http_code);
  }
}

test();
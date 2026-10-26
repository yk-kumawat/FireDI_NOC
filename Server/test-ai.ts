import "dotenv/config";
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
const modelName = process.env.AI_MODEL || "gemini-3.6-flash";

if (!apiKey) {
  console.error("❌ No GOOGLE_GENERATIVE_AI_API_KEY found in .env");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

async function main() {
  console.log(`🤖 Sending "hii" to model: ${modelName}...`);
  try {
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent("hii");
    const response = await result.response;
    console.log("\n✅ Response from Gemini:\n");
    console.log(response.text().trim());
  } catch (error: any) {
    console.error("\n❌ Error:", error.message || error);
  }
}

main();

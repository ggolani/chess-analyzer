const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function listModels() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  try {
    const models = await genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Placeholder
    // The SDK doesn't have a direct "listModels" on the instance in some versions,
    // let's try a different approach or just test common names.
    const modelNames = ["gemini-1.5-flash", "gemini-1.5-flash-latest", "gemini-2.0-flash", "gemini-2.0-flash-exp"];
    for (const name of modelNames) {
      try {
        const m = genAI.getGenerativeModel({ model: name });
        await m.generateContent("test");
        console.log(`✅ ${name} works!`);
      } catch (e) {
        console.log(`❌ ${name} failed: ${e.message}`);
      }
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

listModels();

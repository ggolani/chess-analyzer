const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

async function test() {
  const evaluations = [0.2, 0.4, 0.5, 0.3];
  const moveDataForLLM = [
    { num: 1, move: "e4", fenBefore: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", fenAfter: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1" },
    { num: 2, move: "e5", fenBefore: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1", fenAfter: "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2" },
    { num: 3, move: "Nf3", fenBefore: "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2", fenAfter: "rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2" },
    { num: 4, move: "Nc6", fenBefore: "rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2", fenAfter: "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3" }
  ];

  const prompt = `
    You are an elite Chess Grandmaster. Analyze these moves.
    Stockfish evaluations (White perspective): ${evaluations.join(', ')}
    Moves: ${JSON.stringify(moveDataForLLM)}
    
    RETURN FORMAT (JSON only):
    {
      "annotations": [
        { "move": "e4", "intent": "GM-level insight.", "label": "Best|Good|Inaccuracy|Mistake|Blunder|Great" }
      ]
    }
  `;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    console.log("LLM Response:\n", text);
  } catch (err) {
    console.error("LLM Error:", err);
  }
}

test();

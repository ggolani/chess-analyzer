const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { Chess } = require('chess.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { spawn } = require('child_process');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);
// Using gemini-3-flash-preview for latest capabilities via v1beta
const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" }, { apiVersion: "v1beta" });

// Stockfish Helper
const evaluateFens = (fens) => {
  return new Promise((resolve) => {
    const stockfishPath = path.join(__dirname, 'stockfish-engine');
    const sf = spawn(stockfishPath);
    const evaluations = [];
    let currentIndex = 0;

    const analyzeNext = () => {
      if (currentIndex >= fens.length) {
        sf.stdin.write('quit\n');
        return;
      }
      sf.stdin.write(`position fen ${fens[currentIndex]}\ngo depth 12\n`);
    };

    sf.stdout.on('data', (data) => {
      const lines = data.toString().split('\n');
      for (const line of lines) {
        if (line.includes('cp ')) {
          const match = line.match(/cp (-?\d+)/);
          if (match) evaluations[currentIndex] = parseInt(match[1]) / 100;
        } else if (line.includes('mate ')) {
          const match = line.match(/mate (-?\d+)/);
          if (match) evaluations[currentIndex] = parseInt(match[1]) > 0 ? 100 : -100;
        }
        if (line.includes('bestmove')) {
          if (evaluations[currentIndex] === undefined) evaluations[currentIndex] = 0;
          currentIndex++;
          analyzeNext();
        }
      }
    });

    sf.on('close', () => {
      resolve(evaluations);
    });

    sf.on('error', (err) => {
      console.error('Stockfish error:', err);
      // Fill remaining evaluations with 0 if it crashes
      while(evaluations.length < fens.length) evaluations.push(0);
      resolve(evaluations);
    });

    analyzeNext();
  });
};

const callLLMWithRetry = async (prompt, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (err) {
      if (i === retries - 1) throw err;
      const waitTime = Math.pow(2, i) * 1000;
      console.warn(`LLM failed, retrying in ${waitTime}ms... (${err.message})`);
      await new Promise(r => setTimeout(r, waitTime));
    }
  }
};

app.post('/api/analyze-game', async (req, res) => {
  let { pgn } = req.body;
  try {
    const chess = new Chess();
    if (!chess.loadPgn(pgn)) {
      chess.reset();
      const moves = pgn.replace(/\[.*?\]/g, '').replace(/\d+\./g, '').split(/\s+/).filter(m => m.trim());
      for (const move of moves) {
        try { chess.move(move); } catch (e) {}
      }
    }

    const history = chess.history({ verbose: true });
    if (history.length === 0) throw new Error("No moves found");

    const moveDataForLLM = [];
    const analysisChess = new Chess();
    const fensToEvaluate = [];

    for (let i = 0; i < history.length; i++) {
      const move = history[i];
      const fenBefore = analysisChess.fen();
      analysisChess.move(move);
      const fenAfter = analysisChess.fen();
      moveDataForLLM.push({ num: i + 1, move: move.san, fenBefore, fenAfter });
      fensToEvaluate.push(fenAfter);
    }

    console.log(`Analyzing ${history.length} moves...`);
    const evaluations = await evaluateFens(fensToEvaluate);
    console.log("Stockfish done. Calling LLM...");

    let llmAnnotations = [];
    try {
      const prompt = `
        You are a world-class Chess Grandmaster with a sharp, engaging, and instructive commentary style. 
        Analyze the following sequence of moves from a real game.
        
        CONTEXT:
        - Stockfish evaluations (White's perspective): ${evaluations.join(', ')}
        - Move Sequence: ${JSON.stringify(moveDataForLLM.map(m => `${m.num}. ${m.move}`))}
        - Full Move Data: ${JSON.stringify(moveDataForLLM)}
        
        TASK:
        For each move, provide:
        1. "intent": A concise, one-sentence "GM insight" explaining the strategic or tactical purpose of the move. Be specific about threats, plans, or weaknesses. Avoid generic phrases like "Good move".
        2. "label": Choose exactly one: "Best", "Great", "Good", "Inaccuracy", "Mistake", or "Blunder" based on the evaluation change and the move's quality.
        
        CRITICAL: 
        - DO NOT use placeholder text. 
        - Provide unique commentary for every single move.
        - Return ONLY a valid JSON object.
        
        RETURN FORMAT (JSON only):
        {
          "annotations": [
            { "move": "e4", "intent": "Controls the center and opens lines for the Queen and Bishop.", "label": "Best" },
            ...
          ]
        }
      `;
      
      const responseText = await callLLMWithRetry(prompt);
      // More robust JSON extraction for large responses
      const firstBrace = responseText.indexOf('{');
      const lastBrace = responseText.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        const jsonStr = responseText.substring(firstBrace, lastBrace + 1);
        const parsed = JSON.parse(jsonStr);
        llmAnnotations = parsed.annotations;
      } else {
        throw new Error("Could not find valid JSON object in LLM response");
      }
    } catch (llmError) {
      console.error("LLM Failed after retries:", llmError.message);
      // Fallback with basic evaluation-based labels
      llmAnnotations = history.map((m, i) => {
        const prevEval = i > 0 ? evaluations[i-1] : 0.3;
        const currEval = evaluations[i];
        const diff = Math.abs(currEval - prevEval);
        let label = "Good";
        if (diff > 2.0) label = "Blunder";
        else if (diff > 1.0) label = "Mistake";
        else if (diff > 0.5) label = "Inaccuracy";
        
        return { 
          move: m.san, 
          intent: "The game continues with both sides seeking an advantage.", 
          label: label 
        };
      });
    }

    const finalAnalysis = history.map((move, i) => {
      const annot = llmAnnotations[i] || { intent: "Position continues.", label: "Good" };
      const playbackChess = new Chess();
      // Re-calculate FEN for each move for the final result
      for(let j=0; j<=i; j++) playbackChess.move(history[j]);

      return {
        move: move.san,
        fen: playbackChess.fen(),
        annotation: annot.label,
        intent: annot.intent,
        evaluation: evaluations[i],
        player: i % 2 === 0 ? 'White' : 'Black'
      };
    });

    res.json({ analysis: finalAnalysis });
  } catch (error) {
    console.error("Analysis failed:", error.message);
    res.status(500).json({ error: `Analysis failed: ${error.message}` });
  }
});

app.get('/api/recent-games/:username', async (req, res) => {
  const { username } = req.params;
  try {
    const archivesRes = await axios.get(`https://api.chess.com/pub/player/${username}/games/archives`, {
      headers: { 'User-Agent': 'ChessAnalyzer/1.0' }
    });
    const archives = archivesRes.data.archives;
    if (!archives || archives.length === 0) return res.status(404).json({ error: 'No games found' });

    let allGames = [];
    for (let i = archives.length - 1; i >= 0 && allGames.length < 10; i--) {
      const gamesRes = await axios.get(archives[i], { headers: { 'User-Agent': 'ChessAnalyzer/1.0' } });
      allGames = allGames.concat(gamesRes.data.games.reverse());
    }

    res.json(allGames.slice(0, 10).map((game, index) => ({
      id: index, white: game.white.username, black: game.black.username,
      result: game.pgn?.match(/\[Result "(.*)"\]/)?.[1] || '*',
      date: game.pgn?.match(/\[Date "(.*)"\]/)?.[1] || 'Unknown',
      pgn: game.pgn || ''
    })));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch games' });
  }
});

const PORT = 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

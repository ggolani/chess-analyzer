# Chess Annotator ♟️

An AI-powered chess analysis tool that provides Grandmaster-level insights and Stockfish evaluations for your recent games.

## Features
- **Fetch Recent Games:** Automatically retrieve your last 10 games from Chess.com.
- **Stockfish Integration:** Precise move-by-move evaluation using a local Stockfish engine.
- **AI Grandmaster Commentary:** Contextual, strategic, and instructive annotations powered by **Gemini 3 Flash Preview**.
- **Interactive Wood-Style UI:** A beautiful, responsive interface to replay and learn from your games.

## Prerequisites
- **Node.js:** v18 or higher.
- **Gemini API Key:** Get one from [Google AI Studio](https://aistudio.google.com/).
- **Stockfish Engine:** The project includes a Linux-compatible Stockfish binary.

## Project Structure
- `backend/`: Node.js Express server handling Chess.com API, Stockfish execution, and Gemini LLM calls.
- `frontend/`: React + Vite + Tailwind CSS application for the interactive user interface.

## Setup Instructions

### 1. Backend Configuration
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create a `.env` file and add your Gemini API Key:
   ```env
   GEMINI_API_KEY=your_api_key_here
   ```
3. Install dependencies:
   ```bash
   npm install
   ```

### 2. Frontend Configuration
1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```

## How to Start the Program

You need to run both the backend and the frontend simultaneously.

### Start Backend
In the `backend/` directory:
```bash
node index.js
```
The server will start on `http://localhost:3001`.

### Start Frontend
In the `frontend/` directory:
```bash
npm run dev
```
The UI will be available at `http://localhost:5173`.

## Usage
1. Open the frontend in your browser.
2. Enter your **Chess.com username** in the search bar and click "Search".
3. Select a game from the list.
4. Wait for the AI and Stockfish to finish the analysis (takes 15-30 seconds).
5. Use the "Next" and "Previous" buttons to navigate through the moves and read the GM commentary.

## Design and Architecture
For detailed technical information about implementation choices (such as sequential Stockfish evaluation to save resources), please refer to [ARCHITECTURE.md](./ARCHITECTURE.md).

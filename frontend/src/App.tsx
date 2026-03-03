import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Search, Loader2, ChevronRight, MessageCircle, List, ArrowLeft } from 'lucide-react';

interface MoveAnalysis {
  move: string;
  fen: string;
  annotation: string;
  intent: string;
  player: string;
  evaluation: number;
}

interface GameMetadata {
  white: string;
  black: string;
  result: string;
  date: string;
  pgn: string;
}

// Simple Custom Board for React 19 Stability
const CustomBoard = ({ fen }: { fen: string }) => {
  const pieces: Record<string, string> = {
    p: '♟', n: '♞', b: '♝', r: '♜', q: '♛', k: '♚',
    P: '♟', N: '♞', B: '♝', R: '♜', Q: '♛', K: '♚'
  };

  const getBoard = (fenString: string) => {
    const boardStr = fenString.split(' ')[0];
    const rows = boardStr.split('/');
    const fullBoard: (string | null)[][] = [];
    
    for (const row of rows) {
      const fullRow: (string | null)[] = [];
      for (const char of row) {
        if (isNaN(parseInt(char))) {
          fullRow.push(char);
        } else {
          for (let i = 0; i < parseInt(char); i++) fullRow.push(null);
        }
      }
      fullBoard.push(fullRow);
    }
    return fullBoard;
  };

  const board = getBoard(fen === 'start' ? 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' : fen);

  return (
    <div className="grid grid-cols-8 grid-rows-8 w-full h-full border-8 border-[#3d2b1f] bg-[#decba4] shadow-2xl">
      {board.map((row, i) => 
        row.map((piece, j) => {
          const isDark = (i + j) % 2 === 1;
          return (
            <div 
              key={`${i}-${j}`}
              data-square={`${String.fromCharCode(97 + j)}${8 - i}`}
              className={`flex items-center justify-center text-5xl sm:text-6xl select-none transition-colors ${isDark ? 'bg-[#8b4513]' : 'bg-[#decba4]'}`}
            >
              {piece && (
                <span 
                  data-piece={piece}
                  className={`${piece === piece.toUpperCase() ? 'text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]' : 'text-black drop-shadow-[0_1px_1px_rgba(255,255,255,0.4)]'}`}
                >
                  {pieces[piece]}
                </span>
              )}
            </div>
          )
        })
      )}
    </div>
  );
};

function App() {
  const [username, setUsername] = useState('');
  const [recentGames, setRecentGames] = useState<GameMetadata[]>([]);
  const [selectedGame, setSelectedGame] = useState<GameMetadata | null>(null);
  const [gameAnalysis, setGameAnalysis] = useState<MoveAnalysis[] | null>(null);
  const [loadingGames, setLoadingGames] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);
  const [boardWidth, setBoardWidth] = useState(400);
  const boardContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateSize = () => {
      if (boardContainerRef.current) {
        const width = boardContainerRef.current.offsetWidth;
        const height = boardContainerRef.current.offsetHeight;
        const size = Math.min(width, height) - 64;
        if (size > 0) setBoardWidth(size);
      }
    };
    updateSize();
    const timer = setTimeout(updateSize, 100);
    window.addEventListener('resize', updateSize);
    return () => {
      window.removeEventListener('resize', updateSize);
      clearTimeout(timer);
    };
  }, [selectedGame, gameAnalysis]);

  const fetchRecentGames = async () => {
    if (!username) return;
    setLoadingGames(true);
    try {
      const response = await axios.get(`http://localhost:3001/api/recent-games/${username}`);
      setRecentGames(response.data);
      setSelectedGame(null);
      setGameAnalysis(null);
    } catch (error) {
      console.error('Error fetching games:', error);
      alert('Failed to fetch recent games.');
    } finally {
      setLoadingGames(false);
    }
  };

  const analyzeGame = async (game: GameMetadata) => {
    setSelectedGame(game);
    setAnalyzing(true);
    setGameAnalysis(null);
    setCurrentMoveIndex(-1);
    try {
      const response = await axios.post(`http://localhost:3001/api/analyze-game`, { 
        pgn: game.pgn,
        username: username 
      });
      setGameAnalysis(response.data.analysis);
    } catch (error) {
      console.error('Error analyzing game:', error);
      alert('Failed to analyze game.');
    } finally {
      setAnalyzing(false);
    }
  };

  const currentFEN = currentMoveIndex === -1 ? 'start' : gameAnalysis?.[currentMoveIndex].fen;
  const currentAnalysis = currentMoveIndex === -1 ? null : gameAnalysis?.[currentMoveIndex];

  const getAnnotationColor = (label: string) => {
    switch (label) {
      case 'Blunder': return 'text-red-600 bg-red-50 border-red-200';
      case 'Mistake': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'Inaccuracy': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'Best': return 'text-green-600 bg-green-50 border-green-200';
      case 'Great': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-slate-600 bg-slate-50 border-slate-200';
    }
  };

  const formatEval = (val: number) => {
    if (val === undefined) return '0.0';
    const sign = val > 0 ? '+' : '';
    return `${sign}${val.toFixed(1)}`;
  };

  return (
    <div className="h-screen w-screen bg-slate-50 flex flex-col overflow-hidden font-sans text-slate-900">
      <header className="h-16 border-b border-slate-200 px-6 flex items-center justify-between bg-white shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-3">
          <div className="bg-slate-900 text-white p-2 rounded-xl">
            <List size={20} />
          </div>
          <h1 className="text-xl font-black tracking-tight uppercase">Chess Annotator</h1>
        </div>

        <div className="flex gap-2 w-96">
          <input
            type="text"
            placeholder="Chess.com Username"
            className="flex-1 px-4 py-2 bg-slate-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-slate-900 transition-all outline-none"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && fetchRecentGames()}
          />
          <button
            onClick={fetchRecentGames}
            disabled={loadingGames}
            className="bg-slate-900 text-white px-5 py-2 rounded-xl text-sm font-bold hover:bg-slate-800 disabled:bg-slate-300 transition-all flex items-center gap-2 shadow-md"
          >
            {loadingGames ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />}
            Search
          </button>
        </div>
      </header>

      <div className="flex-1 relative overflow-hidden">
        {!selectedGame && recentGames.length > 0 && (
          <div className="absolute inset-0 bg-slate-50 flex items-center justify-center p-8 overflow-y-auto">
            <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 p-8">
              <h2 className="text-2xl font-black mb-6 flex items-center gap-2">
                Recent Games <span className="text-slate-300 text-sm font-normal">for {username}</span>
              </h2>
              <div className="grid gap-3">
                {recentGames.map((game, idx) => (
                  <button 
                    key={idx}
                    onClick={() => analyzeGame(game)}
                    className="w-full flex items-center justify-between p-6 rounded-2xl border border-slate-50 hover:border-slate-900 hover:bg-slate-50 transition-all text-left group shadow-sm hover:shadow-md"
                  >
                    <div>
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{game.date}</div>
                      <div className="text-lg font-bold flex items-center gap-3">
                        <span className="text-slate-900">{game.white}</span>
                        <span className="text-slate-300 font-medium">vs</span>
                        <span className="text-slate-900">{game.black}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-mono text-sm font-black bg-slate-100 px-3 py-1.5 rounded-xl group-hover:bg-slate-900 group-hover:text-white transition-all">{game.result}</span>
                      <ChevronRight size={20} className="text-slate-200 group-hover:text-slate-900 transition-all" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {analyzing && (
          <div className="absolute inset-0 bg-white/90 backdrop-blur-md z-50 flex flex-col items-center justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-blue-500 blur-3xl opacity-20 animate-pulse"></div>
              <Loader2 className="animate-spin text-slate-900 mb-8 relative" size={80} strokeWidth={1.5} />
            </div>
            <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-900">AI Analysis in Progress</h2>
            <p className="text-slate-500 font-bold mt-2 tracking-widest uppercase text-xs">Estimated: 15-30 seconds depending on game length</p>
            <p className="text-slate-400 font-bold mt-1 tracking-widest uppercase text-[10px]">Stockfish 16.1 · GM Insights</p>
          </div>
        )}

        {selectedGame && gameAnalysis && (
          <div className="h-full flex flex-col">
            <div className="flex-1 flex overflow-hidden">
              <div 
                ref={boardContainerRef}
                className="w-1/2 flex items-center justify-center bg-slate-200/50 p-12"
              >
                <div 
                  className="shadow-[0_20px_50px_rgba(0,0,0,0.3)] rounded-sm overflow-hidden bg-white ring-8 ring-white"
                  style={{ width: boardWidth, height: boardWidth }}
                >
                  <CustomBoard fen={currentFEN || 'start'} />
                </div>
              </div>

              <div className="w-1/2 flex flex-col bg-white overflow-y-auto p-12 border-l border-slate-200">
                <div className="flex justify-between items-center mb-12">
                  <button 
                    onClick={() => {setSelectedGame(null); setGameAnalysis(null);}}
                    className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-slate-900 transition-all"
                  >
                    <ArrowLeft size={14} /> Exit Analysis
                  </button>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest block">White</span>
                      <span className="font-black text-slate-900">{selectedGame.white}</span>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center font-black text-slate-400 border border-slate-200">VS</div>
                    <div className="text-left">
                      <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest block">Black</span>
                      <span className="font-black text-slate-900">{selectedGame.black}</span>
                    </div>
                  </div>
                </div>

                {currentAnalysis ? (
                  <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className={`flex-1 rounded-[2.5rem] p-10 border-4 ${getAnnotationColor(currentAnalysis.annotation)} shadow-sm flex flex-col justify-center`}>
                       <div className="flex justify-between items-start mb-4">
                         <span className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">GM Commentary</span>
                         <span className="bg-white px-3 py-1 rounded-full font-mono text-xs font-black shadow-sm border border-slate-100">
                           {formatEval(currentAnalysis.evaluation)}
                         </span>
                       </div>
                       <div className="flex items-center gap-4 mb-6">
                         <h3 className="text-6xl font-black tracking-tighter">{currentAnalysis.annotation}</h3>
                         <span className="bg-slate-900 text-white text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-widest">{currentAnalysis.player}</span>
                       </div>
                       <p className="text-2xl font-bold leading-tight text-slate-800 italic">
                         "{currentAnalysis.intent}"
                       </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-200">
                    <div className="w-32 h-32 rounded-[2.5rem] bg-slate-50 border border-slate-100 flex items-center justify-center mb-6">
                      <MessageCircle size={48} strokeWidth={1} />
                    </div>
                    <p className="text-xs font-black uppercase tracking-[0.5em] text-slate-300">Analysis Mode</p>
                    <p className="font-bold text-slate-400 mt-2">Pick a move to see the plan</p>
                  </div>
                )}
                
                <div className="mt-12 flex gap-4">
                  <button
                    onClick={() => setCurrentMoveIndex(prev => Math.max(-1, prev - 1))}
                    className="flex-1 py-5 bg-white rounded-2xl font-black hover:bg-slate-50 disabled:opacity-30 transition-all border-2 border-slate-100 text-slate-900 shadow-sm"
                    disabled={currentMoveIndex === -1}
                  >
                    PREVIOUS
                  </button>
                  <button
                    onClick={() => setCurrentMoveIndex(prev => Math.min(gameAnalysis.length - 1, prev + 1))}
                    className="flex-1 py-5 bg-slate-900 text-white rounded-2xl font-black hover:bg-slate-800 disabled:opacity-30 transition-all shadow-xl hover:translate-y-[-2px] active:translate-y-0"
                    disabled={currentMoveIndex === gameAnalysis.length - 1}
                  >
                    NEXT MOVE
                  </button>
                </div>
              </div>
            </div>

            <div className="h-44 bg-slate-900 p-8 flex flex-col z-10">
              <div className="flex-1 overflow-x-auto pb-2 custom-scrollbar no-scrollbar">
                <div className="flex gap-3 items-center h-full">
                  <button
                    onClick={() => setCurrentMoveIndex(-1)}
                    className={`px-8 h-full rounded-2xl font-black text-sm transition-all shrink-0 uppercase tracking-widest ${
                      currentMoveIndex === -1 ? 'bg-white text-slate-900 shadow-[0_0_30px_rgba(255,255,255,0.3)]' : 'bg-slate-800 text-slate-500 hover:text-white'
                    }`}
                  >
                    Start
                  </button>
                  {gameAnalysis.map((item, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentMoveIndex(index)}
                      className={`px-8 h-full rounded-2xl transition-all shrink-0 flex items-center gap-3 border-2 ${
                        currentMoveIndex === index 
                          ? 'bg-white text-slate-900 border-white shadow-[0_0_30px_rgba(255,255,255,0.3)] scale-105' 
                          : 'bg-transparent border-slate-800 text-slate-500 hover:border-slate-700 hover:text-slate-300'
                      }`}
                    >
                      <span className="text-[10px] font-black opacity-30">
                        {index % 2 === 0 ? Math.floor(index / 2) + 1 : ''}
                      </span>
                      <div className="flex flex-col items-center">
                        <span className="font-black text-lg">{item.move}</span>
                        <span className="text-[10px] font-mono opacity-50">{formatEval(item.evaluation)}</span>
                      </div>
                      <div className={`w-2.5 h-2.5 rounded-full shadow-sm ${
                        item.annotation === 'Blunder' ? 'bg-red-500' :
                        item.annotation === 'Mistake' ? 'bg-orange-500' :
                        item.annotation === 'Inaccuracy' ? 'bg-yellow-500' :
                        item.annotation === 'Great' ? 'bg-blue-500' :
                        item.annotation === 'Best' ? 'bg-green-500' : 'bg-slate-700'
                      }`}></div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;

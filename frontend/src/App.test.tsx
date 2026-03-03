import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';
import axios from 'axios';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock axios
vi.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('App Chessboard Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear console to keep output clean
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('verifies that pieces move in the DOM when navigating', async () => {
    const mockGames = [
      {
        id: 0,
        white: 'Player1',
        black: 'Player2',
        result: '1-0',
        date: '2026.03.02',
        pgn: '1. e4'
      }
    ];

    const mockAnalysis = {
      analysis: [
        { 
          move: 'e4', 
          fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1', 
          staticEval: 0, 
          dynamicEval: 0.3, 
          shift: 0, 
          annotation: 'Best', 
          intent: 'White plays e4',
          player: 'White' 
        }
      ]
    };

    mockedAxios.get.mockResolvedValue({ data: mockGames });
    mockedAxios.post.mockResolvedValue({ data: mockAnalysis });

    const { container } = render(<App />);

    // Search and select game
    fireEvent.change(screen.getByPlaceholderText(/Chess.com Username/i), { target: { value: 'test' } });
    fireEvent.click(screen.getByText(/Search/i));
    fireEvent.click(await screen.findByText(/Player1/i));

    // Wait for analysis
    await waitFor(() => expect(screen.queryByText(/AI Analysis in Progress/i)).not.toBeInTheDocument());

    // INITIAL POSITION: Pawn should be on e2
    // Square e2 is at id="chessboard-square-e2"
    // Piece wP should be inside it
    const e2Square = container.querySelector('#chessboard-square-e2');
    const e4Square = container.querySelector('#chessboard-square-e4');
    
    expect(e2Square?.querySelector('[data-piece="wP"]')).toBeTruthy();
    expect(e4Square?.querySelector('[data-piece="wP"]')).toBeFalsy();

    // Click NEXT MOVE (1. e4)
    fireEvent.click(screen.getByText(/NEXT MOVE/i));
    
    // AFTER e4: Pawn should be on e4, not e2
    await waitFor(() => {
      const updatedE2 = container.querySelector('#chessboard-square-e2');
      const updatedE4 = container.querySelector('#chessboard-square-e4');
      if (!updatedE4?.querySelector('[data-piece="wP"]')) throw new Error('Pawn not on e4');
      if (updatedE2?.querySelector('[data-piece="wP"]')) throw new Error('Pawn still on e2');
    });

    expect(screen.getByText(/White plays e4/i)).toBeInTheDocument();
  });
});

import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock ResizeObserver which is used by react-chessboard
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

window.ResizeObserver = ResizeObserver;

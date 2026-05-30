import '@testing-library/jest-dom';

// Mock Tauri IPC — not present in jsdom
// The lib/tauri.ts wrapper checks for window.__TAURI_IPC__ before calling invoke,
// so tests that don't exercise Tauri commands will work without this.
// For tests that DO call Tauri commands we stub them here.

Object.defineProperty(window, '__TAURI_IPC__', {
  value: undefined,
  writable: true,
});

// Silence "not implemented" jsdom errors for specific APIs
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

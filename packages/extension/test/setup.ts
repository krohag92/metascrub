import '@testing-library/react';

// Mock chrome extension APIs globally
const chromeMock = {
  storage: {
    sync: {
      get: vi.fn().mockResolvedValue({}),
      set: vi.fn().mockResolvedValue(undefined),
      remove: vi.fn().mockResolvedValue(undefined),
    },
    session: {
      get: vi.fn().mockResolvedValue({}),
      set: vi.fn().mockResolvedValue(undefined),
      remove: vi.fn().mockResolvedValue(undefined),
    },
  },
  downloads: {
    download: vi.fn().mockImplementation((_options: unknown, callback?: (id: number) => void) => {
      if (callback) callback(1);
    }),
  },
  runtime: {
    lastError: null as { message: string } | null,
  },
  action: {
    openPopup: vi.fn().mockResolvedValue(undefined),
  },
  contextMenus: {
    create: vi.fn(),
    onClicked: {
      addListener: vi.fn(),
    },
  },
};

// @ts-expect-error - global chrome mock for tests
globalThis.chrome = chromeMock;

// Mock URL.createObjectURL / revokeObjectURL
globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
globalThis.URL.revokeObjectURL = vi.fn();

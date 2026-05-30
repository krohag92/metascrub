import '@testing-library/jest-dom';

// Mock all @capacitor/* modules so tests run in jsdom without native bridge
vi.mock('@capacitor/app', () => ({
  App: {
    getLaunchUrl: vi.fn().mockResolvedValue(null),
    addListener: vi.fn().mockResolvedValue({ remove: vi.fn() }),
    removeAllListeners: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@capacitor/filesystem', () => ({
  Filesystem: {
    readFile: vi.fn().mockResolvedValue({ data: '' }),
    writeFile: vi.fn().mockResolvedValue(undefined),
    getUri: vi.fn().mockResolvedValue({ uri: 'file:///mock/path' }),
  },
  Directory: {
    Documents: 'DOCUMENTS',
    Data: 'DATA',
  },
  Encoding: {
    UTF8: 'utf8',
  },
}));

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn().mockResolvedValue({ value: null }),
    set: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@capacitor/share', () => ({
  Share: {
    share: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock @metascrub/core for unit tests that don't need real parsing
vi.mock('@metascrub/core', () => ({
  parse: vi.fn().mockResolvedValue({
    format: 'jpeg',
    filename: 'test.jpg',
    sizeBytes: 1024,
    groups: {
      EXIF: [
        { key: 'Make', label: 'Camera Make', value: 'Apple', sensitive: false },
        { key: 'GPSLatitude', label: 'GPS Latitude', value: '37.7749', sensitive: true },
      ],
      GPS: [
        { key: 'GPSLatitude', label: 'Latitude', value: '37.7749', sensitive: true },
        { key: 'GPSLongitude', label: 'Longitude', value: '-122.4194', sensitive: true },
      ],
    },
    highlights: {
      gps: { lat: 37.7749, lon: -122.4194 },
      capturedAt: '2024-01-15T10:30:00Z',
      device: { make: 'Apple', model: 'iPhone 15' },
    },
    warnings: ['GPS coordinates found', 'Device serial number present'],
  }),
  scrub: vi.fn().mockResolvedValue(new Uint8Array([255, 216, 255])),
  detectFormat: vi.fn().mockReturnValue('jpeg'),
  supportedFormats: vi.fn().mockReturnValue(['jpeg', 'png', 'pdf']),
}));

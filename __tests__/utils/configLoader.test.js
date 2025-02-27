const fs = require('fs');

// Mock fs module
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn()
}));

// Mock console methods properly
const originalConsole = global.console;
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
};

// Import the module to test
const configLoader = require('../../utils/configLoader');

describe('Config Loader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mocks
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue('{"basePath": "/test/path", "logoPath": "/test/logo.png"}');
  });

  test('loadConfig should load configuration from file', () => {
    const config = configLoader.loadConfig();
    expect(config).toHaveProperty('basePath', '/test/path');
    expect(config).toHaveProperty('logoPath', '/test/logo.png');
    expect(fs.readFileSync).toHaveBeenCalled();
  });
  
  test('loadConfig should handle missing config file', () => {
    fs.existsSync.mockReturnValue(false);
    const config = configLoader.loadConfig();
    expect(config).toHaveProperty('basePath');
    expect(fs.writeFileSync).toHaveBeenCalled();
  });
  
  test('loadConfig should handle invalid JSON in config file', () => {
    fs.readFileSync.mockReturnValue('Invalid JSON');
    
    // Should not throw but create a default config instead
    const config = configLoader.loadConfig();
    
    expect(config).toHaveProperty('basePath');
    expect(fs.writeFileSync).toHaveBeenCalled();
    expect(global.console.error).toHaveBeenCalled();
  });
  
  test('saveConfig should write configuration to file', () => {
    const config = { basePath: '/new/path', logoPath: '/new/logo.png' };
    const result = configLoader.saveConfig(config);
    
    expect(result).toBe(true);
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.any(String),
      JSON.stringify(config, null, 2)
    );
  });
  
  test('saveConfig should handle errors', () => {
    // Make writeFileSync throw an error
    fs.writeFileSync.mockImplementationOnce(() => {
      throw new Error('Write error');
    });
    
    const config = { basePath: '/test/path' };
    const result = configLoader.saveConfig(config);
    
    expect(result).toBe(false);
    expect(global.console.error).toHaveBeenCalled();
  });
  
  test('defaultConfig should have expected properties', () => {
    expect(configLoader.defaultConfig).toHaveProperty('basePath');
    expect(configLoader.defaultConfig).toHaveProperty('logoPath');
  });
});

// Restore original console after all tests
afterAll(() => {
  global.console = originalConsole;
});

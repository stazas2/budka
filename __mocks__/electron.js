// Mock for Electron API
const electron = {
  app: {
    getPath: jest.fn().mockImplementation((name) => {
      if (name === 'userData') return '/mock/userData';
      if (name === 'temp') return '/mock/temp';
      return `/mock/${name}`;
    }),
    on: jest.fn(),
    quit: jest.fn(),
    whenReady: jest.fn().mockResolvedValue({}),
  },
  BrowserWindow: jest.fn().mockImplementation(() => ({
    loadFile: jest.fn(),
    webContents: {
      on: jest.fn(),
      send: jest.fn(),
    },
    on: jest.fn(),
    show: jest.fn(),
    maximize: jest.fn(),
    close: jest.fn(),
    isFullScreen: jest.fn().mockReturnValue(false),
    setFullScreen: jest.fn(),
    setMenuBarVisibility: jest.fn(), // Add missing method
  })),
  ipcMain: {
    on: jest.fn(),
    handle: jest.fn(),
  },
  dialog: {
    showOpenDialog: jest.fn().mockResolvedValue({ canceled: false, filePaths: ['/mock/path'] }),
    showMessageBox: jest.fn().mockResolvedValue({ response: 0 }),
  },
};

module.exports = electron;

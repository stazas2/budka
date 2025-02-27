const createWindow = jest.fn().mockImplementation(() => {
  const mainWindow = {
    loadFile: jest.fn(),
    webContents: {
      on: jest.fn(),
      send: jest.fn(),
    },
    on: jest.fn(),
    show: jest.fn(),
    maximize: jest.fn(),
    setMenuBarVisibility: jest.fn(),
    isFullScreen: jest.fn().mockReturnValue(false),
    setFullScreen: jest.fn(),
  };
  return mainWindow;
});

module.exports = {
  createWindow,
};

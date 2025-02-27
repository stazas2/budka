module.exports = {
  print: jest.fn().mockResolvedValue(),
  getPrinters: jest.fn().mockResolvedValue([
    {
      name: 'Mock Printer 1',
      displayName: 'Mock Printer 1',
      description: 'Mock Printer for Testing',
      status: 'Ready',
      isDefault: true
    },
    {
      name: 'Mock Printer 2',
      displayName: 'Mock Printer 2',
      description: 'Secondary Mock Printer',
      status: 'Ready',
      isDefault: false
    }
  ]),
  getDefaultPrinter: jest.fn().mockResolvedValue({
    name: 'Default Mock Printer',
    displayName: 'Default Mock Printer',
    description: 'Default Mock Printer for Testing',
    status: 'Ready',
    isDefault: true
  })
};

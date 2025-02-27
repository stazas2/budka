module.exports = {
  getDefaultPrinter: jest.fn().mockResolvedValue({
    name: 'Mock Printer',
    displayName: 'Mock Printer Display Name',
    description: 'Mock Printer for Testing',
    status: 'Ready',
    isDefault: true
  }),
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
  ])
};

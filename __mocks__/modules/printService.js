module.exports = {
  printPhoto: jest.fn().mockResolvedValue(true),
  generatePrintablePDF: jest.fn().mockResolvedValue('/mock/path/to/pdf'),
  getDefaultPrinter: jest.fn().mockResolvedValue({
    name: 'Mock Printer',
    displayName: 'Mock Printer Display Name',
    description: 'Mock Printer for Testing',
    status: 'Ready',
    isDefault: true
  })
};

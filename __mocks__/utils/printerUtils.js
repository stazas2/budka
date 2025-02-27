module.exports = {
  getDefaultPrinter: jest.fn().mockResolvedValue({
    name: 'Utility Mock Printer',
    displayName: 'Utility Mock Printer',
    description: 'Utility Mock Printer for Testing',
    status: 'Ready',
    isDefault: true
  })
};

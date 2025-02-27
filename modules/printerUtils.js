// Simple printer utilities module
const printerUtils = {
  getDefaultPrinter: async function() {
    // In real code, this would return the default printer
    // This will be mocked in tests
    return { name: "Default Printer" };
  },
  
  getPrinters: async function() {
    // In real code, this would return all printers
    // This will be mocked in tests
    return [{ name: "Default Printer" }];
  }
};

module.exports = printerUtils;

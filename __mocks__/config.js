module.exports = {
  loadConfig: jest.fn().mockReturnValue({
    basePath: '/mock/base/path',
    stylesDir: '{{basePath}}/styles',
    templatesDir: '{{basePath}}/templates',
    outputDir: '{{basePath}}/output',
    printDir: '{{basePath}}/print',
    logoPath: '/mock/base/path/logo.png', // Add logoPath to prevent errors
    // Add other config properties as needed
  })
};

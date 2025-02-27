module.exports = {
  capturePhoto: jest.fn().mockResolvedValue('/mock/path/to/photo.jpg'),
  initialize: jest.fn().mockResolvedValue(true),
  shutdown: jest.fn().mockResolvedValue(true),
};

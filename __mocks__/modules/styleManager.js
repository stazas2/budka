module.exports = {
  getStyles: jest.fn().mockResolvedValue([
    { id: 'style1', name: 'Style 1', gender: 'any' },
    { id: 'style2', name: 'Style 2', gender: 'male' },
    { id: 'style3', name: 'Style 3', gender: 'female' }
  ]),
  getStyleById: jest.fn().mockImplementation((id) => {
    const styles = {
      'style1': { id: 'style1', name: 'Style 1', gender: 'any' },
      'style2': { id: 'style2', name: 'Style 2', gender: 'male' },
      'style3': { id: 'style3', name: 'Style 3', gender: 'female' }
    };
    return Promise.resolve(styles[id] || null);
  })
};

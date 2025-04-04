class ThemeService {
    constructor() {
        this.currentTheme = 'light';
    }

    setTheme(theme) {
        this.currentTheme = theme;
        document.body.setAttribute('data-theme', theme);
    }

    toggleTheme() {
        this.setTheme(this.currentTheme === 'light' ? 'dark' : 'light');
    }
}

module.exports = new ThemeService();
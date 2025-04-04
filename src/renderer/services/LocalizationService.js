class LocalizationService {
    constructor() {
        this.translations = {};
        this.currentLanguage = 'ru';
    }

    loadTranslations(translationsJson) {
        this.translations = translationsJson;
    }

    setLanguage(lang) {
        this.currentLanguage = lang;
    }

    translate(key) {
        if (!this.translations[this.currentLanguage]) return key;
        return this.translations[this.currentLanguage][key] || key;
    }
}

module.exports = new LocalizationService();
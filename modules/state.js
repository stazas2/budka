// modules/state.js
const state = {
    selectedGender: '',           // текущий выбранный пол (строка)
    selectedGenders: [],          // массив выбранных полов (для мультивыбора)
    selectedStyle: '',           // выбранный стиль
    nameDisplay: '',            // имя для отображения
    styleImageIndices: {},      // индексы изображений для стилей
    reset() {
        this.selectedGender = '';
        this.selectedGenders = [];
        this.selectedStyle = '';
        this.nameDisplay = '';
        this.styleImageIndices = {};
    }
};

module.exports = state;

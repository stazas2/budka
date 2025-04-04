class GradientEditor {
    constructor(container) {
        this.container = container;
        this.colors = ['#ff0000', '#00ff00', '#0000ff'];
        this.direction = '90deg';
        this.render();
    }

    render() {
        this.container.innerHTML = '';
        const preview = document.createElement('div');
        preview.className = 'gradient-preview';
        preview.style.background = this.getGradient();
        this.container.appendChild(preview);
    }

    getGradient() {
        return `linear-gradient(${this.direction}, ${this.colors.join(', ')})`;
    }

    setColors(colors) {
        this.colors = colors;
        this.render();
    }

    setDirection(direction) {
        this.direction = direction;
        this.render();
    }
}

module.exports = GradientEditor;
export class LayerManager {
    constructor(engine, panelId) {
        this.engine = engine;
        this.panel = document.getElementById(panelId);
        this.selectedLayer = null;
    }

    update() {
        this.panel.innerHTML = '';

        if (this.engine.shapes.length === 0) {
            const emptyMsg = document.createElement('div');
            emptyMsg.style.padding = '20px';
            emptyMsg.style.textAlign = 'center';
            emptyMsg.style.color = 'var(--text-secondary)';
            emptyMsg.style.fontSize = '13px';
            emptyMsg.textContent = 'No layers yet';
            this.panel.appendChild(emptyMsg);
            return;
        }

        // Reverse order to show last drawn on top
        const shapes = [...this.engine.shapes].reverse();

        shapes.forEach((shape, index) => {
            const layerItem = this.createLayerItem(shape, this.engine.shapes.length - 1 - index);
            this.panel.appendChild(layerItem);
        });
    }

    createLayerItem(shape, index) {
        const item = document.createElement('div');
        item.className = 'layer-item';
        item.dataset.shapeId = shape.id;

        if (this.engine.selectedShape === shape) {
            item.classList.add('selected');
        }

        const info = document.createElement('div');
        info.style.flex = '1';

        const name = document.createElement('div');
        name.className = 'layer-name';
        name.textContent = this.getShapeName(shape, index);

        const type = document.createElement('div');
        type.className = 'layer-type';
        type.textContent = shape.type;

        info.appendChild(name);
        info.appendChild(type);

        const visibilityBtn = document.createElement('button');
        visibilityBtn.className = 'layer-visibility';
        visibilityBtn.innerHTML = shape.visible
            ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
            </svg>`
            : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
            </svg>`;

        visibilityBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleVisibility(shape);
        });

        item.appendChild(info);
        item.appendChild(visibilityBtn);

        item.addEventListener('click', () => {
            this.selectLayer(shape);
        });

        return item;
    }

    getShapeName(shape, index) {
        switch (shape.type) {
            case 'rectangle':
                return `Rectangle ${index + 1}`;
            case 'circle':
                return `Circle ${index + 1}`;
            case 'line':
                return `Line ${index + 1}`;
            case 'text':
                return shape.text || `Text ${index + 1}`;
            default:
                return `Shape ${index + 1}`;
        }
    }

    selectLayer(shape) {
        this.engine.selectShape(shape);
        this.update();
        this.onSelectionChange(shape);
    }

    toggleVisibility(shape) {
        shape.visible = !shape.visible;
        this.engine.render();
        this.update();
    }

    deleteSelected() {
        if (this.engine.selectedShape) {
            const shape = this.engine.selectedShape;
            this.engine.removeShape(shape);
            this.update();
            this.onSelectionChange(null);
            return shape;
        }
        return null;
    }

    moveLayer(shape, direction) {
        const index = this.engine.shapes.indexOf(shape);
        if (index === -1) return;

        if (direction === 'up' && index < this.engine.shapes.length - 1) {
            [this.engine.shapes[index], this.engine.shapes[index + 1]] =
                [this.engine.shapes[index + 1], this.engine.shapes[index]];
        } else if (direction === 'down' && index > 0) {
            [this.engine.shapes[index], this.engine.shapes[index - 1]] =
                [this.engine.shapes[index - 1], this.engine.shapes[index]];
        }

        this.engine.render();
        this.update();
    }

    onSelectionChange(shape) {
        // Override this to update properties panel
    }
}

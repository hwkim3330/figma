export class CanvasEngine {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.shapes = [];
        this.selectedShape = null;
        this.zoom = 1;
        this.pan = { x: 0, y: 0 };
        this.isDragging = false;
        this.dragStart = null;

        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        const container = this.canvas.parentElement;
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
        this.render();
    }

    addShape(shape) {
        this.shapes.push(shape);
        this.render();
        return shape;
    }

    removeShape(shape) {
        const index = this.shapes.indexOf(shape);
        if (index > -1) {
            this.shapes.splice(index, 1);
            if (this.selectedShape === shape) {
                this.selectedShape = null;
            }
            this.render();
            return true;
        }
        return false;
    }

    selectShape(shape) {
        this.selectedShape = shape;
        this.render();
    }

    deselectAll() {
        this.selectedShape = null;
        this.render();
    }

    getShapeAt(x, y) {
        // Transform screen coordinates to canvas coordinates
        const canvasX = (x - this.canvas.width / 2 - this.pan.x) / this.zoom;
        const canvasY = (y - this.canvas.height / 2 - this.pan.y) / this.zoom;

        // Iterate from top to bottom (last drawn = on top)
        for (let i = this.shapes.length - 1; i >= 0; i--) {
            if (this.shapes[i].containsPoint(canvasX, canvasY)) {
                return this.shapes[i];
            }
        }
        return null;
    }

    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    render() {
        this.clear();
        this.ctx.save();

        // Apply transformations
        this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
        this.ctx.scale(this.zoom, this.zoom);
        this.ctx.translate(this.pan.x, this.pan.y);

        // Draw all shapes
        this.shapes.forEach(shape => {
            shape.draw(this.ctx);
        });

        // Draw selection
        if (this.selectedShape) {
            this.drawSelection(this.selectedShape);
        }

        this.ctx.restore();
    }

    drawSelection(shape) {
        this.ctx.save();
        this.ctx.strokeStyle = '#3b82f6';
        this.ctx.lineWidth = 2 / this.zoom;
        this.ctx.setLineDash([5 / this.zoom, 5 / this.zoom]);

        const bounds = shape.getBounds();
        this.ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);

        // Draw handles
        const handles = [
            { x: bounds.x, y: bounds.y }, // top-left
            { x: bounds.x + bounds.width / 2, y: bounds.y }, // top-center
            { x: bounds.x + bounds.width, y: bounds.y }, // top-right
            { x: bounds.x + bounds.width, y: bounds.y + bounds.height / 2 }, // right-center
            { x: bounds.x + bounds.width, y: bounds.y + bounds.height }, // bottom-right
            { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height }, // bottom-center
            { x: bounds.x, y: bounds.y + bounds.height }, // bottom-left
            { x: bounds.x, y: bounds.y + bounds.height / 2 }, // left-center
        ];

        this.ctx.fillStyle = 'white';
        this.ctx.strokeStyle = '#3b82f6';
        this.ctx.lineWidth = 1 / this.zoom;
        this.ctx.setLineDash([]);

        handles.forEach(handle => {
            this.ctx.beginPath();
            this.ctx.arc(handle.x, handle.y, 4 / this.zoom, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.stroke();
        });

        this.ctx.restore();
    }

    setZoom(zoom) {
        this.zoom = Math.max(0.1, Math.min(5, zoom));
        this.render();
    }

    zoomIn() {
        this.setZoom(this.zoom * 1.2);
    }

    zoomOut() {
        this.setZoom(this.zoom / 1.2);
    }

    zoomToFit() {
        if (this.shapes.length === 0) {
            this.setZoom(1);
            this.pan = { x: 0, y: 0 };
            this.render();
            return;
        }

        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;

        this.shapes.forEach(shape => {
            const bounds = shape.getBounds();
            minX = Math.min(minX, bounds.x);
            minY = Math.min(minY, bounds.y);
            maxX = Math.max(maxX, bounds.x + bounds.width);
            maxY = Math.max(maxY, bounds.y + bounds.height);
        });

        const width = maxX - minX;
        const height = maxY - minY;
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;

        const zoomX = (this.canvas.width * 0.8) / width;
        const zoomY = (this.canvas.height * 0.8) / height;
        this.zoom = Math.min(zoomX, zoomY, 2);

        this.pan.x = -centerX;
        this.pan.y = -centerY;

        this.render();
    }

    setPan(x, y) {
        this.pan.x = x;
        this.pan.y = y;
        this.render();
    }

    screenToCanvas(screenX, screenY) {
        return {
            x: (screenX - this.canvas.width / 2 - this.pan.x * this.zoom) / this.zoom,
            y: (screenY - this.canvas.height / 2 - this.pan.y * this.zoom) / this.zoom
        };
    }

    canvasToScreen(canvasX, canvasY) {
        return {
            x: canvasX * this.zoom + this.canvas.width / 2 + this.pan.x * this.zoom,
            y: canvasY * this.zoom + this.canvas.height / 2 + this.pan.y * this.zoom
        };
    }

    exportToPNG() {
        return this.canvas.toDataURL('image/png');
    }

    exportToSVG() {
        let svg = `<svg width="${this.canvas.width}" height="${this.canvas.height}" xmlns="http://www.w3.org/2000/svg">`;

        this.shapes.forEach(shape => {
            svg += shape.toSVG();
        });

        svg += '</svg>';
        return svg;
    }

    exportToJSON() {
        return JSON.stringify({
            version: '1.0',
            zoom: this.zoom,
            pan: this.pan,
            shapes: this.shapes.map(shape => shape.toJSON())
        }, null, 2);
    }

    importFromJSON(jsonStr) {
        try {
            const data = JSON.parse(jsonStr);
            this.shapes = [];

            data.shapes.forEach(shapeData => {
                const shape = Shape.fromJSON(shapeData);
                if (shape) {
                    this.shapes.push(shape);
                }
            });

            if (data.zoom) this.zoom = data.zoom;
            if (data.pan) this.pan = data.pan;

            this.render();
            return true;
        } catch (e) {
            console.error('Failed to import JSON:', e);
            return false;
        }
    }
}

export class Shape {
    constructor(type, x, y, properties = {}) {
        this.id = Math.random().toString(36).substr(2, 9);
        this.type = type;
        this.x = x;
        this.y = y;
        this.rotation = properties.rotation || 0;
        this.fillColor = properties.fillColor || '#3b82f6';
        this.strokeColor = properties.strokeColor || '#000000';
        this.strokeWidth = properties.strokeWidth || 2;
        this.opacity = properties.opacity !== undefined ? properties.opacity : 1;
        this.cornerRadius = properties.cornerRadius || 0;
        this.visible = properties.visible !== undefined ? properties.visible : true;
    }

    draw(ctx) {
        if (!this.visible) return;

        ctx.save();
        ctx.globalAlpha = this.opacity;
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation * Math.PI / 180);

        this.drawShape(ctx);

        ctx.restore();
    }

    drawShape(ctx) {
        // Override in subclasses
    }

    containsPoint(x, y) {
        // Override in subclasses
        return false;
    }

    getBounds() {
        // Override in subclasses
        return { x: this.x, y: this.y, width: 0, height: 0 };
    }

    toJSON() {
        return {
            id: this.id,
            type: this.type,
            x: this.x,
            y: this.y,
            rotation: this.rotation,
            fillColor: this.fillColor,
            strokeColor: this.strokeColor,
            strokeWidth: this.strokeWidth,
            opacity: this.opacity,
            cornerRadius: this.cornerRadius,
            visible: this.visible
        };
    }

    toSVG() {
        // Override in subclasses
        return '';
    }

    static fromJSON(data) {
        switch (data.type) {
            case 'rectangle':
                return Rectangle.fromJSON(data);
            case 'circle':
                return Circle.fromJSON(data);
            case 'line':
                return Line.fromJSON(data);
            case 'text':
                return Text.fromJSON(data);
            default:
                return null;
        }
    }
}

export class Rectangle extends Shape {
    constructor(x, y, width, height, properties = {}) {
        super('rectangle', x, y, properties);
        this.width = width;
        this.height = height;
    }

    drawShape(ctx) {
        ctx.fillStyle = this.fillColor;
        ctx.strokeStyle = this.strokeColor;
        ctx.lineWidth = this.strokeWidth;

        const x = -this.width / 2;
        const y = -this.height / 2;
        const r = Math.min(this.cornerRadius, this.width / 2, this.height / 2);

        if (r > 0) {
            // Draw rounded rectangle
            ctx.beginPath();
            ctx.moveTo(x + r, y);
            ctx.lineTo(x + this.width - r, y);
            ctx.arcTo(x + this.width, y, x + this.width, y + r, r);
            ctx.lineTo(x + this.width, y + this.height - r);
            ctx.arcTo(x + this.width, y + this.height, x + this.width - r, y + this.height, r);
            ctx.lineTo(x + r, y + this.height);
            ctx.arcTo(x, y + this.height, x, y + this.height - r, r);
            ctx.lineTo(x, y + r);
            ctx.arcTo(x, y, x + r, y, r);
            ctx.closePath();
            ctx.fill();
            if (this.strokeWidth > 0) {
                ctx.stroke();
            }
        } else {
            // Draw regular rectangle
            ctx.fillRect(x, y, this.width, this.height);
            if (this.strokeWidth > 0) {
                ctx.strokeRect(x, y, this.width, this.height);
            }
        }
    }

    containsPoint(px, py) {
        const dx = px - this.x;
        const dy = py - this.y;

        // Rotate point back
        const cos = Math.cos(-this.rotation * Math.PI / 180);
        const sin = Math.sin(-this.rotation * Math.PI / 180);
        const rx = dx * cos - dy * sin;
        const ry = dx * sin + dy * cos;

        return Math.abs(rx) <= this.width / 2 && Math.abs(ry) <= this.height / 2;
    }

    getBounds() {
        return {
            x: this.x - this.width / 2,
            y: this.y - this.height / 2,
            width: this.width,
            height: this.height
        };
    }

    toJSON() {
        return {
            ...super.toJSON(),
            width: this.width,
            height: this.height
        };
    }

    toSVG() {
        return `<rect x="${this.x - this.width/2}" y="${this.y - this.height/2}" width="${this.width}" height="${this.height}" fill="${this.fillColor}" stroke="${this.strokeColor}" stroke-width="${this.strokeWidth}" transform="rotate(${this.rotation} ${this.x} ${this.y})"/>`;
    }

    static fromJSON(data) {
        return new Rectangle(data.x, data.y, data.width, data.height, data);
    }
}

export class Circle extends Shape {
    constructor(x, y, radius, properties = {}) {
        super('circle', x, y, properties);
        this.radius = radius;
    }

    drawShape(ctx) {
        ctx.fillStyle = this.fillColor;
        ctx.strokeStyle = this.strokeColor;
        ctx.lineWidth = this.strokeWidth;

        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();
        if (this.strokeWidth > 0) {
            ctx.stroke();
        }
    }

    containsPoint(px, py) {
        const dx = px - this.x;
        const dy = py - this.y;
        return dx * dx + dy * dy <= this.radius * this.radius;
    }

    getBounds() {
        return {
            x: this.x - this.radius,
            y: this.y - this.radius,
            width: this.radius * 2,
            height: this.radius * 2
        };
    }

    toJSON() {
        return {
            ...super.toJSON(),
            radius: this.radius
        };
    }

    toSVG() {
        return `<circle cx="${this.x}" cy="${this.y}" r="${this.radius}" fill="${this.fillColor}" stroke="${this.strokeColor}" stroke-width="${this.strokeWidth}"/>`;
    }

    static fromJSON(data) {
        return new Circle(data.x, data.y, data.radius, data);
    }
}

export class Line extends Shape {
    constructor(x1, y1, x2, y2, properties = {}) {
        super('line', (x1 + x2) / 2, (y1 + y2) / 2, properties);
        this.x1 = x1;
        this.y1 = y1;
        this.x2 = x2;
        this.y2 = y2;
    }

    drawShape(ctx) {
        ctx.strokeStyle = this.strokeColor;
        ctx.lineWidth = this.strokeWidth;

        const dx1 = this.x1 - this.x;
        const dy1 = this.y1 - this.y;
        const dx2 = this.x2 - this.x;
        const dy2 = this.y2 - this.y;

        ctx.beginPath();
        ctx.moveTo(dx1, dy1);
        ctx.lineTo(dx2, dy2);
        ctx.stroke();
    }

    containsPoint(px, py) {
        const threshold = Math.max(this.strokeWidth, 5);
        const dx = this.x2 - this.x1;
        const dy = this.y2 - this.y1;
        const length = Math.sqrt(dx * dx + dy * dy);

        if (length === 0) return false;

        const t = Math.max(0, Math.min(1, ((px - this.x1) * dx + (py - this.y1) * dy) / (length * length)));
        const closestX = this.x1 + t * dx;
        const closestY = this.y1 + t * dy;
        const distance = Math.sqrt((px - closestX) ** 2 + (py - closestY) ** 2);

        return distance <= threshold;
    }

    getBounds() {
        const minX = Math.min(this.x1, this.x2);
        const minY = Math.min(this.y1, this.y2);
        const maxX = Math.max(this.x1, this.x2);
        const maxY = Math.max(this.y1, this.y2);

        return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
        };
    }

    toJSON() {
        return {
            ...super.toJSON(),
            x1: this.x1,
            y1: this.y1,
            x2: this.x2,
            y2: this.y2
        };
    }

    toSVG() {
        return `<line x1="${this.x1}" y1="${this.y1}" x2="${this.x2}" y2="${this.y2}" stroke="${this.strokeColor}" stroke-width="${this.strokeWidth}"/>`;
    }

    static fromJSON(data) {
        return new Line(data.x1, data.y1, data.x2, data.y2, data);
    }
}

export class Text extends Shape {
    constructor(x, y, text, properties = {}) {
        super('text', x, y, properties);
        this.text = text || 'Text';
        this.fontSize = properties.fontSize || 32;
        this.fontFamily = properties.fontFamily || 'Arial';
    }

    drawShape(ctx) {
        ctx.fillStyle = this.fillColor;
        ctx.font = `${this.fontSize}px ${this.fontFamily}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.text, 0, 0);

        if (this.strokeWidth > 0) {
            ctx.strokeStyle = this.strokeColor;
            ctx.lineWidth = this.strokeWidth;
            ctx.strokeText(this.text, 0, 0);
        }
    }

    containsPoint(px, py) {
        const ctx = document.createElement('canvas').getContext('2d');
        ctx.font = `${this.fontSize}px ${this.fontFamily}`;
        const metrics = ctx.measureText(this.text);
        const width = metrics.width;
        const height = this.fontSize;

        return Math.abs(px - this.x) <= width / 2 && Math.abs(py - this.y) <= height / 2;
    }

    getBounds() {
        const ctx = document.createElement('canvas').getContext('2d');
        ctx.font = `${this.fontSize}px ${this.fontFamily}`;
        const metrics = ctx.measureText(this.text);
        const width = metrics.width;
        const height = this.fontSize;

        return {
            x: this.x - width / 2,
            y: this.y - height / 2,
            width: width,
            height: height
        };
    }

    toJSON() {
        return {
            ...super.toJSON(),
            text: this.text,
            fontSize: this.fontSize,
            fontFamily: this.fontFamily
        };
    }

    toSVG() {
        return `<text x="${this.x}" y="${this.y}" font-size="${this.fontSize}" font-family="${this.fontFamily}" fill="${this.fillColor}" text-anchor="middle" dominant-baseline="middle">${this.text}</text>`;
    }

    static fromJSON(data) {
        return new Text(data.x, data.y, data.text, data);
    }
}

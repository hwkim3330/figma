/**
 * Diagram Shapes - Professional diagram shapes (diagrams.net style)
 */

// Diamond (Decision shape)
export class Diamond {
    constructor(x, y, size, options = {}) {
        this.type = 'diamond';
        this.id = Math.random().toString(36).substr(2, 9);
        this.x = x;
        this.y = y;
        this.size = size;
        this.fillColor = options.fillColor || '#e3f2fd';
        this.strokeColor = options.strokeColor || '#1976d2';
        this.strokeWidth = options.strokeWidth || 2;
        this.rotation = options.rotation || 0;
        this.opacity = options.opacity !== undefined ? options.opacity : 1;
        this.text = options.text || '';
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.opacity;
        ctx.translate(this.x, this.y);
        ctx.rotate((this.rotation * Math.PI) / 180);

        ctx.beginPath();
        ctx.moveTo(0, -this.size / 2);
        ctx.lineTo(this.size / 2, 0);
        ctx.lineTo(0, this.size / 2);
        ctx.lineTo(-this.size / 2, 0);
        ctx.closePath();

        ctx.fillStyle = this.fillColor;
        ctx.fill();
        ctx.strokeStyle = this.strokeColor;
        ctx.lineWidth = this.strokeWidth;
        ctx.stroke();

        // Draw text
        if (this.text) {
            ctx.fillStyle = '#000000';
            ctx.font = '14px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.text, 0, 0);
        }

        ctx.restore();
    }

    getBounds() {
        return {
            x: this.x - this.size / 2,
            y: this.y - this.size / 2,
            width: this.size,
            height: this.size
        };
    }

    contains(x, y) {
        const dx = Math.abs(x - this.x);
        const dy = Math.abs(y - this.y);
        return dx + dy <= this.size / 2;
    }

    toJSON() {
        return {
            type: this.type,
            id: this.id,
            x: this.x,
            y: this.y,
            size: this.size,
            fillColor: this.fillColor,
            strokeColor: this.strokeColor,
            strokeWidth: this.strokeWidth,
            rotation: this.rotation,
            opacity: this.opacity,
            text: this.text
        };
    }

    static fromJSON(data) {
        const shape = new Diamond(data.x, data.y, data.size, {
            fillColor: data.fillColor,
            strokeColor: data.strokeColor,
            strokeWidth: data.strokeWidth,
            rotation: data.rotation,
            opacity: data.opacity,
            text: data.text
        });
        shape.id = data.id;
        return shape;
    }
}

// Parallelogram (Data/Input shape)
export class Parallelogram {
    constructor(x, y, width, height, options = {}) {
        this.type = 'parallelogram';
        this.id = Math.random().toString(36).substr(2, 9);
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.skew = options.skew || 20;  // Skew offset
        this.fillColor = options.fillColor || '#fff3e0';
        this.strokeColor = options.strokeColor || '#f57c00';
        this.strokeWidth = options.strokeWidth || 2;
        this.rotation = options.rotation || 0;
        this.opacity = options.opacity !== undefined ? options.opacity : 1;
        this.text = options.text || '';
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.opacity;
        ctx.translate(this.x, this.y);
        ctx.rotate((this.rotation * Math.PI) / 180);

        const halfWidth = this.width / 2;
        const halfHeight = this.height / 2;

        ctx.beginPath();
        ctx.moveTo(-halfWidth + this.skew, -halfHeight);
        ctx.lineTo(halfWidth + this.skew, -halfHeight);
        ctx.lineTo(halfWidth - this.skew, halfHeight);
        ctx.lineTo(-halfWidth - this.skew, halfHeight);
        ctx.closePath();

        ctx.fillStyle = this.fillColor;
        ctx.fill();
        ctx.strokeStyle = this.strokeColor;
        ctx.lineWidth = this.strokeWidth;
        ctx.stroke();

        // Draw text
        if (this.text) {
            ctx.fillStyle = '#000000';
            ctx.font = '14px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.text, 0, 0);
        }

        ctx.restore();
    }

    getBounds() {
        return {
            x: this.x - this.width / 2 - this.skew,
            y: this.y - this.height / 2,
            width: this.width + this.skew * 2,
            height: this.height
        };
    }

    contains(x, y) {
        const bounds = this.getBounds();
        return x >= bounds.x && x <= bounds.x + bounds.width &&
               y >= bounds.y && y <= bounds.y + bounds.height;
    }

    toJSON() {
        return {
            type: this.type,
            id: this.id,
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height,
            skew: this.skew,
            fillColor: this.fillColor,
            strokeColor: this.strokeColor,
            strokeWidth: this.strokeWidth,
            rotation: this.rotation,
            opacity: this.opacity,
            text: this.text
        };
    }

    static fromJSON(data) {
        const shape = new Parallelogram(data.x, data.y, data.width, data.height, {
            skew: data.skew,
            fillColor: data.fillColor,
            strokeColor: data.strokeColor,
            strokeWidth: data.strokeWidth,
            rotation: data.rotation,
            opacity: data.opacity,
            text: data.text
        });
        shape.id = data.id;
        return shape;
    }
}

// Cylinder (Database shape)
export class Cylinder {
    constructor(x, y, width, height, options = {}) {
        this.type = 'cylinder';
        this.id = Math.random().toString(36).substr(2, 9);
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.fillColor = options.fillColor || '#f3e5f5';
        this.strokeColor = options.strokeColor || '#7b1fa2';
        this.strokeWidth = options.strokeWidth || 2;
        this.rotation = options.rotation || 0;
        this.opacity = options.opacity !== undefined ? options.opacity : 1;
        this.text = options.text || '';
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.opacity;
        ctx.translate(this.x, this.y);
        ctx.rotate((this.rotation * Math.PI) / 180);

        const halfWidth = this.width / 2;
        const halfHeight = this.height / 2;
        const ellipseHeight = this.width / 4;

        // Draw sides
        ctx.beginPath();
        ctx.moveTo(-halfWidth, -halfHeight + ellipseHeight);
        ctx.lineTo(-halfWidth, halfHeight - ellipseHeight);
        ctx.ellipse(0, halfHeight - ellipseHeight, halfWidth, ellipseHeight, 0, Math.PI, 0, false);
        ctx.lineTo(halfWidth, -halfHeight + ellipseHeight);
        ctx.closePath();

        ctx.fillStyle = this.fillColor;
        ctx.fill();
        ctx.strokeStyle = this.strokeColor;
        ctx.lineWidth = this.strokeWidth;
        ctx.stroke();

        // Draw top ellipse
        ctx.beginPath();
        ctx.ellipse(0, -halfHeight + ellipseHeight, halfWidth, ellipseHeight, 0, 0, 2 * Math.PI);
        ctx.fillStyle = this.fillColor;
        ctx.fill();
        ctx.stroke();

        // Draw text
        if (this.text) {
            ctx.fillStyle = '#000000';
            ctx.font = '14px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.text, 0, 0);
        }

        ctx.restore();
    }

    getBounds() {
        return {
            x: this.x - this.width / 2,
            y: this.y - this.height / 2,
            width: this.width,
            height: this.height
        };
    }

    contains(x, y) {
        const bounds = this.getBounds();
        return x >= bounds.x && x <= bounds.x + bounds.width &&
               y >= bounds.y && y <= bounds.y + bounds.height;
    }

    toJSON() {
        return {
            type: this.type,
            id: this.id,
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height,
            fillColor: this.fillColor,
            strokeColor: this.strokeColor,
            strokeWidth: this.strokeWidth,
            rotation: this.rotation,
            opacity: this.opacity,
            text: this.text
        };
    }

    static fromJSON(data) {
        const shape = new Cylinder(data.x, data.y, data.width, data.height, {
            fillColor: data.fillColor,
            strokeColor: data.strokeColor,
            strokeWidth: data.strokeWidth,
            rotation: data.rotation,
            opacity: data.opacity,
            text: data.text
        });
        shape.id = data.id;
        return shape;
    }
}

// Cloud (Cloud/Service shape)
export class Cloud {
    constructor(x, y, width, height, options = {}) {
        this.type = 'cloud';
        this.id = Math.random().toString(36).substr(2, 9);
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.fillColor = options.fillColor || '#e8f5e9';
        this.strokeColor = options.strokeColor || '#388e3c';
        this.strokeWidth = options.strokeWidth || 2;
        this.rotation = options.rotation || 0;
        this.opacity = options.opacity !== undefined ? options.opacity : 1;
        this.text = options.text || '';
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.opacity;
        ctx.translate(this.x, this.y);
        ctx.rotate((this.rotation * Math.PI) / 180);

        const halfWidth = this.width / 2;
        const halfHeight = this.height / 2;

        ctx.beginPath();
        // Bottom arc
        ctx.arc(-halfWidth / 2, halfHeight / 3, halfWidth / 2, 0.5 * Math.PI, 1.5 * Math.PI, false);
        // Left arc
        ctx.arc(-halfWidth / 3, -halfHeight / 3, halfWidth / 3, 1 * Math.PI, 2 * Math.PI, false);
        // Top-left arc
        ctx.arc(0, -halfHeight / 2, halfWidth / 3, 1.2 * Math.PI, 1.8 * Math.PI, false);
        // Top-right arc
        ctx.arc(halfWidth / 3, -halfHeight / 4, halfWidth / 3, 1.5 * Math.PI, 0.5 * Math.PI, false);
        // Right arc
        ctx.arc(halfWidth / 2, halfHeight / 4, halfWidth / 2.5, 1.8 * Math.PI, 0.7 * Math.PI, false);
        ctx.closePath();

        ctx.fillStyle = this.fillColor;
        ctx.fill();
        ctx.strokeStyle = this.strokeColor;
        ctx.lineWidth = this.strokeWidth;
        ctx.stroke();

        // Draw text
        if (this.text) {
            ctx.fillStyle = '#000000';
            ctx.font = '14px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.text, 0, 0);
        }

        ctx.restore();
    }

    getBounds() {
        return {
            x: this.x - this.width / 2,
            y: this.y - this.height / 2,
            width: this.width,
            height: this.height
        };
    }

    contains(x, y) {
        const bounds = this.getBounds();
        return x >= bounds.x && x <= bounds.x + bounds.width &&
               y >= bounds.y && y <= bounds.y + bounds.height;
    }

    toJSON() {
        return {
            type: this.type,
            id: this.id,
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height,
            fillColor: this.fillColor,
            strokeColor: this.strokeColor,
            strokeWidth: this.strokeWidth,
            rotation: this.rotation,
            opacity: this.opacity,
            text: this.text
        };
    }

    static fromJSON(data) {
        const shape = new Cloud(data.x, data.y, data.width, data.height, {
            fillColor: data.fillColor,
            strokeColor: data.strokeColor,
            strokeWidth: data.strokeWidth,
            rotation: data.rotation,
            opacity: data.opacity,
            text: data.text
        });
        shape.id = data.id;
        return shape;
    }
}

// Hexagon (Process/Preparation shape)
export class Hexagon {
    constructor(x, y, size, options = {}) {
        this.type = 'hexagon';
        this.id = Math.random().toString(36).substr(2, 9);
        this.x = x;
        this.y = y;
        this.size = size;
        this.fillColor = options.fillColor || '#fce4ec';
        this.strokeColor = options.strokeColor || '#c2185b';
        this.strokeWidth = options.strokeWidth || 2;
        this.rotation = options.rotation || 0;
        this.opacity = options.opacity !== undefined ? options.opacity : 1;
        this.text = options.text || '';
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.opacity;
        ctx.translate(this.x, this.y);
        ctx.rotate((this.rotation * Math.PI) / 180);

        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i;
            const px = (this.size / 2) * Math.cos(angle);
            const py = (this.size / 2) * Math.sin(angle);
            if (i === 0) {
                ctx.moveTo(px, py);
            } else {
                ctx.lineTo(px, py);
            }
        }
        ctx.closePath();

        ctx.fillStyle = this.fillColor;
        ctx.fill();
        ctx.strokeStyle = this.strokeColor;
        ctx.lineWidth = this.strokeWidth;
        ctx.stroke();

        // Draw text
        if (this.text) {
            ctx.fillStyle = '#000000';
            ctx.font = '14px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.text, 0, 0);
        }

        ctx.restore();
    }

    getBounds() {
        return {
            x: this.x - this.size / 2,
            y: this.y - this.size / 2,
            width: this.size,
            height: this.size
        };
    }

    contains(x, y) {
        const dx = x - this.x;
        const dy = y - this.y;
        return Math.sqrt(dx * dx + dy * dy) <= this.size / 2;
    }

    toJSON() {
        return {
            type: this.type,
            id: this.id,
            x: this.x,
            y: this.y,
            size: this.size,
            fillColor: this.fillColor,
            strokeColor: this.strokeColor,
            strokeWidth: this.strokeWidth,
            rotation: this.rotation,
            opacity: this.opacity,
            text: this.text
        };
    }

    static fromJSON(data) {
        const shape = new Hexagon(data.x, data.y, data.size, {
            fillColor: data.fillColor,
            strokeColor: data.strokeColor,
            strokeWidth: data.strokeWidth,
            rotation: data.rotation,
            opacity: data.opacity,
            text: data.text
        });
        shape.id = data.id;
        return shape;
    }
}

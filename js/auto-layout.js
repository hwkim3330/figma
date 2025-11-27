// Auto Layout System - Figma-style auto layout for frames

export class AutoLayout {
    constructor(options = {}) {
        this.direction = options.direction || 'horizontal'; // 'horizontal', 'vertical'
        this.spacing = options.spacing || 10;
        this.padding = options.padding || { top: 10, right: 10, bottom: 10, left: 10 };
        this.alignment = options.alignment || 'start'; // 'start', 'center', 'end', 'space-between'
        this.crossAlignment = options.crossAlignment || 'start'; // 'start', 'center', 'end', 'stretch'
        this.wrap = options.wrap || false;
        this.reversed = options.reversed || false;
    }

    apply(frame, children) {
        if (children.length === 0) return;

        let items = this.reversed ? [...children].reverse() : children;

        if (this.direction === 'horizontal') {
            this.layoutHorizontal(frame, items);
        } else {
            this.layoutVertical(frame, items);
        }
    }

    layoutHorizontal(frame, items) {
        const padding = this.padding;
        const spacing = this.spacing;

        // Calculate total width needed
        let totalWidth = items.reduce((sum, item) => {
            const bounds = item.getBounds();
            return sum + bounds.width;
        }, 0) + spacing * (items.length - 1);

        const availableWidth = frame.width - padding.left - padding.right;
        const availableHeight = frame.height - padding.top - padding.bottom;

        // Calculate starting X
        let startX;
        let actualSpacing = spacing;

        switch (this.alignment) {
            case 'center':
                startX = frame.x - frame.width / 2 + padding.left + (availableWidth - totalWidth) / 2;
                break;
            case 'end':
                startX = frame.x + frame.width / 2 - padding.right - totalWidth;
                break;
            case 'space-between':
                startX = frame.x - frame.width / 2 + padding.left;
                if (items.length > 1) {
                    const totalItemWidth = items.reduce((sum, item) => sum + item.getBounds().width, 0);
                    actualSpacing = (availableWidth - totalItemWidth) / (items.length - 1);
                }
                break;
            default: // start
                startX = frame.x - frame.width / 2 + padding.left;
        }

        // Position items
        let currentX = startX;

        items.forEach(item => {
            const bounds = item.getBounds();

            // Set X position
            item.x = currentX + bounds.width / 2;

            // Set Y position based on cross alignment
            const frameTop = frame.y - frame.height / 2 + padding.top;
            const frameCenter = frame.y;
            const frameBottom = frame.y + frame.height / 2 - padding.bottom;

            switch (this.crossAlignment) {
                case 'center':
                    item.y = frameCenter;
                    break;
                case 'end':
                    item.y = frameBottom - bounds.height / 2;
                    break;
                case 'stretch':
                    item.y = frameCenter;
                    if (item.height !== undefined) {
                        item.height = availableHeight;
                    } else if (item.radius !== undefined) {
                        item.radius = availableHeight / 2;
                    }
                    break;
                default: // start
                    item.y = frameTop + bounds.height / 2;
            }

            currentX += bounds.width + actualSpacing;
        });

        // Auto-resize frame if needed
        if (frame.autoWidth) {
            frame.width = totalWidth + padding.left + padding.right;
        }
    }

    layoutVertical(frame, items) {
        const padding = this.padding;
        const spacing = this.spacing;

        // Calculate total height needed
        let totalHeight = items.reduce((sum, item) => {
            const bounds = item.getBounds();
            return sum + bounds.height;
        }, 0) + spacing * (items.length - 1);

        const availableWidth = frame.width - padding.left - padding.right;
        const availableHeight = frame.height - padding.top - padding.bottom;

        // Calculate starting Y
        let startY;
        let actualSpacing = spacing;

        switch (this.alignment) {
            case 'center':
                startY = frame.y - frame.height / 2 + padding.top + (availableHeight - totalHeight) / 2;
                break;
            case 'end':
                startY = frame.y + frame.height / 2 - padding.bottom - totalHeight;
                break;
            case 'space-between':
                startY = frame.y - frame.height / 2 + padding.top;
                if (items.length > 1) {
                    const totalItemHeight = items.reduce((sum, item) => sum + item.getBounds().height, 0);
                    actualSpacing = (availableHeight - totalItemHeight) / (items.length - 1);
                }
                break;
            default: // start
                startY = frame.y - frame.height / 2 + padding.top;
        }

        // Position items
        let currentY = startY;

        items.forEach(item => {
            const bounds = item.getBounds();

            // Set Y position
            item.y = currentY + bounds.height / 2;

            // Set X position based on cross alignment
            const frameLeft = frame.x - frame.width / 2 + padding.left;
            const frameCenter = frame.x;
            const frameRight = frame.x + frame.width / 2 - padding.right;

            switch (this.crossAlignment) {
                case 'center':
                    item.x = frameCenter;
                    break;
                case 'end':
                    item.x = frameRight - bounds.width / 2;
                    break;
                case 'stretch':
                    item.x = frameCenter;
                    if (item.width !== undefined) {
                        item.width = availableWidth;
                    }
                    break;
                default: // start
                    item.x = frameLeft + bounds.width / 2;
            }

            currentY += bounds.height + actualSpacing;
        });

        // Auto-resize frame if needed
        if (frame.autoHeight) {
            frame.height = totalHeight + padding.top + padding.bottom;
        }
    }

    toJSON() {
        return {
            direction: this.direction,
            spacing: this.spacing,
            padding: this.padding,
            alignment: this.alignment,
            crossAlignment: this.crossAlignment,
            wrap: this.wrap,
            reversed: this.reversed
        };
    }

    static fromJSON(data) {
        return new AutoLayout(data);
    }
}

// Frame with auto-layout
export class Frame {
    constructor(x, y, width, height, options = {}) {
        this.type = 'frame';
        this.id = Math.random().toString(36).substr(2, 9);
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.name = options.name || 'Frame';

        this.fillColor = options.fillColor || '#ffffff';
        this.strokeColor = options.strokeColor || 'transparent';
        this.strokeWidth = options.strokeWidth || 0;
        this.cornerRadius = options.cornerRadius || 0;
        this.opacity = options.opacity || 1;
        this.rotation = options.rotation || 0;
        this.visible = options.visible !== false;

        this.children = [];
        this.autoLayout = options.autoLayout ? new AutoLayout(options.autoLayout) : null;
        this.clipContent = options.clipContent !== false;
        this.autoWidth = options.autoWidth || false;
        this.autoHeight = options.autoHeight || false;

        // Constraints
        this.constraints = options.constraints || {
            horizontal: 'left', // 'left', 'right', 'left-right', 'center', 'scale'
            vertical: 'top'     // 'top', 'bottom', 'top-bottom', 'center', 'scale'
        };
    }

    addChild(shape) {
        shape.parent = this;
        this.children.push(shape);

        if (this.autoLayout) {
            this.autoLayout.apply(this, this.children);
        }
    }

    removeChild(shape) {
        const index = this.children.indexOf(shape);
        if (index > -1) {
            this.children.splice(index, 1);
            shape.parent = null;

            if (this.autoLayout) {
                this.autoLayout.apply(this, this.children);
            }
        }
    }

    setAutoLayout(options) {
        this.autoLayout = new AutoLayout(options);
        this.autoLayout.apply(this, this.children);
    }

    removeAutoLayout() {
        this.autoLayout = null;
    }

    updateLayout() {
        if (this.autoLayout) {
            this.autoLayout.apply(this, this.children);
        }
    }

    draw(ctx) {
        if (!this.visible) return;

        ctx.save();
        ctx.globalAlpha = this.opacity;
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation * Math.PI / 180);

        // Draw frame background
        if (this.fillColor !== 'transparent') {
            ctx.fillStyle = this.fillColor;

            if (this.cornerRadius > 0) {
                this.drawRoundedRect(ctx, -this.width / 2, -this.height / 2, this.width, this.height, this.cornerRadius);
                ctx.fill();
            } else {
                ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
            }
        }

        // Clip content if enabled
        if (this.clipContent) {
            ctx.beginPath();
            if (this.cornerRadius > 0) {
                this.drawRoundedRect(ctx, -this.width / 2, -this.height / 2, this.width, this.height, this.cornerRadius);
            } else {
                ctx.rect(-this.width / 2, -this.height / 2, this.width, this.height);
            }
            ctx.clip();
        }

        // Draw children
        this.children.forEach(child => {
            child.draw(ctx);
        });

        // Draw stroke
        if (this.strokeWidth > 0 && this.strokeColor !== 'transparent') {
            ctx.strokeStyle = this.strokeColor;
            ctx.lineWidth = this.strokeWidth;

            if (this.cornerRadius > 0) {
                this.drawRoundedRect(ctx, -this.width / 2, -this.height / 2, this.width, this.height, this.cornerRadius);
                ctx.stroke();
            } else {
                ctx.strokeRect(-this.width / 2, -this.height / 2, this.width, this.height);
            }
        }

        ctx.restore();
    }

    drawRoundedRect(ctx, x, y, w, h, r) {
        r = Math.min(r, w / 2, h / 2);
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.arcTo(x + w, y, x + w, y + r, r);
        ctx.lineTo(x + w, y + h - r);
        ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
        ctx.lineTo(x + r, y + h);
        ctx.arcTo(x, y + h, x, y + h - r, r);
        ctx.lineTo(x, y + r);
        ctx.arcTo(x, y, x + r, y, r);
        ctx.closePath();
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
            type: this.type,
            id: this.id,
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height,
            name: this.name,
            fillColor: this.fillColor,
            strokeColor: this.strokeColor,
            strokeWidth: this.strokeWidth,
            cornerRadius: this.cornerRadius,
            opacity: this.opacity,
            rotation: this.rotation,
            visible: this.visible,
            clipContent: this.clipContent,
            autoWidth: this.autoWidth,
            autoHeight: this.autoHeight,
            autoLayout: this.autoLayout ? this.autoLayout.toJSON() : null,
            constraints: this.constraints,
            children: this.children.map(c => c.toJSON())
        };
    }

    toSVG() {
        let svg = `<g transform="translate(${this.x}, ${this.y}) rotate(${this.rotation})">`;

        // Background
        if (this.fillColor !== 'transparent') {
            svg += `<rect x="${-this.width / 2}" y="${-this.height / 2}" width="${this.width}" height="${this.height}" fill="${this.fillColor}" rx="${this.cornerRadius}"/>`;
        }

        // Children
        this.children.forEach(child => {
            svg += child.toSVG();
        });

        svg += '</g>';
        return svg;
    }

    static fromJSON(data) {
        const frame = new Frame(data.x, data.y, data.width, data.height, data);
        // Children would need to be reconstructed
        return frame;
    }
}

// Constraints system for responsive design
export class Constraints {
    static apply(shape, parentBounds, newParentBounds) {
        if (!shape.constraints) return;

        const constraints = shape.constraints;
        const bounds = shape.getBounds();

        // Calculate offsets from parent edges
        const leftOffset = bounds.x - parentBounds.x;
        const rightOffset = parentBounds.x + parentBounds.width - (bounds.x + bounds.width);
        const topOffset = bounds.y - parentBounds.y;
        const bottomOffset = parentBounds.y + parentBounds.height - (bounds.y + bounds.height);

        // Apply horizontal constraint
        switch (constraints.horizontal) {
            case 'left':
                shape.x = newParentBounds.x + leftOffset + bounds.width / 2;
                break;
            case 'right':
                shape.x = newParentBounds.x + newParentBounds.width - rightOffset - bounds.width / 2;
                break;
            case 'left-right':
                const newLeft = newParentBounds.x + leftOffset;
                const newRight = newParentBounds.x + newParentBounds.width - rightOffset;
                shape.width = newRight - newLeft;
                shape.x = (newLeft + newRight) / 2;
                break;
            case 'center':
                const centerRatio = (bounds.x + bounds.width / 2 - parentBounds.x) / parentBounds.width;
                shape.x = newParentBounds.x + centerRatio * newParentBounds.width;
                break;
            case 'scale':
                const xRatio = (bounds.x - parentBounds.x) / parentBounds.width;
                const widthRatio = bounds.width / parentBounds.width;
                shape.x = newParentBounds.x + xRatio * newParentBounds.width + widthRatio * newParentBounds.width / 2;
                shape.width = widthRatio * newParentBounds.width;
                break;
        }

        // Apply vertical constraint
        switch (constraints.vertical) {
            case 'top':
                shape.y = newParentBounds.y + topOffset + bounds.height / 2;
                break;
            case 'bottom':
                shape.y = newParentBounds.y + newParentBounds.height - bottomOffset - bounds.height / 2;
                break;
            case 'top-bottom':
                const newTop = newParentBounds.y + topOffset;
                const newBottom = newParentBounds.y + newParentBounds.height - bottomOffset;
                shape.height = newBottom - newTop;
                shape.y = (newTop + newBottom) / 2;
                break;
            case 'center':
                const vCenterRatio = (bounds.y + bounds.height / 2 - parentBounds.y) / parentBounds.height;
                shape.y = newParentBounds.y + vCenterRatio * newParentBounds.height;
                break;
            case 'scale':
                const yRatio = (bounds.y - parentBounds.y) / parentBounds.height;
                const heightRatio = bounds.height / parentBounds.height;
                shape.y = newParentBounds.y + yRatio * newParentBounds.height + heightRatio * newParentBounds.height / 2;
                shape.height = heightRatio * newParentBounds.height;
                break;
        }
    }
}

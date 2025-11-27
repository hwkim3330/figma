// Smart Guides and Snapping System

export class SmartGuides {
    constructor(engine) {
        this.engine = engine;
        this.enabled = true;
        this.snapThreshold = 5; // pixels
        this.guides = [];
        this.snapPoints = [];

        // Guide colors
        this.colors = {
            edge: '#ff3366',
            center: '#3366ff',
            spacing: '#33cc66',
            grid: '#cccccc'
        };
    }

    enable() {
        this.enabled = true;
    }

    disable() {
        this.enabled = false;
    }

    // Calculate snap points for a shape being moved/resized
    calculateSnap(movingShape, dx, dy) {
        if (!this.enabled) return { dx, dy, guides: [] };

        this.guides = [];
        const bounds = movingShape.getBounds();

        const moving = {
            left: bounds.x + dx,
            right: bounds.x + bounds.width + dx,
            top: bounds.y + dy,
            bottom: bounds.y + bounds.height + dy,
            centerX: bounds.x + bounds.width / 2 + dx,
            centerY: bounds.y + bounds.height / 2 + dy,
            width: bounds.width,
            height: bounds.height
        };

        let snappedDx = dx;
        let snappedDy = dy;
        let minDistX = this.snapThreshold;
        let minDistY = this.snapThreshold;

        // Get other shapes
        const otherShapes = this.engine.shapes.filter(s =>
            s !== movingShape &&
            (!Array.isArray(this.engine.selectedShape) || !this.engine.selectedShape.includes(s))
        );

        // Canvas bounds
        const canvasWidth = this.engine.canvas.width / this.engine.zoom;
        const canvasHeight = this.engine.canvas.height / this.engine.zoom;
        const canvasBounds = {
            left: -canvasWidth / 2 - this.engine.pan.x,
            right: canvasWidth / 2 - this.engine.pan.x,
            top: -canvasHeight / 2 - this.engine.pan.y,
            bottom: canvasHeight / 2 - this.engine.pan.y,
            centerX: -this.engine.pan.x,
            centerY: -this.engine.pan.y
        };

        // Check canvas center snap
        this.checkCenterSnap(moving, canvasBounds, 'canvas');

        // Check against each shape
        otherShapes.forEach(shape => {
            const targetBounds = shape.getBounds();
            const target = {
                left: targetBounds.x,
                right: targetBounds.x + targetBounds.width,
                top: targetBounds.y,
                bottom: targetBounds.y + targetBounds.height,
                centerX: targetBounds.x + targetBounds.width / 2,
                centerY: targetBounds.y + targetBounds.height / 2
            };

            // Vertical alignments (affect X position)
            const vAlignments = [
                { movingEdge: 'left', targetEdge: 'left' },
                { movingEdge: 'left', targetEdge: 'right' },
                { movingEdge: 'right', targetEdge: 'left' },
                { movingEdge: 'right', targetEdge: 'right' },
                { movingEdge: 'centerX', targetEdge: 'centerX' }
            ];

            vAlignments.forEach(({ movingEdge, targetEdge }) => {
                const dist = Math.abs(moving[movingEdge] - target[targetEdge]);
                if (dist < minDistX) {
                    minDistX = dist;
                    const snapAmount = target[targetEdge] - moving[movingEdge];
                    snappedDx = dx + snapAmount;

                    // Add guide
                    this.guides.push({
                        type: 'vertical',
                        x: target[targetEdge],
                        y1: Math.min(moving.top, target.top) - 20,
                        y2: Math.max(moving.bottom, target.bottom) + 20,
                        color: targetEdge === 'centerX' ? this.colors.center : this.colors.edge
                    });
                }
            });

            // Horizontal alignments (affect Y position)
            const hAlignments = [
                { movingEdge: 'top', targetEdge: 'top' },
                { movingEdge: 'top', targetEdge: 'bottom' },
                { movingEdge: 'bottom', targetEdge: 'top' },
                { movingEdge: 'bottom', targetEdge: 'bottom' },
                { movingEdge: 'centerY', targetEdge: 'centerY' }
            ];

            hAlignments.forEach(({ movingEdge, targetEdge }) => {
                const dist = Math.abs(moving[movingEdge] - target[targetEdge]);
                if (dist < minDistY) {
                    minDistY = dist;
                    const snapAmount = target[targetEdge] - moving[movingEdge];
                    snappedDy = dy + snapAmount;

                    // Add guide
                    this.guides.push({
                        type: 'horizontal',
                        y: target[targetEdge],
                        x1: Math.min(moving.left, target.left) - 20,
                        x2: Math.max(moving.right, target.right) + 20,
                        color: targetEdge === 'centerY' ? this.colors.center : this.colors.edge
                    });
                }
            });

            // Check for equal spacing
            this.checkEqualSpacing(moving, target, otherShapes, shape);
        });

        return {
            dx: snappedDx,
            dy: snappedDy,
            guides: this.guides
        };
    }

    checkCenterSnap(moving, canvasBounds, source) {
        // Snap to canvas center X
        const distCenterX = Math.abs(moving.centerX - canvasBounds.centerX);
        if (distCenterX < this.snapThreshold) {
            this.guides.push({
                type: 'vertical',
                x: canvasBounds.centerX,
                y1: canvasBounds.top,
                y2: canvasBounds.bottom,
                color: this.colors.center,
                dashed: true
            });
        }

        // Snap to canvas center Y
        const distCenterY = Math.abs(moving.centerY - canvasBounds.centerY);
        if (distCenterY < this.snapThreshold) {
            this.guides.push({
                type: 'horizontal',
                y: canvasBounds.centerY,
                x1: canvasBounds.left,
                x2: canvasBounds.right,
                color: this.colors.center,
                dashed: true
            });
        }
    }

    checkEqualSpacing(moving, target, allShapes, currentTarget) {
        // Find shapes on the same horizontal line
        const horizontalNeighbors = allShapes.filter(s => {
            if (s === currentTarget) return false;
            const b = s.getBounds();
            const targetTop = target.top;
            const targetBottom = target.bottom;
            return b.y < targetBottom && b.y + b.height > targetTop;
        });

        // Check for equal horizontal spacing
        horizontalNeighbors.forEach(neighbor => {
            const neighborBounds = neighbor.getBounds();
            const neighborCenter = neighborBounds.x + neighborBounds.width / 2;

            // Calculate gaps
            const gap1 = target.left - moving.right; // gap between moving and target
            const gap2 = neighborBounds.x - target.right; // gap between target and neighbor

            if (Math.abs(gap1 - gap2) < this.snapThreshold && gap1 > 0 && gap2 > 0) {
                // Add spacing guides
                this.guides.push({
                    type: 'spacing',
                    x1: moving.right,
                    x2: target.left,
                    y: (moving.centerY + target.centerY) / 2,
                    distance: Math.round(gap1),
                    color: this.colors.spacing
                });

                this.guides.push({
                    type: 'spacing',
                    x1: target.right,
                    x2: neighborBounds.x,
                    y: (target.centerY + neighborBounds.y + neighborBounds.height / 2) / 2,
                    distance: Math.round(gap2),
                    color: this.colors.spacing
                });
            }
        });
    }

    // Draw the guides on canvas
    draw(ctx) {
        if (!this.enabled || this.guides.length === 0) return;

        ctx.save();

        this.guides.forEach(guide => {
            ctx.strokeStyle = guide.color;
            ctx.lineWidth = 1 / this.engine.zoom;

            if (guide.dashed) {
                ctx.setLineDash([5 / this.engine.zoom, 5 / this.engine.zoom]);
            } else {
                ctx.setLineDash([]);
            }

            if (guide.type === 'vertical') {
                ctx.beginPath();
                ctx.moveTo(guide.x, guide.y1);
                ctx.lineTo(guide.x, guide.y2);
                ctx.stroke();
            } else if (guide.type === 'horizontal') {
                ctx.beginPath();
                ctx.moveTo(guide.x1, guide.y);
                ctx.lineTo(guide.x2, guide.y);
                ctx.stroke();
            } else if (guide.type === 'spacing') {
                // Draw spacing indicator
                ctx.beginPath();
                ctx.moveTo(guide.x1, guide.y);
                ctx.lineTo(guide.x2, guide.y);
                ctx.stroke();

                // Draw distance label
                const midX = (guide.x1 + guide.x2) / 2;
                ctx.font = `${10 / this.engine.zoom}px Arial`;
                ctx.fillStyle = guide.color;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';
                ctx.fillText(`${guide.distance}`, midX, guide.y - 2 / this.engine.zoom);
            }
        });

        ctx.restore();
    }

    clear() {
        this.guides = [];
    }
}

// Grid system
export class Grid {
    constructor(engine) {
        this.engine = engine;
        this.visible = false;
        this.size = 20;
        this.subdivisions = 5;
        this.color = '#e0e0e0';
        this.subColor = '#f5f5f5';
        this.snapToGrid = false;
    }

    toggle() {
        this.visible = !this.visible;
        this.engine.render();
    }

    setSize(size) {
        this.size = size;
        if (this.visible) {
            this.engine.render();
        }
    }

    snap(x, y) {
        if (!this.snapToGrid) return { x, y };

        return {
            x: Math.round(x / this.size) * this.size,
            y: Math.round(y / this.size) * this.size
        };
    }

    draw(ctx) {
        if (!this.visible) return;

        const width = this.engine.canvas.width / this.engine.zoom;
        const height = this.engine.canvas.height / this.engine.zoom;

        const startX = Math.floor((-width / 2 - this.engine.pan.x) / this.size) * this.size;
        const startY = Math.floor((-height / 2 - this.engine.pan.y) / this.size) * this.size;
        const endX = Math.ceil((width / 2 - this.engine.pan.x) / this.size) * this.size;
        const endY = Math.ceil((height / 2 - this.engine.pan.y) / this.size) * this.size;

        ctx.save();
        ctx.lineWidth = 1 / this.engine.zoom;

        // Draw subdivisions
        if (this.subdivisions > 1) {
            ctx.strokeStyle = this.subColor;
            ctx.beginPath();

            const subSize = this.size / this.subdivisions;
            for (let x = startX; x <= endX; x += subSize) {
                if (x % this.size !== 0) {
                    ctx.moveTo(x, startY);
                    ctx.lineTo(x, endY);
                }
            }
            for (let y = startY; y <= endY; y += subSize) {
                if (y % this.size !== 0) {
                    ctx.moveTo(startX, y);
                    ctx.lineTo(endX, y);
                }
            }

            ctx.stroke();
        }

        // Draw main grid
        ctx.strokeStyle = this.color;
        ctx.beginPath();

        for (let x = startX; x <= endX; x += this.size) {
            ctx.moveTo(x, startY);
            ctx.lineTo(x, endY);
        }

        for (let y = startY; y <= endY; y += this.size) {
            ctx.moveTo(startX, y);
            ctx.lineTo(endX, y);
        }

        ctx.stroke();
        ctx.restore();
    }
}

// Ruler system
export class Rulers {
    constructor(engine) {
        this.engine = engine;
        this.visible = false;
        this.size = 20; // ruler width in pixels
        this.tickSize = 100; // major tick every N units
        this.color = '#f0f0f0';
        this.textColor = '#666';
        this.guideColor = '#0d99ff';

        this.horizontalGuides = [];
        this.verticalGuides = [];
    }

    toggle() {
        this.visible = !this.visible;
    }

    addHorizontalGuide(y) {
        this.horizontalGuides.push(y);
    }

    addVerticalGuide(x) {
        this.verticalGuides.push(x);
    }

    removeGuideAt(x, y, threshold = 5) {
        // Check horizontal guides
        for (let i = this.horizontalGuides.length - 1; i >= 0; i--) {
            if (Math.abs(this.horizontalGuides[i] - y) < threshold) {
                this.horizontalGuides.splice(i, 1);
                return true;
            }
        }

        // Check vertical guides
        for (let i = this.verticalGuides.length - 1; i >= 0; i--) {
            if (Math.abs(this.verticalGuides[i] - x) < threshold) {
                this.verticalGuides.splice(i, 1);
                return true;
            }
        }

        return false;
    }

    draw(ctx) {
        if (!this.visible) return;

        // Draw ruler backgrounds
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);

        // Horizontal ruler
        ctx.fillStyle = this.color;
        ctx.fillRect(this.size, 0, this.engine.canvas.width - this.size, this.size);

        // Vertical ruler
        ctx.fillRect(0, this.size, this.size, this.engine.canvas.height - this.size);

        // Corner
        ctx.fillStyle = '#e0e0e0';
        ctx.fillRect(0, 0, this.size, this.size);

        // Draw ticks and numbers
        ctx.fillStyle = this.textColor;
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        const zoom = this.engine.zoom;
        const panX = this.engine.pan.x;
        const panY = this.engine.pan.y;

        // Calculate visible range
        const startX = -panX - (this.engine.canvas.width / 2 - this.size) / zoom;
        const endX = -panX + (this.engine.canvas.width / 2) / zoom;
        const startY = -panY - (this.engine.canvas.height / 2 - this.size) / zoom;
        const endY = -panY + (this.engine.canvas.height / 2) / zoom;

        // Horizontal ticks
        const tickSpacing = this.getTickSpacing(zoom);
        const firstTickX = Math.ceil(startX / tickSpacing) * tickSpacing;

        for (let x = firstTickX; x <= endX; x += tickSpacing) {
            const screenX = (x + panX) * zoom + this.engine.canvas.width / 2;
            if (screenX > this.size) {
                ctx.fillRect(screenX, this.size - 5, 1, 5);
                ctx.fillText(Math.round(x).toString(), screenX, 2);
            }
        }

        // Vertical ticks
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        const firstTickY = Math.ceil(startY / tickSpacing) * tickSpacing;

        for (let y = firstTickY; y <= endY; y += tickSpacing) {
            const screenY = (y + panY) * zoom + this.engine.canvas.height / 2;
            if (screenY > this.size) {
                ctx.fillRect(this.size - 5, screenY, 5, 1);
                ctx.save();
                ctx.translate(this.size - 5, screenY);
                ctx.rotate(-Math.PI / 2);
                ctx.fillText(Math.round(y).toString(), 0, 0);
                ctx.restore();
            }
        }

        ctx.restore();

        // Draw guides
        this.drawGuides(ctx);
    }

    getTickSpacing(zoom) {
        const baseSpacing = 100;
        if (zoom > 2) return baseSpacing / 2;
        if (zoom > 1) return baseSpacing;
        if (zoom > 0.5) return baseSpacing * 2;
        return baseSpacing * 5;
    }

    drawGuides(ctx) {
        ctx.save();
        ctx.strokeStyle = this.guideColor;
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);

        // Draw horizontal guides
        this.horizontalGuides.forEach(y => {
            const screenY = (y + this.engine.pan.y) * this.engine.zoom + this.engine.canvas.height / 2;
            ctx.beginPath();
            ctx.moveTo(0, screenY);
            ctx.lineTo(this.engine.canvas.width, screenY);
            ctx.stroke();
        });

        // Draw vertical guides
        this.verticalGuides.forEach(x => {
            const screenX = (x + this.engine.pan.x) * this.engine.zoom + this.engine.canvas.width / 2;
            ctx.beginPath();
            ctx.moveTo(screenX, 0);
            ctx.lineTo(screenX, this.engine.canvas.height);
            ctx.stroke();
        });

        ctx.restore();
    }
}

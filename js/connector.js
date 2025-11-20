/**
 * Connector - Auto-connecting lines between shapes (diagrams.net style)
 */

export class Connector {
    constructor(startShape, endShape, options = {}) {
        this.type = 'connector';
        this.id = Math.random().toString(36).substr(2, 9);
        this.startShape = startShape;
        this.endShape = endShape;
        this.startPoint = options.startPoint || 'auto';  // auto, top, bottom, left, right
        this.endPoint = options.endPoint || 'auto';
        this.strokeColor = options.strokeColor || '#333333';
        this.strokeWidth = options.strokeWidth || 2;
        this.arrowStart = options.arrowStart || false;
        this.arrowEnd = options.arrowEnd || true;
        this.lineStyle = options.lineStyle || 'straight';  // straight, curved, orthogonal
        this.label = options.label || '';
        this.opacity = options.opacity !== undefined ? options.opacity : 1;
    }

    getConnectionPoint(shape, side) {
        const bounds = shape.getBounds();
        const centerX = bounds.x + bounds.width / 2;
        const centerY = bounds.y + bounds.height / 2;

        switch (side) {
            case 'top':
                return { x: centerX, y: bounds.y };
            case 'bottom':
                return { x: centerX, y: bounds.y + bounds.height };
            case 'left':
                return { x: bounds.x, y: centerY };
            case 'right':
                return { x: bounds.x + bounds.width, y: centerY };
            default:
                return { x: centerX, y: centerY };
        }
    }

    getBestConnectionPoints() {
        const startBounds = this.startShape.getBounds();
        const endBounds = this.endShape.getBounds();

        const startCenter = {
            x: startBounds.x + startBounds.width / 2,
            y: startBounds.y + startBounds.height / 2
        };
        const endCenter = {
            x: endBounds.x + endBounds.width / 2,
            y: endBounds.y + endBounds.height / 2
        };

        // Determine best connection sides based on relative positions
        const dx = endCenter.x - startCenter.x;
        const dy = endCenter.y - startCenter.y;

        let startSide, endSide;

        if (Math.abs(dx) > Math.abs(dy)) {
            // Horizontal connection
            startSide = dx > 0 ? 'right' : 'left';
            endSide = dx > 0 ? 'left' : 'right';
        } else {
            // Vertical connection
            startSide = dy > 0 ? 'bottom' : 'top';
            endSide = dy > 0 ? 'top' : 'bottom';
        }

        return {
            start: this.getConnectionPoint(this.startShape, startSide),
            end: this.getConnectionPoint(this.endShape, endSide),
            startSide,
            endSide
        };
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.opacity;

        const points = this.getBestConnectionPoints();
        const start = points.start;
        const end = points.end;

        ctx.strokeStyle = this.strokeColor;
        ctx.lineWidth = this.strokeWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Draw line based on style
        if (this.lineStyle === 'straight') {
            this.drawStraightLine(ctx, start, end);
        } else if (this.lineStyle === 'curved') {
            this.drawCurvedLine(ctx, start, end, points.startSide, points.endSide);
        } else if (this.lineStyle === 'orthogonal') {
            this.drawOrthogonalLine(ctx, start, end, points.startSide, points.endSide);
        }

        // Draw arrows
        if (this.arrowEnd) {
            this.drawArrow(ctx, start, end, 'end');
        }
        if (this.arrowStart) {
            this.drawArrow(ctx, end, start, 'start');
        }

        // Draw label
        if (this.label) {
            this.drawLabel(ctx, start, end);
        }

        ctx.restore();
    }

    drawStraightLine(ctx, start, end) {
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
    }

    drawCurvedLine(ctx, start, end, startSide, endSide) {
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);

        // Calculate control points based on connection sides
        const distance = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
        const offset = Math.min(distance / 3, 100);

        let cp1x = start.x;
        let cp1y = start.y;
        let cp2x = end.x;
        let cp2y = end.y;

        if (startSide === 'right') cp1x += offset;
        else if (startSide === 'left') cp1x -= offset;
        else if (startSide === 'bottom') cp1y += offset;
        else if (startSide === 'top') cp1y -= offset;

        if (endSide === 'right') cp2x += offset;
        else if (endSide === 'left') cp2x -= offset;
        else if (endSide === 'bottom') cp2y += offset;
        else if (endSide === 'top') cp2y -= offset;

        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, end.x, end.y);
        ctx.stroke();
    }

    drawOrthogonalLine(ctx, start, end, startSide, endSide) {
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);

        const midX = (start.x + end.x) / 2;
        const midY = (start.y + end.y) / 2;

        // Draw orthogonal path
        if (startSide === 'right' || startSide === 'left') {
            ctx.lineTo(midX, start.y);
            ctx.lineTo(midX, end.y);
        } else {
            ctx.lineTo(start.x, midY);
            ctx.lineTo(end.x, midY);
        }

        ctx.lineTo(end.x, end.y);
        ctx.stroke();
    }

    drawArrow(ctx, from, to, position) {
        const angle = Math.atan2(to.y - from.y, to.x - from.x);
        const arrowLength = 12;
        const arrowWidth = 8;

        ctx.save();
        ctx.fillStyle = this.strokeColor;
        ctx.translate(to.x, to.y);
        ctx.rotate(angle);

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-arrowLength, -arrowWidth / 2);
        ctx.lineTo(-arrowLength, arrowWidth / 2);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }

    drawLabel(ctx, start, end) {
        const midX = (start.x + end.x) / 2;
        const midY = (start.y + end.y) / 2;

        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const metrics = ctx.measureText(this.label);
        const padding = 4;

        // Draw background
        ctx.fillRect(
            midX - metrics.width / 2 - padding,
            midY - 10,
            metrics.width + padding * 2,
            20
        );

        // Draw text
        ctx.strokeText(this.label, midX, midY);
        ctx.fillStyle = '#000000';
        ctx.fillText(this.label, midX, midY);

        ctx.restore();
    }

    getBounds() {
        const points = this.getBestConnectionPoints();
        const start = points.start;
        const end = points.end;

        const minX = Math.min(start.x, end.x);
        const minY = Math.min(start.y, end.y);
        const maxX = Math.max(start.x, end.x);
        const maxY = Math.max(start.y, end.y);

        return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
        };
    }

    contains(x, y) {
        const points = this.getBestConnectionPoints();
        const start = points.start;
        const end = points.end;

        // Calculate distance from point to line
        const lineLength = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
        const distance = Math.abs((end.y - start.y) * x - (end.x - start.x) * y + end.x * start.y - end.y * start.x) / lineLength;

        // Check if point is near the line
        const threshold = this.strokeWidth + 5;
        if (distance > threshold) return false;

        // Check if point is within the bounding box of the line
        const minX = Math.min(start.x, end.x) - threshold;
        const maxX = Math.max(start.x, end.x) + threshold;
        const minY = Math.min(start.y, end.y) - threshold;
        const maxY = Math.max(start.y, end.y) + threshold;

        return x >= minX && x <= maxX && y >= minY && y <= maxY;
    }

    toJSON() {
        return {
            type: this.type,
            id: this.id,
            startShapeId: this.startShape.id,
            endShapeId: this.endShape.id,
            startPoint: this.startPoint,
            endPoint: this.endPoint,
            strokeColor: this.strokeColor,
            strokeWidth: this.strokeWidth,
            arrowStart: this.arrowStart,
            arrowEnd: this.arrowEnd,
            lineStyle: this.lineStyle,
            label: this.label,
            opacity: this.opacity
        };
    }

    static fromJSON(data, shapes) {
        const startShape = shapes.find(s => s.id === data.startShapeId);
        const endShape = shapes.find(s => s.id === data.endShapeId);

        if (!startShape || !endShape) {
            throw new Error('Could not find start or end shape for connector');
        }

        const connector = new Connector(startShape, endShape, {
            startPoint: data.startPoint,
            endPoint: data.endPoint,
            strokeColor: data.strokeColor,
            strokeWidth: data.strokeWidth,
            arrowStart: data.arrowStart,
            arrowEnd: data.arrowEnd,
            lineStyle: data.lineStyle,
            label: data.label,
            opacity: data.opacity
        });

        connector.id = data.id;
        return connector;
    }
}

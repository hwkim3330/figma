// Pen Tool - Vector Path Drawing
import { Shape } from './canvas-engine.js';

export class Path extends Shape {
    constructor(x, y, properties = {}) {
        super('path', x, y, properties);
        this.points = properties.points || [];
        this.closed = properties.closed || false;
        this.smooth = properties.smooth !== undefined ? properties.smooth : true;
    }

    addPoint(x, y, handleIn = null, handleOut = null) {
        this.points.push({
            x: x - this.x,
            y: y - this.y,
            handleIn: handleIn,
            handleOut: handleOut
        });
    }

    updateLastPoint(x, y, handleIn, handleOut) {
        if (this.points.length > 0) {
            const last = this.points[this.points.length - 1];
            last.x = x - this.x;
            last.y = y - this.y;
            if (handleIn) last.handleIn = handleIn;
            if (handleOut) last.handleOut = handleOut;
        }
    }

    closePath() {
        this.closed = true;
    }

    drawShape(ctx) {
        if (this.points.length < 2) return;

        ctx.fillStyle = this.fillColor;
        ctx.strokeStyle = this.strokeColor;
        ctx.lineWidth = this.strokeWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();

        const first = this.points[0];
        ctx.moveTo(first.x, first.y);

        for (let i = 1; i < this.points.length; i++) {
            const prev = this.points[i - 1];
            const curr = this.points[i];

            if (this.smooth && (prev.handleOut || curr.handleIn)) {
                const cp1 = prev.handleOut || { x: prev.x, y: prev.y };
                const cp2 = curr.handleIn || { x: curr.x, y: curr.y };
                ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, curr.x, curr.y);
            } else {
                ctx.lineTo(curr.x, curr.y);
            }
        }

        if (this.closed) {
            const last = this.points[this.points.length - 1];
            if (this.smooth && (last.handleOut || first.handleIn)) {
                const cp1 = last.handleOut || { x: last.x, y: last.y };
                const cp2 = first.handleIn || { x: first.x, y: first.y };
                ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, first.x, first.y);
            } else {
                ctx.closePath();
            }
            ctx.fill();
        }

        if (this.strokeWidth > 0) {
            ctx.stroke();
        }
    }

    containsPoint(px, py) {
        const dx = px - this.x;
        const dy = py - this.y;
        const threshold = Math.max(this.strokeWidth, 10);

        for (let i = 1; i < this.points.length; i++) {
            const p1 = this.points[i - 1];
            const p2 = this.points[i];

            const dist = this.pointToLineDistance(dx, dy, p1.x, p1.y, p2.x, p2.y);
            if (dist < threshold) return true;
        }

        if (this.closed && this.points.length > 2) {
            const last = this.points[this.points.length - 1];
            const first = this.points[0];
            const dist = this.pointToLineDistance(dx, dy, last.x, last.y, first.x, first.y);
            if (dist < threshold) return true;
        }

        return false;
    }

    pointToLineDistance(px, py, x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const length = Math.sqrt(dx * dx + dy * dy);

        if (length === 0) return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);

        const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (length * length)));
        const closestX = x1 + t * dx;
        const closestY = y1 + t * dy;

        return Math.sqrt((px - closestX) ** 2 + (py - closestY) ** 2);
    }

    getBounds() {
        if (this.points.length === 0) {
            return { x: this.x, y: this.y, width: 0, height: 0 };
        }

        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;

        this.points.forEach(p => {
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x);
            maxY = Math.max(maxY, p.y);
        });

        return {
            x: this.x + minX,
            y: this.y + minY,
            width: maxX - minX,
            height: maxY - minY
        };
    }

    toJSON() {
        return {
            ...super.toJSON(),
            points: this.points,
            closed: this.closed,
            smooth: this.smooth
        };
    }

    toSVG() {
        if (this.points.length < 2) return '';

        let d = `M ${this.x + this.points[0].x} ${this.y + this.points[0].y}`;

        for (let i = 1; i < this.points.length; i++) {
            const prev = this.points[i - 1];
            const curr = this.points[i];

            if (this.smooth && (prev.handleOut || curr.handleIn)) {
                const cp1 = prev.handleOut || { x: prev.x, y: prev.y };
                const cp2 = curr.handleIn || { x: curr.x, y: curr.y };
                d += ` C ${this.x + cp1.x} ${this.y + cp1.y}, ${this.x + cp2.x} ${this.y + cp2.y}, ${this.x + curr.x} ${this.y + curr.y}`;
            } else {
                d += ` L ${this.x + curr.x} ${this.y + curr.y}`;
            }
        }

        if (this.closed) d += ' Z';

        return `<path d="${d}" fill="${this.closed ? this.fillColor : 'none'}" stroke="${this.strokeColor}" stroke-width="${this.strokeWidth}"/>`;
    }

    static fromJSON(data) {
        return new Path(data.x, data.y, data);
    }
}

export class PenTool {
    constructor(engine) {
        this.engine = engine;
        this.currentPath = null;
        this.isDrawing = false;
        this.isDraggingHandle = false;
        this.selectedPointIndex = -1;
    }

    startPath(x, y, properties) {
        const canvasPos = this.engine.screenToCanvas(x, y);
        this.currentPath = new Path(canvasPos.x, canvasPos.y, properties);
        this.currentPath.addPoint(canvasPos.x, canvasPos.y);
        this.engine.addShape(this.currentPath);
        this.isDrawing = true;
    }

    addPoint(x, y) {
        if (!this.currentPath || !this.isDrawing) return;

        const canvasPos = this.engine.screenToCanvas(x, y);

        // Check if clicking near first point to close
        if (this.currentPath.points.length > 2) {
            const first = this.currentPath.points[0];
            const dist = Math.sqrt(
                Math.pow(canvasPos.x - this.currentPath.x - first.x, 2) +
                Math.pow(canvasPos.y - this.currentPath.y - first.y, 2)
            );

            if (dist < 10) {
                this.closePath();
                return;
            }
        }

        this.currentPath.addPoint(canvasPos.x, canvasPos.y);
        this.engine.render();
    }

    updateHandle(x, y) {
        if (!this.currentPath || this.currentPath.points.length === 0) return;

        const canvasPos = this.engine.screenToCanvas(x, y);
        const lastPoint = this.currentPath.points[this.currentPath.points.length - 1];

        const dx = canvasPos.x - this.currentPath.x - lastPoint.x;
        const dy = canvasPos.y - this.currentPath.y - lastPoint.y;

        lastPoint.handleOut = { x: lastPoint.x + dx, y: lastPoint.y + dy };
        lastPoint.handleIn = { x: lastPoint.x - dx, y: lastPoint.y - dy };

        this.engine.render();
        this.drawHandles();
    }

    drawHandles() {
        if (!this.currentPath) return;

        const ctx = this.engine.ctx;
        ctx.save();

        ctx.translate(this.engine.canvas.width / 2, this.engine.canvas.height / 2);
        ctx.scale(this.engine.zoom, this.engine.zoom);
        ctx.translate(this.engine.pan.x, this.engine.pan.y);
        ctx.translate(this.currentPath.x, this.currentPath.y);

        // Draw control points and handles
        this.currentPath.points.forEach((point, index) => {
            // Draw point
            ctx.fillStyle = index === this.selectedPointIndex ? '#0d99ff' : 'white';
            ctx.strokeStyle = '#0d99ff';
            ctx.lineWidth = 1.5 / this.engine.zoom;

            ctx.beginPath();
            ctx.arc(point.x, point.y, 4 / this.engine.zoom, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Draw handles
            if (point.handleIn) {
                ctx.beginPath();
                ctx.moveTo(point.x, point.y);
                ctx.lineTo(point.handleIn.x, point.handleIn.y);
                ctx.strokeStyle = '#0d99ff';
                ctx.stroke();

                ctx.beginPath();
                ctx.arc(point.handleIn.x, point.handleIn.y, 3 / this.engine.zoom, 0, Math.PI * 2);
                ctx.fillStyle = '#0d99ff';
                ctx.fill();
            }

            if (point.handleOut) {
                ctx.beginPath();
                ctx.moveTo(point.x, point.y);
                ctx.lineTo(point.handleOut.x, point.handleOut.y);
                ctx.strokeStyle = '#0d99ff';
                ctx.stroke();

                ctx.beginPath();
                ctx.arc(point.handleOut.x, point.handleOut.y, 3 / this.engine.zoom, 0, Math.PI * 2);
                ctx.fillStyle = '#0d99ff';
                ctx.fill();
            }
        });

        ctx.restore();
    }

    closePath() {
        if (this.currentPath) {
            this.currentPath.closePath();
            this.engine.render();
        }
        this.finishPath();
    }

    finishPath() {
        this.isDrawing = false;
        const path = this.currentPath;
        this.currentPath = null;
        return path;
    }

    cancel() {
        if (this.currentPath) {
            this.engine.removeShape(this.currentPath);
            this.currentPath = null;
        }
        this.isDrawing = false;
    }
}

// Freehand drawing tool
export class Pencil extends Shape {
    constructor(x, y, properties = {}) {
        super('pencil', x, y, properties);
        this.points = [];
        this.smoothing = properties.smoothing || 0.5;
    }

    addPoint(x, y) {
        this.points.push({ x: x - this.x, y: y - this.y });
    }

    simplify(tolerance = 2) {
        if (this.points.length < 3) return;

        // Douglas-Peucker simplification
        const simplified = this.douglasPeucker(this.points, tolerance);
        this.points = simplified;
    }

    douglasPeucker(points, tolerance) {
        if (points.length < 3) return points;

        let maxDist = 0;
        let maxIndex = 0;

        const first = points[0];
        const last = points[points.length - 1];

        for (let i = 1; i < points.length - 1; i++) {
            const dist = this.perpendicularDistance(points[i], first, last);
            if (dist > maxDist) {
                maxDist = dist;
                maxIndex = i;
            }
        }

        if (maxDist > tolerance) {
            const left = this.douglasPeucker(points.slice(0, maxIndex + 1), tolerance);
            const right = this.douglasPeucker(points.slice(maxIndex), tolerance);
            return [...left.slice(0, -1), ...right];
        }

        return [first, last];
    }

    perpendicularDistance(point, lineStart, lineEnd) {
        const dx = lineEnd.x - lineStart.x;
        const dy = lineEnd.y - lineStart.y;
        const length = Math.sqrt(dx * dx + dy * dy);

        if (length === 0) return Math.sqrt(
            (point.x - lineStart.x) ** 2 + (point.y - lineStart.y) ** 2
        );

        return Math.abs(
            (point.y - lineStart.y) * dx - (point.x - lineStart.x) * dy
        ) / length;
    }

    drawShape(ctx) {
        if (this.points.length < 2) return;

        ctx.strokeStyle = this.strokeColor;
        ctx.lineWidth = this.strokeWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        ctx.moveTo(this.points[0].x, this.points[0].y);

        if (this.smoothing > 0 && this.points.length > 2) {
            // Smooth curve
            for (let i = 1; i < this.points.length - 1; i++) {
                const p0 = this.points[i - 1];
                const p1 = this.points[i];
                const p2 = this.points[i + 1];

                const cp1x = p1.x - (p2.x - p0.x) * this.smoothing * 0.25;
                const cp1y = p1.y - (p2.y - p0.y) * this.smoothing * 0.25;
                const cp2x = p1.x + (p2.x - p0.x) * this.smoothing * 0.25;
                const cp2y = p1.y + (p2.y - p0.y) * this.smoothing * 0.25;

                ctx.quadraticCurveTo(cp1x, cp1y, p1.x, p1.y);
            }

            const last = this.points[this.points.length - 1];
            ctx.lineTo(last.x, last.y);
        } else {
            // Straight lines
            for (let i = 1; i < this.points.length; i++) {
                ctx.lineTo(this.points[i].x, this.points[i].y);
            }
        }

        ctx.stroke();
    }

    containsPoint(px, py) {
        const dx = px - this.x;
        const dy = py - this.y;
        const threshold = Math.max(this.strokeWidth, 10);

        for (let i = 1; i < this.points.length; i++) {
            const p1 = this.points[i - 1];
            const p2 = this.points[i];

            const lineDx = p2.x - p1.x;
            const lineDy = p2.y - p1.y;
            const length = Math.sqrt(lineDx * lineDx + lineDy * lineDy);

            if (length === 0) continue;

            const t = Math.max(0, Math.min(1, ((dx - p1.x) * lineDx + (dy - p1.y) * lineDy) / (length * length)));
            const closestX = p1.x + t * lineDx;
            const closestY = p1.y + t * lineDy;
            const dist = Math.sqrt((dx - closestX) ** 2 + (dy - closestY) ** 2);

            if (dist < threshold) return true;
        }

        return false;
    }

    getBounds() {
        if (this.points.length === 0) {
            return { x: this.x, y: this.y, width: 0, height: 0 };
        }

        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;

        this.points.forEach(p => {
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x);
            maxY = Math.max(maxY, p.y);
        });

        return {
            x: this.x + minX,
            y: this.y + minY,
            width: maxX - minX || 1,
            height: maxY - minY || 1
        };
    }

    toJSON() {
        return {
            ...super.toJSON(),
            points: this.points,
            smoothing: this.smoothing
        };
    }

    toSVG() {
        if (this.points.length < 2) return '';

        let d = `M ${this.x + this.points[0].x} ${this.y + this.points[0].y}`;

        for (let i = 1; i < this.points.length; i++) {
            d += ` L ${this.x + this.points[i].x} ${this.y + this.points[i].y}`;
        }

        return `<path d="${d}" fill="none" stroke="${this.strokeColor}" stroke-width="${this.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>`;
    }

    static fromJSON(data) {
        const pencil = new Pencil(data.x, data.y, data);
        pencil.points = data.points || [];
        return pencil;
    }
}

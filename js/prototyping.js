// Prototyping System - Interactive links and transitions

export class PrototypeLink {
    constructor(sourceId, targetId, options = {}) {
        this.id = Math.random().toString(36).substr(2, 9);
        this.sourceId = sourceId;
        this.targetId = targetId;
        this.sourceHandle = options.sourceHandle || 'right'; // 'top', 'right', 'bottom', 'left'
        this.targetHandle = options.targetHandle || 'left';

        // Trigger
        this.trigger = options.trigger || 'click'; // 'click', 'hover', 'drag', 'keypress'
        this.triggerKey = options.triggerKey || null;

        // Animation
        this.animation = options.animation || 'instant'; // 'instant', 'dissolve', 'slide-left', 'slide-right', 'slide-up', 'slide-down', 'push', 'move-in', 'move-out'
        this.duration = options.duration || 300; // ms
        this.easing = options.easing || 'ease-out'; // 'linear', 'ease', 'ease-in', 'ease-out', 'ease-in-out'

        // Scroll behavior
        this.scrollTo = options.scrollTo || null; // null, 'top', 'center', 'position'
        this.scrollPosition = options.scrollPosition || { x: 0, y: 0 };

        // Overlay options (for overlay navigation)
        this.isOverlay = options.isOverlay || false;
        this.overlayPosition = options.overlayPosition || 'center'; // 'center', 'top-left', etc.
        this.overlayBackdrop = options.overlayBackdrop || true;
        this.closeOnOutsideClick = options.closeOnOutsideClick !== false;
    }

    toJSON() {
        return {
            id: this.id,
            sourceId: this.sourceId,
            targetId: this.targetId,
            sourceHandle: this.sourceHandle,
            targetHandle: this.targetHandle,
            trigger: this.trigger,
            triggerKey: this.triggerKey,
            animation: this.animation,
            duration: this.duration,
            easing: this.easing,
            scrollTo: this.scrollTo,
            scrollPosition: this.scrollPosition,
            isOverlay: this.isOverlay,
            overlayPosition: this.overlayPosition,
            overlayBackdrop: this.overlayBackdrop,
            closeOnOutsideClick: this.closeOnOutsideClick
        };
    }

    static fromJSON(data) {
        const link = new PrototypeLink(data.sourceId, data.targetId, data);
        link.id = data.id;
        return link;
    }
}

export class PrototypeManager {
    constructor(engine) {
        this.engine = engine;
        this.links = new Map();
        this.isPreviewMode = false;
        this.currentFrame = null;
        this.overlayStack = [];
        this.history = [];
        this.historyIndex = -1;
    }

    addLink(sourceId, targetId, options = {}) {
        const link = new PrototypeLink(sourceId, targetId, options);
        this.links.set(link.id, link);
        return link;
    }

    removeLink(linkId) {
        this.links.delete(linkId);
    }

    getLinksFromShape(shapeId) {
        return Array.from(this.links.values()).filter(link => link.sourceId === shapeId);
    }

    getLinksToShape(shapeId) {
        return Array.from(this.links.values()).filter(link => link.targetId === shapeId);
    }

    // Draw prototype connections in editor mode
    drawConnections(ctx) {
        if (this.isPreviewMode) return;

        ctx.save();

        this.links.forEach(link => {
            const source = this.engine.shapes.find(s => s.id === link.sourceId);
            const target = this.engine.shapes.find(s => s.id === link.targetId);

            if (!source || !target) return;

            const sourceBounds = source.getBounds();
            const targetBounds = target.getBounds();

            // Get connection points
            const sourcePoint = this.getHandlePosition(sourceBounds, link.sourceHandle);
            const targetPoint = this.getHandlePosition(targetBounds, link.targetHandle);

            // Draw connection line
            ctx.strokeStyle = '#0d99ff';
            ctx.lineWidth = 2 / this.engine.zoom;
            ctx.setLineDash([5 / this.engine.zoom, 5 / this.engine.zoom]);

            // Draw curved line
            const controlPoint1 = this.getControlPoint(sourcePoint, link.sourceHandle, 50);
            const controlPoint2 = this.getControlPoint(targetPoint, link.targetHandle, 50);

            ctx.beginPath();
            ctx.moveTo(sourcePoint.x, sourcePoint.y);
            ctx.bezierCurveTo(
                controlPoint1.x, controlPoint1.y,
                controlPoint2.x, controlPoint2.y,
                targetPoint.x, targetPoint.y
            );
            ctx.stroke();

            // Draw arrow at target
            this.drawArrow(ctx, controlPoint2, targetPoint);

            // Draw connection indicators
            ctx.fillStyle = '#0d99ff';
            ctx.beginPath();
            ctx.arc(sourcePoint.x, sourcePoint.y, 4 / this.engine.zoom, 0, Math.PI * 2);
            ctx.fill();

            ctx.beginPath();
            ctx.arc(targetPoint.x, targetPoint.y, 4 / this.engine.zoom, 0, Math.PI * 2);
            ctx.fill();
        });

        ctx.restore();
    }

    getHandlePosition(bounds, handle) {
        switch (handle) {
            case 'top':
                return { x: bounds.x + bounds.width / 2, y: bounds.y };
            case 'bottom':
                return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height };
            case 'left':
                return { x: bounds.x, y: bounds.y + bounds.height / 2 };
            case 'right':
            default:
                return { x: bounds.x + bounds.width, y: bounds.y + bounds.height / 2 };
        }
    }

    getControlPoint(point, handle, offset) {
        switch (handle) {
            case 'top':
                return { x: point.x, y: point.y - offset };
            case 'bottom':
                return { x: point.x, y: point.y + offset };
            case 'left':
                return { x: point.x - offset, y: point.y };
            case 'right':
            default:
                return { x: point.x + offset, y: point.y };
        }
    }

    drawArrow(ctx, from, to) {
        const angle = Math.atan2(to.y - from.y, to.x - from.x);
        const arrowSize = 8 / this.engine.zoom;

        ctx.save();
        ctx.setLineDash([]);
        ctx.fillStyle = '#0d99ff';

        ctx.translate(to.x, to.y);
        ctx.rotate(angle);

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-arrowSize, -arrowSize / 2);
        ctx.lineTo(-arrowSize, arrowSize / 2);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }

    // Preview mode
    enterPreviewMode(startFrameId = null) {
        this.isPreviewMode = true;
        this.history = [];
        this.historyIndex = -1;
        this.overlayStack = [];

        // Find starting frame
        if (startFrameId) {
            this.currentFrame = this.engine.shapes.find(s => s.id === startFrameId);
        } else {
            // Use first frame or selected shape
            this.currentFrame = this.engine.selectedShape || this.engine.shapes[0];
        }

        if (this.currentFrame) {
            this.history.push(this.currentFrame.id);
            this.historyIndex = 0;
        }

        return this.currentFrame;
    }

    exitPreviewMode() {
        this.isPreviewMode = false;
        this.currentFrame = null;
        this.overlayStack = [];
    }

    // Navigate to a frame
    async navigateTo(targetId, link = null) {
        const target = this.engine.shapes.find(s => s.id === targetId);
        if (!target) return;

        const animation = link ? link.animation : 'instant';
        const duration = link ? link.duration : 0;

        if (link && link.isOverlay) {
            // Add as overlay
            this.overlayStack.push({
                frame: target,
                link: link
            });
        } else {
            // Full navigation
            if (animation !== 'instant') {
                await this.animateTransition(this.currentFrame, target, animation, duration, link?.easing);
            }

            this.currentFrame = target;

            // Update history
            if (this.historyIndex < this.history.length - 1) {
                this.history = this.history.slice(0, this.historyIndex + 1);
            }
            this.history.push(targetId);
            this.historyIndex++;
        }

        return target;
    }

    // Close current overlay
    closeOverlay() {
        if (this.overlayStack.length > 0) {
            this.overlayStack.pop();
        }
    }

    // Navigate back
    goBack() {
        if (this.overlayStack.length > 0) {
            this.closeOverlay();
            return;
        }

        if (this.historyIndex > 0) {
            this.historyIndex--;
            const targetId = this.history[this.historyIndex];
            this.currentFrame = this.engine.shapes.find(s => s.id === targetId);
        }
    }

    // Animate transition between frames
    animateTransition(from, to, animation, duration, easing = 'ease-out') {
        return new Promise(resolve => {
            // For now, just resolve immediately
            // In a full implementation, this would animate the canvas
            setTimeout(resolve, duration);
        });
    }

    // Handle click in preview mode
    handleClick(x, y) {
        if (!this.isPreviewMode || !this.currentFrame) return;

        // Check overlays first (top to bottom)
        for (let i = this.overlayStack.length - 1; i >= 0; i--) {
            const overlay = this.overlayStack[i];

            if (overlay.frame.containsPoint(x, y)) {
                // Check for links within overlay
                const links = this.getLinksFromShape(overlay.frame.id);
                for (const link of links) {
                    if (link.trigger === 'click') {
                        this.navigateTo(link.targetId, link);
                        return;
                    }
                }
                return;
            } else if (overlay.link.closeOnOutsideClick) {
                this.closeOverlay();
                return;
            }
        }

        // Check current frame
        const clickedShape = this.findShapeAt(this.currentFrame, x, y);
        if (clickedShape) {
            const links = this.getLinksFromShape(clickedShape.id);
            for (const link of links) {
                if (link.trigger === 'click') {
                    this.navigateTo(link.targetId, link);
                    return;
                }
            }
        }
    }

    findShapeAt(frame, x, y) {
        // Check frame's children if it's a group/frame
        if (frame.children) {
            for (let i = frame.children.length - 1; i >= 0; i--) {
                const child = frame.children[i];
                if (child.containsPoint(x - frame.x, y - frame.y)) {
                    return child;
                }
            }
        }

        if (frame.containsPoint(x, y)) {
            return frame;
        }

        return null;
    }

    toJSON() {
        return {
            links: Array.from(this.links.values()).map(l => l.toJSON())
        };
    }

    static fromJSON(data, engine) {
        const manager = new PrototypeManager(engine);

        (data.links || []).forEach(linkData => {
            const link = PrototypeLink.fromJSON(linkData);
            manager.links.set(link.id, link);
        });

        return manager;
    }
}

// Animation presets
export const AnimationPresets = {
    instant: { duration: 0, easing: 'linear' },
    dissolve: { duration: 300, easing: 'ease-out' },
    slideLeft: { duration: 300, easing: 'ease-out' },
    slideRight: { duration: 300, easing: 'ease-out' },
    slideUp: { duration: 300, easing: 'ease-out' },
    slideDown: { duration: 300, easing: 'ease-out' },
    push: { duration: 300, easing: 'ease-out' },
    smartAnimate: { duration: 500, easing: 'ease-in-out' }
};

// Trigger types
export const TriggerTypes = {
    CLICK: 'click',
    HOVER: 'hover',
    MOUSE_ENTER: 'mouse-enter',
    MOUSE_LEAVE: 'mouse-leave',
    DRAG: 'drag',
    KEY_PRESS: 'keypress',
    AFTER_DELAY: 'after-delay'
};

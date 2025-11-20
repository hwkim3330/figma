/**
 * Layout Engine - Auto-layout and alignment tools
 */

export class LayoutEngine {
    constructor(engine) {
        this.engine = engine;
    }

    // Align selected shapes
    alignLeft() {
        const shapes = this.engine.getSelectedShapes();
        if (shapes.length < 2) return;

        const minX = Math.min(...shapes.map(s => s.getBounds().x));
        shapes.forEach(shape => {
            shape.x = minX + (shape.getBounds().width / 2);
        });

        this.engine.render();
    }

    alignRight() {
        const shapes = this.engine.getSelectedShapes();
        if (shapes.length < 2) return;

        const maxX = Math.max(...shapes.map(s => {
            const bounds = s.getBounds();
            return bounds.x + bounds.width;
        }));

        shapes.forEach(shape => {
            const bounds = shape.getBounds();
            shape.x = maxX - (bounds.width / 2);
        });

        this.engine.render();
    }

    alignTop() {
        const shapes = this.engine.getSelectedShapes();
        if (shapes.length < 2) return;

        const minY = Math.min(...shapes.map(s => s.getBounds().y));
        shapes.forEach(shape => {
            shape.y = minY + (shape.getBounds().height / 2);
        });

        this.engine.render();
    }

    alignBottom() {
        const shapes = this.engine.getSelectedShapes();
        if (shapes.length < 2) return;

        const maxY = Math.max(...shapes.map(s => {
            const bounds = s.getBounds();
            return bounds.y + bounds.height;
        }));

        shapes.forEach(shape => {
            const bounds = shape.getBounds();
            shape.y = maxY - (bounds.height / 2);
        });

        this.engine.render();
    }

    alignCenterHorizontal() {
        const shapes = this.engine.getSelectedShapes();
        if (shapes.length < 2) return;

        const avgY = shapes.reduce((sum, s) => sum + s.y, 0) / shapes.length;
        shapes.forEach(shape => {
            shape.y = avgY;
        });

        this.engine.render();
    }

    alignCenterVertical() {
        const shapes = this.engine.getSelectedShapes();
        if (shapes.length < 2) return;

        const avgX = shapes.reduce((sum, s) => sum + s.x, 0) / shapes.length;
        shapes.forEach(shape => {
            shape.x = avgX;
        });

        this.engine.render();
    }

    // Distribute shapes evenly
    distributeHorizontally() {
        const shapes = this.engine.getSelectedShapes();
        if (shapes.length < 3) return;

        // Sort by x position
        shapes.sort((a, b) => a.x - b.x);

        const first = shapes[0];
        const last = shapes[shapes.length - 1];
        const totalWidth = last.x - first.x;
        const gap = totalWidth / (shapes.length - 1);

        shapes.forEach((shape, index) => {
            if (index > 0 && index < shapes.length - 1) {
                shape.x = first.x + gap * index;
            }
        });

        this.engine.render();
    }

    distributeVertically() {
        const shapes = this.engine.getSelectedShapes();
        if (shapes.length < 3) return;

        // Sort by y position
        shapes.sort((a, b) => a.y - b.y);

        const first = shapes[0];
        const last = shapes[shapes.length - 1];
        const totalHeight = last.y - first.y;
        const gap = totalHeight / (shapes.length - 1);

        shapes.forEach((shape, index) => {
            if (index > 0 && index < shapes.length - 1) {
                shape.y = first.y + gap * index;
            }
        });

        this.engine.render();
    }

    // Auto-layout flowchart
    autoLayoutFlowchart(shapes, direction = 'vertical') {
        if (!shapes || shapes.length === 0) return;

        const gap = 100;
        const startX = 0;
        const startY = 0;

        if (direction === 'vertical') {
            let currentY = startY;
            shapes.forEach(shape => {
                shape.x = startX;
                shape.y = currentY;
                currentY += gap + (shape.getBounds ? shape.getBounds().height : 100);
            });
        } else {
            let currentX = startX;
            shapes.forEach(shape => {
                shape.x = currentX;
                shape.y = startY;
                currentX += gap + (shape.getBounds ? shape.getBounds().width : 100);
            });
        }

        this.engine.render();
    }

    // Grid layout
    layoutGrid(shapes, columns = 4) {
        if (!shapes || shapes.length === 0) return;

        const gapX = 120;
        const gapY = 120;
        const startX = 0;
        const startY = 0;

        shapes.forEach((shape, index) => {
            const col = index % columns;
            const row = Math.floor(index / columns);

            shape.x = startX + col * gapX;
            shape.y = startY + row * gapY;
        });

        this.engine.render();
    }

    // Circular layout
    layoutCircular(shapes, radius = 200) {
        if (!shapes || shapes.length === 0) return;

        const centerX = 0;
        const centerY = 0;
        const angleStep = (2 * Math.PI) / shapes.length;

        shapes.forEach((shape, index) => {
            const angle = angleStep * index - Math.PI / 2; // Start from top
            shape.x = centerX + radius * Math.cos(angle);
            shape.y = centerY + radius * Math.sin(angle);
        });

        this.engine.render();
    }

    // Hierarchical tree layout (for org charts, mind maps)
    layoutTree(rootShape, children, levelGap = 150, siblingGap = 100) {
        if (!rootShape || !children || children.length === 0) return;

        // Calculate total width needed
        const totalWidth = (children.length - 1) * siblingGap;
        const startX = rootShape.x - totalWidth / 2;
        const childY = rootShape.y + levelGap;

        children.forEach((child, index) => {
            child.x = startX + index * siblingGap;
            child.y = childY;
        });

        this.engine.render();
    }

    // Make same size
    makeSameWidth() {
        const shapes = this.engine.getSelectedShapes();
        if (shapes.length < 2) return;

        const avgWidth = shapes.reduce((sum, s) => {
            return sum + (s.width || s.size || s.radius * 2 || 50);
        }, 0) / shapes.length;

        shapes.forEach(shape => {
            if (shape.width !== undefined) {
                shape.width = avgWidth;
            } else if (shape.size !== undefined) {
                shape.size = avgWidth;
            } else if (shape.radius !== undefined) {
                shape.radius = avgWidth / 2;
            }
        });

        this.engine.render();
    }

    makeSameHeight() {
        const shapes = this.engine.getSelectedShapes();
        if (shapes.length < 2) return;

        const avgHeight = shapes.reduce((sum, s) => {
            return sum + (s.height || s.size || s.radius * 2 || 50);
        }, 0) / shapes.length;

        shapes.forEach(shape => {
            if (shape.height !== undefined) {
                shape.height = avgHeight;
            } else if (shape.size !== undefined) {
                shape.size = avgHeight;
            } else if (shape.radius !== undefined) {
                shape.radius = avgHeight / 2;
            }
        });

        this.engine.render();
    }

    makeSameSize() {
        this.makeSameWidth();
        this.makeSameHeight();
    }
}

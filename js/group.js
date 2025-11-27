// Group and Component System
import { Shape } from './canvas-engine.js';

export class Group extends Shape {
    constructor(shapes = [], properties = {}) {
        // Calculate center from shapes
        const bounds = Group.calculateBounds(shapes);
        super('group', bounds.x + bounds.width / 2, bounds.y + bounds.height / 2, properties);

        this.children = [];
        this.width = bounds.width;
        this.height = bounds.height;

        // Add shapes and convert coordinates to local
        shapes.forEach(shape => {
            this.addChild(shape);
        });
    }

    static calculateBounds(shapes) {
        if (shapes.length === 0) {
            return { x: 0, y: 0, width: 100, height: 100 };
        }

        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;

        shapes.forEach(shape => {
            const bounds = shape.getBounds();
            minX = Math.min(minX, bounds.x);
            minY = Math.min(minY, bounds.y);
            maxX = Math.max(maxX, bounds.x + bounds.width);
            maxY = Math.max(maxY, bounds.y + bounds.height);
        });

        return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
        };
    }

    addChild(shape) {
        // Convert to local coordinates
        shape.x = shape.x - this.x;
        shape.y = shape.y - this.y;
        shape.parent = this;
        this.children.push(shape);
    }

    removeChild(shape) {
        const index = this.children.indexOf(shape);
        if (index > -1) {
            // Convert back to world coordinates
            shape.x = shape.x + this.x;
            shape.y = shape.y + this.y;
            shape.parent = null;
            this.children.splice(index, 1);
            this.updateBounds();
        }
    }

    updateBounds() {
        if (this.children.length === 0) return;

        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;

        this.children.forEach(child => {
            const bounds = child.getBounds();
            // bounds are in local space
            minX = Math.min(minX, bounds.x);
            minY = Math.min(minY, bounds.y);
            maxX = Math.max(maxX, bounds.x + bounds.width);
            maxY = Math.max(maxY, bounds.y + bounds.height);
        });

        this.width = maxX - minX;
        this.height = maxY - minY;
    }

    drawShape(ctx) {
        // Draw all children
        this.children.forEach(child => {
            ctx.save();
            ctx.globalAlpha = this.opacity * (child.opacity || 1);
            child.draw(ctx);
            ctx.restore();
        });
    }

    containsPoint(px, py) {
        const dx = px - this.x;
        const dy = py - this.y;

        // Check each child
        for (const child of this.children) {
            if (child.containsPoint(dx, dy)) {
                return true;
            }
        }

        return false;
    }

    getChildAt(px, py) {
        const dx = px - this.x;
        const dy = py - this.y;

        for (let i = this.children.length - 1; i >= 0; i--) {
            if (this.children[i].containsPoint(dx, dy)) {
                return this.children[i];
            }
        }

        return null;
    }

    getBounds() {
        return {
            x: this.x - this.width / 2,
            y: this.y - this.height / 2,
            width: this.width,
            height: this.height
        };
    }

    // Ungroup - returns children with world coordinates
    ungroup() {
        const shapes = this.children.map(child => {
            child.x = child.x + this.x;
            child.y = child.y + this.y;
            child.parent = null;
            return child;
        });

        this.children = [];
        return shapes;
    }

    toJSON() {
        return {
            ...super.toJSON(),
            width: this.width,
            height: this.height,
            children: this.children.map(child => child.toJSON())
        };
    }

    toSVG() {
        let svg = `<g transform="translate(${this.x}, ${this.y}) rotate(${this.rotation})">`;
        this.children.forEach(child => {
            svg += child.toSVG();
        });
        svg += '</g>';
        return svg;
    }

    static fromJSON(data) {
        // Need to reconstruct children first
        const children = data.children.map(childData => {
            // This would need access to the shape factory
            return Shape.fromJSON(childData);
        }).filter(c => c !== null);

        const group = new Group([], data);
        group.children = children;
        group.width = data.width;
        group.height = data.height;
        return group;
    }
}

// Component - reusable design element
export class Component extends Group {
    constructor(shapes = [], properties = {}) {
        super(shapes, properties);
        this.type = 'component';
        this.name = properties.name || 'Component';
        this.description = properties.description || '';
        this.variants = new Map();
        this.properties = properties.componentProperties || {};
        this.isMainComponent = properties.isMainComponent !== false;
    }

    // Create an instance of this component
    createInstance() {
        const instance = new ComponentInstance(this);
        return instance;
    }

    // Add a variant
    addVariant(name, overrides = {}) {
        this.variants.set(name, overrides);
    }

    toJSON() {
        return {
            ...super.toJSON(),
            name: this.name,
            description: this.description,
            variants: Object.fromEntries(this.variants),
            componentProperties: this.properties,
            isMainComponent: this.isMainComponent
        };
    }
}

// Component Instance - linked copy of a component
export class ComponentInstance extends Shape {
    constructor(mainComponent, properties = {}) {
        const bounds = mainComponent.getBounds();
        super('componentInstance', mainComponent.x, mainComponent.y, properties);

        this.mainComponent = mainComponent;
        this.mainComponentId = mainComponent.id;
        this.width = bounds.width;
        this.height = bounds.height;
        this.overrides = properties.overrides || {};
        this.currentVariant = properties.currentVariant || null;
    }

    // Apply override to a specific property
    setOverride(path, value) {
        this.overrides[path] = value;
    }

    // Remove an override
    removeOverride(path) {
        delete this.overrides[path];
    }

    // Reset all overrides
    resetOverrides() {
        this.overrides = {};
    }

    // Set variant
    setVariant(variantName) {
        if (this.mainComponent.variants.has(variantName)) {
            this.currentVariant = variantName;
            this.overrides = {
                ...this.overrides,
                ...this.mainComponent.variants.get(variantName)
            };
        }
    }

    drawShape(ctx) {
        // Draw main component with overrides applied
        ctx.save();

        // Apply instance transform
        ctx.translate(this.x - this.mainComponent.x, this.y - this.mainComponent.y);

        // Draw with overrides
        const originalProps = {};

        // Apply overrides temporarily
        for (const [path, value] of Object.entries(this.overrides)) {
            const parts = path.split('.');
            let obj = this.mainComponent;

            for (let i = 0; i < parts.length - 1; i++) {
                obj = obj[parts[i]];
                if (!obj) break;
            }

            if (obj) {
                const lastPart = parts[parts.length - 1];
                originalProps[path] = obj[lastPart];
                obj[lastPart] = value;
            }
        }

        // Draw component
        this.mainComponent.draw(ctx);

        // Restore original properties
        for (const [path, value] of Object.entries(originalProps)) {
            const parts = path.split('.');
            let obj = this.mainComponent;

            for (let i = 0; i < parts.length - 1; i++) {
                obj = obj[parts[i]];
                if (!obj) break;
            }

            if (obj) {
                obj[parts[parts.length - 1]] = value;
            }
        }

        // Draw instance indicator
        ctx.strokeStyle = '#9747ff';
        ctx.lineWidth = 2 / (ctx.getTransform().a || 1);
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(
            -this.width / 2,
            -this.height / 2,
            this.width,
            this.height
        );

        ctx.restore();
    }

    containsPoint(px, py) {
        const dx = px - this.x;
        const dy = py - this.y;
        return Math.abs(dx) <= this.width / 2 && Math.abs(dy) <= this.height / 2;
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
            mainComponentId: this.mainComponentId,
            width: this.width,
            height: this.height,
            overrides: this.overrides,
            currentVariant: this.currentVariant
        };
    }
}

// Component Library
export class ComponentLibrary {
    constructor() {
        this.components = new Map();
        this.categories = new Map();
    }

    add(component, category = 'Uncategorized') {
        this.components.set(component.id, component);

        if (!this.categories.has(category)) {
            this.categories.set(category, []);
        }
        this.categories.get(category).push(component.id);
    }

    get(id) {
        return this.components.get(id);
    }

    remove(id) {
        const component = this.components.get(id);
        if (component) {
            this.components.delete(id);

            // Remove from category
            this.categories.forEach((ids, category) => {
                const index = ids.indexOf(id);
                if (index > -1) {
                    ids.splice(index, 1);
                }
            });
        }
    }

    getByCategory(category) {
        const ids = this.categories.get(category) || [];
        return ids.map(id => this.components.get(id)).filter(c => c);
    }

    getAllCategories() {
        return Array.from(this.categories.keys());
    }

    search(query) {
        const lowerQuery = query.toLowerCase();
        return Array.from(this.components.values()).filter(component =>
            component.name.toLowerCase().includes(lowerQuery) ||
            component.description.toLowerCase().includes(lowerQuery)
        );
    }

    toJSON() {
        return {
            components: Array.from(this.components.entries()).map(([id, comp]) => ({
                id,
                data: comp.toJSON()
            })),
            categories: Object.fromEntries(this.categories)
        };
    }

    static fromJSON(data) {
        const library = new ComponentLibrary();

        data.components.forEach(({ id, data: compData }) => {
            const component = Component.fromJSON(compData);
            library.components.set(id, component);
        });

        library.categories = new Map(Object.entries(data.categories));

        return library;
    }
}

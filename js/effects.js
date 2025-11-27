// Effects System - Shadows, Blur, Gradients, Blend Modes

export class GradientFill {
    constructor(type = 'linear', stops = [], angle = 0) {
        this.type = type; // 'linear', 'radial', 'angular', 'diamond'
        this.stops = stops.length > 0 ? stops : [
            { offset: 0, color: '#0d99ff' },
            { offset: 1, color: '#7c3aed' }
        ];
        this.angle = angle; // degrees for linear gradient
        this.centerX = 0.5; // 0-1, center for radial
        this.centerY = 0.5;
        this.radius = 0.5; // for radial gradient
    }

    createCanvasGradient(ctx, x, y, width, height) {
        let gradient;

        switch (this.type) {
            case 'linear': {
                const angleRad = (this.angle - 90) * Math.PI / 180;
                const cos = Math.cos(angleRad);
                const sin = Math.sin(angleRad);
                const halfW = width / 2;
                const halfH = height / 2;

                gradient = ctx.createLinearGradient(
                    x - cos * halfW,
                    y - sin * halfH,
                    x + cos * halfW,
                    y + sin * halfH
                );
                break;
            }

            case 'radial': {
                const cx = x + (this.centerX - 0.5) * width;
                const cy = y + (this.centerY - 0.5) * height;
                const r = Math.max(width, height) * this.radius;

                gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
                break;
            }

            case 'angular': {
                // Angular gradient requires manual implementation
                // For now, fall back to linear
                gradient = ctx.createLinearGradient(x - width / 2, y, x + width / 2, y);
                break;
            }

            default:
                gradient = ctx.createLinearGradient(x - width / 2, y, x + width / 2, y);
        }

        this.stops.forEach(stop => {
            gradient.addColorStop(stop.offset, stop.color);
        });

        return gradient;
    }

    addStop(offset, color) {
        this.stops.push({ offset, color });
        this.stops.sort((a, b) => a.offset - b.offset);
    }

    removeStop(index) {
        if (this.stops.length > 2) {
            this.stops.splice(index, 1);
        }
    }

    toJSON() {
        return {
            type: this.type,
            stops: this.stops,
            angle: this.angle,
            centerX: this.centerX,
            centerY: this.centerY,
            radius: this.radius
        };
    }

    static fromJSON(data) {
        const gradient = new GradientFill(data.type, data.stops, data.angle);
        gradient.centerX = data.centerX || 0.5;
        gradient.centerY = data.centerY || 0.5;
        gradient.radius = data.radius || 0.5;
        return gradient;
    }

    toCSS() {
        const colors = this.stops.map(s => `${s.color} ${s.offset * 100}%`).join(', ');

        switch (this.type) {
            case 'linear':
                return `linear-gradient(${this.angle}deg, ${colors})`;
            case 'radial':
                return `radial-gradient(circle at ${this.centerX * 100}% ${this.centerY * 100}%, ${colors})`;
            default:
                return `linear-gradient(${this.angle}deg, ${colors})`;
        }
    }
}

export class Shadow {
    constructor(options = {}) {
        this.type = options.type || 'drop'; // 'drop', 'inner'
        this.color = options.color || 'rgba(0, 0, 0, 0.25)';
        this.offsetX = options.offsetX || 0;
        this.offsetY = options.offsetY || 4;
        this.blur = options.blur || 8;
        this.spread = options.spread || 0;
        this.visible = options.visible !== false;
    }

    apply(ctx) {
        if (!this.visible) return;

        ctx.shadowColor = this.color;
        ctx.shadowOffsetX = this.offsetX;
        ctx.shadowOffsetY = this.offsetY;
        ctx.shadowBlur = this.blur;
    }

    clear(ctx) {
        ctx.shadowColor = 'transparent';
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.shadowBlur = 0;
    }

    toJSON() {
        return {
            type: this.type,
            color: this.color,
            offsetX: this.offsetX,
            offsetY: this.offsetY,
            blur: this.blur,
            spread: this.spread,
            visible: this.visible
        };
    }

    static fromJSON(data) {
        return new Shadow(data);
    }

    toCSS() {
        if (!this.visible) return 'none';

        const inset = this.type === 'inner' ? 'inset ' : '';
        return `${inset}${this.offsetX}px ${this.offsetY}px ${this.blur}px ${this.spread}px ${this.color}`;
    }
}

export class BlurEffect {
    constructor(options = {}) {
        this.type = options.type || 'layer'; // 'layer', 'background'
        this.amount = options.amount || 8;
        this.visible = options.visible !== false;
    }

    apply(ctx) {
        if (!this.visible || this.amount === 0) return;
        ctx.filter = `blur(${this.amount}px)`;
    }

    clear(ctx) {
        ctx.filter = 'none';
    }

    toJSON() {
        return {
            type: this.type,
            amount: this.amount,
            visible: this.visible
        };
    }

    static fromJSON(data) {
        return new BlurEffect(data);
    }
}

// Blend modes supported by canvas
export const BlendModes = {
    NORMAL: 'source-over',
    MULTIPLY: 'multiply',
    SCREEN: 'screen',
    OVERLAY: 'overlay',
    DARKEN: 'darken',
    LIGHTEN: 'lighten',
    COLOR_DODGE: 'color-dodge',
    COLOR_BURN: 'color-burn',
    HARD_LIGHT: 'hard-light',
    SOFT_LIGHT: 'soft-light',
    DIFFERENCE: 'difference',
    EXCLUSION: 'exclusion',
    HUE: 'hue',
    SATURATION: 'saturation',
    COLOR: 'color',
    LUMINOSITY: 'luminosity'
};

// Effects container for a shape
export class ShapeEffects {
    constructor() {
        this.fills = []; // Can have multiple fills
        this.strokes = []; // Can have multiple strokes
        this.shadows = [];
        this.innerShadows = [];
        this.blur = null;
        this.blendMode = BlendModes.NORMAL;
    }

    addFill(fill) {
        this.fills.push(fill);
    }

    addStroke(stroke) {
        this.strokes.push(stroke);
    }

    addShadow(shadow) {
        if (shadow.type === 'inner') {
            this.innerShadows.push(shadow);
        } else {
            this.shadows.push(shadow);
        }
    }

    setBlur(blur) {
        this.blur = blur;
    }

    apply(ctx, shape) {
        // Apply blend mode
        ctx.globalCompositeOperation = this.blendMode;

        // Apply blur
        if (this.blur && this.blur.visible) {
            this.blur.apply(ctx);
        }

        // Apply outer shadows (drawn before shape)
        this.shadows.forEach(shadow => {
            if (shadow.visible) {
                shadow.apply(ctx);
            }
        });
    }

    cleanup(ctx) {
        ctx.globalCompositeOperation = BlendModes.NORMAL;
        ctx.filter = 'none';
        ctx.shadowColor = 'transparent';
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.shadowBlur = 0;
    }

    toJSON() {
        return {
            fills: this.fills.map(f => f instanceof GradientFill ? f.toJSON() : f),
            strokes: this.strokes,
            shadows: this.shadows.map(s => s.toJSON()),
            innerShadows: this.innerShadows.map(s => s.toJSON()),
            blur: this.blur ? this.blur.toJSON() : null,
            blendMode: this.blendMode
        };
    }

    static fromJSON(data) {
        const effects = new ShapeEffects();

        effects.fills = (data.fills || []).map(f =>
            f.type && f.stops ? GradientFill.fromJSON(f) : f
        );
        effects.strokes = data.strokes || [];
        effects.shadows = (data.shadows || []).map(s => Shadow.fromJSON(s));
        effects.innerShadows = (data.innerShadows || []).map(s => Shadow.fromJSON(s));
        effects.blur = data.blur ? BlurEffect.fromJSON(data.blur) : null;
        effects.blendMode = data.blendMode || BlendModes.NORMAL;

        return effects;
    }
}

// Preset gradients
export const GradientPresets = {
    sunset: new GradientFill('linear', [
        { offset: 0, color: '#ff6b6b' },
        { offset: 0.5, color: '#feca57' },
        { offset: 1, color: '#48dbfb' }
    ], 45),

    ocean: new GradientFill('linear', [
        { offset: 0, color: '#667eea' },
        { offset: 1, color: '#764ba2' }
    ], 135),

    forest: new GradientFill('linear', [
        { offset: 0, color: '#11998e' },
        { offset: 1, color: '#38ef7d' }
    ], 90),

    fire: new GradientFill('radial', [
        { offset: 0, color: '#f12711' },
        { offset: 1, color: '#f5af19' }
    ]),

    midnight: new GradientFill('linear', [
        { offset: 0, color: '#232526' },
        { offset: 1, color: '#414345' }
    ], 180),

    rainbow: new GradientFill('linear', [
        { offset: 0, color: '#ff0000' },
        { offset: 0.17, color: '#ff8000' },
        { offset: 0.33, color: '#ffff00' },
        { offset: 0.5, color: '#00ff00' },
        { offset: 0.67, color: '#0080ff' },
        { offset: 0.83, color: '#8000ff' },
        { offset: 1, color: '#ff0080' }
    ], 90)
};

// Shadow presets
export const ShadowPresets = {
    small: new Shadow({ offsetX: 0, offsetY: 1, blur: 3, color: 'rgba(0,0,0,0.12)' }),
    medium: new Shadow({ offsetX: 0, offsetY: 4, blur: 6, color: 'rgba(0,0,0,0.1)' }),
    large: new Shadow({ offsetX: 0, offsetY: 10, blur: 15, color: 'rgba(0,0,0,0.1)' }),
    xl: new Shadow({ offsetX: 0, offsetY: 20, blur: 25, color: 'rgba(0,0,0,0.15)' }),
    inner: new Shadow({ type: 'inner', offsetX: 0, offsetY: 2, blur: 4, color: 'rgba(0,0,0,0.1)' }),
    glow: new Shadow({ offsetX: 0, offsetY: 0, blur: 20, color: 'rgba(13, 153, 255, 0.5)' })
};

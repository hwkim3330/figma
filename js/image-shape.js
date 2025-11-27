// Image Shape - Import and manipulate images
import { Shape } from './canvas-engine.js';

export class ImageShape extends Shape {
    constructor(x, y, width, height, properties = {}) {
        super('image', x, y, properties);
        this.width = width || 100;
        this.height = height || 100;
        this.src = properties.src || '';
        this.image = null;
        this.loaded = false;
        this.preserveAspectRatio = properties.preserveAspectRatio !== false;
        this.fit = properties.fit || 'contain'; // 'contain', 'cover', 'fill'
        this.filters = properties.filters || {
            brightness: 100,
            contrast: 100,
            saturation: 100,
            blur: 0,
            grayscale: 0,
            sepia: 0,
            hueRotate: 0
        };

        if (this.src) {
            this.loadImage(this.src);
        }
    }

    loadImage(src) {
        return new Promise((resolve, reject) => {
            this.image = new Image();
            this.image.crossOrigin = 'anonymous';

            this.image.onload = () => {
                this.loaded = true;

                if (this.preserveAspectRatio && this.width === 100 && this.height === 100) {
                    // Set initial size based on image
                    const maxSize = 400;
                    const ratio = this.image.width / this.image.height;

                    if (this.image.width > this.image.height) {
                        this.width = Math.min(this.image.width, maxSize);
                        this.height = this.width / ratio;
                    } else {
                        this.height = Math.min(this.image.height, maxSize);
                        this.width = this.height * ratio;
                    }
                }

                resolve(this);
            };

            this.image.onerror = () => {
                this.loaded = false;
                reject(new Error('Failed to load image'));
            };

            this.src = src;
            this.image.src = src;
        });
    }

    getFilterString() {
        const f = this.filters;
        const filters = [];

        if (f.brightness !== 100) filters.push(`brightness(${f.brightness}%)`);
        if (f.contrast !== 100) filters.push(`contrast(${f.contrast}%)`);
        if (f.saturation !== 100) filters.push(`saturate(${f.saturation}%)`);
        if (f.blur > 0) filters.push(`blur(${f.blur}px)`);
        if (f.grayscale > 0) filters.push(`grayscale(${f.grayscale}%)`);
        if (f.sepia > 0) filters.push(`sepia(${f.sepia}%)`);
        if (f.hueRotate !== 0) filters.push(`hue-rotate(${f.hueRotate}deg)`);

        return filters.join(' ');
    }

    drawShape(ctx) {
        if (!this.loaded || !this.image) {
            // Draw placeholder
            ctx.fillStyle = '#f0f0f0';
            ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);

            ctx.strokeStyle = '#ccc';
            ctx.lineWidth = 2;
            ctx.strokeRect(-this.width / 2, -this.height / 2, this.width, this.height);

            // Draw X
            ctx.beginPath();
            ctx.moveTo(-this.width / 2, -this.height / 2);
            ctx.lineTo(this.width / 2, this.height / 2);
            ctx.moveTo(this.width / 2, -this.height / 2);
            ctx.lineTo(-this.width / 2, this.height / 2);
            ctx.stroke();

            // Draw icon
            ctx.fillStyle = '#999';
            ctx.font = '14px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('Image', 0, 0);

            return;
        }

        // Apply filters
        const filterStr = this.getFilterString();
        if (filterStr) {
            ctx.filter = filterStr;
        }

        // Apply corner radius clipping
        if (this.cornerRadius > 0) {
            ctx.save();
            this.drawRoundedRect(ctx, -this.width / 2, -this.height / 2, this.width, this.height, this.cornerRadius);
            ctx.clip();
        }

        // Calculate draw dimensions based on fit mode
        let drawX = -this.width / 2;
        let drawY = -this.height / 2;
        let drawWidth = this.width;
        let drawHeight = this.height;

        if (this.fit === 'contain' || this.fit === 'cover') {
            const imgRatio = this.image.width / this.image.height;
            const boxRatio = this.width / this.height;

            if ((this.fit === 'contain' && imgRatio > boxRatio) ||
                (this.fit === 'cover' && imgRatio < boxRatio)) {
                drawWidth = this.width;
                drawHeight = this.width / imgRatio;
            } else {
                drawHeight = this.height;
                drawWidth = this.height * imgRatio;
            }

            drawX = -drawWidth / 2;
            drawY = -drawHeight / 2;
        }

        ctx.drawImage(this.image, drawX, drawY, drawWidth, drawHeight);

        // Reset filter
        ctx.filter = 'none';

        if (this.cornerRadius > 0) {
            ctx.restore();
        }

        // Draw stroke if any
        if (this.strokeWidth > 0) {
            ctx.strokeStyle = this.strokeColor;
            ctx.lineWidth = this.strokeWidth;

            if (this.cornerRadius > 0) {
                this.drawRoundedRect(ctx, -this.width / 2, -this.height / 2, this.width, this.height, this.cornerRadius);
                ctx.stroke();
            } else {
                ctx.strokeRect(-this.width / 2, -this.height / 2, this.width, this.height);
            }
        }
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
            height: this.height,
            src: this.src,
            fit: this.fit,
            preserveAspectRatio: this.preserveAspectRatio,
            filters: this.filters
        };
    }

    toSVG() {
        return `<image x="${this.x - this.width / 2}" y="${this.y - this.height / 2}" width="${this.width}" height="${this.height}" href="${this.src}" transform="rotate(${this.rotation} ${this.x} ${this.y})"/>`;
    }

    static fromJSON(data) {
        return new ImageShape(data.x, data.y, data.width, data.height, data);
    }
}

// Image import handler
export class ImageImporter {
    constructor(engine) {
        this.engine = engine;
    }

    async importFromFile(file, x = 0, y = 0) {
        return new Promise((resolve, reject) => {
            if (!file.type.startsWith('image/')) {
                reject(new Error('Not an image file'));
                return;
            }

            const reader = new FileReader();

            reader.onload = async (e) => {
                try {
                    const imageShape = new ImageShape(x, y, 100, 100, {
                        fillColor: 'transparent',
                        strokeWidth: 0
                    });

                    await imageShape.loadImage(e.target.result);
                    this.engine.addShape(imageShape);
                    resolve(imageShape);
                } catch (err) {
                    reject(err);
                }
            };

            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(file);
        });
    }

    async importFromURL(url, x = 0, y = 0) {
        const imageShape = new ImageShape(x, y, 100, 100, {
            fillColor: 'transparent',
            strokeWidth: 0
        });

        await imageShape.loadImage(url);
        this.engine.addShape(imageShape);
        return imageShape;
    }

    async importFromClipboard(x = 0, y = 0) {
        try {
            const items = await navigator.clipboard.read();

            for (const item of items) {
                if (item.types.includes('image/png') || item.types.includes('image/jpeg')) {
                    const blob = await item.getType(item.types.find(t => t.startsWith('image/')));
                    const file = new File([blob], 'clipboard-image.png', { type: blob.type });
                    return this.importFromFile(file, x, y);
                }
            }

            throw new Error('No image in clipboard');
        } catch (err) {
            throw err;
        }
    }

    setupDragAndDrop(element) {
        element.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
        });

        element.addEventListener('drop', async (e) => {
            e.preventDefault();

            const rect = element.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;

            const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));

            for (const file of files) {
                try {
                    await this.importFromFile(file, x, y);
                } catch (err) {
                    console.error('Failed to import image:', err);
                }
            }

            // Handle URL drops
            const url = e.dataTransfer.getData('text/uri-list');
            if (url && (url.endsWith('.png') || url.endsWith('.jpg') || url.endsWith('.jpeg') || url.endsWith('.gif') || url.endsWith('.webp'))) {
                try {
                    await this.importFromURL(url, x, y);
                } catch (err) {
                    console.error('Failed to import image from URL:', err);
                }
            }
        });
    }
}

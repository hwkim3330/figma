import { CanvasEngine, Rectangle, Circle, Line, Text } from './canvas-engine.js';
import { History, createAddShapeAction, createRemoveShapeAction, createModifyShapeAction } from './history.js';
import { Collaboration } from './collaboration.js';
import { LayerManager } from './layers.js';

// Export shape classes to window for collaboration
window.Rectangle = Rectangle;
window.Circle = Circle;
window.Line = Line;
window.Text = Text;

class DesignApp {
    constructor() {
        this.engine = new CanvasEngine('canvas');
        this.history = new History();
        this.collaboration = new Collaboration(this.engine);
        this.layerManager = new LayerManager(this.engine, 'layers-panel');

        this.currentTool = 'select';
        this.isDrawing = false;
        this.drawStart = null;
        this.tempShape = null;
        this.isDragging = false;
        this.dragStart = null;
        this.draggedShape = null;
        this.isPanning = false;
        this.panStart = null;

        this.fillColor = '#3b82f6';
        this.strokeColor = '#000000';
        this.strokeWidth = 2;

        this.init();
    }

    async init() {
        this.setupToolbar();
        this.setupCanvas();
        this.setupProperties();
        this.setupKeyboardShortcuts();
        this.setupShare();
        this.setupExport();

        // Initialize collaboration
        try {
            const peerId = await this.collaboration.init();
            document.getElementById('my-peer-id').textContent = `Your ID: ${peerId}`;

            this.collaboration.onConnectionChange = () => {
                this.updateConnectionStatus();
            };
        } catch (err) {
            console.error('Failed to initialize collaboration:', err);
            document.getElementById('my-peer-id').textContent = 'Collaboration unavailable';
        }

        // Update layer manager callback
        this.layerManager.onSelectionChange = (shape) => {
            this.updateProperties(shape);
        };

        console.log('DesignFlow initialized!');
    }

    setupToolbar() {
        // Tool buttons
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentTool = btn.dataset.tool;
                this.updateCursor();
            });
        });

        // Zoom controls
        document.getElementById('zoom-in-btn').addEventListener('click', () => {
            this.engine.zoomIn();
            this.updateZoomLevel();
        });

        document.getElementById('zoom-out-btn').addEventListener('click', () => {
            this.engine.zoomOut();
            this.updateZoomLevel();
        });

        document.getElementById('zoom-fit-btn').addEventListener('click', () => {
            this.engine.zoomToFit();
            this.updateZoomLevel();
        });

        // Undo/Redo
        document.getElementById('undo-btn').addEventListener('click', () => this.undo());
        document.getElementById('redo-btn').addEventListener('click', () => this.redo());

        // Collaboration
        document.getElementById('connect-btn').addEventListener('click', () => {
            const peerId = document.getElementById('peer-id-input').value.trim();
            if (peerId) {
                this.collaboration.connectToPeer(peerId);
                document.getElementById('peer-id-input').value = '';
            }
        });

        // Delete layer
        document.getElementById('delete-layer-btn').addEventListener('click', () => {
            const shape = this.layerManager.deleteSelected();
            if (shape) {
                const action = createRemoveShapeAction(this.engine, shape);
                this.history.push(action);
                this.collaboration.broadcastShapeRemove(shape);
            }
        });

        this.updateUndoRedoButtons();
    }

    setupCanvas() {
        const canvas = this.engine.canvas;

        canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        canvas.addEventListener('wheel', (e) => this.handleWheel(e));

        // Context menu
        canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });
    }

    setupProperties() {
        // Fill color
        document.getElementById('fill-color').addEventListener('input', (e) => {
            this.fillColor = e.target.value;
            document.getElementById('fill-color-text').value = e.target.value;
            this.updateSelectedShapeProperty('fillColor', e.target.value);
        });

        document.getElementById('fill-color-text').addEventListener('input', (e) => {
            const color = e.target.value;
            if (/^#[0-9A-F]{6}$/i.test(color)) {
                this.fillColor = color;
                document.getElementById('fill-color').value = color;
                this.updateSelectedShapeProperty('fillColor', color);
            }
        });

        // Stroke color
        document.getElementById('stroke-color').addEventListener('input', (e) => {
            this.strokeColor = e.target.value;
            document.getElementById('stroke-color-text').value = e.target.value;
            this.updateSelectedShapeProperty('strokeColor', e.target.value);
        });

        document.getElementById('stroke-color-text').addEventListener('input', (e) => {
            const color = e.target.value;
            if (/^#[0-9A-F]{6}$/i.test(color)) {
                this.strokeColor = color;
                document.getElementById('stroke-color').value = color;
                this.updateSelectedShapeProperty('strokeColor', color);
            }
        });

        // Stroke width
        document.getElementById('stroke-width').addEventListener('input', (e) => {
            this.strokeWidth = parseInt(e.target.value);
            document.getElementById('stroke-width-value').textContent = this.strokeWidth + 'px';
            this.updateSelectedShapeProperty('strokeWidth', this.strokeWidth);
        });

        // Transform properties
        ['pos-x', 'pos-y', 'size-w', 'size-h'].forEach(id => {
            document.getElementById(id).addEventListener('input', (e) => {
                this.updateSelectedShapeTransform();
            });
        });

        // Rotation
        document.getElementById('rotation').addEventListener('input', (e) => {
            const rotation = parseInt(e.target.value);
            document.getElementById('rotation-value').textContent = rotation + '°';
            this.updateSelectedShapeProperty('rotation', rotation);
        });

        // Text properties
        document.getElementById('font-size').addEventListener('input', (e) => {
            const fontSize = parseInt(e.target.value);
            document.getElementById('font-size-value').textContent = fontSize + 'px';
            this.updateSelectedShapeProperty('fontSize', fontSize);
        });

        document.getElementById('font-family').addEventListener('change', (e) => {
            this.updateSelectedShapeProperty('fontFamily', e.target.value);
        });
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Undo/Redo
            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'z') {
                    e.preventDefault();
                    this.undo();
                } else if (e.key === 'y') {
                    e.preventDefault();
                    this.redo();
                }
            }

            // Tool shortcuts
            if (!e.ctrlKey && !e.metaKey) {
                switch (e.key.toLowerCase()) {
                    case 'v':
                        this.selectTool('select');
                        break;
                    case 'r':
                        this.selectTool('rectangle');
                        break;
                    case 'c':
                        this.selectTool('circle');
                        break;
                    case 'l':
                        this.selectTool('line');
                        break;
                    case 't':
                        this.selectTool('text');
                        break;
                    case 'p':
                        this.selectTool('pen');
                        break;
                }
            }

            // Delete
            if (e.key === 'Delete' || e.key === 'Backspace') {
                if (this.engine.selectedShape) {
                    e.preventDefault();
                    const shape = this.layerManager.deleteSelected();
                    if (shape) {
                        const action = createRemoveShapeAction(this.engine, shape);
                        this.history.push(action);
                        this.collaboration.broadcastShapeRemove(shape);
                    }
                }
            }

            // Zoom
            if (e.key === '+' || e.key === '=') {
                e.preventDefault();
                this.engine.zoomIn();
                this.updateZoomLevel();
            } else if (e.key === '-' || e.key === '_') {
                e.preventDefault();
                this.engine.zoomOut();
                this.updateZoomLevel();
            }

            // Deselect
            if (e.key === 'Escape') {
                this.engine.deselectAll();
                this.layerManager.update();
                this.updateProperties(null);
            }
        });
    }

    setupShare() {
        const shareBtn = document.getElementById('share-btn');
        const shareModal = document.getElementById('share-modal');
        const closeBtn = document.getElementById('close-share-modal');

        shareBtn.addEventListener('click', () => {
            this.openShareModal();
        });

        closeBtn.addEventListener('click', () => {
            shareModal.classList.remove('active');
        });

        shareModal.addEventListener('click', (e) => {
            if (e.target === shareModal) {
                shareModal.classList.remove('active');
            }
        });

        // Copy ID button
        document.getElementById('copy-id-btn').addEventListener('click', async () => {
            const id = this.collaboration.myId;
            if (id) {
                try {
                    await navigator.clipboard.writeText(id);
                    this.showCopyFeedback('copy-id-btn');
                } catch (err) {
                    console.error('Failed to copy ID:', err);
                }
            }
        });

        // Copy URL button
        document.getElementById('copy-url-btn').addEventListener('click', async () => {
            const url = this.collaboration.getShareURL();
            if (url) {
                try {
                    await navigator.clipboard.writeText(url);
                    this.showCopyFeedback('copy-url-btn');
                } catch (err) {
                    console.error('Failed to copy URL:', err);
                }
            }
        });

        // Download QR code button
        document.getElementById('download-qr-btn').addEventListener('click', () => {
            const canvas = document.getElementById('qr-canvas');
            const url = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.download = `designflow-qr-${Date.now()}.png`;
            link.href = url;
            link.click();
        });
    }

    openShareModal() {
        const modal = document.getElementById('share-modal');
        const myId = this.collaboration.myId;
        const shareURL = this.collaboration.getShareURL();

        if (!myId) {
            alert('Collaboration not initialized yet. Please wait...');
            return;
        }

        // Update ID display
        document.getElementById('my-id-display').value = myId;
        document.getElementById('share-url-display').value = shareURL;

        // Generate QR code
        const canvas = document.getElementById('qr-canvas');
        const qr = new QRious({
            element: canvas,
            value: shareURL,
            size: 256,
            level: 'H',
            background: 'white',
            foreground: 'black'
        });

        modal.classList.add('active');
    }

    showCopyFeedback(buttonId) {
        const btn = document.getElementById(buttonId);
        const originalText = btn.innerHTML;
        btn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"/>
            </svg>
            Copied!
        `;
        btn.style.background = 'var(--accent-green)';

        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.style.background = '';
        }, 2000);
    }

    setupExport() {
        const exportBtn = document.getElementById('export-btn');
        const exportModal = document.getElementById('export-modal');
        const closeBtn = document.getElementById('close-export-modal');

        exportBtn.addEventListener('click', () => {
            exportModal.classList.add('active');
        });

        closeBtn.addEventListener('click', () => {
            exportModal.classList.remove('active');
        });

        exportModal.addEventListener('click', (e) => {
            if (e.target === exportModal) {
                exportModal.classList.remove('active');
            }
        });

        document.getElementById('export-png').addEventListener('click', () => {
            this.exportPNG();
            exportModal.classList.remove('active');
        });

        document.getElementById('export-svg').addEventListener('click', () => {
            this.exportSVG();
            exportModal.classList.remove('active');
        });

        document.getElementById('export-json').addEventListener('click', () => {
            this.exportJSON();
            exportModal.classList.remove('active');
        });
    }

    handleMouseDown(e) {
        const rect = this.engine.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const canvasPos = this.engine.screenToCanvas(x, y);

        if (this.currentTool === 'select') {
            const shape = this.engine.getShapeAt(x, y);
            if (shape) {
                this.engine.selectShape(shape);
                this.layerManager.update();
                this.updateProperties(shape);
                this.isDragging = true;
                this.dragStart = canvasPos;
                this.draggedShape = shape;
                this.dragInitialPos = { x: shape.x, y: shape.y };
            } else {
                this.engine.deselectAll();
                this.layerManager.update();
                this.updateProperties(null);
                // Start panning
                this.isPanning = true;
                this.panStart = { x: e.clientX, y: e.clientY };
            }
        } else {
            this.isDrawing = true;
            this.drawStart = canvasPos;

            // Create temporary shape for preview
            switch (this.currentTool) {
                case 'rectangle':
                    this.tempShape = new Rectangle(canvasPos.x, canvasPos.y, 0, 0, {
                        fillColor: this.fillColor,
                        strokeColor: this.strokeColor,
                        strokeWidth: this.strokeWidth
                    });
                    break;
                case 'circle':
                    this.tempShape = new Circle(canvasPos.x, canvasPos.y, 0, {
                        fillColor: this.fillColor,
                        strokeColor: this.strokeColor,
                        strokeWidth: this.strokeWidth
                    });
                    break;
                case 'line':
                    this.tempShape = new Line(canvasPos.x, canvasPos.y, canvasPos.x, canvasPos.y, {
                        strokeColor: this.strokeColor,
                        strokeWidth: this.strokeWidth
                    });
                    break;
            }

            if (this.tempShape) {
                this.engine.addShape(this.tempShape);
            }
        }
    }

    handleMouseMove(e) {
        const rect = this.engine.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const canvasPos = this.engine.screenToCanvas(x, y);

        // Broadcast cursor position
        this.collaboration.broadcastCursor(canvasPos.x, canvasPos.y);

        if (this.isPanning && this.panStart) {
            const dx = (e.clientX - this.panStart.x) / this.engine.zoom;
            const dy = (e.clientY - this.panStart.y) / this.engine.zoom;
            this.engine.setPan(this.engine.pan.x + dx, this.engine.pan.y + dy);
            this.panStart = { x: e.clientX, y: e.clientY };
            this.collaboration.drawCursors();
            return;
        }

        if (this.isDragging && this.draggedShape && this.dragStart) {
            const dx = canvasPos.x - this.dragStart.x;
            const dy = canvasPos.y - this.dragStart.y;
            this.draggedShape.x = this.dragInitialPos.x + dx;
            this.draggedShape.y = this.dragInitialPos.y + dy;
            this.engine.render();
            this.updateProperties(this.draggedShape);
            return;
        }

        if (this.isDrawing && this.tempShape && this.drawStart) {
            switch (this.currentTool) {
                case 'rectangle':
                    const width = canvasPos.x - this.drawStart.x;
                    const height = canvasPos.y - this.drawStart.y;
                    this.tempShape.x = this.drawStart.x + width / 2;
                    this.tempShape.y = this.drawStart.y + height / 2;
                    this.tempShape.width = Math.abs(width);
                    this.tempShape.height = Math.abs(height);
                    break;
                case 'circle':
                    const radius = Math.sqrt(
                        Math.pow(canvasPos.x - this.drawStart.x, 2) +
                        Math.pow(canvasPos.y - this.drawStart.y, 2)
                    );
                    this.tempShape.radius = radius;
                    break;
                case 'line':
                    this.tempShape.x2 = canvasPos.x;
                    this.tempShape.y2 = canvasPos.y;
                    this.tempShape.x = (this.tempShape.x1 + this.tempShape.x2) / 2;
                    this.tempShape.y = (this.tempShape.y1 + this.tempShape.y2) / 2;
                    break;
            }
            this.engine.render();
        }
    }

    handleMouseUp(e) {
        if (this.isPanning) {
            this.isPanning = false;
            this.panStart = null;
            return;
        }

        if (this.isDragging && this.draggedShape) {
            const action = createModifyShapeAction(
                this.engine,
                this.draggedShape,
                { x: this.dragInitialPos.x, y: this.dragInitialPos.y },
                { x: this.draggedShape.x, y: this.draggedShape.y }
            );
            this.history.push(action);
            this.updateUndoRedoButtons();
            this.collaboration.broadcastShapeUpdate(this.draggedShape);

            this.isDragging = false;
            this.dragStart = null;
            this.draggedShape = null;
            return;
        }

        if (this.isDrawing && this.tempShape) {
            // Check if shape is too small
            const bounds = this.tempShape.getBounds();
            if (bounds.width < 5 && bounds.height < 5 && this.currentTool !== 'text') {
                this.engine.removeShape(this.tempShape);
            } else {
                const action = createAddShapeAction(this.engine, this.tempShape);
                this.history.push(action);
                this.updateUndoRedoButtons();
                this.collaboration.broadcastShapeAdd(this.tempShape);

                this.engine.selectShape(this.tempShape);
                this.layerManager.update();
                this.updateProperties(this.tempShape);
            }

            this.isDrawing = false;
            this.drawStart = null;
            this.tempShape = null;
        }

        if (this.currentTool === 'text') {
            const rect = this.engine.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const canvasPos = this.engine.screenToCanvas(x, y);

            const text = new Text(canvasPos.x, canvasPos.y, 'Double click to edit', {
                fillColor: this.fillColor,
                strokeColor: this.strokeColor,
                strokeWidth: this.strokeWidth,
                fontSize: 32,
                fontFamily: 'Arial'
            });

            this.engine.addShape(text);
            const action = createAddShapeAction(this.engine, text);
            this.history.push(action);
            this.updateUndoRedoButtons();
            this.collaboration.broadcastShapeAdd(text);

            this.engine.selectShape(text);
            this.layerManager.update();
            this.updateProperties(text);
        }
    }

    handleWheel(e) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        this.engine.setZoom(this.engine.zoom * delta);
        this.updateZoomLevel();
        this.collaboration.drawCursors();
    }

    selectTool(tool) {
        this.currentTool = tool;
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tool === tool);
        });
        this.updateCursor();
    }

    updateCursor() {
        const canvas = this.engine.canvas;
        switch (this.currentTool) {
            case 'select':
                canvas.style.cursor = 'default';
                break;
            case 'text':
                canvas.style.cursor = 'text';
                break;
            default:
                canvas.style.cursor = 'crosshair';
        }
    }

    updateProperties(shape) {
        const transformGroup = document.getElementById('transform-group');
        const textGroup = document.getElementById('text-group');

        if (!shape) {
            transformGroup.style.display = 'none';
            textGroup.style.display = 'none';
            return;
        }

        // Update color inputs
        document.getElementById('fill-color').value = shape.fillColor;
        document.getElementById('fill-color-text').value = shape.fillColor;
        document.getElementById('stroke-color').value = shape.strokeColor;
        document.getElementById('stroke-color-text').value = shape.strokeColor;
        document.getElementById('stroke-width').value = shape.strokeWidth;
        document.getElementById('stroke-width-value').textContent = shape.strokeWidth + 'px';

        // Update transform inputs
        transformGroup.style.display = 'block';
        const bounds = shape.getBounds();
        document.getElementById('pos-x').value = Math.round(shape.x);
        document.getElementById('pos-y').value = Math.round(shape.y);
        document.getElementById('size-w').value = Math.round(bounds.width);
        document.getElementById('size-h').value = Math.round(bounds.height);
        document.getElementById('rotation').value = shape.rotation;
        document.getElementById('rotation-value').textContent = shape.rotation + '°';

        // Update text inputs
        if (shape.type === 'text') {
            textGroup.style.display = 'block';
            document.getElementById('font-size').value = shape.fontSize;
            document.getElementById('font-size-value').textContent = shape.fontSize + 'px';
            document.getElementById('font-family').value = shape.fontFamily;
        } else {
            textGroup.style.display = 'none';
        }
    }

    updateSelectedShapeProperty(property, value) {
        if (this.engine.selectedShape) {
            const oldValue = this.engine.selectedShape[property];
            this.engine.selectedShape[property] = value;
            this.engine.render();

            const action = createModifyShapeAction(
                this.engine,
                this.engine.selectedShape,
                { [property]: oldValue },
                { [property]: value }
            );
            this.history.push(action);
            this.updateUndoRedoButtons();
            this.collaboration.broadcastShapeUpdate(this.engine.selectedShape);
        }
    }

    updateSelectedShapeTransform() {
        if (!this.engine.selectedShape) return;

        const shape = this.engine.selectedShape;
        const newX = parseFloat(document.getElementById('pos-x').value);
        const newY = parseFloat(document.getElementById('pos-y').value);
        const newW = parseFloat(document.getElementById('size-w').value);
        const newH = parseFloat(document.getElementById('size-h').value);

        if (!isNaN(newX)) shape.x = newX;
        if (!isNaN(newY)) shape.y = newY;

        if (shape.type === 'rectangle') {
            if (!isNaN(newW)) shape.width = newW;
            if (!isNaN(newH)) shape.height = newH;
        } else if (shape.type === 'circle') {
            if (!isNaN(newW)) shape.radius = newW / 2;
        }

        this.engine.render();
        this.collaboration.broadcastShapeUpdate(shape);
    }

    updateZoomLevel() {
        document.getElementById('zoom-level').textContent = Math.round(this.engine.zoom * 100) + '%';
    }

    updateUndoRedoButtons() {
        document.getElementById('undo-btn').disabled = !this.history.canUndo();
        document.getElementById('redo-btn').disabled = !this.history.canRedo();
    }

    updateConnectionStatus() {
        const count = this.collaboration.getConnectionCount();
        const peers = this.collaboration.getConnectedPeers();
        const connectedDiv = document.getElementById('connected-peers');

        if (count > 0) {
            connectedDiv.textContent = `Connected: ${count} peer${count > 1 ? 's' : ''}`;
        } else {
            connectedDiv.textContent = '';
        }
    }

    undo() {
        const action = this.history.undo();
        if (action) {
            action.revert();
            this.layerManager.update();
            this.updateProperties(this.engine.selectedShape);
        }
        this.updateUndoRedoButtons();
    }

    redo() {
        const action = this.history.redo();
        if (action) {
            action.execute();
            this.layerManager.update();
            this.updateProperties(this.engine.selectedShape);
        }
        this.updateUndoRedoButtons();
    }

    exportPNG() {
        const dataUrl = this.engine.exportToPNG();
        const link = document.createElement('a');
        link.download = `design-${Date.now()}.png`;
        link.href = dataUrl;
        link.click();
    }

    exportSVG() {
        const svg = this.engine.exportToSVG();
        const blob = new Blob([svg], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `design-${Date.now()}.svg`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
    }

    exportJSON() {
        const json = this.engine.exportToJSON();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `design-${Date.now()}.json`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
    }
}

// Initialize app
const app = new DesignApp();
window.app = app;

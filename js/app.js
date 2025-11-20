import { CanvasEngine, Rectangle, Circle, Line, Text, Star, Triangle, Arrow } from './canvas-engine.js';
import { History, createAddShapeAction, createRemoveShapeAction, createModifyShapeAction } from './history.js';
import { Collaboration } from './collaboration.js';
import { LayerManager } from './layers.js';
import { TextEditor } from './text-editor.js';
import { Connector } from './connector.js';
import { Diamond, Parallelogram, Cylinder, Cloud, Hexagon } from './diagram-shapes.js';
import { LayoutEngine } from './layout-engine.js';

// Export shape classes to window for collaboration
window.Rectangle = Rectangle;
window.Circle = Circle;
window.Line = Line;
window.Text = Text;
window.Star = Star;
window.Triangle = Triangle;
window.Arrow = Arrow;
window.Connector = Connector;
window.Diamond = Diamond;
window.Parallelogram = Parallelogram;
window.Cylinder = Cylinder;
window.Cloud = Cloud;
window.Hexagon = Hexagon;

class DesignApp {
    constructor() {
        this.engine = new CanvasEngine('canvas');
        this.history = new History();
        this.collaboration = new Collaboration(this.engine);
        this.layerManager = new LayerManager(this.engine, 'layers-panel');
        this.layoutEngine = new LayoutEngine(this.engine);
        this.textEditor = null; // Will be initialized after collaboration
        this.connectMode = false;  // For connector tool
        this.connectStart = null;

        this.currentTool = 'select';
        this.isDrawing = false;
        this.drawStart = null;
        this.tempShape = null;
        this.isDragging = false;
        this.dragStart = null;
        this.draggedShape = null;
        this.isPanning = false;
        this.panStart = null;
        this.isSelecting = false;
        this.selectionStart = null;
        this.selectionBox = null;
        this.isResizing = false;
        this.resizeHandle = null;
        this.resizeStart = null;
        this.isRotating = false;
        this.rotationStart = null;

        this.fillColor = '#0d99ff';
        this.strokeColor = '#333333';
        this.strokeWidth = 1;

        this.clipboard = null;
        this.isSpacePressed = false;
        this.tempCursor = null;

        this.init();
    }

    async init() {
        this.setupToolbar();
        this.setupCanvas();
        this.setupProperties();
        this.setupKeyboardShortcuts();
        this.setupShare();
        this.setupExport();
        this.setupContextMenu();

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

        // Initialize text editor
        this.textEditor = new TextEditor(this.engine, this.collaboration);

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

        // Delete layer
        document.getElementById('delete-layer-btn').addEventListener('click', () => {
            const shape = this.layerManager.deleteSelected();
            if (shape) {
                const action = createRemoveShapeAction(this.engine, shape);
                this.history.push(action);
                this.collaboration.broadcastShapeRemove(shape);
            }
        });

        // Layout tools
        document.getElementById('align-left-btn').addEventListener('click', () => {
            this.layoutEngine.alignLeft();
        });

        document.getElementById('align-center-btn').addEventListener('click', () => {
            this.layoutEngine.alignCenterVertical();
        });

        document.getElementById('align-right-btn').addEventListener('click', () => {
            this.layoutEngine.alignRight();
        });

        document.getElementById('distribute-h-btn').addEventListener('click', () => {
            this.layoutEngine.distributeHorizontally();
        });

        document.getElementById('distribute-v-btn').addEventListener('click', () => {
            this.layoutEngine.distributeVertically();
        });

        this.updateUndoRedoButtons();
    }

    setupCanvas() {
        const canvas = this.engine.canvas;

        canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        canvas.addEventListener('wheel', (e) => this.handleWheel(e));
        canvas.addEventListener('dblclick', (e) => this.handleDoubleClick(e));

        // Context menu
        canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (this.engine.selectedShape) {
                this.showContextMenu(e.clientX, e.clientY);
            }
        });

        // Hide context menu on click outside
        document.addEventListener('click', () => {
            this.hideContextMenu();
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

        // Opacity
        document.getElementById('opacity').addEventListener('input', (e) => {
            const opacity = parseInt(e.target.value) / 100;
            document.getElementById('opacity-value').textContent = parseInt(e.target.value) + '%';
            this.updateSelectedShapeProperty('opacity', opacity);
        });

        // Corner Radius
        document.getElementById('corner-radius').addEventListener('input', (e) => {
            const cornerRadius = parseInt(e.target.value);
            document.getElementById('corner-radius-value').textContent = cornerRadius + 'px';
            this.updateSelectedShapeProperty('cornerRadius', cornerRadius);
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
            // Space for pan mode
            if (e.code === 'Space' && !this.isSpacePressed && !this.textEditor?.isActive()) {
                e.preventDefault();
                this.isSpacePressed = true;
                this.tempCursor = this.engine.canvas.style.cursor;
                this.engine.canvas.style.cursor = 'grab';
                return;
            }

            // Undo/Redo
            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'z') {
                    e.preventDefault();
                    this.undo();
                } else if (e.key === 'y') {
                    e.preventDefault();
                    this.redo();
                } else if (e.key === 'c') {
                    e.preventDefault();
                    this.copySelected();
                } else if (e.key === 'v') {
                    e.preventDefault();
                    this.paste();
                } else if (e.key === 'd') {
                    e.preventDefault();
                    this.duplicate();
                } else if (e.key === 'a') {
                    e.preventDefault();
                    this.selectAll();
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
                    case 'o':
                        this.selectTool('circle');
                        break;
                    case 'l':
                        this.selectTool('line');
                        break;
                    case 't':
                        this.selectTool('text');
                        break;
                    case 's':
                        if (!e.shiftKey) {
                            this.selectTool('star');
                        }
                        break;
                    case 'a':
                        if (!e.ctrlKey) {
                            this.selectTool('arrow');
                        }
                        break;
                }
            }

            // Delete - only if not editing text
            if (e.key === 'Delete' || e.key === 'Backspace') {
                // Don't delete shapes if editing text
                if (this.textEditor && this.textEditor.isActive()) {
                    return;
                }

                // Don't delete on Backspace if in an input field
                if (e.key === 'Backspace' && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
                    return;
                }

                if (this.engine.selectedShape) {
                    e.preventDefault();
                    const shapes = this.engine.getSelectedShapes();

                    // Delete all selected shapes
                    shapes.forEach(shape => {
                        this.engine.removeShape(shape);
                        const action = createRemoveShapeAction(this.engine, shape);
                        this.history.push(action);
                        this.collaboration.broadcastShapeRemove(shape);
                    });

                    this.layerManager.update();
                    this.updateProperties(null);
                    this.updateUndoRedoButtons();
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

        document.addEventListener('keyup', (e) => {
            // Release space for pan mode
            if (e.code === 'Space' && this.isSpacePressed) {
                this.isSpacePressed = false;
                if (this.tempCursor) {
                    this.engine.canvas.style.cursor = this.tempCursor;
                    this.tempCursor = null;
                } else {
                    this.updateCursor();
                }
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

    setupContextMenu() {
        document.getElementById('ctx-copy').addEventListener('click', () => {
            this.copySelected();
            this.hideContextMenu();
        });

        document.getElementById('ctx-paste').addEventListener('click', () => {
            this.paste();
            this.hideContextMenu();
        });

        document.getElementById('ctx-duplicate').addEventListener('click', () => {
            this.duplicate();
            this.hideContextMenu();
        });

        document.getElementById('ctx-delete').addEventListener('click', () => {
            if (this.engine.selectedShape) {
                const shapes = this.engine.getSelectedShapes();
                shapes.forEach(shape => {
                    this.engine.removeShape(shape);
                    this.collaboration.broadcastShapeRemove(shape);
                });
                this.layerManager.update();
                this.updateProperties(null);
            }
            this.hideContextMenu();
        });

        document.getElementById('ctx-bring-front').addEventListener('click', () => {
            this.bringToFront();
            this.hideContextMenu();
        });

        document.getElementById('ctx-send-back').addEventListener('click', () => {
            this.sendToBack();
            this.hideContextMenu();
        });
    }

    showContextMenu(x, y) {
        const menu = document.getElementById('context-menu');
        menu.style.left = x + 'px';
        menu.style.top = y + 'px';
        menu.classList.add('active');
    }

    hideContextMenu() {
        const menu = document.getElementById('context-menu');
        menu.classList.remove('active');
    }

    bringToFront() {
        if (!this.engine.selectedShape || Array.isArray(this.engine.selectedShape)) return;

        const shape = this.engine.selectedShape;
        const index = this.engine.shapes.indexOf(shape);
        if (index > -1) {
            this.engine.shapes.splice(index, 1);
            this.engine.shapes.push(shape);
            this.engine.render();
            this.layerManager.update();
        }
    }

    sendToBack() {
        if (!this.engine.selectedShape || Array.isArray(this.engine.selectedShape)) return;

        const shape = this.engine.selectedShape;
        const index = this.engine.shapes.indexOf(shape);
        if (index > -1) {
            this.engine.shapes.splice(index, 1);
            this.engine.shapes.unshift(shape);
            this.engine.render();
            this.layerManager.update();
        }
    }

    handleMouseDown(e) {
        const rect = this.engine.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const canvasPos = this.engine.screenToCanvas(x, y);

        // Space + drag for panning
        if (this.isSpacePressed) {
            this.isPanning = true;
            this.panStart = { x: e.clientX, y: e.clientY };
            this.engine.canvas.style.cursor = 'grabbing';
            return;
        }

        if (this.currentTool === 'select') {
            // Check for resize/rotation handles first
            const handle = this.engine.getHandleAt(canvasPos.x, canvasPos.y);
            if (handle) {
                if (handle.type === 'rotate') {
                    this.isRotating = true;
                    this.rotationStart = {
                        angle: Math.atan2(
                            canvasPos.y - this.engine.selectedShape.y,
                            canvasPos.x - this.engine.selectedShape.x
                        ),
                        initialRotation: this.engine.selectedShape.rotation || 0
                    };
                } else {
                    this.isResizing = true;
                    this.resizeHandle = handle;
                    this.resizeStart = {
                        x: canvasPos.x,
                        y: canvasPos.y,
                        bounds: this.engine.selectedShape.getBounds(),
                        shapeX: this.engine.selectedShape.x,
                        shapeY: this.engine.selectedShape.y,
                        shapeWidth: this.engine.selectedShape.width || this.engine.selectedShape.size,
                        shapeHeight: this.engine.selectedShape.height,
                        shapeRadius: this.engine.selectedShape.radius || this.engine.selectedShape.outerRadius
                    };
                }
                return;
            }

            const shape = this.engine.getShapeAt(x, y);
            if (shape) {
                // Shift+Click for multi-selection
                const addToSelection = e.shiftKey;
                this.engine.selectShape(shape, addToSelection);
                this.layerManager.update();
                this.updateProperties(shape);
                this.isDragging = true;
                this.dragStart = canvasPos;
                this.draggedShape = shape;
                this.dragInitialPos = { x: shape.x, y: shape.y };
            } else {
                // If not clicking on a shape, start selection box or pan
                if (e.shiftKey) {
                    // Start drag selection
                    this.isSelecting = true;
                    this.selectionStart = canvasPos;
                } else if (e.button === 1 || e.ctrlKey) {
                    // Middle click or Ctrl+Click for panning
                    this.isPanning = true;
                    this.panStart = { x: e.clientX, y: e.clientY };
                } else {
                    this.engine.deselectAll();
                    this.layerManager.update();
                    this.updateProperties(null);
                    // Start selection box
                    this.isSelecting = true;
                    this.selectionStart = canvasPos;
                }
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
                case 'triangle':
                    this.tempShape = new Triangle(canvasPos.x, canvasPos.y, 0, {
                        fillColor: this.fillColor,
                        strokeColor: this.strokeColor,
                        strokeWidth: this.strokeWidth
                    });
                    break;
                case 'star':
                    this.tempShape = new Star(canvasPos.x, canvasPos.y, 0, {
                        fillColor: this.fillColor,
                        strokeColor: this.strokeColor,
                        strokeWidth: this.strokeWidth
                    });
                    break;
                case 'arrow':
                    this.tempShape = new Arrow(canvasPos.x, canvasPos.y, 0, 0, {
                        fillColor: this.fillColor,
                        strokeColor: this.strokeColor,
                        strokeWidth: this.strokeWidth
                    });
                    break;
                case 'diamond':
                    this.tempShape = new Diamond(canvasPos.x, canvasPos.y, 0, {
                        fillColor: this.fillColor,
                        strokeColor: this.strokeColor,
                        strokeWidth: this.strokeWidth
                    });
                    break;
                case 'parallelogram':
                    this.tempShape = new Parallelogram(canvasPos.x, canvasPos.y, 0, 0, {
                        fillColor: this.fillColor,
                        strokeColor: this.strokeColor,
                        strokeWidth: this.strokeWidth
                    });
                    break;
                case 'hexagon':
                    this.tempShape = new Hexagon(canvasPos.x, canvasPos.y, 0, {
                        fillColor: this.fillColor,
                        strokeColor: this.strokeColor,
                        strokeWidth: this.strokeWidth
                    });
                    break;
                case 'cylinder':
                    this.tempShape = new Cylinder(canvasPos.x, canvasPos.y, 0, 0, {
                        fillColor: this.fillColor,
                        strokeColor: this.strokeColor,
                        strokeWidth: this.strokeWidth
                    });
                    break;
                case 'cloud':
                    this.tempShape = new Cloud(canvasPos.x, canvasPos.y, 0, 0, {
                        fillColor: this.fillColor,
                        strokeColor: this.strokeColor,
                        strokeWidth: this.strokeWidth
                    });
                    break;
                case 'connector':
                    // Connector mode - click on shapes to connect
                    const clickedShape = this.engine.getShapeAt(x, y);
                    if (clickedShape && clickedShape.type !== 'connector') {
                        if (!this.connectStart) {
                            this.connectStart = clickedShape;
                            console.log('Connector: Start shape selected');
                        } else {
                            // Create connector
                            const connector = new Connector(this.connectStart, clickedShape, {
                                strokeColor: this.strokeColor,
                                strokeWidth: this.strokeWidth
                            });
                            this.engine.addShape(connector);
                            this.connectStart = null;
                            console.log('Connector created');
                        }
                    }
                    return;  // Don't add temp shape for connector
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

        // Update cursor based on handles
        if (this.currentTool === 'select' && !this.isDragging && !this.isResizing && !this.isRotating) {
            const handle = this.engine.getHandleAt(canvasPos.x, canvasPos.y);
            if (handle) {
                this.engine.canvas.style.cursor = handle.cursor;
            } else {
                this.updateCursor();
            }
        }

        if (this.isRotating && this.rotationStart) {
            const angle = Math.atan2(
                canvasPos.y - this.engine.selectedShape.y,
                canvasPos.x - this.engine.selectedShape.x
            );
            const deltaAngle = angle - this.rotationStart.angle;
            this.engine.selectedShape.rotation = this.rotationStart.initialRotation + (deltaAngle * 180 / Math.PI);
            this.engine.render();
            this.updateProperties(this.engine.selectedShape);
            this.engine.canvas.style.cursor = 'grabbing';
            return;
        }

        if (this.isResizing && this.resizeHandle && this.resizeStart) {
            const dx = canvasPos.x - this.resizeStart.x;
            const dy = canvasPos.y - this.resizeStart.y;
            const shape = this.engine.selectedShape;
            const maintainRatio = e.shiftKey;

            if (shape.type === 'rectangle' || shape.type === 'arrow') {
                this.resizeRectangle(shape, this.resizeHandle.type, dx, dy, maintainRatio);
            } else if (shape.type === 'circle') {
                this.resizeCircle(shape, this.resizeHandle.type, dx, dy);
            } else if (shape.type === 'star') {
                this.resizeStar(shape, this.resizeHandle.type, dx, dy);
            } else if (shape.type === 'triangle') {
                this.resizeTriangle(shape, this.resizeHandle.type, dx, dy);
            }

            this.engine.render();
            this.updateProperties(shape);
            return;
        }

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

        if (this.isSelecting && this.selectionStart) {
            // Draw selection box
            this.selectionBox = {
                x1: this.selectionStart.x,
                y1: this.selectionStart.y,
                x2: canvasPos.x,
                y2: canvasPos.y
            };
            this.engine.render();
            this.drawSelectionBox();
            return;
        }

        if (this.isDrawing && this.tempShape && this.drawStart) {
            switch (this.currentTool) {
                case 'rectangle':
                    let width = canvasPos.x - this.drawStart.x;
                    let height = canvasPos.y - this.drawStart.y;

                    // Shift for square
                    if (e.shiftKey) {
                        const size = Math.max(Math.abs(width), Math.abs(height));
                        width = width < 0 ? -size : size;
                        height = height < 0 ? -size : size;
                    }

                    // Alt for center-based drawing
                    if (e.altKey) {
                        this.tempShape.x = this.drawStart.x;
                        this.tempShape.y = this.drawStart.y;
                        this.tempShape.width = Math.abs(width) * 2;
                        this.tempShape.height = Math.abs(height) * 2;
                    } else {
                        this.tempShape.x = this.drawStart.x + width / 2;
                        this.tempShape.y = this.drawStart.y + height / 2;
                        this.tempShape.width = Math.abs(width);
                        this.tempShape.height = Math.abs(height);
                    }
                    break;
                case 'circle':
                    let radius = Math.sqrt(
                        Math.pow(canvasPos.x - this.drawStart.x, 2) +
                        Math.pow(canvasPos.y - this.drawStart.y, 2)
                    );

                    // Alt for center-based drawing
                    if (e.altKey) {
                        radius *= 2;
                    }

                    this.tempShape.radius = radius;
                    break;
                case 'line':
                    this.tempShape.x2 = canvasPos.x;
                    this.tempShape.y2 = canvasPos.y;
                    this.tempShape.x = (this.tempShape.x1 + this.tempShape.x2) / 2;
                    this.tempShape.y = (this.tempShape.y1 + this.tempShape.y2) / 2;
                    break;
                case 'triangle':
                    const triSize = Math.sqrt(
                        Math.pow(canvasPos.x - this.drawStart.x, 2) +
                        Math.pow(canvasPos.y - this.drawStart.y, 2)
                    ) * 2;
                    this.tempShape.size = triSize;
                    break;
                case 'star':
                    const starRadius = Math.sqrt(
                        Math.pow(canvasPos.x - this.drawStart.x, 2) +
                        Math.pow(canvasPos.y - this.drawStart.y, 2)
                    );
                    this.tempShape.outerRadius = starRadius;
                    this.tempShape.innerRadius = starRadius * 0.4;
                    break;
                case 'arrow':
                    let arrowWidth = canvasPos.x - this.drawStart.x;
                    let arrowHeight = canvasPos.y - this.drawStart.y;

                    // Alt for center-based drawing
                    if (e.altKey) {
                        this.tempShape.x = this.drawStart.x;
                        this.tempShape.y = this.drawStart.y;
                        this.tempShape.width = Math.abs(arrowWidth) * 2;
                        this.tempShape.height = Math.abs(arrowHeight) * 2;
                    } else {
                        this.tempShape.x = this.drawStart.x + arrowWidth / 2;
                        this.tempShape.y = this.drawStart.y + arrowHeight / 2;
                        this.tempShape.width = Math.abs(arrowWidth);
                        this.tempShape.height = Math.abs(arrowHeight);
                    }
                    break;
                case 'diamond':
                case 'hexagon':
                    const diagSize = Math.sqrt(
                        Math.pow(canvasPos.x - this.drawStart.x, 2) +
                        Math.pow(canvasPos.y - this.drawStart.y, 2)
                    ) * 2;
                    this.tempShape.size = diagSize;
                    break;
                case 'parallelogram':
                case 'cylinder':
                case 'cloud':
                    let diagWidth = canvasPos.x - this.drawStart.x;
                    let diagHeight = canvasPos.y - this.drawStart.y;

                    if (e.altKey) {
                        this.tempShape.x = this.drawStart.x;
                        this.tempShape.y = this.drawStart.y;
                        this.tempShape.width = Math.abs(diagWidth) * 2;
                        this.tempShape.height = Math.abs(diagHeight) * 2;
                    } else {
                        this.tempShape.x = this.drawStart.x + diagWidth / 2;
                        this.tempShape.y = this.drawStart.y + diagHeight / 2;
                        this.tempShape.width = Math.abs(diagWidth);
                        this.tempShape.height = Math.abs(diagHeight);
                    }
                    break;
            }
            this.engine.render();
        }
    }

    drawSelectionBox() {
        if (!this.selectionBox) return;

        const ctx = this.engine.ctx;
        ctx.save();

        // Apply transformations
        ctx.translate(this.engine.canvas.width / 2, this.engine.canvas.height / 2);
        ctx.scale(this.engine.zoom, this.engine.zoom);
        ctx.translate(this.engine.pan.x, this.engine.pan.y);

        // Draw selection rectangle
        const minX = Math.min(this.selectionBox.x1, this.selectionBox.x2);
        const minY = Math.min(this.selectionBox.y1, this.selectionBox.y2);
        const width = Math.abs(this.selectionBox.x2 - this.selectionBox.x1);
        const height = Math.abs(this.selectionBox.y2 - this.selectionBox.y1);

        // Fill
        ctx.fillStyle = 'rgba(13, 153, 255, 0.1)';
        ctx.fillRect(minX, minY, width, height);

        // Border
        ctx.strokeStyle = '#0d99ff';
        ctx.lineWidth = 1 / this.engine.zoom;
        ctx.setLineDash([5 / this.engine.zoom, 5 / this.engine.zoom]);
        ctx.strokeRect(minX, minY, width, height);

        ctx.restore();
    }

    handleMouseUp(e) {
        if (this.isPanning) {
            this.isPanning = false;
            this.panStart = null;
            if (this.isSpacePressed) {
                this.engine.canvas.style.cursor = 'grab';
            } else {
                this.updateCursor();
            }
            return;
        }

        if (this.isRotating) {
            this.isRotating = false;
            this.rotationStart = null;
            this.updateCursor();
            return;
        }

        if (this.isResizing) {
            this.isResizing = false;
            this.resizeHandle = null;
            this.resizeStart = null;
            this.updateCursor();
            return;
        }

        if (this.isPanning) {
            this.isPanning = false;
            this.panStart = null;
            return;
        }

        if (this.isSelecting && this.selectionStart) {
            const rect = this.engine.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const canvasPos = this.engine.screenToCanvas(x, y);

            // Get shapes in selection box
            const selectedShapes = this.engine.getShapesInRect(
                this.selectionStart.x,
                this.selectionStart.y,
                canvasPos.x,
                canvasPos.y
            );

            if (selectedShapes.length > 0) {
                this.engine.selectMultiple(selectedShapes);
                this.layerManager.update();
                if (selectedShapes.length === 1) {
                    this.updateProperties(selectedShapes[0]);
                }
            }

            this.isSelecting = false;
            this.selectionStart = null;
            this.selectionBox = null;
            this.engine.render();
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

    handleDoubleClick(e) {
        const rect = this.engine.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const shape = this.engine.getShapeAt(x, y);

        // Double-click on text to edit - works from any tool
        if (shape && shape.type === 'text') {
            // Temporarily switch to select tool
            const previousTool = this.currentTool;
            this.currentTool = 'select';

            // Start editing
            this.textEditor.startEditing(shape);

            // Restore tool after editing is done
            this.textEditor.onEditingComplete = () => {
                this.currentTool = previousTool;
                this.updateCursor();
            };
        }
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

        // Update opacity and corner radius
        document.getElementById('opacity').value = Math.round(shape.opacity * 100);
        document.getElementById('opacity-value').textContent = Math.round(shape.opacity * 100) + '%';
        document.getElementById('corner-radius').value = shape.cornerRadius || 0;
        document.getElementById('corner-radius-value').textContent = (shape.cornerRadius || 0) + 'px';

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

    copySelected() {
        if (this.engine.selectedShape) {
            this.clipboard = this.engine.selectedShape.toJSON();
            console.log('Copied shape to clipboard');
        }
    }

    paste() {
        if (this.clipboard) {
            const ShapeClass = this.getShapeClass(this.clipboard.type);
            if (ShapeClass) {
                const newShape = ShapeClass.fromJSON(this.clipboard);
                // Offset the pasted shape
                newShape.id = Math.random().toString(36).substr(2, 9);
                newShape.x += 20;
                newShape.y += 20;

                this.engine.addShape(newShape);
                const action = createAddShapeAction(this.engine, newShape);
                this.history.push(action);
                this.updateUndoRedoButtons();
                this.collaboration.broadcastShapeAdd(newShape);

                this.engine.selectShape(newShape);
                this.layerManager.update();
                this.updateProperties(newShape);
                console.log('Pasted shape from clipboard');
            }
        }
    }

    duplicate() {
        if (this.engine.selectedShape) {
            this.copySelected();
            this.paste();
        }
    }

    selectAll() {
        if (this.engine.shapes.length > 0) {
            // Select all shapes using the existing selectMultiple method
            this.engine.selectMultiple(this.engine.shapes);
            this.layerManager.update();

            // Update properties for the first selected shape
            if (this.engine.shapes.length === 1) {
                this.updateProperties(this.engine.shapes[0]);
            } else {
                // For multiple selections, clear individual properties
                this.updateProperties(null);
            }
        }
    }

    resizeRectangle(shape, handleType, dx, dy, maintainRatio = false) {
        const start = this.resizeStart;
        const ratio = start.shapeWidth / start.shapeHeight;

        switch (handleType) {
            case 'se': // bottom-right
                let newWidth = Math.max(10, start.shapeWidth + dx);
                let newHeight = Math.max(10, start.shapeHeight + dy);

                if (maintainRatio) {
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    const sign = (dx + dy) >= 0 ? 1 : -1;
                    newWidth = Math.max(10, start.shapeWidth + sign * distance);
                    newHeight = newWidth / ratio;
                }

                shape.width = newWidth;
                shape.height = newHeight;
                shape.x = start.shapeX + (newWidth - start.shapeWidth) / 2;
                shape.y = start.shapeY + (newHeight - start.shapeHeight) / 2;
                break;
            case 'nw': // top-left
                let nwWidth = Math.max(10, start.shapeWidth - dx);
                let nwHeight = Math.max(10, start.shapeHeight - dy);

                if (maintainRatio) {
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    const sign = (dx + dy) >= 0 ? -1 : 1;
                    nwWidth = Math.max(10, start.shapeWidth + sign * distance);
                    nwHeight = nwWidth / ratio;
                }

                shape.width = nwWidth;
                shape.height = nwHeight;
                shape.x = start.shapeX - (nwWidth - start.shapeWidth) / 2;
                shape.y = start.shapeY - (nwHeight - start.shapeHeight) / 2;
                break;
            case 'ne': // top-right
                let neWidth = Math.max(10, start.shapeWidth + dx);
                let neHeight = Math.max(10, start.shapeHeight - dy);

                if (maintainRatio) {
                    neWidth = Math.max(10, start.shapeWidth + dx);
                    neHeight = neWidth / ratio;
                    dy = start.shapeHeight - neHeight;
                }

                shape.width = neWidth;
                shape.height = neHeight;
                shape.x = start.shapeX + (neWidth - start.shapeWidth) / 2;
                shape.y = start.shapeY - (neHeight - start.shapeHeight) / 2;
                break;
            case 'sw': // bottom-left
                let swWidth = Math.max(10, start.shapeWidth - dx);
                let swHeight = Math.max(10, start.shapeHeight + dy);

                if (maintainRatio) {
                    swWidth = Math.max(10, start.shapeWidth - dx);
                    swHeight = swWidth / ratio;
                    dy = swHeight - start.shapeHeight;
                }

                shape.width = swWidth;
                shape.height = swHeight;
                shape.x = start.shapeX - (swWidth - start.shapeWidth) / 2;
                shape.y = start.shapeY + (swHeight - start.shapeHeight) / 2;
                break;
            case 'e': // right
                shape.width = Math.max(10, start.shapeWidth + dx);
                if (maintainRatio) {
                    shape.height = shape.width / ratio;
                }
                shape.x = start.shapeX + (shape.width - start.shapeWidth) / 2;
                shape.y = start.shapeY + (shape.height - start.shapeHeight) / 2;
                break;
            case 'w': // left
                shape.width = Math.max(10, start.shapeWidth - dx);
                if (maintainRatio) {
                    shape.height = shape.width / ratio;
                }
                shape.x = start.shapeX - (shape.width - start.shapeWidth) / 2;
                shape.y = start.shapeY - (shape.height - start.shapeHeight) / 2;
                break;
            case 'n': // top
                shape.height = Math.max(10, start.shapeHeight - dy);
                if (maintainRatio) {
                    shape.width = shape.height * ratio;
                }
                shape.x = start.shapeX + (shape.width - start.shapeWidth) / 2;
                shape.y = start.shapeY - (shape.height - start.shapeHeight) / 2;
                break;
            case 's': // bottom
                shape.height = Math.max(10, start.shapeHeight + dy);
                if (maintainRatio) {
                    shape.width = shape.height * ratio;
                }
                shape.x = start.shapeX + (shape.width - start.shapeWidth) / 2;
                shape.y = start.shapeY + (shape.height - start.shapeHeight) / 2;
                break;
        }
    }

    resizeCircle(shape, handleType, dx, dy) {
        const start = this.resizeStart;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Determine if we're increasing or decreasing radius
        const isIncreasing = (handleType.includes('e') && dx > 0) ||
                            (handleType.includes('w') && dx < 0) ||
                            (handleType.includes('s') && dy > 0) ||
                            (handleType.includes('n') && dy < 0);

        const delta = isIncreasing ? distance : -distance;
        shape.radius = Math.max(5, start.shapeRadius + delta);
    }

    resizeStar(shape, handleType, dx, dy) {
        const start = this.resizeStart;
        const distance = Math.sqrt(dx * dx + dy * dy);

        const isIncreasing = (handleType.includes('e') && dx > 0) ||
                            (handleType.includes('w') && dx < 0) ||
                            (handleType.includes('s') && dy > 0) ||
                            (handleType.includes('n') && dy < 0);

        const delta = isIncreasing ? distance : -distance;
        shape.outerRadius = Math.max(10, start.shapeRadius + delta);
        shape.innerRadius = shape.outerRadius * 0.4;
    }

    resizeTriangle(shape, handleType, dx, dy) {
        const start = this.resizeStart;
        const distance = Math.sqrt(dx * dx + dy * dy);

        const isIncreasing = (handleType.includes('e') && dx > 0) ||
                            (handleType.includes('w') && dx < 0) ||
                            (handleType.includes('s') && dy > 0) ||
                            (handleType.includes('n') && dy < 0);

        const delta = isIncreasing ? distance : -distance;
        shape.size = Math.max(10, (start.shapeWidth || start.shapeRadius) + delta);
    }

    getShapeClass(type) {
        switch (type) {
            case 'rectangle': return Rectangle;
            case 'circle': return Circle;
            case 'line': return Line;
            case 'text': return Text;
            case 'star': return Star;
            case 'triangle': return Triangle;
            case 'arrow': return Arrow;
            default: return null;
        }
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

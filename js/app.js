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
        this.textEditor = null;
        this.connectMode = false;
        this.connectStart = null;

        this.currentTool = 'select';
        this.currentTab = 'design';
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

        // Mermaid state
        this.mermaidHistory = [];
        this.mermaidHistoryIndex = -1;
        this.mermaidAutoRender = true;
        this.mermaidRenderTimeout = null;
        this.mermaidZoom = 1;
        this.mermaidPanX = 0;
        this.mermaidPanY = 0;
        this.mermaidTheme = 'default';

        // Dark theme state
        this.isDarkTheme = false;

        this.init();
    }

    async init() {
        this.setupTabs();
        this.setupToolbar();
        this.setupCanvas();
        this.setupProperties();
        this.setupKeyboardShortcuts();
        this.setupShare();
        this.setupExport();
        this.setupContextMenu();
        this.setupMermaid();
        this.setupThemeToggle();

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

    setupTabs() {
        const tabs = document.querySelectorAll('.main-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabId = tab.dataset.tab;
                this.switchTab(tabId);
            });
        });
    }

    switchTab(tabId) {
        this.currentTab = tabId;

        // Update tab buttons
        document.querySelectorAll('.main-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabId);
        });

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tabId}-tab`);
        });

        // Initialize mermaid if switching to mermaid tab
        if (tabId === 'mermaid' && !this.mermaidInitialized) {
            this.initMermaidEditor();
        }
    }

    setupThemeToggle() {
        const themeBtn = document.getElementById('theme-toggle-btn');
        if (themeBtn) {
            themeBtn.addEventListener('click', () => {
                this.toggleTheme();
            });
        }

        // Check for saved theme preference
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            this.toggleTheme();
        }
    }

    toggleTheme() {
        this.isDarkTheme = !this.isDarkTheme;
        document.body.classList.toggle('dark-theme', this.isDarkTheme);

        // Toggle icons
        const sunIcon = document.querySelector('.sun-icon');
        const moonIcon = document.querySelector('.moon-icon');
        if (sunIcon && moonIcon) {
            sunIcon.style.display = this.isDarkTheme ? 'none' : 'block';
            moonIcon.style.display = this.isDarkTheme ? 'block' : 'none';
        }

        // Save preference
        localStorage.setItem('theme', this.isDarkTheme ? 'dark' : 'light');

        // Re-render mermaid if active
        if (this.currentTab === 'mermaid') {
            this.renderMermaid();
        }
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

        canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (this.engine.selectedShape) {
                this.showContextMenu(e.clientX, e.clientY);
            }
        });

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
                    if (this.currentTab === 'mermaid') {
                        this.mermaidUndo();
                    } else {
                        this.undo();
                    }
                } else if (e.key === 'y') {
                    e.preventDefault();
                    if (this.currentTab === 'mermaid') {
                        this.mermaidRedo();
                    } else {
                        this.redo();
                    }
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

            // Tool shortcuts (only in design tab)
            if (this.currentTab === 'design' && !e.ctrlKey && !e.metaKey) {
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

            // Tab switching
            if (e.key === '1' && e.altKey) {
                e.preventDefault();
                this.switchTab('design');
            } else if (e.key === '2' && e.altKey) {
                e.preventDefault();
                this.switchTab('mermaid');
            }

            // Delete
            if (e.key === 'Delete' || e.key === 'Backspace') {
                if (this.textEditor && this.textEditor.isActive()) {
                    return;
                }

                if (e.key === 'Backspace' && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
                    return;
                }

                if (this.currentTab === 'design' && this.engine.selectedShape) {
                    e.preventDefault();
                    const shapes = this.engine.getSelectedShapes();

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

        document.getElementById('copy-id-btn').addEventListener('click', async () => {
            const id = this.collaboration.myId;
            if (id) {
                try {
                    await navigator.clipboard.writeText(id);
                    this.showToast('Copied to clipboard');
                } catch (err) {
                    console.error('Failed to copy ID:', err);
                }
            }
        });

        document.getElementById('copy-url-btn').addEventListener('click', async () => {
            const url = this.collaboration.getShareURL();
            if (url) {
                try {
                    await navigator.clipboard.writeText(url);
                    this.showToast('Link copied to clipboard');
                } catch (err) {
                    console.error('Failed to copy URL:', err);
                }
            }
        });

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
            this.showToast('Collaboration not initialized yet');
            return;
        }

        document.getElementById('my-id-display').value = myId;
        document.getElementById('share-url-display').value = shareURL;

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

    // ================================
    // MERMAID EDITOR METHODS
    // ================================

    setupMermaid() {
        // Initialize mermaid
        if (window.mermaid) {
            mermaid.initialize({
                startOnLoad: false,
                theme: this.mermaidTheme,
                securityLevel: 'loose'
            });
        }

        // Templates button
        document.getElementById('mermaid-templates-btn').addEventListener('click', () => {
            this.showTemplatesModal();
        });

        // Close templates modal
        document.getElementById('close-templates-modal').addEventListener('click', () => {
            document.getElementById('templates-modal').classList.remove('active');
        });

        // Template search
        document.getElementById('template-search').addEventListener('input', (e) => {
            this.filterTemplates(e.target.value);
        });

        // Code editor
        const codeEditor = document.getElementById('mermaid-code');
        codeEditor.addEventListener('input', () => {
            this.updateLineNumbers();
            this.saveMermaidHistory();
            if (this.mermaidAutoRender) {
                this.debouncedRenderMermaid();
            }
        });

        codeEditor.addEventListener('scroll', () => {
            document.getElementById('line-numbers').scrollTop = codeEditor.scrollTop;
        });

        codeEditor.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                e.preventDefault();
                const start = codeEditor.selectionStart;
                const end = codeEditor.selectionEnd;
                codeEditor.value = codeEditor.value.substring(0, start) + '    ' + codeEditor.value.substring(end);
                codeEditor.selectionStart = codeEditor.selectionEnd = start + 4;
                this.updateLineNumbers();
            }

            if (e.ctrlKey && e.key === 'Enter') {
                e.preventDefault();
                this.renderMermaid();
            }
        });

        // Theme select
        document.getElementById('mermaid-theme-select').addEventListener('change', (e) => {
            this.mermaidTheme = e.target.value;
            this.renderMermaid();
        });

        // Diagram type select
        document.getElementById('mermaid-diagram-type').addEventListener('change', (e) => {
            this.loadDiagramTemplate(e.target.value);
        });

        // Auto render toggle
        document.getElementById('mermaid-auto-render').addEventListener('change', (e) => {
            this.mermaidAutoRender = e.target.checked;
        });

        // Render button
        document.getElementById('mermaid-render-btn').addEventListener('click', () => {
            this.renderMermaid();
        });

        // Undo/Redo
        document.getElementById('mermaid-undo-btn').addEventListener('click', () => this.mermaidUndo());
        document.getElementById('mermaid-redo-btn').addEventListener('click', () => this.mermaidRedo());

        // Zoom controls
        document.getElementById('mermaid-zoom-in-btn').addEventListener('click', () => this.mermaidZoomIn());
        document.getElementById('mermaid-zoom-out-btn').addEventListener('click', () => this.mermaidZoomOut());
        document.getElementById('mermaid-zoom-fit-btn').addEventListener('click', () => this.mermaidZoomFit());

        // Export buttons
        document.getElementById('mermaid-export-svg-btn').addEventListener('click', () => this.exportMermaidSVG());
        document.getElementById('mermaid-export-png-btn').addEventListener('click', () => this.exportMermaidPNG());
        document.getElementById('mermaid-export-pdf-btn').addEventListener('click', () => this.exportMermaidPDF());

        // Copy code
        document.getElementById('mermaid-copy-btn').addEventListener('click', () => this.copyMermaidCode());

        // Format code
        document.getElementById('mermaid-format-btn').addEventListener('click', () => this.formatMermaidCode());

        // Fullscreen
        document.getElementById('mermaid-fullscreen-btn').addEventListener('click', () => {
            document.querySelector('.mermaid-preview-panel').classList.toggle('fullscreen');
        });

        // Initialize line numbers
        this.updateLineNumbers();

        // Populate templates
        this.populateTemplates();
    }

    initMermaidEditor() {
        this.mermaidInitialized = true;
        // Load default template
        this.loadDiagramTemplate('flowchart');
    }

    updateLineNumbers() {
        const code = document.getElementById('mermaid-code').value;
        const lines = code.split('\n').length;
        const lineNumbers = document.getElementById('line-numbers');
        lineNumbers.innerHTML = Array.from({ length: lines }, (_, i) =>
            `<div class="line-num">${i + 1}</div>`
        ).join('');
    }

    debouncedRenderMermaid() {
        clearTimeout(this.mermaidRenderTimeout);
        this.mermaidRenderTimeout = setTimeout(() => this.renderMermaid(), 500);
    }

    async renderMermaid() {
        const code = document.getElementById('mermaid-code').value.trim();
        const output = document.getElementById('mermaid-output');
        const errorPanel = document.getElementById('mermaid-error-panel');

        if (!code) {
            output.innerHTML = `<div class="empty-state">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <path d="M12 18v-6"/>
                    <path d="M8 18v-1"/>
                    <path d="M16 18v-3"/>
                </svg>
                <p>Enter Mermaid code or select a template</p>
            </div>`;
            errorPanel.classList.remove('visible');
            return;
        }

        if (!window.mermaid) {
            errorPanel.textContent = 'Mermaid library not loaded';
            errorPanel.classList.add('visible');
            return;
        }

        try {
            mermaid.initialize({
                startOnLoad: false,
                theme: this.mermaidTheme,
                securityLevel: 'loose'
            });

            const id = 'mermaid-' + Date.now();
            const { svg } = await mermaid.render(id, code);
            output.innerHTML = svg;
            errorPanel.classList.remove('visible');

            // Apply zoom
            this.applyMermaidZoom();
        } catch (err) {
            errorPanel.textContent = err.message || 'Syntax error in diagram';
            errorPanel.classList.add('visible');
        }
    }

    saveMermaidHistory() {
        const code = document.getElementById('mermaid-code').value;

        if (this.mermaidHistoryIndex < this.mermaidHistory.length - 1) {
            this.mermaidHistory = this.mermaidHistory.slice(0, this.mermaidHistoryIndex + 1);
        }

        if (this.mermaidHistory.length > 0 && this.mermaidHistory[this.mermaidHistory.length - 1] === code) {
            return;
        }

        this.mermaidHistory.push(code);
        if (this.mermaidHistory.length > 50) {
            this.mermaidHistory.shift();
        }
        this.mermaidHistoryIndex = this.mermaidHistory.length - 1;
    }

    mermaidUndo() {
        if (this.mermaidHistoryIndex > 0) {
            this.mermaidHistoryIndex--;
            document.getElementById('mermaid-code').value = this.mermaidHistory[this.mermaidHistoryIndex];
            this.updateLineNumbers();
            if (this.mermaidAutoRender) {
                this.renderMermaid();
            }
        }
    }

    mermaidRedo() {
        if (this.mermaidHistoryIndex < this.mermaidHistory.length - 1) {
            this.mermaidHistoryIndex++;
            document.getElementById('mermaid-code').value = this.mermaidHistory[this.mermaidHistoryIndex];
            this.updateLineNumbers();
            if (this.mermaidAutoRender) {
                this.renderMermaid();
            }
        }
    }

    mermaidZoomIn() {
        this.mermaidZoom = Math.min(3, this.mermaidZoom + 0.1);
        document.getElementById('mermaid-zoom-level').textContent = Math.round(this.mermaidZoom * 100) + '%';
        this.applyMermaidZoom();
    }

    mermaidZoomOut() {
        this.mermaidZoom = Math.max(0.1, this.mermaidZoom - 0.1);
        document.getElementById('mermaid-zoom-level').textContent = Math.round(this.mermaidZoom * 100) + '%';
        this.applyMermaidZoom();
    }

    mermaidZoomFit() {
        this.mermaidZoom = 1;
        this.mermaidPanX = 0;
        this.mermaidPanY = 0;
        document.getElementById('mermaid-zoom-level').textContent = '100%';
        this.applyMermaidZoom();
    }

    applyMermaidZoom() {
        const svg = document.querySelector('#mermaid-output svg');
        if (svg) {
            svg.style.transform = `scale(${this.mermaidZoom})`;
            svg.style.transformOrigin = 'center center';
        }
    }

    async copyMermaidCode() {
        try {
            await navigator.clipboard.writeText(document.getElementById('mermaid-code').value);
            this.showToast('Code copied to clipboard');
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    }

    formatMermaidCode() {
        const code = document.getElementById('mermaid-code').value;
        const lines = code.split('\n');
        let formatted = [];
        let indent = 0;

        for (let line of lines) {
            let trimmed = line.trim();

            if (trimmed.match(/^(end|section|else)/i)) {
                indent = Math.max(0, indent - 1);
            }

            if (trimmed) {
                formatted.push('    '.repeat(indent) + trimmed);
            } else {
                formatted.push('');
            }

            if (trimmed.match(/^(subgraph|section|loop|alt|opt|par|critical|break|rect)/i)) {
                indent++;
            }
        }

        document.getElementById('mermaid-code').value = formatted.join('\n');
        this.updateLineNumbers();
        this.renderMermaid();
    }

    exportMermaidSVG() {
        const svg = document.querySelector('#mermaid-output svg');
        if (!svg) {
            this.showToast('No diagram to export');
            return;
        }

        const svgData = new XMLSerializer().serializeToString(svg);
        const blob = new Blob([svgData], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.download = `mermaid-diagram-${Date.now()}.svg`;
        link.href = url;
        link.click();

        URL.revokeObjectURL(url);
        this.showToast('SVG exported');
    }

    exportMermaidPNG() {
        const svg = document.querySelector('#mermaid-output svg');
        if (!svg) {
            this.showToast('No diagram to export');
            return;
        }

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const svgData = new XMLSerializer().serializeToString(svg);
        const img = new Image();

        const bbox = svg.getBBox();
        const width = bbox.width || svg.clientWidth || 800;
        const height = bbox.height || svg.clientHeight || 600;

        const scale = 2;
        canvas.width = width * scale;
        canvas.height = height * scale;

        img.onload = () => {
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            const link = document.createElement('a');
            link.download = `mermaid-diagram-${Date.now()}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();

            this.showToast('PNG exported');
        };

        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    }

    exportMermaidPDF() {
        const svg = document.querySelector('#mermaid-output svg');
        if (!svg) {
            this.showToast('No diagram to export');
            return;
        }

        const printWindow = window.open('', '_blank');
        const svgData = new XMLSerializer().serializeToString(svg);

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Mermaid Diagram</title>
                <style>
                    body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
                    svg { max-width: 100%; height: auto; }
                </style>
            </head>
            <body>
                ${svgData}
                <script>window.onload = function() { window.print(); window.close(); }<\/script>
            </body>
            </html>
        `);

        this.showToast('Opening print dialog');
    }

    populateTemplates() {
        const templates = this.getMermaidTemplates();
        const grid = document.getElementById('templates-grid');

        grid.innerHTML = Object.entries(templates).map(([key, template]) => `
            <div class="template-card" data-template="${key}">
                <div class="template-icon">${template.icon}</div>
                <div class="template-name">${template.name}</div>
            </div>
        `).join('');

        // Add click handlers
        grid.querySelectorAll('.template-card').forEach(card => {
            card.addEventListener('click', () => {
                const key = card.dataset.template;
                const template = templates[key];
                if (template) {
                    document.getElementById('mermaid-code').value = template.code;
                    this.updateLineNumbers();
                    this.saveMermaidHistory();
                    this.renderMermaid();
                    document.getElementById('templates-modal').classList.remove('active');
                }
            });
        });
    }

    showTemplatesModal() {
        document.getElementById('templates-modal').classList.add('active');
    }

    filterTemplates(query) {
        const cards = document.querySelectorAll('.template-card');
        const lowerQuery = query.toLowerCase();

        cards.forEach(card => {
            const name = card.querySelector('.template-name').textContent.toLowerCase();
            card.style.display = name.includes(lowerQuery) ? 'flex' : 'none';
        });
    }

    loadDiagramTemplate(type) {
        const templates = this.getMermaidTemplates();
        const template = templates[type];
        if (template) {
            document.getElementById('mermaid-code').value = template.code;
            this.updateLineNumbers();
            this.saveMermaidHistory();
            this.renderMermaid();
        }
    }

    getMermaidTemplates() {
        return {
            flowchart: {
                name: 'Flowchart',
                icon: '📊',
                code: `flowchart TD
    A[Start] --> B{Is it working?}
    B -->|Yes| C[Great!]
    B -->|No| D[Debug]
    D --> B
    C --> E[End]`
            },
            sequence: {
                name: 'Sequence',
                icon: '🔄',
                code: `sequenceDiagram
    participant A as Alice
    participant B as Bob
    participant C as Charlie

    A->>B: Hello Bob!
    B->>C: Hello Charlie!
    C-->>B: Hi Bob!
    B-->>A: Hi Alice!

    Note over A,C: This is a note`
            },
            class: {
                name: 'Class Diagram',
                icon: '📦',
                code: `classDiagram
    class Animal {
        +String name
        +int age
        +makeSound()
    }
    class Dog {
        +String breed
        +bark()
    }
    class Cat {
        +String color
        +meow()
    }
    Animal <|-- Dog
    Animal <|-- Cat`
            },
            state: {
                name: 'State Diagram',
                icon: '🔵',
                code: `stateDiagram-v2
    [*] --> Idle
    Idle --> Processing : Start
    Processing --> Success : Complete
    Processing --> Error : Fail
    Success --> [*]
    Error --> Idle : Retry`
            },
            er: {
                name: 'ER Diagram',
                icon: '🗃️',
                code: `erDiagram
    CUSTOMER ||--o{ ORDER : places
    ORDER ||--|{ LINE_ITEM : contains
    PRODUCT ||--o{ LINE_ITEM : "ordered in"
    CUSTOMER {
        string name
        string email
        int id PK
    }
    ORDER {
        int id PK
        date created
        string status
    }`
            },
            journey: {
                name: 'User Journey',
                icon: '🚶',
                code: `journey
    title My Working Day
    section Go to work
        Make tea: 5: Me
        Go upstairs: 3: Me
        Do work: 1: Me, Cat
    section Go home
        Go downstairs: 5: Me
        Sit down: 5: Me`
            },
            gantt: {
                name: 'Gantt Chart',
                icon: '📅',
                code: `gantt
    title Project Schedule
    dateFormat YYYY-MM-DD
    section Planning
        Research      :a1, 2024-01-01, 7d
        Design        :a2, after a1, 14d
    section Development
        Coding        :a3, after a2, 21d
        Testing       :a4, after a3, 14d
    section Deployment
        Release       :a5, after a4, 7d`
            },
            pie: {
                name: 'Pie Chart',
                icon: '🥧',
                code: `pie showData
    title Browser Market Share
    "Chrome" : 65
    "Safari" : 19
    "Firefox" : 10
    "Edge" : 4
    "Other" : 2`
            },
            mindmap: {
                name: 'Mind Map',
                icon: '🧠',
                code: `mindmap
    root((Central Idea))
        Branch 1
            Sub-topic 1.1
            Sub-topic 1.2
        Branch 2
            Sub-topic 2.1
            Sub-topic 2.2
                Detail
        Branch 3
            Sub-topic 3.1`
            },
            timeline: {
                name: 'Timeline',
                icon: '⏱️',
                code: `timeline
    title History of Web Development
    1990 : HTML invented
    1995 : JavaScript created
    1996 : CSS introduced
    2004 : Web 2.0 era begins
    2010 : HTML5 released
    2015 : ES6 JavaScript`
            },
            gitgraph: {
                name: 'Git Graph',
                icon: '🌿',
                code: `gitGraph
    commit id: "Initial"
    branch develop
    checkout develop
    commit id: "Feature A"
    commit id: "Feature B"
    checkout main
    merge develop
    commit id: "Release v1.0"`
            },
            quadrant: {
                name: 'Quadrant',
                icon: '📈',
                code: `quadrantChart
    title Reach and engagement
    x-axis Low Reach --> High Reach
    y-axis Low Engagement --> High Engagement
    quadrant-1 We should expand
    quadrant-2 Need to promote
    quadrant-3 Re-evaluate
    quadrant-4 May be improved
    Campaign A: [0.3, 0.6]
    Campaign B: [0.45, 0.23]
    Campaign C: [0.57, 0.69]
    Campaign D: [0.78, 0.34]`
            },
            sankey: {
                name: 'Sankey',
                icon: '🌊',
                code: `sankey-beta

Agricultural 'waste',Bio-conversion,124.729
Bio-conversion,Liquid,0.597
Bio-conversion,Losses,26.862
Bio-conversion,Solid,280.322
Bio-conversion,Gas,81.144`
            },
            xy: {
                name: 'XY Chart',
                icon: '📉',
                code: `xychart-beta
    title "Sales Revenue"
    x-axis [jan, feb, mar, apr, may, jun]
    y-axis "Revenue ($)" 4000 --> 11000
    bar [5000, 6000, 7500, 8200, 9500, 10500]
    line [5000, 6000, 7500, 8200, 9500, 10500]`
            }
        };
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

        if (this.isSpacePressed) {
            this.isPanning = true;
            this.panStart = { x: e.clientX, y: e.clientY };
            this.engine.canvas.style.cursor = 'grabbing';
            return;
        }

        if (this.currentTool === 'select') {
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
                const addToSelection = e.shiftKey;
                this.engine.selectShape(shape, addToSelection);
                this.layerManager.update();
                this.updateProperties(shape);
                this.isDragging = true;
                this.dragStart = canvasPos;
                this.draggedShape = shape;
                this.dragInitialPos = { x: shape.x, y: shape.y };
            } else {
                if (e.shiftKey) {
                    this.isSelecting = true;
                    this.selectionStart = canvasPos;
                } else if (e.button === 1 || e.ctrlKey) {
                    this.isPanning = true;
                    this.panStart = { x: e.clientX, y: e.clientY };
                } else {
                    this.engine.deselectAll();
                    this.layerManager.update();
                    this.updateProperties(null);
                    this.isSelecting = true;
                    this.selectionStart = canvasPos;
                }
            }
        } else {
            this.isDrawing = true;
            this.drawStart = canvasPos;

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
                    const clickedShape = this.engine.getShapeAt(x, y);
                    if (clickedShape && clickedShape.type !== 'connector') {
                        if (!this.connectStart) {
                            this.connectStart = clickedShape;
                        } else {
                            const connector = new Connector(this.connectStart, clickedShape, {
                                strokeColor: this.strokeColor,
                                strokeWidth: this.strokeWidth
                            });
                            this.engine.addShape(connector);
                            this.connectStart = null;
                        }
                    }
                    return;
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

        this.collaboration.broadcastCursor(canvasPos.x, canvasPos.y);

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

                    if (e.shiftKey) {
                        const size = Math.max(Math.abs(width), Math.abs(height));
                        width = width < 0 ? -size : size;
                        height = height < 0 ? -size : size;
                    }

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

        ctx.translate(this.engine.canvas.width / 2, this.engine.canvas.height / 2);
        ctx.scale(this.engine.zoom, this.engine.zoom);
        ctx.translate(this.engine.pan.x, this.engine.pan.y);

        const minX = Math.min(this.selectionBox.x1, this.selectionBox.x2);
        const minY = Math.min(this.selectionBox.y1, this.selectionBox.y2);
        const width = Math.abs(this.selectionBox.x2 - this.selectionBox.x1);
        const height = Math.abs(this.selectionBox.y2 - this.selectionBox.y1);

        ctx.fillStyle = 'rgba(13, 153, 255, 0.1)';
        ctx.fillRect(minX, minY, width, height);

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

        if (this.isSelecting && this.selectionStart) {
            const rect = this.engine.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const canvasPos = this.engine.screenToCanvas(x, y);

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

        if (shape && shape.type === 'text') {
            const previousTool = this.currentTool;
            this.currentTool = 'select';

            this.textEditor.startEditing(shape);

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

        document.getElementById('fill-color').value = shape.fillColor;
        document.getElementById('fill-color-text').value = shape.fillColor;
        document.getElementById('stroke-color').value = shape.strokeColor;
        document.getElementById('stroke-color-text').value = shape.strokeColor;
        document.getElementById('stroke-width').value = shape.strokeWidth;
        document.getElementById('stroke-width-value').textContent = shape.strokeWidth + 'px';

        transformGroup.style.display = 'block';
        const bounds = shape.getBounds();
        document.getElementById('pos-x').value = Math.round(shape.x);
        document.getElementById('pos-y').value = Math.round(shape.y);
        document.getElementById('size-w').value = Math.round(bounds.width);
        document.getElementById('size-h').value = Math.round(bounds.height);
        document.getElementById('rotation').value = shape.rotation;
        document.getElementById('rotation-value').textContent = shape.rotation + '°';

        document.getElementById('opacity').value = Math.round(shape.opacity * 100);
        document.getElementById('opacity-value').textContent = Math.round(shape.opacity * 100) + '%';
        document.getElementById('corner-radius').value = shape.cornerRadius || 0;
        document.getElementById('corner-radius-value').textContent = (shape.cornerRadius || 0) + 'px';

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
        }
    }

    paste() {
        if (this.clipboard) {
            const ShapeClass = this.getShapeClass(this.clipboard.type);
            if (ShapeClass) {
                const newShape = ShapeClass.fromJSON(this.clipboard);
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
            this.engine.selectMultiple(this.engine.shapes);
            this.layerManager.update();

            if (this.engine.shapes.length === 1) {
                this.updateProperties(this.engine.shapes[0]);
            } else {
                this.updateProperties(null);
            }
        }
    }

    resizeRectangle(shape, handleType, dx, dy, maintainRatio = false) {
        const start = this.resizeStart;
        const ratio = start.shapeWidth / start.shapeHeight;

        switch (handleType) {
            case 'se':
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
            case 'nw':
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
            case 'ne':
                let neWidth = Math.max(10, start.shapeWidth + dx);
                let neHeight = Math.max(10, start.shapeHeight - dy);

                if (maintainRatio) {
                    neWidth = Math.max(10, start.shapeWidth + dx);
                    neHeight = neWidth / ratio;
                }

                shape.width = neWidth;
                shape.height = neHeight;
                shape.x = start.shapeX + (neWidth - start.shapeWidth) / 2;
                shape.y = start.shapeY - (neHeight - start.shapeHeight) / 2;
                break;
            case 'sw':
                let swWidth = Math.max(10, start.shapeWidth - dx);
                let swHeight = Math.max(10, start.shapeHeight + dy);

                if (maintainRatio) {
                    swWidth = Math.max(10, start.shapeWidth - dx);
                    swHeight = swWidth / ratio;
                }

                shape.width = swWidth;
                shape.height = swHeight;
                shape.x = start.shapeX - (swWidth - start.shapeWidth) / 2;
                shape.y = start.shapeY + (swHeight - start.shapeHeight) / 2;
                break;
            case 'e':
                shape.width = Math.max(10, start.shapeWidth + dx);
                if (maintainRatio) shape.height = shape.width / ratio;
                shape.x = start.shapeX + (shape.width - start.shapeWidth) / 2;
                shape.y = start.shapeY + (shape.height - start.shapeHeight) / 2;
                break;
            case 'w':
                shape.width = Math.max(10, start.shapeWidth - dx);
                if (maintainRatio) shape.height = shape.width / ratio;
                shape.x = start.shapeX - (shape.width - start.shapeWidth) / 2;
                shape.y = start.shapeY - (shape.height - start.shapeHeight) / 2;
                break;
            case 'n':
                shape.height = Math.max(10, start.shapeHeight - dy);
                if (maintainRatio) shape.width = shape.height * ratio;
                shape.x = start.shapeX + (shape.width - start.shapeWidth) / 2;
                shape.y = start.shapeY - (shape.height - start.shapeHeight) / 2;
                break;
            case 's':
                shape.height = Math.max(10, start.shapeHeight + dy);
                if (maintainRatio) shape.width = shape.height * ratio;
                shape.x = start.shapeX + (shape.width - start.shapeWidth) / 2;
                shape.y = start.shapeY + (shape.height - start.shapeHeight) / 2;
                break;
        }
    }

    resizeCircle(shape, handleType, dx, dy) {
        const start = this.resizeStart;
        const distance = Math.sqrt(dx * dx + dy * dy);

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

    showToast(message) {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.classList.add('visible');

        setTimeout(() => {
            toast.classList.remove('visible');
        }, 2000);
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

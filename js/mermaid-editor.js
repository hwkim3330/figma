// Mermaid Editor Module - Complete Mermaid Viewer Integration
// Supports all 30+ diagram types with live preview, templates, export, and more

export class MermaidEditor {
    constructor(engine) {
        this.engine = engine;
        this.container = null;
        this.editor = null;
        this.preview = null;
        this.isVisible = false;
        this.currentTheme = 'default';
        this.history = [];
        this.historyIndex = -1;
        this.maxHistory = 50;
        this.autoRender = true;
        this.renderTimeout = null;
        this.zoomLevel = 1;
        this.panX = 0;
        this.panY = 0;

        // Diagram templates library
        this.templates = this.initTemplates();

        // Initialize Mermaid
        this.initMermaid();
    }

    initMermaid() {
        // Load Mermaid library dynamically
        if (!window.mermaid) {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js';
            script.onload = () => {
                mermaid.initialize({
                    startOnLoad: false,
                    theme: this.currentTheme,
                    securityLevel: 'loose',
                    flowchart: { useMaxWidth: false, htmlLabels: true },
                    sequence: { useMaxWidth: false },
                    gantt: { useMaxWidth: false },
                    journey: { useMaxWidth: false },
                    timeline: { useMaxWidth: false },
                    mindmap: { useMaxWidth: false },
                    gitGraph: { useMaxWidth: false }
                });
                console.log('Mermaid initialized');
            };
            document.head.appendChild(script);
        }
    }

    initTemplates() {
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
            flowchartLR: {
                name: 'Flowchart (Left to Right)',
                icon: '➡️',
                code: `flowchart LR
    A[Input] --> B[Process]
    B --> C[Output]
    B --> D[Log]`
            },
            sequence: {
                name: 'Sequence Diagram',
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
            classDiagram: {
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
            stateDiagram: {
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
            erDiagram: {
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
            quadrant: {
                name: 'Quadrant Chart',
                icon: '📈',
                code: `quadrantChart
    title Reach and engagement of campaigns
    x-axis Low Reach --> High Reach
    y-axis Low Engagement --> High Engagement
    quadrant-1 We should expand
    quadrant-2 Need to promote
    quadrant-3 Re-evaluate
    quadrant-4 May be improved
    Campaign A: [0.3, 0.6]
    Campaign B: [0.45, 0.23]
    Campaign C: [0.57, 0.69]
    Campaign D: [0.78, 0.34]
    Campaign E: [0.40, 0.34]
    Campaign F: [0.35, 0.78]`
            },
            requirement: {
                name: 'Requirement Diagram',
                icon: '📋',
                code: `requirementDiagram
    requirement test_req {
        id: 1
        text: The system shall do something
        risk: high
        verifymethod: test
    }

    element test_entity {
        type: simulation
    }

    test_entity - satisfies -> test_req`
            },
            gitGraph: {
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
            c4Context: {
                name: 'C4 Context',
                icon: '🏗️',
                code: `C4Context
    title System Context Diagram

    Person(user, "User", "A user of the system")
    System(system, "My System", "The main system")
    System_Ext(email, "Email System", "External email")

    Rel(user, system, "Uses")
    Rel(system, email, "Sends emails")`
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
            sankey: {
                name: 'Sankey Diagram',
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
    x-axis [jan, feb, mar, apr, may, jun, jul, aug, sep, oct, nov, dec]
    y-axis "Revenue (in $)" 4000 --> 11000
    bar [5000, 6000, 7500, 8200, 9500, 10500, 11000, 10200, 9200, 8500, 7000, 6000]
    line [5000, 6000, 7500, 8200, 9500, 10500, 11000, 10200, 9200, 8500, 7000, 6000]`
            },
            block: {
                name: 'Block Diagram',
                icon: '🧱',
                code: `block-beta
    columns 3

    a["Start"]:1
    b["Process 1"]:1
    c["Process 2"]:1

    d["Decision"]:2
    e["End"]:1

    a --> b
    b --> c
    c --> d
    d --> e`
            },
            packet: {
                name: 'Packet Diagram',
                icon: '📦',
                code: `packet-beta
    0-15: "Source Port"
    16-31: "Destination Port"
    32-63: "Sequence Number"
    64-95: "Acknowledgment Number"
    96-99: "Data Offset"
    100-105: "Reserved"
    106-111: "Flags"
    112-127: "Window Size"`
            },
            architecture: {
                name: 'Architecture',
                icon: '🏛️',
                code: `architecture-beta
    group api(cloud)[API]

    service db(database)[Database] in api
    service disk1(disk)[Storage] in api
    service disk2(disk)[Storage] in api
    service server(server)[Server] in api

    db:L -- R:server
    disk1:T -- B:server
    disk2:T -- B:db`
            }
        };
    }

    createUI() {
        // Create main container
        this.container = document.createElement('div');
        this.container.className = 'mermaid-editor-panel';
        this.container.innerHTML = `
            <div class="mermaid-editor-header">
                <div class="mermaid-editor-title">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                        <polyline points="10 9 9 9 8 9"></polyline>
                    </svg>
                    <span>Mermaid Editor</span>
                </div>
                <div class="mermaid-editor-controls">
                    <button class="mermaid-btn" id="mermaid-undo-btn" title="Undo (Ctrl+Z)">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>
                        </svg>
                    </button>
                    <button class="mermaid-btn" id="mermaid-redo-btn" title="Redo (Ctrl+Y)">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"/>
                        </svg>
                    </button>
                    <button class="mermaid-btn" id="mermaid-close-btn" title="Close">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                    </button>
                </div>
            </div>

            <div class="mermaid-editor-toolbar">
                <div class="toolbar-section">
                    <button class="mermaid-btn mermaid-btn-primary" id="mermaid-templates-btn">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="3" y1="9" x2="21" y2="9"></line>
                            <line x1="9" y1="21" x2="9" y2="9"></line>
                        </svg>
                        Templates
                    </button>
                    <select id="mermaid-theme-select" class="mermaid-select">
                        <option value="default">Default Theme</option>
                        <option value="dark">Dark Theme</option>
                        <option value="forest">Forest Theme</option>
                        <option value="neutral">Neutral Theme</option>
                        <option value="base">Base Theme</option>
                    </select>
                </div>
                <div class="toolbar-section">
                    <label class="mermaid-checkbox">
                        <input type="checkbox" id="mermaid-auto-render" checked>
                        <span>Live Preview</span>
                    </label>
                    <button class="mermaid-btn" id="mermaid-render-btn" title="Render (Ctrl+Enter)">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polygon points="5 3 19 12 5 21 5 3"></polygon>
                        </svg>
                        Render
                    </button>
                </div>
                <div class="toolbar-section">
                    <button class="mermaid-btn" id="mermaid-zoom-out-btn" title="Zoom Out">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/>
                        </svg>
                    </button>
                    <span class="mermaid-zoom-level" id="mermaid-zoom-level">100%</span>
                    <button class="mermaid-btn" id="mermaid-zoom-in-btn" title="Zoom In">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
                        </svg>
                    </button>
                    <button class="mermaid-btn" id="mermaid-zoom-fit-btn" title="Fit to View">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
                        </svg>
                    </button>
                </div>
            </div>

            <div class="mermaid-editor-content">
                <div class="mermaid-code-section">
                    <div class="mermaid-code-header">
                        <span>Code</span>
                        <div class="mermaid-code-actions">
                            <button class="mermaid-btn-small" id="mermaid-format-btn" title="Format Code">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <line x1="21" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="21" y1="18" x2="3" y2="18"/>
                                </svg>
                            </button>
                            <button class="mermaid-btn-small" id="mermaid-copy-code-btn" title="Copy Code">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div class="mermaid-code-wrapper">
                        <div class="mermaid-line-numbers" id="mermaid-line-numbers"></div>
                        <textarea id="mermaid-code-editor" spellcheck="false" placeholder="Enter Mermaid code here..."></textarea>
                    </div>
                    <div class="mermaid-error-panel" id="mermaid-error-panel"></div>
                </div>

                <div class="mermaid-preview-section">
                    <div class="mermaid-preview-header">
                        <span>Preview</span>
                        <div class="mermaid-preview-actions">
                            <button class="mermaid-btn-small" id="mermaid-fullscreen-btn" title="Fullscreen">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div class="mermaid-preview-wrapper" id="mermaid-preview-wrapper">
                        <div class="mermaid-preview" id="mermaid-preview"></div>
                    </div>
                </div>
            </div>

            <div class="mermaid-editor-footer">
                <div class="footer-left">
                    <span class="mermaid-status" id="mermaid-status">Ready</span>
                </div>
                <div class="footer-right">
                    <button class="mermaid-btn" id="mermaid-export-svg-btn">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                        SVG
                    </button>
                    <button class="mermaid-btn" id="mermaid-export-png-btn">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                        PNG
                    </button>
                    <button class="mermaid-btn" id="mermaid-export-pdf-btn">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                        </svg>
                        PDF
                    </button>
                    <button class="mermaid-btn mermaid-btn-primary" id="mermaid-add-to-canvas-btn">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                        </svg>
                        Add to Canvas
                    </button>
                </div>
            </div>
        `;

        // Create templates modal
        this.templatesModal = document.createElement('div');
        this.templatesModal.className = 'mermaid-templates-modal';
        this.templatesModal.innerHTML = `
            <div class="mermaid-templates-content">
                <div class="mermaid-templates-header">
                    <h3>Diagram Templates</h3>
                    <button class="mermaid-btn" id="mermaid-templates-close-btn">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                    </button>
                </div>
                <div class="mermaid-templates-search">
                    <input type="text" id="mermaid-template-search" placeholder="Search templates...">
                </div>
                <div class="mermaid-templates-grid" id="mermaid-templates-grid">
                    ${Object.entries(this.templates).map(([key, template]) => `
                        <div class="mermaid-template-card" data-template="${key}">
                            <div class="template-icon">${template.icon}</div>
                            <div class="template-name">${template.name}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        document.body.appendChild(this.container);
        document.body.appendChild(this.templatesModal);

        this.editor = document.getElementById('mermaid-code-editor');
        this.preview = document.getElementById('mermaid-preview');
        this.previewWrapper = document.getElementById('mermaid-preview-wrapper');

        this.setupEventListeners();
        this.updateLineNumbers();
    }

    setupEventListeners() {
        // Close button
        document.getElementById('mermaid-close-btn').addEventListener('click', () => this.hide());

        // Editor events
        this.editor.addEventListener('input', () => {
            this.updateLineNumbers();
            this.saveToHistory();
            if (this.autoRender) {
                this.debouncedRender();
            }
        });

        this.editor.addEventListener('scroll', () => {
            document.getElementById('mermaid-line-numbers').scrollTop = this.editor.scrollTop;
        });

        this.editor.addEventListener('keydown', (e) => {
            // Tab handling
            if (e.key === 'Tab') {
                e.preventDefault();
                const start = this.editor.selectionStart;
                const end = this.editor.selectionEnd;
                const value = this.editor.value;
                this.editor.value = value.substring(0, start) + '    ' + value.substring(end);
                this.editor.selectionStart = this.editor.selectionEnd = start + 4;
                this.updateLineNumbers();
            }

            // Ctrl+Enter to render
            if (e.ctrlKey && e.key === 'Enter') {
                e.preventDefault();
                this.render();
            }

            // Ctrl+Z undo
            if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                this.undo();
            }

            // Ctrl+Y or Ctrl+Shift+Z redo
            if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'z')) {
                e.preventDefault();
                this.redo();
            }
        });

        // Undo/Redo buttons
        document.getElementById('mermaid-undo-btn').addEventListener('click', () => this.undo());
        document.getElementById('mermaid-redo-btn').addEventListener('click', () => this.redo());

        // Theme select
        document.getElementById('mermaid-theme-select').addEventListener('change', (e) => {
            this.currentTheme = e.target.value;
            this.render();
        });

        // Auto render toggle
        document.getElementById('mermaid-auto-render').addEventListener('change', (e) => {
            this.autoRender = e.target.checked;
        });

        // Manual render
        document.getElementById('mermaid-render-btn').addEventListener('click', () => this.render());

        // Zoom controls
        document.getElementById('mermaid-zoom-in-btn').addEventListener('click', () => this.zoom(0.1));
        document.getElementById('mermaid-zoom-out-btn').addEventListener('click', () => this.zoom(-0.1));
        document.getElementById('mermaid-zoom-fit-btn').addEventListener('click', () => this.fitToView());

        // Preview panning
        this.setupPreviewPanning();

        // Export buttons
        document.getElementById('mermaid-export-svg-btn').addEventListener('click', () => this.exportSVG());
        document.getElementById('mermaid-export-png-btn').addEventListener('click', () => this.exportPNG());
        document.getElementById('mermaid-export-pdf-btn').addEventListener('click', () => this.exportPDF());
        document.getElementById('mermaid-add-to-canvas-btn').addEventListener('click', () => this.addToCanvas());

        // Copy code
        document.getElementById('mermaid-copy-code-btn').addEventListener('click', () => this.copyCode());

        // Format code
        document.getElementById('mermaid-format-btn').addEventListener('click', () => this.formatCode());

        // Fullscreen
        document.getElementById('mermaid-fullscreen-btn').addEventListener('click', () => this.toggleFullscreen());

        // Templates
        document.getElementById('mermaid-templates-btn').addEventListener('click', () => this.showTemplates());
        document.getElementById('mermaid-templates-close-btn').addEventListener('click', () => this.hideTemplates());

        // Template search
        document.getElementById('mermaid-template-search').addEventListener('input', (e) => {
            this.filterTemplates(e.target.value);
        });

        // Template cards
        document.querySelectorAll('.mermaid-template-card').forEach(card => {
            card.addEventListener('click', () => {
                const templateKey = card.dataset.template;
                this.loadTemplate(templateKey);
                this.hideTemplates();
            });
        });

        // Close templates modal on outside click
        this.templatesModal.addEventListener('click', (e) => {
            if (e.target === this.templatesModal) {
                this.hideTemplates();
            }
        });
    }

    setupPreviewPanning() {
        let isPanning = false;
        let startX, startY;

        this.previewWrapper.addEventListener('mousedown', (e) => {
            if (e.button === 0) {
                isPanning = true;
                startX = e.clientX - this.panX;
                startY = e.clientY - this.panY;
                this.previewWrapper.style.cursor = 'grabbing';
            }
        });

        document.addEventListener('mousemove', (e) => {
            if (isPanning) {
                this.panX = e.clientX - startX;
                this.panY = e.clientY - startY;
                this.updatePreviewTransform();
            }
        });

        document.addEventListener('mouseup', () => {
            isPanning = false;
            this.previewWrapper.style.cursor = 'grab';
        });

        // Mouse wheel zoom
        this.previewWrapper.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            this.zoom(delta);
        });
    }

    updateLineNumbers() {
        const lines = this.editor.value.split('\n').length;
        const lineNumbers = document.getElementById('mermaid-line-numbers');
        lineNumbers.innerHTML = Array.from({ length: lines }, (_, i) =>
            `<div class="line-number">${i + 1}</div>`
        ).join('');
    }

    debouncedRender() {
        clearTimeout(this.renderTimeout);
        this.renderTimeout = setTimeout(() => this.render(), 500);
    }

    async render() {
        const code = this.editor.value.trim();
        if (!code) {
            this.preview.innerHTML = '<div class="mermaid-empty">Enter Mermaid code to see preview</div>';
            return;
        }

        if (!window.mermaid) {
            this.showError('Mermaid library not loaded yet. Please wait...');
            return;
        }

        try {
            // Update theme
            mermaid.initialize({
                startOnLoad: false,
                theme: this.currentTheme,
                securityLevel: 'loose'
            });

            // Clear previous content
            this.preview.innerHTML = '';
            this.hideError();
            this.setStatus('Rendering...');

            // Generate unique ID
            const id = 'mermaid-' + Date.now();

            // Render
            const { svg } = await mermaid.render(id, code);
            this.preview.innerHTML = svg;

            // Apply zoom
            this.updatePreviewTransform();

            this.setStatus('Rendered successfully');
        } catch (err) {
            this.showError(err.message || 'Syntax error in diagram');
            this.setStatus('Error');
        }
    }

    showError(message) {
        const errorPanel = document.getElementById('mermaid-error-panel');
        errorPanel.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span>${message}</span>
        `;
        errorPanel.classList.add('visible');
    }

    hideError() {
        const errorPanel = document.getElementById('mermaid-error-panel');
        errorPanel.classList.remove('visible');
    }

    setStatus(status) {
        document.getElementById('mermaid-status').textContent = status;
    }

    zoom(delta) {
        this.zoomLevel = Math.max(0.1, Math.min(3, this.zoomLevel + delta));
        document.getElementById('mermaid-zoom-level').textContent = Math.round(this.zoomLevel * 100) + '%';
        this.updatePreviewTransform();
    }

    fitToView() {
        this.zoomLevel = 1;
        this.panX = 0;
        this.panY = 0;
        document.getElementById('mermaid-zoom-level').textContent = '100%';
        this.updatePreviewTransform();
    }

    updatePreviewTransform() {
        const svg = this.preview.querySelector('svg');
        if (svg) {
            svg.style.transform = `scale(${this.zoomLevel}) translate(${this.panX / this.zoomLevel}px, ${this.panY / this.zoomLevel}px)`;
            svg.style.transformOrigin = 'center center';
        }
    }

    saveToHistory() {
        const code = this.editor.value;

        // Remove future history if we're not at the end
        if (this.historyIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.historyIndex + 1);
        }

        // Don't save if same as last
        if (this.history.length > 0 && this.history[this.history.length - 1] === code) {
            return;
        }

        this.history.push(code);
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        }
        this.historyIndex = this.history.length - 1;
    }

    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.editor.value = this.history[this.historyIndex];
            this.updateLineNumbers();
            if (this.autoRender) {
                this.render();
            }
        }
    }

    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.editor.value = this.history[this.historyIndex];
            this.updateLineNumbers();
            if (this.autoRender) {
                this.render();
            }
        }
    }

    async copyCode() {
        try {
            await navigator.clipboard.writeText(this.editor.value);
            this.showToast('Code copied to clipboard');
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    }

    formatCode() {
        // Basic formatting - ensure consistent indentation
        const lines = this.editor.value.split('\n');
        let formatted = [];
        let indent = 0;

        for (let line of lines) {
            let trimmed = line.trim();

            // Decrease indent for closing keywords
            if (trimmed.match(/^(end|section|else)/i)) {
                indent = Math.max(0, indent - 1);
            }

            if (trimmed) {
                formatted.push('    '.repeat(indent) + trimmed);
            } else {
                formatted.push('');
            }

            // Increase indent for opening keywords
            if (trimmed.match(/^(subgraph|section|loop|alt|opt|par|critical|break|rect)/i)) {
                indent++;
            }
        }

        this.editor.value = formatted.join('\n');
        this.updateLineNumbers();
        this.render();
    }

    loadTemplate(templateKey) {
        const template = this.templates[templateKey];
        if (template) {
            this.editor.value = template.code;
            this.updateLineNumbers();
            this.saveToHistory();
            this.render();
        }
    }

    filterTemplates(query) {
        const cards = document.querySelectorAll('.mermaid-template-card');
        const lowerQuery = query.toLowerCase();

        cards.forEach(card => {
            const name = card.querySelector('.template-name').textContent.toLowerCase();
            card.style.display = name.includes(lowerQuery) ? 'flex' : 'none';
        });
    }

    showTemplates() {
        this.templatesModal.classList.add('active');
    }

    hideTemplates() {
        this.templatesModal.classList.remove('active');
    }

    exportSVG() {
        const svg = this.preview.querySelector('svg');
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

    exportPNG() {
        const svg = this.preview.querySelector('svg');
        if (!svg) {
            this.showToast('No diagram to export');
            return;
        }

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const svgData = new XMLSerializer().serializeToString(svg);
        const img = new Image();

        // Get SVG dimensions
        const bbox = svg.getBBox();
        const width = bbox.width || svg.clientWidth || 800;
        const height = bbox.height || svg.clientHeight || 600;

        // Scale for high resolution
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

    exportPDF() {
        const svg = this.preview.querySelector('svg');
        if (!svg) {
            this.showToast('No diagram to export');
            return;
        }

        // Create a new window with the SVG for printing
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
                <script>
                    window.onload = function() {
                        window.print();
                        window.close();
                    }
                </script>
            </body>
            </html>
        `);

        this.showToast('Opening print dialog for PDF');
    }

    async addToCanvas() {
        const svg = this.preview.querySelector('svg');
        if (!svg) {
            this.showToast('No diagram to add');
            return;
        }

        // Convert SVG to data URL
        const svgData = new XMLSerializer().serializeToString(svg);
        const dataUrl = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));

        // Create image and add to canvas
        const img = new Image();
        img.onload = () => {
            // Add to canvas engine
            if (this.engine && typeof this.engine.addImage === 'function') {
                this.engine.addImage(img, 0, 0, img.width, img.height);
            } else {
                // Alternative: download as image
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);

                // Store for later use
                this.lastRenderedImage = canvas.toDataURL('image/png');
                this.showToast('Diagram ready - use Export PNG to save');
            }
        };
        img.src = dataUrl;

        this.showToast('Added to canvas');
    }

    toggleFullscreen() {
        this.container.classList.toggle('fullscreen');
    }

    showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'mermaid-toast';
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => toast.classList.add('visible'), 10);
        setTimeout(() => {
            toast.classList.remove('visible');
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }

    show() {
        if (!this.container) {
            this.createUI();
        }
        this.container.classList.add('active');
        this.isVisible = true;

        // Load default template
        if (!this.editor.value) {
            this.loadTemplate('flowchart');
        }
    }

    hide() {
        if (this.container) {
            this.container.classList.remove('active');
            this.container.classList.remove('fullscreen');
        }
        this.isVisible = false;
    }

    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }

    setCode(code) {
        if (this.editor) {
            this.editor.value = code;
            this.updateLineNumbers();
            this.saveToHistory();
            this.render();
        }
    }

    getCode() {
        return this.editor ? this.editor.value : '';
    }
}

export default MermaidEditor;

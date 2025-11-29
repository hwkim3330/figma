# DesignFlow

> Professional Design Tools for Everyone

**Live:** https://hwkim3330.github.io/figma

---

## Tools

| Tool | Description | Link |
|------|-------------|------|
| **Basic Canvas** | Simple drawing tool | [v1-basic.html](v1-basic.html) |
| **Pro Designer** | Advanced design with effects | [v2-advanced.html](v2-advanced.html) |
| **Diagram Editor** | Mermaid diagrams | [v3-mermaid.html](v3-mermaid.html) |

---

## v1 - Basic Canvas

Simple and fast drawing tool for quick sketches.

### Features
- Basic shapes (Rectangle, Circle, Triangle, Line, Text)
- Color picker for fill and stroke
- Layers panel with visibility toggle
- Undo/Redo history
- Export to PNG
- Grid display

### Shortcuts
| Key | Action |
|-----|--------|
| V | Select |
| R | Rectangle |
| C | Circle |
| T | Triangle |
| L | Line |
| X | Text |
| Del | Delete |
| Ctrl+Z | Undo |
| Ctrl+Y | Redo |
| Ctrl+D | Duplicate |
| Ctrl+C/V | Copy/Paste |
| +/- | Zoom |

---

## v2 - Pro Designer

Advanced design tool with professional features.

### Features
- All basic shapes + Star, Hexagon, Arrow
- Pen tool for vector paths
- Pencil tool for freehand drawing
- Gradient fills (6 presets: Sunset, Ocean, Forest, Fire, Midnight, Gold)
- Drop shadow effects
- Blur effects
- Opacity and corner radius
- Rotation control
- Real-time collaboration via PeerJS
- Grid and snap-to-grid

### Shortcuts
| Key | Action |
|-----|--------|
| V | Select |
| R | Rectangle |
| C | Circle |
| P | Pen tool |
| B | Pencil |
| S | Star |
| H | Hexagon |
| A | Arrow |
| G | Toggle grid |

### Collaboration
1. Click "Collaborate" button
2. Copy your Session ID
3. Share with others
4. They enter your ID and connect
5. All changes sync in real-time!

---

## v3 - Diagram Editor

Create beautiful diagrams with Mermaid syntax.

### Diagram Types
- Flowchart
- Sequence Diagram
- Class Diagram
- State Diagram
- ER Diagram
- User Journey
- Gantt Chart
- Pie Chart
- Mind Map
- Timeline
- Git Graph

### Features
- Live preview (auto-render)
- 12+ ready-to-use templates
- 4 themes (Default, Dark, Forest, Neutral)
- Code formatting
- Export to SVG/PNG
- Resizable panels
- Fullscreen mode
- Zoom controls

---

## Architecture

```
figma/
├── index.html          # Landing page
├── v1-basic.html       # Basic Canvas (standalone)
├── v2-advanced.html    # Pro Designer (standalone)
├── v3-mermaid.html     # Diagram Editor (standalone)
└── README.md
```

### Design Decisions

**Single-File Architecture**: Each tool is a standalone HTML file with embedded CSS and JavaScript.

Benefits:
- Zero dependencies
- No build tools required
- No module import errors
- Fast loading (one request)
- Easy to deploy and maintain

---

## Tech Stack

| Tool | Technologies |
|------|--------------|
| Basic Canvas | Vanilla JS, Canvas API |
| Pro Designer | Vanilla JS, Canvas API, PeerJS (WebRTC) |
| Diagram Editor | Vanilla JS, Mermaid.js |

---

## Browser Support

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

---

## Local Development

```bash
git clone https://github.com/hwkim3330/figma.git
cd figma

# Option 1: Python
python3 -m http.server 8000

# Option 2: Node.js
npx serve

# Open http://localhost:8000
```

No build process needed. Just open any HTML file directly.

---

## License

MIT License

---

Created with [Claude Code](https://claude.com/claude-code)

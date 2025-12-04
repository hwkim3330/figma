# DesignFlow

> Professional Design Tools - No Login Required

**Live:** https://hwkim3330.github.io/figma

---

## Tools

| Tool | Description | Link |
|------|-------------|------|
| **Basic Canvas** | Simple drawing tool for beginners | [basic/](basic/) |
| **Pro Designer** | Advanced design with effects & collaboration | [pro/](pro/) |
| **Diagram Editor** | Mermaid-powered diagram creation | [mermaid/](mermaid/) |
| **Whiteboard** | Infinite canvas for freehand drawing | [whiteboard/](whiteboard/) |

---

## Basic Canvas

Simple and fast drawing tool for quick sketches.

**Features:**
- Basic shapes (Rectangle, Circle, Triangle, Line, Text)
- Color picker for fill and stroke
- Layers panel with visibility toggle
- Undo/Redo history
- Export to PNG
- Grid display

**Shortcuts:**
| Key | Action | Key | Action |
|-----|--------|-----|--------|
| V | Select | Ctrl+Z | Undo |
| R | Rectangle | Ctrl+Y | Redo |
| C | Circle | Ctrl+D | Duplicate |
| T | Triangle | Ctrl+C/V | Copy/Paste |
| L | Line | Del | Delete |
| X | Text | +/- | Zoom |

---

## Pro Designer

Advanced design tool with professional features.

**Features:**
- All basic shapes + Star, Hexagon, Arrow
- Pen tool for vector paths
- Pencil tool for freehand drawing
- Gradient fills (6 presets)
- Drop shadow & blur effects
- Real-time collaboration via WebRTC

**Shortcuts:**
| Key | Action | Key | Action |
|-----|--------|-----|--------|
| V | Select | S | Star |
| R | Rectangle | H | Hexagon |
| C | Circle | A | Arrow |
| P | Pen tool | G | Toggle grid |
| B | Pencil | | |

**Collaboration:**
1. Click "Collaborate" button
2. Copy your Session ID
3. Share with others - they connect instantly!

---

## Diagram Editor

Create beautiful diagrams with Mermaid syntax.

**Supported Diagrams:**
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

**Features:**
- Live preview
- 12+ templates
- 4 themes
- Export to SVG/PNG

---

## Whiteboard

Infinite canvas for freehand drawing and brainstorming.

**Features:**
- Freehand pen drawing
- Highlighter tool
- Eraser
- Shapes (Rectangle, Circle, Arrow, Line)
- Sticky notes (5 colors)
- Text boxes
- Infinite pan & zoom
- Touch support

**Shortcuts:**
| Key | Action | Key | Action |
|-----|--------|-----|--------|
| P | Pen | R | Rectangle |
| H | Highlighter | C | Circle |
| E | Eraser | A | Arrow |
| V | Select | L | Line |
| T | Text | S | Sticky note |

---

## Project Structure

```
figma/
├── index.html          # Landing page (tool selector)
├── basic/
│   └── index.html      # Basic Canvas
├── pro/
│   └── index.html      # Pro Designer
├── mermaid/
│   └── index.html      # Diagram Editor
├── whiteboard/
│   └── index.html      # Whiteboard
└── README.md
```

---

## Architecture

**Single-File Design**: Each tool is a standalone HTML file with embedded CSS and JavaScript.

| Benefit | Description |
|---------|-------------|
| Zero dependencies | No npm, no bundler |
| No build step | Open HTML directly |
| No errors | No module import issues |
| Fast loading | Single HTTP request |
| Easy deploy | Copy and paste |

---

## Tech Stack

| Tool | Technologies |
|------|--------------|
| Basic Canvas | Vanilla JS, Canvas API |
| Pro Designer | Vanilla JS, Canvas API, PeerJS |
| Diagram Editor | Vanilla JS, Mermaid.js |
| Whiteboard | Vanilla JS, Canvas API, Touch API |

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

---

## License

MIT License

---

Created with [Claude Code](https://claude.com/claude-code)

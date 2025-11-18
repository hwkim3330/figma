export class TextEditor {
    constructor(canvasEngine, collaboration) {
        this.engine = canvasEngine;
        this.collaboration = collaboration;
        this.editingShape = null;
        this.editorElement = null;
        this.isEditing = false;
        this.onEditingComplete = null;

        this.createEditorElement();
    }

    createEditorElement() {
        this.editorElement = document.createElement('textarea');
        this.editorElement.id = 'text-editor-overlay';
        this.editorElement.style.position = 'absolute';
        this.editorElement.style.display = 'none';
        this.editorElement.style.border = '2px solid #0d99ff';
        this.editorElement.style.background = 'rgba(255, 255, 255, 0.95)';
        this.editorElement.style.outline = 'none';
        this.editorElement.style.resize = 'none';
        this.editorElement.style.overflow = 'hidden';
        this.editorElement.style.fontFamily = 'Arial';
        this.editorElement.style.textAlign = 'center';
        this.editorElement.style.padding = '4px';
        this.editorElement.style.zIndex = '1000';

        document.body.appendChild(this.editorElement);

        // Handle text changes
        this.editorElement.addEventListener('input', () => {
            if (this.editingShape) {
                this.editingShape.text = this.editorElement.value;
                this.engine.render();
                this.updateEditorSize();

                // Broadcast text change
                if (this.collaboration && this.collaboration.enabled) {
                    this.collaboration.broadcastShapeUpdate(this.editingShape);
                }
            }
        });

        // Handle blur (clicking outside)
        this.editorElement.addEventListener('blur', () => {
            this.stopEditing();
        });

        // Handle Enter key
        this.editorElement.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.stopEditing();
            } else if (e.key === 'Escape') {
                this.stopEditing();
            }
        });
    }

    startEditing(textShape) {
        if (this.isEditing) {
            this.stopEditing();
        }

        this.editingShape = textShape;
        this.isEditing = true;

        // Set editor text
        this.editorElement.value = textShape.text;

        // Position and style editor
        const screenPos = this.engine.canvasToScreen(textShape.x, textShape.y);
        this.editorElement.style.fontSize = (textShape.fontSize * this.engine.zoom) + 'px';
        this.editorElement.style.fontFamily = textShape.fontFamily;
        this.editorElement.style.color = textShape.fillColor;

        this.updateEditorSize();

        // Position editor
        const bounds = this.editorElement.getBoundingClientRect();
        this.editorElement.style.left = (screenPos.x - bounds.width / 2) + 'px';
        this.editorElement.style.top = (screenPos.y - bounds.height / 2) + 'px';

        // Show and focus
        this.editorElement.style.display = 'block';
        this.editorElement.focus();
        this.editorElement.select();
    }

    updateEditorSize() {
        if (!this.editingShape) return;

        // Auto-resize based on content
        this.editorElement.style.height = 'auto';
        this.editorElement.style.width = 'auto';

        const minWidth = 100;
        const padding = 20;
        const width = Math.max(minWidth, this.editorElement.scrollWidth + padding);

        this.editorElement.style.width = width + 'px';
        this.editorElement.style.height = this.editorElement.scrollHeight + 'px';
    }

    stopEditing() {
        if (!this.isEditing) return;

        this.editorElement.style.display = 'none';
        this.isEditing = false;
        this.editingShape = null;
        this.engine.render();

        // Call completion callback
        if (this.onEditingComplete) {
            this.onEditingComplete();
            this.onEditingComplete = null;
        }
    }

    isActive() {
        return this.isEditing;
    }
}

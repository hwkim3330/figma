export class History {
    constructor(maxSize = 50) {
        this.undoStack = [];
        this.redoStack = [];
        this.maxSize = maxSize;
    }

    push(action) {
        this.undoStack.push(action);
        this.redoStack = [];

        if (this.undoStack.length > this.maxSize) {
            this.undoStack.shift();
        }
    }

    undo() {
        if (this.undoStack.length === 0) return null;

        const action = this.undoStack.pop();
        this.redoStack.push(action);
        return action;
    }

    redo() {
        if (this.redoStack.length === 0) return null;

        const action = this.redoStack.pop();
        this.undoStack.push(action);
        return action;
    }

    canUndo() {
        return this.undoStack.length > 0;
    }

    canRedo() {
        return this.redoStack.length > 0;
    }

    clear() {
        this.undoStack = [];
        this.redoStack = [];
    }
}

export class Action {
    constructor(type, data, undo, redo) {
        this.type = type;
        this.data = data;
        this.undo = undo;
        this.redo = redo;
    }

    execute() {
        if (this.redo) {
            this.redo();
        }
    }

    revert() {
        if (this.undo) {
            this.undo();
        }
    }
}

export function createAddShapeAction(engine, shape) {
    return new Action(
        'add',
        { shape },
        () => {
            engine.removeShape(shape);
            engine.render();
        },
        () => {
            engine.addShape(shape);
            engine.render();
        }
    );
}

export function createRemoveShapeAction(engine, shape) {
    const index = engine.shapes.indexOf(shape);
    return new Action(
        'remove',
        { shape, index },
        () => {
            engine.shapes.splice(index, 0, shape);
            engine.render();
        },
        () => {
            engine.removeShape(shape);
            engine.render();
        }
    );
}

export function createModifyShapeAction(engine, shape, oldProps, newProps) {
    return new Action(
        'modify',
        { shape, oldProps, newProps },
        () => {
            Object.assign(shape, oldProps);
            engine.render();
        },
        () => {
            Object.assign(shape, newProps);
            engine.render();
        }
    );
}

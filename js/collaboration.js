export class Collaboration {
    constructor(engine) {
        this.engine = engine;
        this.peer = null;
        this.connections = new Map();
        this.myId = null;
        this.cursors = new Map();
        this.enabled = false;
    }

    async init() {
        return new Promise((resolve, reject) => {
            try {
                this.peer = new Peer();

                this.peer.on('open', (id) => {
                    this.myId = id;
                    this.enabled = true;
                    console.log('My peer ID:', id);

                    // Update URL with my peer ID
                    this.updateURL();

                    // Auto-connect if peer ID in URL
                    this.autoConnectFromURL();

                    resolve(id);
                });

                this.peer.on('connection', (conn) => {
                    this.handleConnection(conn);
                });

                this.peer.on('error', (err) => {
                    console.error('PeerJS error:', err);
                    reject(err);
                });
            } catch (err) {
                reject(err);
            }
        });
    }

    updateURL() {
        if (!this.myId) return;
        const url = new URL(window.location);
        url.searchParams.set('id', this.myId);
        window.history.replaceState({}, '', url);
    }

    autoConnectFromURL() {
        const params = new URLSearchParams(window.location.search);
        const connectTo = params.get('connect');

        if (connectTo && connectTo !== this.myId) {
            console.log('Auto-connecting to peer from URL:', connectTo);
            setTimeout(() => {
                this.connectToPeer(connectTo);
            }, 1000);
        }
    }

    getShareURL() {
        if (!this.myId) return null;
        const url = new URL(window.location.origin + window.location.pathname);
        url.searchParams.set('connect', this.myId);
        return url.toString();
    }

    async generateQRCode(url) {
        // Using QRCode.js library
        const qr = new QRious({
            value: url,
            size: 256,
            level: 'H'
        });
        return qr.toDataURL();
    }

    connectToPeer(peerId) {
        if (!this.peer || !this.enabled) {
            console.error('Peer not initialized');
            return false;
        }

        if (peerId === this.myId) {
            console.error('Cannot connect to yourself');
            return false;
        }

        if (this.connections.has(peerId)) {
            console.log('Already connected to this peer');
            return false;
        }

        const conn = this.peer.connect(peerId);
        this.handleConnection(conn);
        return true;
    }

    handleConnection(conn) {
        conn.on('open', () => {
            console.log('Connected to peer:', conn.peer);
            this.connections.set(conn.peer, conn);

            // Send current state
            this.sendMessage(conn, {
                type: 'sync',
                data: {
                    shapes: this.engine.shapes.map(s => s.toJSON()),
                    zoom: this.engine.zoom,
                    pan: this.engine.pan
                }
            });

            this.onConnectionChange();
        });

        conn.on('data', (data) => {
            this.handleMessage(conn.peer, data);
        });

        conn.on('close', () => {
            console.log('Connection closed:', conn.peer);
            this.connections.delete(conn.peer);
            this.cursors.delete(conn.peer);
            this.onConnectionChange();
        });

        conn.on('error', (err) => {
            console.error('Connection error:', err);
        });
    }

    handleMessage(peerId, message) {
        switch (message.type) {
            case 'sync':
                this.handleSync(message.data);
                break;
            case 'shape-add':
                this.handleShapeAdd(message.data);
                break;
            case 'shape-update':
                this.handleShapeUpdate(message.data);
                break;
            case 'shape-remove':
                this.handleShapeRemove(message.data);
                break;
            case 'cursor':
                this.handleCursor(peerId, message.data);
                break;
            case 'selection':
                this.handleSelection(peerId, message.data);
                break;
        }
    }

    handleSync(data) {
        if (this.engine.shapes.length > 0) {
            // If we have shapes, we're the host, ignore sync
            return;
        }

        // Load the state
        this.engine.shapes = data.shapes.map(s => {
            const ShapeClass = this.getShapeClass(s.type);
            return ShapeClass.fromJSON(s);
        });

        if (data.zoom) this.engine.zoom = data.zoom;
        if (data.pan) this.engine.pan = data.pan;

        this.engine.render();
    }

    handleShapeAdd(data) {
        const ShapeClass = this.getShapeClass(data.shape.type);
        const shape = ShapeClass.fromJSON(data.shape);
        this.engine.addShape(shape);
    }

    handleShapeUpdate(data) {
        const shape = this.engine.shapes.find(s => s.id === data.shapeId);
        if (shape) {
            Object.assign(shape, data.properties);
            this.engine.render();
        }
    }

    handleShapeRemove(data) {
        const shape = this.engine.shapes.find(s => s.id === data.shapeId);
        if (shape) {
            this.engine.removeShape(shape);
        }
    }

    handleCursor(peerId, data) {
        this.cursors.set(peerId, data);
        this.drawCursors();
    }

    handleSelection(peerId, data) {
        // Handle remote selection visualization
        console.log('Remote selection:', peerId, data);
    }

    broadcastShapeAdd(shape) {
        if (!this.enabled) return;

        this.broadcast({
            type: 'shape-add',
            data: {
                shape: shape.toJSON()
            }
        });
    }

    broadcastShapeUpdate(shape) {
        if (!this.enabled) return;

        this.broadcast({
            type: 'shape-update',
            data: {
                shapeId: shape.id,
                properties: shape.toJSON()
            }
        });
    }

    broadcastShapeRemove(shape) {
        if (!this.enabled) return;

        this.broadcast({
            type: 'shape-remove',
            data: {
                shapeId: shape.id
            }
        });
    }

    broadcastCursor(x, y) {
        if (!this.enabled) return;

        this.broadcast({
            type: 'cursor',
            data: { x, y }
        });
    }

    broadcast(message) {
        this.connections.forEach(conn => {
            this.sendMessage(conn, message);
        });
    }

    sendMessage(conn, message) {
        try {
            conn.send(message);
        } catch (err) {
            console.error('Failed to send message:', err);
        }
    }

    drawCursors() {
        // Clear previous cursors
        const overlay = document.getElementById('canvas-overlay');
        overlay.innerHTML = '';

        // Draw each remote cursor
        this.cursors.forEach((cursor, peerId) => {
            const screenPos = this.engine.canvasToScreen(cursor.x, cursor.y);

            const cursorEl = document.createElement('div');
            cursorEl.style.position = 'absolute';
            cursorEl.style.left = screenPos.x + 'px';
            cursorEl.style.top = screenPos.y + 'px';
            cursorEl.style.width = '20px';
            cursorEl.style.height = '20px';
            cursorEl.style.pointerEvents = 'none';
            cursorEl.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #10b981;">
                    <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/>
                </svg>
            `;

            const labelEl = document.createElement('div');
            labelEl.textContent = peerId.substring(0, 8);
            labelEl.style.position = 'absolute';
            labelEl.style.top = '22px';
            labelEl.style.left = '0px';
            labelEl.style.fontSize = '11px';
            labelEl.style.background = '#10b981';
            labelEl.style.color = 'white';
            labelEl.style.padding = '2px 6px';
            labelEl.style.borderRadius = '4px';
            labelEl.style.whiteSpace = 'nowrap';

            cursorEl.appendChild(labelEl);
            overlay.appendChild(cursorEl);
        });
    }

    getShapeClass(type) {
        const { Rectangle, Circle, Line, Text, Star, Triangle, Arrow } = window;
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

    onConnectionChange() {
        // Override this to update UI
    }

    disconnect() {
        this.connections.forEach(conn => conn.close());
        this.connections.clear();
        this.cursors.clear();

        if (this.peer) {
            this.peer.destroy();
            this.peer = null;
        }

        this.enabled = false;
        this.myId = null;
    }

    getConnectionCount() {
        return this.connections.size;
    }

    getConnectedPeers() {
        return Array.from(this.connections.keys());
    }
}

/**
 * WebSocket client service with automatic reconnection
 * and event subscription.
 */
class WebSocketService {
  constructor() {
    this.socket = null;
    this.statusListeners = new Set();
    this.messageListeners = new Set();
    this.reconnectCallbacks = new Set();
    this.reconnectInterval = 2500;
    this.reconnectTimeoutId = null;
    this.pingIntervalId = null;
    this.status = 'disconnected'; // 'connected' | 'reconnecting' | 'disconnected'
    this.shouldReconnect = true;
    this.hasConnectedOnce = false;
  }

  connect() {
    this.shouldReconnect = true;
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this._setStatus(this.hasConnectedOnce ? 'reconnecting' : 'disconnected');

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    try {
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        const wasReconnecting = this.hasConnectedOnce;
        this.hasConnectedOnce = true;
        this._setStatus('connected');

        // Start heartbeat ping
        this._startHeartbeat();

        if (wasReconnecting) {
          // Notify listeners to refresh data from REST API
          this.reconnectCallbacks.forEach((cb) => {
            try { cb(); } catch (err) { console.error('Error in reconnect callback:', err); }
          });
        }
      };

      this.socket.onmessage = (event) => {
        if (event.data === 'pong') return;
        try {
          const payload = JSON.parse(event.data);
          this.messageListeners.forEach((listener) => {
            try { listener(payload); } catch (err) { console.error('Error in message listener:', err); }
          });
        } catch (e) {
          console.warn('Non-JSON WebSocket message received:', event.data);
        }
      };

      this.socket.onclose = () => {
        this._stopHeartbeat();
        this._setStatus('disconnected');
        if (this.shouldReconnect) {
          this._scheduleReconnect();
        }
      };

      this.socket.onerror = (error) => {
        console.warn('WebSocket error observed:', error);
        // Browser will fire onclose next
      };
    } catch (err) {
      console.error('Failed to create WebSocket instance:', err);
      if (this.shouldReconnect) {
        this._scheduleReconnect();
      }
    }
  }

  _scheduleReconnect() {
    if (this.reconnectTimeoutId) return;
    this._setStatus('reconnecting');
    this.reconnectTimeoutId = setTimeout(() => {
      this.reconnectTimeoutId = null;
      this.connect();
    }, this.reconnectInterval);
  }

  _startHeartbeat() {
    this._stopHeartbeat();
    this.pingIntervalId = setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send('ping');
      }
    }, 15000);
  }

  _stopHeartbeat() {
    if (this.pingIntervalId) {
      clearInterval(this.pingIntervalId);
      this.pingIntervalId = null;
    }
  }

  _setStatus(newStatus) {
    if (this.status !== newStatus) {
      this.status = newStatus;
      this.statusListeners.forEach((listener) => {
        try { listener(newStatus); } catch (err) { console.error('Error in status listener:', err); }
      });
    }
  }

  onStatusChange(listener) {
    this.statusListeners.add(listener);
    listener(this.status);
    return () => this.statusListeners.delete(listener);
  }

  onMessage(listener) {
    this.messageListeners.add(listener);
    return () => this.messageListeners.delete(listener);
  }

  onReconnect(callback) {
    this.reconnectCallbacks.add(callback);
    return () => this.reconnectCallbacks.delete(callback);
  }

  disconnect() {
    this.shouldReconnect = false;
    this._stopHeartbeat();
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this._setStatus('disconnected');
  }
}

export const wsService = new WebSocketService();

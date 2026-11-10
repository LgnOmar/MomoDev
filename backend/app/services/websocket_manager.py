import asyncio
from typing import List
from fastapi import WebSocket

class WebSocketManager:
    def __init__(self):
        self._active_connections: List[WebSocket] = []
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        async with self._lock:
            self._active_connections.append(websocket)

    async def disconnect(self, websocket: WebSocket):
        async with self._lock:
            if websocket in self._active_connections:
                self._active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        """
        Broadcasts a JSON message to all active WebSocket connections.
        Stale or disconnected sockets are removed cleanly.
        """
        async with self._lock:
            connections = list(self._active_connections)

        dead_connections = []
        for connection in connections:
            try:
                await connection.send_json(message)
            except Exception:
                dead_connections.append(connection)

        if dead_connections:
            async with self._lock:
                for dead in dead_connections:
                    if dead in self._active_connections:
                        self._active_connections.remove(dead)

# Global manager instance
ws_manager = WebSocketManager()

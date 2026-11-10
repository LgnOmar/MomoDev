from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import logging

from app.database import init_db
from app.routes.orders import router as orders_router
from app.services.websocket_manager import ws_manager

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("restaurant_app")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize SQLite database schema
    logger.info("Initializing SQLite database...")
    init_db()
    logger.info("Database ready.")
    yield
    logger.info("Application shutting down.")

app = FastAPI(
    title="Real-Time Restaurant Order Management API",
    description="Backend API with SQLite persistence, optimistic concurrency control, and WebSocket broadcasting",
    version="1.0.0",
    lifespan=lifespan,
)

# Enable CORS for frontend Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include REST routes
app.include_router(orders_router)

@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "restaurant-order-backend"}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    logger.info(f"WebSocket client connected. Total active: {len(ws_manager._active_connections)}")
    try:
        while True:
            # Keep connection open; listen for incoming messages (e.g. ping/heartbeat)
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        await ws_manager.disconnect(websocket)
        logger.info(f"WebSocket client disconnected. Total active: {len(ws_manager._active_connections)}")
    except Exception as e:
        logger.warning(f"WebSocket connection error: {e}")
        await ws_manager.disconnect(websocket)

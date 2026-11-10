import json
import uuid
from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, HTTPException, status
from fastapi.responses import JSONResponse

from app.database import get_db, row_to_dict
from app.models import (
    CustomerOrderItemInput,
    OrderCreate,
    OrderResponse,
    OrderStatus,
    OrderStatusUpdate,
    VALID_TRANSITIONS,
)
from app.services.websocket_manager import ws_manager

router = APIRouter(prefix="/api/orders", tags=["Orders"])

def _generate_next_order_id(conn) -> str:
    cursor = conn.execute("SELECT count(*) FROM orders")
    count = cursor.fetchone()[0]
    candidate_num = 1001 + count
    while True:
        candidate_id = f"ORD-{candidate_num}"
        existing = conn.execute("SELECT 1 FROM orders WHERE id = ?", (candidate_id,)).fetchone()
        if not existing:
            return candidate_id
        candidate_num += 1

@router.get("", response_model=List[OrderResponse])
def get_orders():
    """Retrieve all orders, sorted by creation time descending."""
    with get_db() as conn:
        cursor = conn.execute("SELECT * FROM orders ORDER BY created_at DESC")
        rows = cursor.fetchall()
        return [row_to_dict(row) for row in rows]

@router.get("/{order_id}", response_model=OrderResponse)
def get_order(order_id: str):
    """Retrieve a single order by ID or secure tracking token."""
    clean_id = order_id.strip()
    with get_db() as conn:
        cursor = conn.execute(
            "SELECT * FROM orders WHERE id = ? OR id = ? OR tracking_token = ?",
            (clean_id, f"ORD-{clean_id}", clean_id)
        )
        row = cursor.fetchone()
        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Order '{clean_id}' not found."
            )
        return row_to_dict(row)

@router.post("", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
async def create_order(payload: OrderCreate):
    """
    Create a new order starting at status 'New' and version 1.
    Supports both:
    1. Customer self-service ordering with menu item IDs & server-calculated prices.
    2. Cashier walk-in ordering with custom item strings.
    Validates item existence, positive quantities, availability, and idempotency.
    Broadcasts 'order_created' after successful database commit.
    """
    created_at = datetime.now(timezone.utc).isoformat()
    initial_status = OrderStatus.NEW.value
    initial_version = 1
    tracking_token = f"trk_{uuid.uuid4().hex[:12]}"

    snapshots = []
    total_price = 0.0

    with get_db() as conn:
        # Check idempotency to prevent duplicate orders on retry or double-click
        if payload.idempotency_key:
            existing = conn.execute(
                "SELECT * FROM orders WHERE idempotency_key = ?",
                (payload.idempotency_key,)
            ).fetchone()
            if existing:
                return row_to_dict(existing)

        # Check if items are structured menu item inputs or plain strings
        first_item = payload.items[0] if payload.items else None

        if isinstance(first_item, str):
            # Legacy or quick walk-in custom item entries from cashier
            for raw_item in payload.items:
                trimmed = str(raw_item).strip()
                if not trimmed:
                    continue
                snapshots.append({
                    "menu_item_id": None,
                    "name": trimmed,
                    "unit_price": 0.0,
                    "quantity": 1,
                    "line_total": 0.0,
                })
            total_price = 0.0
        else:
            # Customer self-service ordering: validate every item against DB
            for item_input in payload.items:
                # item_input is CustomerOrderItemInput
                item_id = item_input.menu_item_id.strip()
                qty = item_input.quantity

                if qty <= 0:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Item quantity must be a positive integer, got {qty}."
                    )

                menu_row = conn.execute(
                    "SELECT id, name, price, is_available FROM menu_items WHERE id = ?;",
                    (item_id,)
                ).fetchone()

                if not menu_row:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Menu item '{item_id}' does not exist."
                    )

                if not bool(menu_row["is_available"]):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Item '{menu_row['name']}' is currently unavailable. Please remove it from your cart."
                    )

                unit_price = float(menu_row["price"])
                line_total = round(unit_price * qty, 2)
                snapshots.append({
                    "menu_item_id": menu_row["id"],
                    "name": menu_row["name"],
                    "unit_price": unit_price,
                    "quantity": qty,
                    "line_total": line_total,
                })

            total_price = round(sum(s["line_total"] for s in snapshots), 2)

        if not snapshots:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Order must contain at least one valid item."
            )

        items_json = json.dumps(snapshots)

        with conn:
            order_id = _generate_next_order_id(conn)
            conn.execute(
                """
                INSERT INTO orders (id, customer_name, items, status, created_at, version, total_price, tracking_token, idempotency_key)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (order_id, payload.customer_name, items_json, initial_status, created_at, initial_version, total_price, tracking_token, payload.idempotency_key)
            )
            cursor = conn.execute("SELECT * FROM orders WHERE id = ?", (order_id,))
            created_order = row_to_dict(cursor.fetchone())

    # Broadcast real-time update ONLY after successful commit
    await ws_manager.broadcast({
        "event": "order_created",
        "data": created_order
    })

    return created_order

@router.patch("/{order_id}/status", response_model=OrderResponse)
async def update_order_status(order_id: str, payload: OrderStatusUpdate):
    """
    Advance an order's status using Optimistic Concurrency Control (OCC).
    - Checks order existence.
    - Validates strict lifecycle transition: New -> Preparing -> Ready -> Served.
    - Atomically updates status and increments version matching submitted version.
    - Returns HTTP 409 Conflict if version mismatch occurs (concurrent update).
    - Broadcasts 'order_updated' ONLY after successful commit.
    """
    clean_id = order_id.strip()

    with get_db() as conn:
        # 1. Fetch current order state
        cursor = conn.execute(
            "SELECT * FROM orders WHERE id = ? OR id = ?",
            (clean_id, f"ORD-{clean_id}")
        )
        current_row = cursor.fetchone()
        if not current_row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Order '{clean_id}' not found."
            )

        current_order = row_to_dict(current_row)
        actual_id = current_order["id"]
        current_status = current_order["status"]
        current_version = current_order["version"]

        # 2. Check version (Optimistic Concurrency Control)
        # If the order version has already moved ahead, reject immediately as 409 Conflict
        if payload.version != current_version:
            return JSONResponse(
                status_code=status.HTTP_409_CONFLICT,
                content={
                    "detail": f"Conflict: Order '{actual_id}' was updated by another user. You sent version {payload.version}, but current version is {current_version}.",
                    "current_order": current_order,
                },
            )

        # 3. Strict transition validation
        expected_next = VALID_TRANSITIONS.get(current_status)
        if payload.status != expected_next:
            valid_hint = f"Next allowed status is '{expected_next}'." if expected_next else "Order is already in its final state (Served)."
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status transition from '{current_status}' to '{payload.status.value}'. {valid_hint}"
            )

        # 4. Atomic conditional SQL update inside transaction
        with conn:
            update_cursor = conn.execute(
                """
                UPDATE orders
                SET status = ?, version = version + 1
                WHERE id = ? AND version = ?
                """,
                (payload.status.value, actual_id, payload.version)
            )

            # Check whether the atomic update succeeded
            if update_cursor.rowcount == 0:
                # Concurrent race condition: version changed right during execution
                cursor = conn.execute("SELECT * FROM orders WHERE id = ?", (actual_id,))
                latest_order = row_to_dict(cursor.fetchone())
                return JSONResponse(
                    status_code=status.HTTP_409_CONFLICT,
                    content={
                        "detail": f"Conflict: Order '{actual_id}' was updated by another user. You sent version {payload.version}, but current version is {latest_order['version']}.",
                        "current_order": latest_order,
                    },
                )

            # Update succeeded: fetch refreshed order data
            cursor = conn.execute("SELECT * FROM orders WHERE id = ?", (actual_id,))
            updated_order = row_to_dict(cursor.fetchone())

    # 5. Broadcast real-time update ONLY after successful commit
    await ws_manager.broadcast({
        "event": "order_updated",
        "data": updated_order
    })

    return updated_order

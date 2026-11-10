from typing import List
from fastapi import APIRouter, HTTPException, status
from app.database import get_db, row_to_dict
from app.models import (
    MenuCategoryResponse,
    MenuItemResponse,
    MenuItemAvailabilityUpdate,
)
from app.services.websocket_manager import ws_manager

router = APIRouter(prefix="/api/menu", tags=["Menu"])

MEAL_PERIOD_ORDER = {
    "Breakfast": 1,
    "Lunch": 2,
    "Dinner & Full-Course Meal": 3,
}

@router.get("", response_model=List[MenuCategoryResponse])
def get_menu():
    """
    Retrieve full restaurant menu structured by meal periods and categories,
    preserving the exact hierarchy and category ordering.
    """
    with get_db() as conn:
        cat_rows = conn.execute("""
            SELECT * FROM menu_categories
            ORDER BY 
                CASE meal_period 
                    WHEN 'Breakfast' THEN 1 
                    WHEN 'Lunch' THEN 2 
                    WHEN 'Dinner & Full-Course Meal' THEN 3 
                    ELSE 4 
                END ASC,
                display_order ASC;
        """).fetchall()

        item_rows = conn.execute("SELECT * FROM menu_items ORDER BY id ASC;").fetchall()

    # Group items by category
    items_by_cat = {}
    for ir in item_rows:
        item_dict = row_to_dict(ir)
        items_by_cat.setdefault(item_dict["category_id"], []).append(item_dict)

    result = []
    for cr in cat_rows:
        cat_dict = row_to_dict(cr)
        cat_dict["items"] = items_by_cat.get(cat_dict["id"], [])
        result.append(cat_dict)

    return result

@router.get("/items", response_model=List[MenuItemResponse])
def get_all_menu_items():
    """Retrieve flat list of all menu items."""
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM menu_items ORDER BY id ASC;").fetchall()
        return [row_to_dict(r) for r in rows]

@router.patch("/items/{item_id}/availability", response_model=MenuItemResponse)
async def update_item_availability(item_id: str, payload: MenuItemAvailabilityUpdate):
    """
    Toggle availability status of a menu item.
    Broadcasts 'menu_item_updated' via WebSocket after commit.
    """
    clean_id = item_id.strip()

    with get_db() as conn:
        row = conn.execute("SELECT * FROM menu_items WHERE id = ?;", (clean_id,)).fetchone()
        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Menu item '{clean_id}' not found."
            )

        with conn:
            conn.execute(
                "UPDATE menu_items SET is_available = ? WHERE id = ?;",
                (1 if payload.is_available else 0, clean_id)
            )

            updated_row = conn.execute("SELECT * FROM menu_items WHERE id = ?;", (clean_id,)).fetchone()
            updated_item = row_to_dict(updated_row)

    # Broadcast update post-commit
    await ws_manager.broadcast({
        "event": "menu_item_updated",
        "data": updated_item,
    })

    return updated_item


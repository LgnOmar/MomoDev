import sqlite3
import json
import os
import uuid
from datetime import datetime, timezone
from contextlib import contextmanager
from app.menu_seed import SEED_MENU

DEFAULT_DB_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_DB_PATH = os.path.join(DEFAULT_DB_DIR, "restaurant_orders.db")
DB_PATH = DEFAULT_DB_PATH

def get_db_path() -> str:
    """Dynamically resolve the active database path, respecting test overrides."""
    return os.environ.get("RESTAURANT_DB_PATH") or DB_PATH

def get_connection(db_path: str = None) -> sqlite3.Connection:
    actual_path = db_path or get_db_path()
    conn = sqlite3.connect(actual_path, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode = WAL;")
    conn.execute("PRAGMA synchronous = NORMAL;")
    return conn

@contextmanager
def get_db(db_path: str = None):
    actual_path = db_path or get_db_path()
    conn = get_connection(actual_path)
    try:
        yield conn
    finally:
        conn.close()

def init_db(db_path: str = None) -> None:
    actual_path = db_path or get_db_path()
    with get_db(actual_path) as conn:
        with conn:
            # 1. Orders table
            conn.execute("""
                CREATE TABLE IF NOT EXISTS orders (
                    id TEXT PRIMARY KEY,
                    customer_name TEXT NOT NULL,
                    items TEXT NOT NULL,
                    status TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    version INTEGER NOT NULL DEFAULT 1,
                    total_price REAL NOT NULL DEFAULT 0.0,
                    tracking_token TEXT,
                    idempotency_key TEXT
                );
            """)
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
            """)

            # Safe additive migrations for existing databases
            cursor = conn.execute("PRAGMA table_info(orders);")
            columns = [col["name"] for col in cursor.fetchall()]
            if "total_price" not in columns:
                conn.execute("ALTER TABLE orders ADD COLUMN total_price REAL NOT NULL DEFAULT 0.0;")
            if "tracking_token" not in columns:
                conn.execute("ALTER TABLE orders ADD COLUMN tracking_token TEXT;")
            if "idempotency_key" not in columns:
                conn.execute("ALTER TABLE orders ADD COLUMN idempotency_key TEXT;")

            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_orders_tracking ON orders(tracking_token);
            """)
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_orders_idempotency ON orders(idempotency_key);
            """)

            # 2. Menu categories table
            conn.execute("""
                CREATE TABLE IF NOT EXISTS menu_categories (
                    id TEXT PRIMARY KEY,
                    meal_period TEXT NOT NULL,
                    name TEXT NOT NULL,
                    display_order INTEGER NOT NULL
                );
            """)
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_categories_period_order ON menu_categories(meal_period, display_order);
            """)

            # 3. Menu items table
            conn.execute("""
                CREATE TABLE IF NOT EXISTS menu_items (
                    id TEXT PRIMARY KEY,
                    category_id TEXT NOT NULL,
                    name TEXT NOT NULL,
                    description TEXT NOT NULL,
                    price REAL NOT NULL,
                    is_available INTEGER NOT NULL DEFAULT 1,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (category_id) REFERENCES menu_categories(id)
                );
            """)
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_items_category ON menu_items(category_id);
            """)

            # 4. Seed menu data if categories table is empty or has legacy demo items
            first_item = conn.execute("SELECT name, price FROM menu_items LIMIT 1;").fetchone()
            if first_item is None or first_item["price"] < 100.0 or "Valencia" in first_item["name"]:
                conn.execute("DELETE FROM menu_items;")
                conn.execute("DELETE FROM menu_categories;")
                now_str = datetime.now(timezone.utc).isoformat()
                for period_data in SEED_MENU:
                    meal_period = period_data["meal_period"]
                    for cat in period_data["categories"]:
                        conn.execute(
                            """
                            INSERT INTO menu_categories (id, meal_period, name, display_order)
                            VALUES (?, ?, ?, ?);
                            """,
                            (cat["id"], meal_period, cat["name"], cat["display_order"])
                        )
                        for item in cat["items"]:
                            conn.execute(
                                """
                                INSERT INTO menu_items (id, category_id, name, description, price, is_available, created_at)
                                VALUES (?, ?, ?, ?, ?, ?, ?);
                                """,
                                (item["id"], cat["id"], item["name"], item["description"], item["price"], item["is_available"], now_str)
                            )

def row_to_dict(row: sqlite3.Row) -> dict:
    if row is None:
        return None
    d = dict(row)
    if "is_available" in d:
        d["is_available"] = bool(d["is_available"])

    if "items" in d and isinstance(d.get("items"), str):
        try:
            parsed = json.loads(d["items"])
            # Normalize legacy items if any are plain strings
            normalized = []
            for item in parsed:
                if isinstance(item, str):
                    normalized.append({
                        "menu_item_id": None,
                        "name": item,
                        "unit_price": 0.0,
                        "quantity": 1,
                        "line_total": 0.0,
                    })
                elif isinstance(item, dict):
                    normalized.append({
                        "menu_item_id": item.get("menu_item_id"),
                        "name": item.get("name", "Item"),
                        "unit_price": float(item.get("unit_price", 0.0)),
                        "quantity": int(item.get("quantity", 1)),
                        "line_total": float(item.get("line_total", 0.0)),
                    })
            d["items"] = normalized
        except Exception:
            d["items"] = []

    if "total_price" in d:
        d["total_price"] = float(d["total_price"] or 0.0)

    if "tracking_token" not in d or not d["tracking_token"]:
        d["tracking_token"] = None

    if "idempotency_key" not in d or not d["idempotency_key"]:
        d["idempotency_key"] = None

    return d

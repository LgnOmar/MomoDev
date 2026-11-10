import sqlite3
import json
import os
from contextlib import contextmanager

DB_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(DB_DIR, "restaurant_orders.db")

def get_connection(db_path: str = DB_PATH) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode = WAL;")
    conn.execute("PRAGMA synchronous = NORMAL;")
    return conn

@contextmanager
def get_db(db_path: str = DB_PATH):
    conn = get_connection(db_path)
    try:
        yield conn
    finally:
        conn.close()

def init_db(db_path: str = DB_PATH) -> None:
    with get_db(db_path) as conn:
        with conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS orders (
                    id TEXT PRIMARY KEY,
                    customer_name TEXT NOT NULL,
                    items TEXT NOT NULL,
                    status TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    version INTEGER NOT NULL DEFAULT 1
                );
            """)
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
            """)

def row_to_dict(row: sqlite3.Row) -> dict:
    if row is None:
        return None
    d = dict(row)
    if isinstance(d.get("items"), str):
        try:
            d["items"] = json.loads(d["items"])
        except Exception:
            d["items"] = []
    return d

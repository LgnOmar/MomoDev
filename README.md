# Real-Time Restaurant Order Management & Customer Self-Service System

A lightweight, robust, real-time restaurant order management application demonstrating shared state synchronization between multiple roles: **Customer** (Self-Service Ordering & Live Tracking), **Cashier** (Walk-in Orders & Menu Availability), and **Kitchen** (Kitchen Display System).

The application uses **FastAPI** with Python's built-in **SQLite** (`sqlite3`) as the authoritative source of truth, **WebSockets** for instant bi-directional event broadcasts, and **React + Vite** for a responsive, reactive frontend across mobile, tablet, and desktop devices.

---

## 1. System Architecture

```text
┌─────────────────────────┐       ┌─────────────────────────┐       ┌─────────────────────────┐
│     Customer View       │       │      Kitchen View       │       │      Cashier View       │
│  - Browse Menu          │       │  - Live Ticket Queue    │       │  - Walk-in Orders       │
│  - Self-Service Cart    │       │  - Advance State (OCC)  │       │  - Toggle Availability │
│  - Live Order Tracking  │       │  - Auto-syncs via WS    │       │  - Generate Links       │
└────────────┬────────────┘       └────────────┬────────────┘       └────────────┬────────────┘
             │                                 │                                 │
             │ REST (GET/POST)                 │ REST (PATCH)                    │ REST (POST/PATCH)
             │                                 │                                 │
             ▼                                 ▼                                 ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   FastAPI Backend Service                                   │
│  - REST API validation, menu routes, & order creation                                       │
│  - Authoritative server-side price calculation (never trusts client totals)                 │
│  - Optimistic Concurrency Control (OCC) with atomic version verification                    │
│  - Transactional commits to SQLite                                                          │
│  - In-memory WebSocket Connection Manager                                                   │
└──────────────────────────────┬──────────────────────────────────────▲───────────────────────┘
                               │ Writes & Reads                       │ Broadcasts events
                               ▼                                      │ (post-commit only)
┌──────────────────────────────────────────────┐                      │
│           SQLite Persistent Store            │                      │
│  - Authoritative orders, categories, items   │──────────────────────┘
│  - Historical item price & name snapshots    │  ws://localhost:8000/ws
│  - Atomic version increments (WAL mode)      │
└──────────────────────────────────────────────┘
```

### Key Architectural Principles
- **Authoritative Database & Server Calculations**: SQLite is the single source of truth. The frontend sends menu item IDs and quantities; the backend retrieves current prices from SQLite, validates availability, and calculates the authoritative total.
- **Historical Order Snapshots**: When an order is placed, an immutable snapshot of item names, unit prices, quantities, and line totals is saved. Future menu price edits never alter historical receipts.
- **Post-Commit Broadcasting**: WebSocket events (`order_created`, `order_updated`, `menu_item_updated`) are broadcast **only after** database transactions have committed.
- **Sound Simplicity**: Single-process architecture using standard Python `sqlite3` and FastAPI WebSocket manager. No heavy message brokers or ORMs are required.
- **Graceful Reconnection**: When reconnecting, the frontend re-fetches orders and menu data from the REST API to recover any state changes missed during a network interruption.

---

## 2. Project Structure

```text
restaurant-order-sync/
├── frontend/                         # Vite + React Client
│   ├── src/
│   │   ├── components/
│   │   │   ├── ConflictBanner.jsx    # Displays concurrency conflict warnings
│   │   │   ├── Header.jsx            # Role navigation bar & live WS indicator
│   │   │   ├── OrderLifecycleStepper.jsx # Visual 4-stage progression bar
│   │   │   └── StatusBadge.jsx       # Distinct color-coded status badges
│   │   ├── pages/
│   │   │   ├── CashierView.jsx       # Walk-in orders & Menu Availability Manager
│   │   │   ├── KitchenView.jsx       # Active ticket queue & advance actions
│   │   │   └── CustomerView.jsx      # Menu browsing, self-service cart, live tracking
│   │   ├── services/
│   │   │   ├── api.js                # REST API client with OCC conflict handling
│   │   │   └── websocket.js          # Auto-reconnecting WebSocket client
│   │   ├── App.css                   # Responsive layout & utility classes
│   │   ├── App.jsx                   # Role routing & global state sync
│   │   ├── index.css                 # Clean CSS reset & responsive styling
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js                # Proxies /api and /ws to backend
│
├── backend/                          # FastAPI + SQLite Service
│   ├── app/
│   │   ├── database.py               # SQLite connection pool, schema, WAL mode, migrations
│   │   ├── menu_seed.py              # Illustrative demonstration menu data
│   │   ├── models.py                 # Pydantic schemas, validation, transitions
│   │   ├── main.py                   # FastAPI app, CORS, lifespan, /ws endpoint
│   │   ├── routes/
│   │   │   ├── menu.py               # Menu browsing & availability endpoints
│   │   │   └── orders.py             # Order creation & OCC status endpoints
│   │   └── services/
│   │       └── websocket_manager.py  # Thread/async-safe WebSocket broadcaster
│   ├── tests/
│   │   ├── conftest.py               # Isolated SQLite test fixture
│   │   ├── test_menu_and_ordering.py # Menu hierarchy, cart & price validation tests
│   │   ├── test_orders.py            # Lifecycle, OCC concurrency, & validation tests
│   │   └── e2e_simulation.py         # Multi-client live concurrency test
│   ├── pytest.ini
│   └── requirements.txt
│
├── README.md
├── DEMO_GUIDE.md
└── .gitignore
```

---

## 3. Restaurant Menu Hierarchy

The menu strictly follows the 3 meal periods and their exact 20 categories in order, featuring dishes inspired by French and Algerian culinary traditions (e.g., Couscous Royal, Chakhchoukha de Biskra, Chorba Frik, Tajine Zitoun, Bourek, Chakchouka, Msemen, Thé à la Menthe) with authentic prices formatted in **Algerian Dinars (DA)**:

### 1. Breakfast
1. Beverages / Liquid Start
2. Fruit & Bakery
3. Cereals & Grains
4. Main Plates

### 2. Lunch
1. Appetizer / Starter
2. Main Course
3. Sides
4. Dessert

### 3. Dinner & Full-Course Meal
1. Hors d’œuvre
2. Amuse-bouche
3. Soup
4. Appetizer / Starter
5. Salad
6. Fish / Seafood Course
7. Palate Cleanser
8. Main Course
9. Cheese Course
10. Dessert
11. Mignardises / Petit Fours
12. Digestif & Beverages

Each category contains sample illustrative dishes with unique IDs, names, descriptions, prices, and availability status.

---

## 4. Order Lifecycle & Concurrency Strategy

### Lifecycle
$$\text{New} \longrightarrow \text{Preparing} \longrightarrow \text{Ready} \longrightarrow \text{Served}$$

- Skipped transitions (e.g. `New → Ready`) and backwards transitions are rejected with HTTP 400.

### Optimistic Concurrency Control (OCC)
- Orders start at `version = 1`.
- When updating status, clients submit `{ "status": nextStatus, "version": knownVersion }`.
- Backend verifies version matches database.
- Updates execute via atomic conditional SQL:
  ```sql
  UPDATE orders
  SET status = ?, version = version + 1
  WHERE id = ? AND version = ?
  ```
- If a stale version is received or another user updated first, the request is rejected with **HTTP 409 Conflict** and returns the latest order state.

---

## 5. API Reference

### Menu Endpoints
- `GET /api/menu`: Returns structured menu with categories and items grouped by meal period.
- `GET /api/menu/items`: Returns flat list of all menu items.
- `PATCH /api/menu/items/{id}/availability`: Toggles item availability and broadcasts `menu_item_updated`.

### Order Endpoints
- `GET /api/orders`: Retrieves all orders.
- `GET /api/orders/{id}`: Retrieves single order by ID or numeric code.
- `POST /api/orders`: Creates order from menu items or walk-in items; calculates authoritative prices server-side; broadcasts `order_created`.
- `PATCH /api/orders/{id}/status`: Advances status using OCC; broadcasts `order_updated`.
- `WS /ws`: Bi-directional real-time connection.

---

## 6. Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+ and npm

### Installation & Launch (PowerShell)

#### 1. Backend Service
```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
API is live at `http://127.0.0.1:8000` (docs at `http://127.0.0.1:8000/docs`).

#### 2. Frontend Application
```powershell
cd frontend
npm install
npm run dev
```
Client is live at `http://localhost:5173`.

---

## 7. Role URLs

- **Customer View (Menu & Self-Order)**: [http://localhost:5173/?role=customer](http://localhost:5173/?role=customer)
- **Customer Tracker**: [http://localhost:5173/?role=customer&orderId=ORD-1001](http://localhost:5173/?role=customer&orderId=ORD-1001)
- **Kitchen Display System**: [http://localhost:5173/?role=kitchen](http://localhost:5173/?role=kitchen)
- **Cashier Terminal**: [http://localhost:5173/?role=cashier](http://localhost:5173/?role=cashier)

---

## 8. Running the Tests

```powershell
# Run full backend test suite (18 tests)
backend\.venv\Scripts\pytest backend\tests -v

# Run live multi-client end-to-end WebSocket & concurrency simulation
backend\.venv\Scripts\python backend\tests\e2e_simulation.py
```

# Real-Time Restaurant Order Management System

A lightweight, robust, real-time restaurant order management application demonstrating shared state synchronization between multiple roles: **Cashier**, **Kitchen**, and **Customer**.

The application uses **FastAPI** with Python's built-in **SQLite** (`sqlite3`) as the authoritative source of truth, **WebSockets** for instant bi-directional event broadcasts, and **React + Vite** for a responsive, reactive frontend across mobile, tablet, and desktop devices.

---

## 1. System Architecture

```text
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│  Cashier View   │       │  Kitchen View   │       │  Customer View  │
│ (Creates Order) │       │ (Advances State)│       │  (Tracks Order) │
└────────┬────────┘       └────────┬────────┘       └────────┬────────┘
         │                         │                         │
         │ REST (POST)             │ REST (PATCH)            │ REST (GET)
         │                         │                         │
         ▼                         ▼                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       FastAPI Backend Service                       │
│  - REST API validation & route handlers                             │
│  - Optimistic Concurrency Control (OCC)                             │
│  - Transactional commits to SQLite                                  │
│  - In-memory WebSocket Connection Manager                           │
└───────────────────┬─────────────────────────────▲───────────────────┘
                    │ Writes & Reads              │ Broadcasts events
                    ▼                             │ (post-commit only)
┌──────────────────────────────────────┐          │
│       SQLite Persistent Store        │          │
│  - Authoritative database            │          │
│  - Atomic version increments         │──────────┘
│  - WAL journal mode                  │  ws://localhost:8000/ws
└──────────────────────────────────────┘
```

### Key Architectural Principles
- **Authoritative Database**: SQLite is the single source of truth. Frontend state is a local reactive cache updated via REST or WebSocket events.
- **Post-Commit Broadcasting**: WebSocket events (`order_created`, `order_updated`) are broadcast **only after** the database transaction has committed. If a database write fails, no event is broadcast.
- **Sound Simplicity**: No external message brokers (Redis, RabbitMQ, Kafka) or heavy ORMs are required. SQLite and an in-memory WebSocket manager satisfy all real-time requirements cleanly in a single process.
- **Graceful Reconnection**: When the frontend detects a WebSocket reconnection, it automatically triggers a REST API refresh to recover any status changes missed during the disconnect window.

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
│   │   │   ├── CashierView.jsx       # Order creation & tracking link generator
│   │   │   ├── KitchenView.jsx       # Active ticket queue & advance actions
│   │   └── CustomerView.jsx      # Read-only live tracking view
│   │   ├── services/
│   │   │   ├── api.js                # REST API client with OCC conflict handling
│   │   │   └── websocket.js          # Auto-reconnecting WebSocket client
│   │   ├── App.css
│   │   ├── App.jsx                   # Role routing & global order state sync
│   │   ├── index.css                 # Clean CSS reset & responsive styling
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js                # Proxies /api and /ws to backend
│
├── backend/                          # FastAPI + SQLite Service
│   ├── app/
│   │   ├── database.py               # SQLite connection pool, schema, WAL mode
│   │   ├── models.py                 # Pydantic schemas, validation, transitions
│   │   ├── main.py                   # FastAPI app, CORS, lifespan, /ws endpoint
│   │   ├── routes/
│   │   │   └── orders.py             # REST endpoints with OCC logic
│   │   └── services/
│   │       └── websocket_manager.py  # Thread/async-safe WebSocket broadcaster
│   ├── tests/
│   │   ├── conftest.py               # Isolated SQLite test fixture
│   │   ├── test_orders.py            # Comprehensive unit/integration test suite
│   │   └── e2e_simulation.py         # Multi-client live concurrency test
│   ├── pytest.ini
│   └── requirements.txt
│
├── README.md
├── DEMO_GUIDE.md
└── .gitignore
```

---

## 3. Data Model & Order Lifecycle

### Data Model
Each order record contains:
- `id` (TEXT, PRIMARY KEY): Sequential human-readable identifier (e.g. `ORD-1001`).
- `customer_name` (TEXT, NOT NULL): Name of the customer.
- `items` (TEXT, NOT NULL): JSON-encoded list of ordered food/drink items (e.g. `["Classic Burger", "Fries"]`).
- `status` (TEXT, NOT NULL): Current order status.
- `created_at` (TEXT, NOT NULL): ISO-8601 UTC timestamp.
- `version` (INTEGER, NOT NULL DEFAULT 1): Monotonically increasing version counter for Optimistic Concurrency Control.

### Order Lifecycle
The order strictly advances through four sequential statuses:

$$\text{New} \longrightarrow \text{Preparing} \longrightarrow \text{Ready} \longrightarrow \text{Served}$$

- **New**: Order entered by Cashier; queued for prep.
- **Preparing**: Kitchen has started making the meal.
- **Ready**: Food is cooked and ready for counter pickup.
- **Served**: Order has been handed to customer (final status).

**Validation Rule**: Statuses cannot be skipped (e.g., `New → Ready` is rejected with HTTP 400), and an order cannot move backwards (e.g., `Preparing → New` is rejected with HTTP 400).

---

## 4. Simultaneous Updates and Concurrency Strategy

Handling concurrent updates reliably is a core design requirement. The system uses **Optimistic Concurrency Control (OCC)** combined with **atomic conditional SQL execution**.

### The Concurrency Problem
Suppose two kitchen staff members (Staff A and Staff B) have ticket `ORD-1001` open on their screens at status `Preparing` and version `2`.
- Both attempt to advance the order to `Ready`.
- If unmanaged, both updates would succeed or duplicate actions could occur. If one person advances it to `Ready` while another attempts an update based on stale data, silent data overwrites can happen.

### The Solution: Versioning + Atomic SQL Condition
1. **Initial State**: Every order starts at `version = 1`.
2. **Client Version Submission**: Whenever a client requests a status transition (`PATCH /api/orders/{id}/status`), it must supply the version it currently knows:
   ```json
   {
     "status": "Ready",
     "version": 2
   }
   ```
3. **Optimistic Version Check**:
   The backend retrieves the current record. If the database `version` does not match the submitted version, the request is immediately rejected with **HTTP 409 Conflict**.
4. **Atomic Conditional SQL Update**:
   Inside an atomic database transaction, the update executes:
   ```sql
   UPDATE orders
   SET status = ?, version = version + 1
   WHERE id = ? AND version = ?
   ```
   - If the row matched `version = 2`, `cursor.rowcount` is `1`. The version atomically becomes `3` and the transaction commits.
   - If another concurrent transaction modified the row a millisecond prior, `cursor.rowcount` will be `0`. The transaction detects this race condition.
5. **Conflict Response**:
   On conflict (HTTP 409), the backend returns the latest authoritative order state:
   ```json
   {
     "detail": "Conflict: Order 'ORD-1001' was updated by another user. You sent version 2, but current version is 3.",
     "current_order": {
       "id": "ORD-1001",
       "customer_name": "Maria",
       "items": ["Burger"],
       "status": "Ready",
       "version": 3,
       "created_at": "2026-11-10T14:30:00Z"
     }
   }
   ```
6. **Client Graceful Recovery**:
   Instead of failing silently or showing stale data, the frontend displays a dismissible warning banner and automatically syncs its state with `current_order`.

---

## 5. API Design

### REST Endpoints

| Method | Endpoint | Description | Status Codes |
|---|---|---|---|
| `GET` | `/api/health` | Health check endpoint | `200 OK` |
| `GET` | `/api/orders` | Retrieve all orders (sorted latest first) | `200 OK` |
| `GET` | `/api/orders/{id}` | Retrieve single order by ID or numeric code | `200 OK`, `404 Not Found` |
| `POST` | `/api/orders` | Create a new order (starts at `New`, `v1`) | `201 Created`, `422 Unprocessable` |
| `PATCH` | `/api/orders/{id}/status` | Advance status with version OCC check | `200 OK`, `400 Bad Request`, `404 Not Found`, `409 Conflict` |

### WebSocket Endpoint

| Endpoint | Protocol | Description |
|---|---|---|
| `/ws` | `ws://` / `wss://` | Real-time broadcast channel for all connected clients |

#### Broadcast Events:
1. **`order_created`**:
   ```json
   {
     "event": "order_created",
     "data": {
       "id": "ORD-1001",
       "customer_name": "Alice",
       "items": ["Pizza"],
       "status": "New",
       "created_at": "2026-11-10T14:30:00Z",
       "version": 1
     }
   }
   ```
2. **`order_updated`**:
   ```json
   {
     "event": "order_updated",
     "data": {
       "id": "ORD-1001",
       "customer_name": "Alice",
       "items": ["Pizza"],
       "status": "Preparing",
       "created_at": "2026-11-10T14:30:00Z",
       "version": 2
     }
   }
   ```

---

## 6. Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+ and npm

### Installation & Execution (PowerShell / Terminal)

#### 1. Start the Backend
```powershell
cd backend

# Create & activate virtual environment
python -m venv .venv
.venv\Scripts\Activate.ps1

# Install backend dependencies
pip install -r requirements.txt

# Start backend server
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
The backend API will be live at `http://127.0.0.1:8000` (interactive documentation at `http://127.0.0.1:8000/docs`).

#### 2. Start the Frontend
Open a second terminal:
```powershell
cd frontend

# Install dependencies
npm install

# Start Vite dev server
npm run dev
```
The frontend application will be live at `http://localhost:5173`.

---

## 7. Role-Based Views

Open three separate browser windows or tabs to view real-time synchronization:

- **Cashier**: `http://localhost:5173/?role=cashier`
- **Kitchen**: `http://localhost:5173/?role=kitchen`
- **Customer Tracker**: `http://localhost:5173/?role=customer&orderId=ORD-1001`
  *(or enter any order ID into the lookup field)*

---

## 8. Running the Tests

To run the backend test suite:
```powershell
backend\.venv\Scripts\pytest backend\tests\test_orders.py -v
```

To run the live multi-client end-to-end simulation:
```powershell
backend\.venv\Scripts\python backend\tests\e2e_simulation.py
```

<div align="center">

# 🍽️ Real-Time Restaurant Order Management & Customer Self-Service System

**An event-driven restaurant management application featuring authoritative state synchronization, customer self-service ordering, and optimistic concurrency control across distributed role interfaces.**

[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18+-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5+-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![SQLite](https://img.shields.io/badge/SQLite-WAL_Mode-003B57?style=for-the-badge&logo=sqlite&logoColor=white)](https://www.sqlite.org/)
[![WebSockets](https://img.shields.io/badge/WebSockets-Real--Time-010101?style=for-the-badge&logo=socketdotio&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)
[![Tests](https://img.shields.io/badge/Tests-18%20Passed-success?style=for-the-badge&logo=pytest&logoColor=white)](https://docs.pytest.org/)

[Key Features](#-key-features) • [System Architecture](#-system-architecture) • [Real-Time Flow](#-real-time-synchronization-flow) • [Menu Hierarchy](#-restaurant-menu-hierarchy) • [Concurrency Control](#-concurrency-control--occ) • [Quick Start](#-getting-started) • [API Reference](#-api-reference)

</div>

---

## 🌟 Key Features

The application provides three specialized web interfaces sharing one authoritative SQLite datastore and an in-memory WebSocket event bus:

| Interface | Primary Users | Key Capabilities |
| :--- | :--- | :--- |
| **📱 Customer View** | Guests & Walk-ins | Browse 3 meal periods (20 strict categories), interactive shopping cart, server-validated orders in Algerian Dinars (`DA`), and live 4-stage tracking stepper with real-time updates. |
| **🍳 Kitchen Display (KDS)** | Kitchen Staff & Chefs | Live active ticket queue, 1-click lifecycle advancement (`New → Preparing → Ready → Served`), optimistic concurrency conflict detection, and immediate broadcast on prep completion. |
| **💳 Cashier Terminal** | Front Counter & Cashiers | Walk-in manual ticket entry, shareable tracking link generator, order queue review, and live menu stock toggling (`In Stock` ↔ `Out of Stock`). |

### Engineering Highlights
- **Authoritative Server Calculations**: Client-submitted totals are never trusted. The backend verifies item availability and calculates line totals and grand totals authoritatively in **Algerian Dinars (DA)**.
- **Historical Order Snapshots**: When an order is placed, an immutable snapshot of item names, unit prices, quantities, and line totals is saved. Future menu updates never alter past receipts.
- **Transactional Post-Commit Broadcasting**: WebSockets only broadcast events after the SQLite transaction has committed to disk.
- **Optimistic Concurrency Control (OCC)**: Atomic conditional SQL updates eliminate race conditions when multiple staff members advance tickets simultaneously.
- **Full Multi-Device Responsiveness**: Fluid layouts engineered for smartphones (320px–480px), tablets (768px–1024px), laptops, and large desktop screens.

---

## 🏗️ System Architecture

```mermaid
flowchart TD
    subgraph Clients["Frontend Clients (React + Vite)"]
        CV["Customer Self-Service Interface (Cart, Menu & Live Stepper)"]
        KV["Kitchen Display System (Ticket Queue & Status Actions)"]
        CT["Cashier Terminal (Walk-in Orders & Stock Management)"]
    end

    subgraph Backend["FastAPI Backend Service"]
        ROUTER["REST API Routes (/api/orders, /api/menu)"]
        WS_MGR["WebSocket Manager (In-Memory Broadcast Hub)"]
        VAL["Validation & OCC Engine (Price Auth, State Machine)"]
    end

    subgraph Storage["Persistent Store (Authoritative)"]
        DB[("SQLite 3 Engine (WAL Mode, Immediate Transactions)")]
        T_ORDERS[("orders table (JSON Snapshot, Version, Status)")]
        T_MENU[("menu_categories & menu_items (3 Meal Periods, 20 Categories)")]
    end

    CV -->|"POST /api/orders (Submit Cart)"| ROUTER
    KV -->|"PATCH /api/orders/{id}/status (Advance Status)"| ROUTER
    CT -->|"PATCH /api/menu/items/{id}/availability (Toggle Stock)"| ROUTER
    CV -.->|"GET /api/menu"| ROUTER

    ROUTER --> VAL
    VAL -->|"ACID Transaction"| DB
    DB --- T_ORDERS
    DB --- T_MENU

    DB -->|"Commit Success Trigger"| WS_MGR
    WS_MGR -.->|"ws:// broadcast: order_created"| CV & KV & CT
    WS_MGR -.->|"ws:// broadcast: order_updated"| CV & KV & CT
    WS_MGR -.->|"ws:// broadcast: menu_item_updated"| CV & CT
```

---

## ⚡ Real-Time Synchronization Flow

```mermaid
sequenceDiagram
    autonumber
    actor Customer as Customer View
    participant Backend as FastAPI Backend
    participant DB as SQLite Store
    actor Kitchen as Kitchen Display
    actor Cashier as Cashier View

    Note over Customer, Backend: 1. Customer Submits Self-Service Order
    Customer->>Backend: POST /api/orders { customer_name, items: [{id, qty}] }
    Backend->>DB: Query current prices & verify is_available = 1
    Backend->>DB: INSERT INTO orders (total_price in DA, version=1, status='New')
    DB-->>Backend: Transaction Committed
    Backend-->>Customer: 201 Created { id: "ORD-1001", total_price: 1450.0, version: 1 }

    par Real-Time Broadcast (Post-Commit)
        Backend-->>Customer: WS: order_created (Transitions to Live Stepper)
        Backend-->>Kitchen: WS: order_created (New ticket appears in queue)
        Backend-->>Cashier: WS: order_created (Ticket logged in queue)
    end

    Note over Kitchen, Backend: 2. Kitchen Advances Ticket
    Kitchen->>Backend: PATCH /api/orders/ORD-1001/status { status: 'Preparing', version: 1 }
    Backend->>DB: UPDATE orders SET status='Preparing', version=2 WHERE id='ORD-1001' AND version=1
    DB-->>Backend: 1 row affected (Version incremented)
    Backend-->>Kitchen: 200 OK

    par Real-Time Status Broadcast
        Backend-->>Customer: WS: order_updated (Stepper moves to Preparing)
        Backend-->>Kitchen: WS: order_updated
        Backend-->>Cashier: WS: order_updated
    end
```

---

## 🔄 Order Lifecycle & Concurrency (OCC)

```mermaid
stateDiagram-v2
    [*] --> New: Customer self-orders or Cashier creates ticket (v1)

    New --> Preparing: Kitchen clicks "Démarrer la préparation" (v1 -> v2)
    Preparing --> Ready: Kitchen clicks "Marquer Prêt" (v2 -> v3)
    Ready --> Served: Kitchen clicks "Marquer Servi" (v3 -> v4)
    Served --> [*]: Ticket Completed

    note right of New
        Ticket queued in kitchen.
        Tracking link active for guest.
    end note

    note right of Preparing
        Food being cooked / plated.
        Customer receives live update.
    end note

    note right of Ready
        Food at pickup counter.
        Visual pickup chime alert.
    end note

    note right of Served
        Delivered to customer.
        Archived from active queue.
    end note
```

### Optimistic Concurrency Control
To prevent race conditions when multiple users manipulate tickets simultaneously:
1. Every order carries an incremental integer `version` (initialized to `1`).
2. Update requests submit the known version: `{ "status": "Ready", "version": 2 }`.
3. The backend executes an atomic conditional SQL statement:
   ```sql
   UPDATE orders
   SET status = ?, version = version + 1
   WHERE id = ? AND version = ?;
   ```
4. If another staff member updated the order first, `rowcount` equals `0`. The backend rejects the stale request with **HTTP 409 Conflict** and returns the latest order state so the client reconciles without data loss.

---

## 📋 Restaurant Menu Hierarchy

The demonstration menu adheres to 3 meal periods and their exact 20 canonical categories, featuring French and Algerian culinary dishes with prices in **Algerian Dinars (DA)**:

| Meal Period | Category Order | Canonical Category Name | Sample Demonstrative Dishes (DA) |
| :--- | :---: | :--- | :--- |
| **🌅 Breakfast** | 1 | `Beverages / Liquid Start` | Jus d'Orange Pressé (350 DA), Café Crème Kahwa (250 DA) |
| | 2 | `Fruit & Bakery` | Msemen Beurre & Miel (400 DA), Croissant Artisanal (350 DA) |
| | 3 | `Cereals & Grains` | Tamina Dorée aux Amandes (500 DA), Gruau Dattes Deglet Nour (450 DA) |
| | 4 | `Main Plates` | Chakchouka Traditionnelle aux Œufs (750 DA), Omelette Khlii (850 DA) |
| **🥗 Lunch** | 1 | `Appetizer / Starter` | Bourek Viande Hachée (650 DA), Salade Méchouia Braisée (600 DA) |
| | 2 | `Main Course` | Couscous Royal Agneau (1 950 DA), Tajine Zitoun Poulet (1 650 DA) |
| | 3 | `Sides` | Frites Maison aux Épices (400 DA), Batata Chtitha (450 DA) |
| | 4 | `Dessert` | Crème Caramel Fleur d'Oranger (500 DA), Fondant Chocolat Noir (650 DA) |
| **🍷 Dinner & Full-Course** | 1 | `Hors d’œuvre` | Mini Pastillas Poulet & Amandes (850 DA), Feuillantine Crevettes (900 DA) |
| | 2 | `Amuse-bouche` | Velouté Glacé Courgettes Menthe (450 DA), Canapé Sardines (500 DA) |
| | 3 | `Soup` | Chorba Frik Agneau (850 DA), Chorba Beida Blanche Poulet (800 DA) |
| | 4 | `Appetizer / Starter` | Foie Gras Poêlé aux Figues (1 800 DA), Tartare de Thon Rouge (1 500 DA) |
| | 5 | `Salad` | Salade Agrumes & Roquette (750 DA), Salade Tomates & Olives (700 DA) |
| | 6 | `Fish / Seafood Course` | Pavé de Loup de Mer au Fenouil (2 400 DA), Gambas Royales (2 600 DA) |
| | 7 | `Palate Cleanser` | Sorbet Givré Citron & Menthe (400 DA), Granité Clémentine (450 DA) |
| | 8 | `Main Course` | Chakhchoukha de Biskra Agneau (2 200 DA), Souris d'Agneau Confite (2 500 DA) |
| | 9 | `Cheese Course` | Sélection Brebis & Chèvre (1 100 DA), Fromage Frais Zaatar (950 DA) |
| | 10 | `Dessert` | Mille-Feuille Vanille Praliné (850 DA), Tartelette Fraises Pistache (800 DA) |
| | 11 | `Mignardises / Petit Fours`| Trio Pâtisseries Baklawa/Samsa (650 DA), Truffes Chocolat (550 DA) |
| | 12 | `Digestif & Beverages` | Thé à la Menthe aux Pignons (350 DA), Infusion Verveine (300 DA) |

---

## 📱 Responsive Multi-Device Design

The application is responsive across different device viewports:

| Device | Breakpoint | Responsive Behaviors |
| :--- | :--- | :--- |
| **Mobile** | `< 480px` | Single-column stacked tickets, full-width touch targets (minimum 44px), horizontally swipeable meal-period tabs, and sticky cart action bar. |
| **Tablet** | `768px – 1024px` | Dual-column KDS grid, fluid 2-column cashier layout, and optimized typography for touchscreens. |
| **Desktop** | `> 1024px` | Side-by-side cashier orders queue and walk-in form; sticky shopping cart panel pinned alongside category items; multi-column kitchen ticket grid. |

---

## 🔌 API Reference

### Menu Endpoints
- `GET /api/menu`: Returns structured 3-period menu with 20 ordered categories and items.
- `GET /api/menu/items`: Returns flat list of all menu items.
- `PATCH /api/menu/items/{id}/availability`: Toggles item availability and broadcasts `menu_item_updated`.

### Order Endpoints
- `GET /api/orders`: Retrieves all orders sorted by creation time descending.
- `GET /api/orders/{id}`: Retrieves single order by alphanumeric ID (e.g. `ORD-1001`).
- `POST /api/orders`: Creates self-service or walk-in order; validates items, availability, and calculates prices authoritatively in `DA`; broadcasts `order_created`.
- `PATCH /api/orders/{id}/status`: Advances status using OCC version check; broadcasts `order_updated`.
- `WS /ws`: Bi-directional real-time WebSocket connection.

---

## 🚀 Getting Started

### Prerequisites
- **Python 3.10+**
- **Node.js 18+** and **npm**

### 1. Backend Service Setup (PowerShell)
```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt

# Start FastAPI server on port 8000
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
- API endpoints: `http://127.0.0.1:8000`
- Interactive Swagger docs: `http://127.0.0.1:8000/docs`

### 2. Frontend Application Setup (PowerShell)
```powershell
cd frontend
npm install

# Start Vite development server
npm run dev
```
- Web Application: `http://localhost:5173`

---

## 🌐 Role Direct URLs

| Role | Direct URL | Description |
| :--- | :--- | :--- |
| **Customer (Self-Order)** | [http://localhost:5173/?role=customer](http://localhost:5173/?role=customer) | Default view: Browse French/Algerian menu, build cart, place order. |
| **Customer Tracking** | [http://localhost:5173/?role=customer&orderId=ORD-1001](http://localhost:5173/?role=customer&orderId=ORD-1001) | Live 4-stage tracking stepper for order `ORD-1001`. |
| **Kitchen Display (KDS)** | [http://localhost:5173/?role=kitchen](http://localhost:5173/?role=kitchen) | Active ticket queue with one-click status advancement. |
| **Cashier Terminal** | [http://localhost:5173/?role=cashier](http://localhost:5173/?role=cashier) | Walk-in order creation and live menu stock toggling. |

---

## 🧪 Verification & Testing

```powershell
# Run the complete test suite (18 unit & integration tests)
backend\.venv\Scripts\pytest backend\tests -v

# Run the live multi-client end-to-end WebSocket & OCC simulation
backend\.venv\Scripts\python backend\tests\e2e_simulation.py

# Verify production frontend build
cd frontend; npm run build
```

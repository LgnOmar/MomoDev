# Demonstration Guide & Presentation Walkthrough

This guide details how to run, demonstrate, and present the Real-Time Restaurant Order Management System.

---

## 1. Environment Setup & Startup Instructions

### Step 1: Start the Backend Service
Open a PowerShell terminal:
```powershell
# In backend directory
cd backend

# Create virtual environment and install dependencies:
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt

# Launch FastAPI backend with hot reloading
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
Console output:
```text
INFO:     Started server process
INFO:restaurant_app:Initializing SQLite database...
INFO:restaurant_app:Database ready.
INFO:     Uvicorn running on http://127.0.0.1:8000
```

### Step 2: Start the Frontend Application
Open a second PowerShell terminal:
```powershell
# In frontend directory
cd frontend

# Install node dependencies and start Vite dev server:
npm install
npm run dev
```
Console output:
```text
  VITE ready in 400 ms
  ➜  Local:   http://localhost:5173/
```

---

## 2. Browser Setup

For demonstration, arrange three browser windows side by side (or across split monitors):

| Role | Window | Direct URL |
|---|---|---|
| **Cashier** | Window 1 (Left) | [http://localhost:5173/?role=cashier](http://localhost:5173/?role=cashier) |
| **Kitchen** | Window 2 (Center) | [http://localhost:5173/?role=kitchen](http://localhost:5173/?role=kitchen) |
| **Customer** | Window 3 (Right) | [http://localhost:5173/?role=customer](http://localhost:5173/?role=customer) |

> **Note**: Each window maintains its role independently via URL query parameters, so you can freely reload or navigate each view.

---

## 3. Step-by-Step Feature Walkthrough

### Scenario 1: Creating an Order & Real-Time Sync
1. In **Window 1 (Cashier)**:
   - Enter Customer Name: `"Sarah Connor"`.
   - Click quick-add buttons: `+ Classic Burger`, `+ Crispy Fries`, `+ Iced Lemon Tea`.
   - Click **"Submit Order"**.
2. **Observe Real-Time Synchronization**:
   - In **Window 1 (Cashier)**: The new order card (e.g., `ORD-1001`) appears immediately with status `New (v1)`.
   - In **Window 2 (Kitchen)**: **Without refreshing the page**, a new ticket for `ORD-1001` pops up in the active queue with status `New`, showing all items and a blue action button: **"Start Preparing ⏳"**.
3. **Open Customer Tracking**:
   - In **Window 1 (Cashier)**, click **"Copy Link"** on `ORD-1001`'s card (or click `Open ↗`).
   - Paste the link into **Window 3 (Customer)** or enter the order ID `ORD-1001` into the search box and click **Track Order**.
   - Window 3 displays the customer receipt, item breakdown, and a 4-stage visual progress stepper currently at **"New"**.

---

### Scenario 2: Advancing the Order Lifecycle
1. In **Window 2 (Kitchen)**:
   - Click the button: **"Start Preparing ⏳"**.
2. **Observe Window 3 (Customer)** & **Window 1 (Cashier)**:
   - Immediately, without any page refresh:
     - The customer progress stepper advances to **Stage 2: Preparing**.
     - The customer status message updates to: *"The kitchen team is actively preparing your meal right now!"*.
     - The version counter advances to `v2`.
     - The cashier's card updates its status badge to amber **Preparing**.
3. In **Window 2 (Kitchen)**:
   - Click the button: **"Mark Ready ✓"**.
   - The customer screen turns green: *"Your food is fresh and ready for pickup at the counter! 🔔"*.
   - The kitchen card reflects the emerald **Ready** badge.
4. In **Window 2 (Kitchen)**:
   - Click **"Mark Served 🍽"**.
   - Order transitions to final state: **Served**.
   - If Kitchen has "Active Tickets" filtered, the ticket moves out of the active queue into completed history.

---

### Scenario 3: Concurrency Conflict Handling (OCC)

To demonstrate how the system prevents stale updates when two staff members interact simultaneously:

#### Option A: Two Kitchen Browser Windows
1. Open a second Kitchen window: `http://localhost:5173/?role=kitchen` alongside the first.
2. In Cashier, create another order (e.g., `ORD-1002`). Both kitchen windows show `ORD-1002` at `v1`.
3. In Kitchen Window A, click **"Start Preparing"**.
   - Window A updates `ORD-1002` to `Preparing` (now version 2).
4. In Kitchen Window B, if an action is attempted with stale version 1:
   - The backend validates that `submitted_version (1) != database_version (2)`.
   - The backend rejects the stale request with **HTTP 409 Conflict**.
   - Window B displays the alert banner:
     *"Concurrency Notice: Conflict on ORD-1002: Another user already updated this order to 'Preparing' (v2). Order was automatically refreshed."*
   - Window B automatically updates its UI state to version 2 without corrupting data or skipping steps.

#### Option B: Automated Concurrency Script
Run the automated multi-client concurrency test in PowerShell:
```powershell
python backend\tests\e2e_simulation.py
```
This script connects 3 concurrent WebSockets, creates an order, and fires two simultaneous update requests with identical version numbers, proving:
- Exactly one update succeeds with `200 OK`.
- The second update is rejected with `409 Conflict`.
- The database is not corrupted.

---

## 4. Presentation & Architecture Walkthrough

```text
Time Outline:
- 0:00 – 0:45: Introduction & Multi-Window Layout
- 0:45 – 1:45: System Architecture & Sound Simplicity
- 1:45 – 2:45: Live Demonstration across Roles
- 2:45 – 3:45: Optimistic Concurrency Control (OCC)
- 3:45 – 4:30: Design Decisions & Scalability Discussion
```

### Presentation Script

#### Introduction (0:00 – 0:45)
> "Welcome! Today I am presenting the Real-Time Restaurant Order Management System.
> 
> The application demonstrates shared real-time state synchronization across three distinct roles: the Cashier who enters orders, the Kitchen team who prepares them, and the Customer who tracks their meal live.
> 
> On my screen, I have three independent browser windows open:
> On the left is the Cashier Terminal, in the center is the Kitchen Display System, and on the right is the Customer Order Tracker. All three interfaces communicate with the same backend service and share the same authoritative database."

#### Architecture & Technology Choices (0:45 – 1:45)
> "Let's review the architecture.
> 
> For the backend, I built a service using **Python with FastAPI** and **SQLite** using the built-in `sqlite3` driver. SQLite functions as the authoritative source of truth. Rather than introducing complex distributed infrastructure like Redis or external message brokers for a single-server deployment, a single-process SQLite with Write-Ahead Logging (WAL) and an in-memory WebSocket manager provides bulletproof ACID transactions with minimal complexity.
> 
> For communication, we use a hybrid model:
> 1. Standard **REST endpoints** handle state mutations and initial data loading: POST to create an order, PATCH to update status, and GET for queries.
> 2. A **WebSocket endpoint** (`/ws`) provides bi-directional real-time broadcasting.
> 
> A key engineering decision is **post-commit broadcasting**: the backend broadcasts WebSocket events only *after* the SQLite database transaction has successfully committed. If a database operation fails, no event is broadcast.
> 
> On the frontend, we have a clean **React + Vite** application. The view is controlled dynamically via URL query parameters, allowing each role to operate independently while sharing identical live state."

#### Live Demonstration (1:45 – 2:45)
> "Now let's see the application in action.
> 
> As the Cashier, I'll enter a new order for 'Sarah' with a Classic Burger and Crispy Fries, and submit it.
> 
> Instantly, without anyone refreshing their browser, the Kitchen Display receives ticket `ORD-1001`, and the customer's tracker shows the ticket is queued.
> 
> Now watch the kitchen. When the cook clicks 'Start Preparing', the ticket updates to 'Preparing', and the customer's screen immediately transitions to Stage 2 with an updated status banner.
> 
> When the kitchen clicks 'Mark Ready', the customer view lights up green, notifying them that their meal is ready for pickup. Finally, 'Mark Served' completes the lifecycle."

#### Concurrency Handling: Optimistic Concurrency Control (2:45 – 3:45)
> "One of the most important requirements is handling simultaneous updates.
> 
> Rather than letting requests arbitrarily overwrite one another, I implemented **Optimistic Concurrency Control (OCC)** using an atomic version number.
> 
> Every order begins at version 1. Whenever a client requests a status update, it must submit the version number it currently holds.
> 
> In SQLite, we execute an atomic conditional SQL update:
> `UPDATE orders SET status = ?, version = version + 1 WHERE id = ? AND version = ?`
> 
> If two kitchen operators click an action at the exact same millisecond, the database serializes the write. The first update succeeds and increments the version to 2. The second update finds zero rows matching the old version and is immediately rejected with an **HTTP 409 Conflict**.
> 
> The backend doesn't just reject the request—it returns the latest authoritative order state in the response. The frontend catches this conflict, shows an informative notice, and updates the UI to the latest state so no user is left looking at stale data."

#### Scalability & Wrap-up (3:45 – 4:30)
> "In terms of future evolution for large-scale enterprise deployments:
> 1. We could add a Redis Pub/Sub backplane to scale across clustered backend nodes.
> 2. We could introduce JWT-based role authentication.
> 3. We could add audio chime notifications for kitchen stations.
> 
> In summary, this implementation delivers reliable real-time synchronization, strict lifecycle validation, and deterministic concurrency control with clean, maintainable code."

---

## 5. Verification Commands

```powershell
# 1. Run all unit and integration tests (9 tests)
backend\.venv\Scripts\pytest backend\tests\test_orders.py -v

# 2. Run live multi-client end-to-end WebSocket & OCC test
python backend\tests\e2e_simulation.py

# 3. Test production frontend build
cd frontend; npm run build
```

# Demonstration Guide & Presentation Walkthrough

This guide details how to run, demonstrate, and present the Real-Time Restaurant Order Management & Customer Self-Service System.

---

## 1. Environment Setup & Startup Instructions

### Step 1: Start the Backend Service
Open a PowerShell terminal:
```powershell
cd backend

# Create virtual environment & install dependencies (if not already done):
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
| **Customer (Self-Service)** | Window 1 (Left) | [http://localhost:5173/?role=customer](http://localhost:5173/?role=customer) |
| **Kitchen Display** | Window 2 (Center) | [http://localhost:5173/?role=kitchen](http://localhost:5173/?role=kitchen) |
| **Cashier Terminal** | Window 3 (Right) | [http://localhost:5173/?role=cashier](http://localhost:5173/?role=cashier) |

---

## 3. Step-by-Step Demonstration Sequence

### Step 1: Customer Browses the Menu & Adds Items to Cart
1. In **Window 1 (Customer)**:
   - Notice the default view is the **Restaurant Menu**.
   - Click across the three meal periods:
     - **Breakfast** (Beverages / Liquid Start, Fruit & Bakery, Cereals & Grains, Main Plates)
     - **Lunch** (Appetizer / Starter, Main Course, Sides, Dessert)
     - **Dinner & Full-Course Meal** (all 12 sequential courses: Hors d’œuvre, Amuse-bouche, Soup, Appetizer / Starter, Salad, Fish / Seafood Course, Palate Cleanser, Main Course, Cheese Course, Dessert, Mignardises / Petit Fours, Digestif & Beverages)
2. **Add Items to Cart**:
   - In Breakfast, click **"+ Ajouter au panier"** on `Jus d'Orange Pressé Frais` (350 DA).
   - In Main Plates, click **"+ Ajouter au panier"** on `Chakchouka Traditionnelle aux Œufs` (750 DA).
   - In the Shopping Cart panel on the right, increase the quantity of Jus d'Orange to `2`.
   - Observe that the estimated total updates immediately to **1 450 DA** (2x 350 DA + 750 DA).

---

### Step 2: Customer Submits Order directly to Kitchen
1. In **Window 1 (Customer)**:
   - Enter your name / table: `"Amine / Table 4"`.
   - Click **"Valider la Commande (1 450 DA)"**.
2. **Instant Synchronization**:
   - In **Window 1 (Customer)**: Instantly receives Order Confirmation with ID (e.g. `ORD-1001`), line items, total, and switches into the live real-time tracker at Stage 1: **New**.
   - In **Window 2 (Kitchen)**: **Without any browser refresh**, ticket `ORD-1001` pops up in the active queue with customer name, items, quantities, and total `1 450 DA`.
   - In **Window 3 (Cashier)**: The order appears immediately in the cashier's active orders queue.

---

### Step 3: Kitchen Advances Order Lifecycle
1. In **Window 2 (Kitchen)**:
   - Click **"Démarrer la préparation ⏳"**.
2. **Observe Customer Window 1 & Cashier Window 3**:
   - Customer screen immediately moves to **Stage 2: Preparing**, and the status banner updates to: *"L'équipe en cuisine prépare activement votre repas !"*.
   - Version counter increments to `v2`.
3. In **Window 2 (Kitchen)**:
   - Click **"Marquer Prêt ✓"**.
   - Customer screen immediately turns green: *"Votre commande est prête et chaude au comptoir ! 🔔"*.
4. In **Window 2 (Kitchen)**:
   - Click **"Marquer Servi 🍽"**.
   - Order transitions to final state: **Served** (*"Votre commande a été servie. Bon appétit !"*).

---

### Step 4: Real-Time Menu Availability Toggling
1. In **Window 3 (Cashier)**:
   - Switch to the **"Menu Availability"** tab.
   - Under Lunch Main Course, find `Couscous Royal à l'Agneau & Légumes`.
   - Click the green button **"✓ In Stock"** to toggle it to **"✕ Out of Stock"**.
2. **Observe Window 1 (Customer)**:
   - Immediately, without any browser refresh:
     - In the customer's Lunch menu, `Couscous Royal à l'Agneau & Légumes` badge changes to **"✕ Épuisé"**.
     - The Add to Cart button is automatically disabled with label **"Indisponible"**.
     - If a customer attempts to submit an order containing an unavailable item, the backend validates and rejects it with an informative message.
3. Toggle it back to **"✓ In Stock"** in the Cashier view, and observe the Customer view immediately re-enabling it.

---

### Step 5: Concurrency Conflict Handling (OCC)
1. Open two Kitchen windows side by side.
2. In Cashier, enter a quick walk-in order.
3. When both kitchen windows attempt to click "Start Preparing" on the same ticket version:
   - Exactly one update succeeds (`200 OK`, advances to version 2).
   - The second update is rejected with **HTTP 409 Conflict**.
   - The second window displays an alert banner explaining that another user updated the ticket, and refreshes to the latest state.

---

## 4. Presentation & Architecture Walkthrough (3–5 Minutes)

```text
Time Outline:
- 0:00 – 0:50: Overview & Customer Self-Service Introduction
- 0:50 – 1:50: Architecture, Database Snapshots & Server Price Calculations
- 1:50 – 2:50: Live Ordering & Multi-User Real-Time Demonstration
- 2:50 – 3:50: Real-Time Availability Toggling & OCC Concurrency Control
- 3:50 – 4:30: Summary & Scalability Discussion
```

### Presentation Script

#### Introduction (0:00 – 0:50)
> "Welcome! Today I am presenting the Real-Time Restaurant Order Management and Customer Self-Service System.
> 
> In this project, I extended the core real-time order synchronization platform to empower customers with a complete self-service ordering workflow. Customers can independently browse the restaurant's menu across different meal periods, build a shopping cart, submit orders directly to the kitchen, and track their preparation progress live.
> 
> As you can see, I have three browser sessions open:
> On the left is the Customer Self-Service and Live Tracking interface, in the center is the Kitchen Display System, and on the right is the Cashier Terminal."

#### Architecture & Server-Authoritative Integrity (0:50 – 1:50)
> "Let's examine how the system architecture maintains data integrity.
> 
> The backend is built with **FastAPI** and uses **SQLite** as the single authoritative source of truth.
> 
> When customers order, a critical design choice was **authoritative server-side pricing**: the frontend only sends item IDs and quantities. The backend fetches current prices directly from SQLite, verifies that every item is currently available, and calculates line totals and the final total itself. We never trust client-submitted prices.
> 
> Another key requirement is the **historical order snapshot**: when an order commits, we snapshot the item names, unit prices at that moment, quantities, and line totals into the order record. If a menu item's price is updated later, historical receipts remain unchanged.
> 
> All WebSocket broadcasts—including `order_created`, `order_updated`, and `menu_item_updated`—occur **post-commit**. If a database write fails, no broadcast ever takes place."

#### Live Ordering Walkthrough (1:50 – 2:50)
> "Now let's see the customer experience in action.
> 
> The customer navigates between Breakfast, Lunch, and the 12-course Dinner menu. Notice the exact category hierarchy is strictly preserved—from Liquid Start to Fruit & Bakery, Amuse-bouche, and Digestifs. The dishes are inspired by French and Algerian culinary traditions, with prices in Algerian Dinars (DA).
> 
> I'll add a Jus d'Orange Pressé and a Chakchouka to my cart. In the cart panel, I can increment quantities or remove items.
> 
> Now, I enter my name and click 'Valider la Commande'.
> 
> Instantly, three things happen simultaneously without anyone refreshing:
> 1. The customer screen receives an Order Confirmation and transitions to the live 4-stage tracking stepper.
> 2. The Kitchen Display immediately receives the ticket with the ordered dishes and total price in DA.
> 3. The Cashier queue reflects the order.
> 
> When the kitchen clicks 'Démarrer la préparation' and 'Marquer Prêt', the customer's tracker updates in real time."

#### Live Menu Availability & Concurrency Control (2:50 – 3:50)
> "Now let's look at menu availability management.
> 
> If the kitchen runs out of Couscous Royal, the cashier opens the Menu Availability tab and marks it 'Out of Stock'.
> 
> Immediately, via WebSockets, the customer's menu marks the dish as unavailable and disables adding it to the cart. If a customer had cached the page or tried to send an order with that item, the backend rejects it with an explanatory message.
> 
> For simultaneous status updates, we enforce **Optimistic Concurrency Control (OCC)** using atomic conditional SQL queries. If two staff members click a button simultaneously, SQLite serializes the update, one succeeds, and the other receives an **HTTP 409 Conflict** with the latest state, ensuring no updates are lost."

#### Summary (3:50 – 4:30)
> "In summary, this implementation provides a seamless customer ordering experience, authoritative pricing, live two-way real-time state synchronization, and strict concurrency control in a clean, maintainable codebase.
> 
> Thank you!"

---

## 5. Verification Commands

```powershell
# Run the complete test suite (18 unit & integration tests)
backend\.venv\Scripts\pytest backend\tests -v

# Run the live multi-client end-to-end WebSocket & OCC simulation
backend\.venv\Scripts\python backend\tests\e2e_simulation.py

# Test production frontend build
cd frontend; npm run build
```

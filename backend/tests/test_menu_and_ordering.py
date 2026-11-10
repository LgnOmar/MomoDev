import pytest
from app.database import get_db

# 1. Retrieving the menu
def test_retrieve_menu(client):
    res = client.get("/api/menu")
    assert res.status_code == 200
    menu = res.json()
    assert len(menu) == 20  # 4 Breakfast + 4 Lunch + 12 Dinner categories

    # Verify meal periods present
    meal_periods = {cat["meal_period"] for cat in menu}
    assert meal_periods == {"Breakfast", "Lunch", "Dinner & Full-Course Meal"}

# 2. Correct category ordering
def test_correct_category_ordering(client):
    res = client.get("/api/menu")
    assert res.status_code == 200
    menu = res.json()

    # Breakfast categories in exact order
    breakfast_cats = [c["name"] for c in menu if c["meal_period"] == "Breakfast"]
    assert breakfast_cats == [
        "Beverages / Liquid Start",
        "Fruit & Bakery",
        "Cereals & Grains",
        "Main Plates",
    ]

    # Lunch categories in exact order
    lunch_cats = [c["name"] for c in menu if c["meal_period"] == "Lunch"]
    assert lunch_cats == [
        "Appetizer / Starter",
        "Main Course",
        "Sides",
        "Dessert",
    ]

    # Dinner categories in exact order
    dinner_cats = [c["name"] for c in menu if c["meal_period"] == "Dinner & Full-Course Meal"]
    assert dinner_cats == [
        "Hors d’œuvre",
        "Amuse-bouche",
        "Soup",
        "Appetizer / Starter",
        "Salad",
        "Fish / Seafood Course",
        "Palate Cleanser",
        "Main Course",
        "Cheese Course",
        "Dessert",
        "Mignardises / Petit Fours",
        "Digestif & Beverages",
    ]

# 3 & 4. Creating an order from valid menu item IDs & server-side price calculation
def test_create_order_from_menu_items_with_server_price_calculation(client):
    # ITEM-B-101: Jus d'Orange Pressé Frais (350.0 DA)
    # ITEM-B-401: Chakchouka Traditionnelle aux Œufs (750.0 DA)
    order_payload = {
        "customer_name": "Karim Benali",
        "items": [
            {"menu_item_id": "ITEM-B-101", "quantity": 2}, # 2 * 350 = 700 DA
            {"menu_item_id": "ITEM-B-401", "quantity": 1}, # 1 * 750 = 750 DA
        ]
    }
    res = client.post("/api/orders", json=order_payload)
    assert res.status_code == 201
    order = res.json()

    assert order["customer_name"] == "Karim Benali"
    assert order["status"] == "New"
    assert order["version"] == 1
    assert order["total_price"] == 1450.0

    items = order["items"]
    assert len(items) == 2
    assert items[0]["name"] == "Jus d'Orange Pressé Frais"
    assert items[0]["unit_price"] == 350.0
    assert items[0]["quantity"] == 2
    assert items[0]["line_total"] == 700.0

    assert items[1]["name"] == "Chakchouka Traditionnelle aux Œufs"
    assert items[1]["unit_price"] == 750.0
    assert items[1]["quantity"] == 1
    assert items[1]["line_total"] == 750.0

# 5. Rejecting unavailable items
def test_reject_order_with_unavailable_item(client):
    # Mark item ITEM-L-201 (Couscous Royal) unavailable
    toggle_res = client.patch("/api/menu/items/ITEM-L-201/availability", json={"is_available": False})
    assert toggle_res.status_code == 200
    assert toggle_res.json()["is_available"] is False

    # Attempt to order unavailable item
    order_payload = {
        "customer_name": "Amine",
        "items": [
            {"menu_item_id": "ITEM-L-201", "quantity": 1}
        ]
    }
    res = client.post("/api/orders", json=order_payload)
    assert res.status_code == 400
    assert "currently unavailable" in res.json()["detail"]

# 6. Rejecting invalid quantities
def test_reject_invalid_quantities(client):
    # Zero quantity
    res_zero = client.post("/api/orders", json={
        "customer_name": "Yacine",
        "items": [{"menu_item_id": "ITEM-B-101", "quantity": 0}]
    })
    assert res_zero.status_code == 422 # Pydantic ge=1 validation

    # Negative quantity
    res_neg = client.post("/api/orders", json={
        "customer_name": "Yacine",
        "items": [{"menu_item_id": "ITEM-B-101", "quantity": -3}]
    })
    assert res_neg.status_code == 422

# 7. Rejecting nonexistent menu items
def test_reject_nonexistent_menu_item(client):
    res = client.post("/api/orders", json={
        "customer_name": "Salima",
        "items": [{"menu_item_id": "ITEM-DOES-NOT-EXIST", "quantity": 1}]
    })
    assert res.status_code == 400
    assert "does not exist" in res.json()["detail"]

# 8. Ensuring an order retains its original item names and prices if menu changes
def test_order_retains_historical_snapshot_if_menu_changes(client):
    # Create order when price of ITEM-B-102 (Café Crème) is 250.0 DA
    res = client.post("/api/orders", json={
        "customer_name": "Nadia",
        "items": [{"menu_item_id": "ITEM-B-102", "quantity": 2}]
    })
    assert res.status_code == 201
    order_id = res.json()["id"]
    assert res.json()["total_price"] == 500.0

    # Simulate price increase in menu table directly
    with get_db() as conn:
        with conn:
            conn.execute("UPDATE menu_items SET price = 9999.00 WHERE id = 'ITEM-B-102';")

    # Retrieve existing order: historical snapshot must remain 250.0 DA, total 500.0 DA!
    fetch_res = client.get(f"/api/orders/{order_id}")
    assert fetch_res.status_code == 200
    fetched_order = fetch_res.json()
    assert fetched_order["total_price"] == 500.0
    assert fetched_order["items"][0]["unit_price"] == 250.0
    assert fetched_order["items"][0]["line_total"] == 500.0

# 9. Changing menu item availability & WebSocket broadcast
def test_toggle_menu_availability_and_ws_broadcast(client):
    with client.websocket_connect("/ws") as websocket:
        # Toggle availability
        res = client.patch("/api/menu/items/ITEM-D-301/availability", json={"is_available": False})
        assert res.status_code == 200
        assert res.json()["is_available"] is False

        # Verify WebSocket received 'menu_item_updated'
        event = websocket.receive_json()
        assert event["event"] == "menu_item_updated"
        assert event["data"]["id"] == "ITEM-D-301"
        assert event["data"]["is_available"] is False

        # Toggle back to available
        res2 = client.patch("/api/menu/items/ITEM-D-301/availability", json={"is_available": True})
        assert res2.status_code == 200
        assert res2.json()["is_available"] is True

        event2 = websocket.receive_json()
        assert event2["event"] == "menu_item_updated"
        assert event2["data"]["id"] == "ITEM-D-301"
        assert event2["data"]["is_available"] is True

# 10. Ensuring customer order is available to kitchen & cashier
def test_customer_order_available_to_all_views(client):
    with client.websocket_connect("/ws") as websocket:
        res = client.post("/api/orders", json={
            "customer_name": "Table 5 (Méridien)",
            "items": [{"menu_item_id": "ITEM-L-101", "quantity": 1}]
        })
        assert res.status_code == 201
        created = res.json()

        # Real-time broadcast received
        event = websocket.receive_json()
        assert event["event"] == "order_created"
        assert event["data"]["id"] == created["id"]

        # Accessible in all orders query (for cashier and kitchen)
        all_orders = client.get("/api/orders").json()
        assert any(o["id"] == created["id"] for o in all_orders)

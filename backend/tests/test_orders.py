import pytest

def test_health_check(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"

# 1. Creating and retrieving an order
def test_create_and_retrieve_order(client):
    create_payload = {
        "customer_name": "Alice Johnson",
        "items": ["Classic Cheeseburger", "Large Curly Fries", "Iced Tea"]
    }
    create_resp = client.post("/api/orders", json=create_payload)
    assert create_resp.status_code == 201
    created_data = create_resp.json()

    assert created_data["id"].startswith("ORD-")
    assert created_data["customer_name"] == "Alice Johnson"
    assert [item["name"] for item in created_data["items"]] == ["Classic Cheeseburger", "Large Curly Fries", "Iced Tea"]
    assert created_data["status"] == "New"
    assert created_data["version"] == 1
    assert "created_at" in created_data

    order_id = created_data["id"]

    # Retrieve by exact ID
    get_resp = client.get(f"/api/orders/{order_id}")
    assert get_resp.status_code == 200
    assert get_resp.json()["id"] == order_id
    assert get_resp.json()["customer_name"] == "Alice Johnson"

    # Retrieve all orders
    all_resp = client.get("/api/orders")
    assert all_resp.status_code == 200
    orders = all_resp.json()
    assert len(orders) >= 1
    assert any(o["id"] == order_id for o in orders)

# 2. Valid status transitions: New -> Preparing -> Ready -> Served
def test_valid_status_transitions_lifecycle(client):
    # Create order (starts at New, v1)
    res = client.post("/api/orders", json={"customer_name": "Bob", "items": ["Pepperoni Pizza"]})
    order = res.json()
    order_id = order["id"]
    assert order["status"] == "New"
    assert order["version"] == 1

    # Transition 1: New -> Preparing (version 1 -> 2)
    step1 = client.patch(f"/api/orders/{order_id}/status", json={"status": "Preparing", "version": 1})
    assert step1.status_code == 200
    data1 = step1.json()
    assert data1["status"] == "Preparing"
    assert data1["version"] == 2

    # Transition 2: Preparing -> Ready (version 2 -> 3)
    step2 = client.patch(f"/api/orders/{order_id}/status", json={"status": "Ready", "version": 2})
    assert step2.status_code == 200
    data2 = step2.json()
    assert data2["status"] == "Ready"
    assert data2["version"] == 3

    # Transition 3: Ready -> Served (version 3 -> 4)
    step3 = client.patch(f"/api/orders/{order_id}/status", json={"status": "Served", "version": 3})
    assert step3.status_code == 200
    data3 = step3.json()
    assert data3["status"] == "Served"
    assert data3["version"] == 4

# 3. Rejecting invalid status transitions
def test_reject_invalid_status_transitions(client):
    res = client.post("/api/orders", json={"customer_name": "Charlie", "items": ["Tacos"]})
    order_id = res.json()["id"]

    # Cannot skip: New -> Ready directly
    invalid_skip = client.patch(f"/api/orders/{order_id}/status", json={"status": "Ready", "version": 1})
    assert invalid_skip.status_code == 400
    assert "Invalid status transition" in invalid_skip.json()["detail"]

    # Cannot skip: New -> Served directly
    invalid_skip2 = client.patch(f"/api/orders/{order_id}/status", json={"status": "Served", "version": 1})
    assert invalid_skip2.status_code == 400

    # Advance to Preparing
    client.patch(f"/api/orders/{order_id}/status", json={"status": "Preparing", "version": 1})

    # Cannot go backwards: Preparing -> New
    invalid_back = client.patch(f"/api/orders/{order_id}/status", json={"status": "New", "version": 2})
    assert invalid_back.status_code == 400

    # Advance to Ready
    client.patch(f"/api/orders/{order_id}/status", json={"status": "Ready", "version": 2})

    # Advance to Served
    client.patch(f"/api/orders/{order_id}/status", json={"status": "Served", "version": 3})

    # Cannot advance past Served
    invalid_after_served = client.patch(f"/api/orders/{order_id}/status", json={"status": "Preparing", "version": 4})
    assert invalid_after_served.status_code == 400

# 4. Rejecting updates using stale version numbers (HTTP 409 Conflict)
def test_reject_stale_version_conflict(client):
    # User A and User B both view order at version 1
    res = client.post("/api/orders", json={"customer_name": "Diana", "items": ["Sushi Platter"]})
    order_id = res.json()["id"]

    # User A successfully updates order from version 1 to Preparing -> version becomes 2
    res_a = client.patch(f"/api/orders/{order_id}/status", json={"status": "Preparing", "version": 1})
    assert res_a.status_code == 200
    assert res_a.json()["version"] == 2

    # User B, who still has stale version 1, attempts to update status to Preparing
    res_b = client.patch(f"/api/orders/{order_id}/status", json={"status": "Preparing", "version": 1})
    # Should be rejected with 409 Conflict (or 400 if transition check failed, but with OCC version mismatch)
    # Notice: even if target status is Preparing, version is stale (1 vs 2).
    # Since status is already Preparing in DB, transition Preparing -> Preparing is also invalid,
    # but let's test User B attempting Preparing -> Ready with stale version 1!
    res_b2 = client.patch(f"/api/orders/{order_id}/status", json={"status": "Ready", "version": 1})
    assert res_b2.status_code == 409
    conflict_data = res_b2.json()
    assert "Conflict" in conflict_data["detail"]
    assert "current_order" in conflict_data
    assert conflict_data["current_order"]["version"] == 2
    assert conflict_data["current_order"]["status"] == "Preparing"

# 5. Ensuring a failed or conflicting update does not overwrite the existing order
def test_conflicting_update_does_not_corrupt_data(client):
    res = client.post("/api/orders", json={"customer_name": "Edward", "items": ["Hot Dog"]})
    order_id = res.json()["id"]

    # Advance to Preparing
    client.patch(f"/api/orders/{order_id}/status", json={"status": "Preparing", "version": 1})

    # Attempt conflicting update with wrong version
    conflict_res = client.patch(f"/api/orders/{order_id}/status", json={"status": "Ready", "version": 99})
    assert conflict_res.status_code == 409

    # Verify order state remains intact in database
    get_res = client.get(f"/api/orders/{order_id}")
    current = get_res.json()
    assert current["status"] == "Preparing"
    assert current["version"] == 2

# 6. Validation tests
def test_create_order_validation(client):
    # Blank customer name
    blank_name = client.post("/api/orders", json={"customer_name": "   ", "items": ["Item"]})
    assert blank_name.status_code == 422

    # Empty items list
    empty_items = client.post("/api/orders", json={"customer_name": "Frank", "items": []})
    assert empty_items.status_code == 422

def test_nonexistent_order_404(client):
    res = client.get("/api/orders/NON_EXISTENT_ID")
    assert res.status_code == 404

# 7. Real-time WebSocket broadcasting test
def test_websocket_order_broadcasts(client):
    with client.websocket_connect("/ws") as websocket:
        # 1. Create order -> receives order_created event
        create_resp = client.post("/api/orders", json={"customer_name": "WebSocket Tester", "items": ["Club Sandwich"]})
        assert create_resp.status_code == 201
        created = create_resp.json()

        event1 = websocket.receive_json()
        assert event1["event"] == "order_created"
        assert event1["data"]["id"] == created["id"]
        assert event1["data"]["status"] == "New"
        assert event1["data"]["version"] == 1

        # 2. Advance status -> receives order_updated event
        update_resp = client.patch(f"/api/orders/{created['id']}/status", json={"status": "Preparing", "version": 1})
        assert update_resp.status_code == 200

        event2 = websocket.receive_json()
        assert event2["event"] == "order_updated"
        assert event2["data"]["id"] == created["id"]
        assert event2["data"]["status"] == "Preparing"
        assert event2["data"]["version"] == 2

import asyncio
import httpx
import websockets
import json

async def run_e2e_simulation():
    print("--- Starting E2E Multi-User Live Simulation ---")
    
    # Check Health
    async with httpx.AsyncClient() as client:
        resp = await client.get("http://127.0.0.1:8000/api/health")
        assert resp.status_code == 200, f"Health check failed: {resp.text}"
        print("✓ Health check passed:", resp.json())

    # Open 3 WebSocket connections (Cashier, Kitchen, Customer)
    ws_cashier = await websockets.connect("ws://127.0.0.1:8000/ws")
    ws_kitchen = await websockets.connect("ws://127.0.0.1:8000/ws")
    ws_customer = await websockets.connect("ws://127.0.0.1:8000/ws")
    print("✓ Connected 3 WebSocket clients (Cashier, Kitchen, Customer)")

    # 1. Cashier creates order via REST
    async with httpx.AsyncClient() as client:
        create_resp = await client.post("http://127.0.0.1:8000/api/orders", json={
            "customer_name": "E2E Test User",
            "items": ["Double Bacon Burger", "Truffle Fries"]
        })
        assert create_resp.status_code == 201
        order = create_resp.json()
        order_id = order["id"]
        version = order["version"]
        print(f"✓ Cashier created order {order_id} (version: {version})")

    # All 3 clients should receive order_created event
    msg_cashier = json.loads(await ws_cashier.recv())
    msg_kitchen = json.loads(await ws_kitchen.recv())
    msg_customer = json.loads(await ws_customer.recv())

    assert msg_cashier["event"] == "order_created" and msg_cashier["data"]["id"] == order_id
    assert msg_kitchen["event"] == "order_created" and msg_kitchen["data"]["id"] == order_id
    assert msg_customer["event"] == "order_created" and msg_customer["data"]["id"] == order_id
    print("✓ All 3 WebSocket clients received order_created event simultaneously!")

    # 2. Kitchen advances status from New -> Preparing (version 1 -> 2)
    async with httpx.AsyncClient() as client:
        patch_resp = await client.patch(f"http://127.0.0.1:8000/api/orders/{order_id}/status", json={
            "status": "Preparing",
            "version": 1
        })
        assert patch_resp.status_code == 200
        updated = patch_resp.json()
        assert updated["status"] == "Preparing"
        assert updated["version"] == 2
        print(f"✓ Kitchen advanced status to Preparing (new version: {updated['version']})")

    # All 3 clients receive order_updated event
    msg_cashier2 = json.loads(await ws_cashier.recv())
    msg_kitchen2 = json.loads(await ws_kitchen.recv())
    msg_customer2 = json.loads(await ws_customer.recv())

    assert msg_cashier2["data"]["status"] == "Preparing"
    assert msg_kitchen2["data"]["status"] == "Preparing"
    assert msg_customer2["data"]["status"] == "Preparing"
    print("✓ All 3 WebSocket clients received status update to Preparing!")

    # 3. Simulate Concurrent Simultaneous Updates (Conflict Handling)
    # Two clients both send status=Ready with version=2 at the exact same moment
    print("Testing simultaneous concurrent updates with version 2...")
    async with httpx.AsyncClient() as client:
        req1 = client.patch(f"http://127.0.0.1:8000/api/orders/{order_id}/status", json={
            "status": "Ready",
            "version": 2
        })
        req2 = client.patch(f"http://127.0.0.1:8000/api/orders/{order_id}/status", json={
            "status": "Ready",
            "version": 2
        })
        resp1, resp2 = await asyncio.gather(req1, req2)

    status_codes = sorted([resp1.status_code, resp2.status_code])
    assert status_codes == [200, 409], f"Expected [200, 409], got {status_codes}"
    conflict_resp = resp1 if resp1.status_code == 409 else resp2
    conflict_json = conflict_resp.json()
    assert "Conflict" in conflict_json["detail"]
    assert conflict_json["current_order"]["version"] == 3
    assert conflict_json["current_order"]["status"] == "Ready"
    print(f"✓ Concurrency test passed: Exactly one update succeeded (200), and stale update was rejected with HTTP 409 Conflict!")
    print(f"✓ Conflict response contained current order state (version {conflict_json['current_order']['version']})")

    # Advance Ready -> Served
    async with httpx.AsyncClient() as client:
        served_resp = await client.patch(f"http://127.0.0.1:8000/api/orders/{order_id}/status", json={
            "status": "Served",
            "version": 3
        })
        assert served_resp.status_code == 200
        print("✓ Order advanced to final state: Served (version: 4)")

    # Clean up WebSockets
    await ws_cashier.close()
    await ws_kitchen.close()
    await ws_customer.close()
    print("--- E2E Multi-User Live Simulation Successfully Completed! ---")

if __name__ == "__main__":
    asyncio.run(run_e2e_simulation())

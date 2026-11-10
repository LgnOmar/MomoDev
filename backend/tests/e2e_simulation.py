import asyncio
import httpx
import websockets
import json

async def run_e2e_simulation():
    print("--- Starting Extended E2E Multi-User Live Simulation ---")
    
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

    # 1. Customer browses menu
    async with httpx.AsyncClient() as client:
        menu_resp = await client.get("http://127.0.0.1:8000/api/menu")
        assert menu_resp.status_code == 200
        menu = menu_resp.json()
        assert len(menu) == 20
        print(f"✓ Customer retrieved structured menu ({len(menu)} categories across 3 meal periods)")

    # 2. Customer submits self-service order in Algerian Dinars (DA)
    # ITEM-B-101: Jus d'orange (350 DA * 2 = 700 DA)
    # ITEM-B-401: Chakchouka (750 DA * 1 = 750 DA) -> Total: 1450.0 DA
    async with httpx.AsyncClient() as client:
        create_resp = await client.post("http://127.0.0.1:8000/api/orders", json={
            "customer_name": "Farid Haddad",
            "items": [
                {"menu_item_id": "ITEM-B-101", "quantity": 2},
                {"menu_item_id": "ITEM-B-401", "quantity": 1},
            ]
        })
        assert create_resp.status_code == 201
        order = create_resp.json()
        order_id = order["id"]
        assert order["total_price"] == 1450.0
        print(f"✓ Customer placed self-service order {order_id} (Total: {order['total_price']:.0f} DA, v{order['version']})")

    # All 3 clients should receive order_created event
    msg_cashier = json.loads(await ws_cashier.recv())
    msg_kitchen = json.loads(await ws_kitchen.recv())
    msg_customer = json.loads(await ws_customer.recv())

    assert msg_cashier["event"] == "order_created" and msg_cashier["data"]["id"] == order_id
    assert msg_kitchen["event"] == "order_created" and msg_kitchen["data"]["id"] == order_id
    assert msg_customer["event"] == "order_created" and msg_customer["data"]["id"] == order_id
    print("✓ Cashier, Kitchen, and Customer received new order event simultaneously via WebSocket!")

    # 3. Cashier toggles an item's availability (ITEM-L-201: Couscous Royal)
    async with httpx.AsyncClient() as client:
        toggle_resp = await client.patch("http://127.0.0.1:8000/api/menu/items/ITEM-L-201/availability", json={
            "is_available": False
        })
        assert toggle_resp.status_code == 200
        print("✓ Cashier marked 'ITEM-L-201' (Couscous Royal) as unavailable in SQLite")

    # All 3 clients should receive menu_item_updated event
    menu_msg1 = json.loads(await ws_cashier.recv())
    menu_msg2 = json.loads(await ws_kitchen.recv())
    menu_msg3 = json.loads(await ws_customer.recv())

    assert menu_msg3["event"] == "menu_item_updated"
    assert menu_msg3["data"]["id"] == "ITEM-L-201"
    assert menu_msg3["data"]["is_available"] is False
    print("✓ Customer screen immediately received 'menu_item_updated' broadcast without refresh!")

    # Verify backend rejects order for this newly unavailable item
    async with httpx.AsyncClient() as client:
        reject_resp = await client.post("http://127.0.0.1:8000/api/orders", json={
            "customer_name": "Client En Retard",
            "items": [{"menu_item_id": "ITEM-L-201", "quantity": 1}]
        })
        assert reject_resp.status_code == 400
        print("✓ Backend successfully rejected order containing the unavailable item!")

    # Restore item availability
    async with httpx.AsyncClient() as client:
        await client.patch("http://127.0.0.1:8000/api/menu/items/ITEM-L-201/availability", json={
            "is_available": True
        })
    # Drain restore messages
    await ws_cashier.recv()
    await ws_kitchen.recv()
    await ws_customer.recv()

    # 4. Kitchen advances order: New -> Preparing (version 1 -> 2)
    async with httpx.AsyncClient() as client:
        patch_resp = await client.patch(f"http://127.0.0.1:8000/api/orders/{order_id}/status", json={
            "status": "Preparing",
            "version": 1
        })
        assert patch_resp.status_code == 200
        print(f"✓ Kitchen advanced {order_id} to Preparing (v2)")

    # Receive update
    u_c = json.loads(await ws_customer.recv())
    assert u_c["data"]["status"] == "Preparing"
    await ws_cashier.recv()
    await ws_kitchen.recv()

    # 5. OCC Concurrency test on order
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
    print("✓ Concurrency check: Exactly one succeeded (200), stale update rejected with 409 Conflict!")

    # Clean up WebSockets
    await ws_cashier.close()
    await ws_kitchen.close()
    await ws_customer.close()
    print("--- Extended E2E Live Simulation Completed Successfully! ---")

if __name__ == "__main__":
    asyncio.run(run_e2e_simulation())

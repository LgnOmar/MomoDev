const BASE_URL = '';

export async function fetchOrders() {
  const res = await fetch(`${BASE_URL}/api/orders`);
  if (!res.ok) {
    throw new Error(`Failed to fetch orders: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchOrderById(orderId) {
  const res = await fetch(`${BASE_URL}/api/orders/${encodeURIComponent(orderId)}`);
  if (res.status === 404) {
    return null;
  }
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to fetch order: ${res.statusText}`);
  }
  return res.json();
}

export async function createOrder({ customer_name, items }) {
  const res = await fetch(`${BASE_URL}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customer_name, items }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const message = errorData.detail 
      ? (Array.isArray(errorData.detail) ? errorData.detail.map(e => e.msg).join(', ') : errorData.detail)
      : `Failed to create order (${res.status})`;
    throw new Error(message);
  }

  return res.json();
}

export async function updateOrderStatus(orderId, { status, version }) {
  const res = await fetch(`${BASE_URL}/api/orders/${encodeURIComponent(orderId)}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, version }),
  });

  if (res.status === 409) {
    const conflictData = await res.json();
    return {
      success: false,
      conflict: true,
      detail: conflictData.detail,
      currentOrder: conflictData.current_order,
    };
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const message = errorData.detail || `Failed to update status (${res.status})`;
    return {
      success: false,
      conflict: false,
      error: message,
    };
  }

  const updatedOrder = await res.json();
  return {
    success: true,
    conflict: false,
    order: updatedOrder,
  };
}

export async function fetchMenu() {
  const res = await fetch(`${BASE_URL}/api/menu`);
  if (!res.ok) {
    throw new Error(`Failed to fetch menu: ${res.statusText}`);
  }
  return res.json();
}

export async function updateMenuItemAvailability(itemId, isAvailable) {
  const res = await fetch(`${BASE_URL}/api/menu/items/${encodeURIComponent(itemId)}/availability`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_available: isAvailable }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to update item availability (${res.status})`);
  }

  return res.json();
}

export async function checkBackendHealth() {
  try {
    const res = await fetch(`${BASE_URL}/api/health`, { cache: 'no-store' });
    return res.ok;
  } catch {
    return false;
  }
}

from enum import Enum
from typing import List, Optional, Union
from pydantic import BaseModel, Field, field_validator

class OrderStatus(str, Enum):
    NEW = "New"
    PREPARING = "Preparing"
    READY = "Ready"
    SERVED = "Served"

# Strictly defined single-step transitions
VALID_TRANSITIONS = {
    OrderStatus.NEW: OrderStatus.PREPARING,
    OrderStatus.PREPARING: OrderStatus.READY,
    OrderStatus.READY: OrderStatus.SERVED,
}

# --- Menu Models ---
class MenuItemResponse(BaseModel):
    id: str
    category_id: str
    name: str
    description: str
    price: float
    is_available: bool

class MenuCategoryResponse(BaseModel):
    id: str
    meal_period: str
    name: str
    display_order: int
    items: List[MenuItemResponse] = []

class MenuItemAvailabilityUpdate(BaseModel):
    is_available: bool

# --- Order Models ---
class CustomerOrderItemInput(BaseModel):
    menu_item_id: str = Field(..., min_length=1)
    quantity: int = Field(..., ge=1, description="Quantity must be at least 1")

class OrderItemSnapshot(BaseModel):
    menu_item_id: Optional[str] = None
    name: str
    unit_price: float
    quantity: int
    line_total: float

class OrderCreate(BaseModel):
    customer_name: str = Field(..., min_length=1, max_length=100, description="Name of customer")
    items: Union[List[CustomerOrderItemInput], List[str]] = Field(
        ..., min_length=1, description="List of menu item selections or legacy item names"
    )

    @field_validator("customer_name")
    def validate_name(cls, v: str) -> str:
        trimmed = v.strip()
        if not trimmed:
            raise ValueError("Customer name cannot be blank")
        return trimmed

class OrderStatusUpdate(BaseModel):
    status: OrderStatus = Field(..., description="Target next status")
    version: int = Field(..., ge=1, description="Order version known by client (for Optimistic Concurrency Control)")

class OrderResponse(BaseModel):
    id: str
    customer_name: str
    items: List[OrderItemSnapshot]
    total_price: float = 0.0
    status: OrderStatus
    created_at: str
    version: int

class OrderConflictResponse(BaseModel):
    detail: str
    current_order: OrderResponse

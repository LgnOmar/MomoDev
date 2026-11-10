from enum import Enum
from typing import List, Optional
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

class OrderCreate(BaseModel):
    customer_name: str = Field(..., min_length=1, max_length=100, description="Name of the customer")
    items: List[str] = Field(..., min_length=1, description="List of ordered item descriptions")

    @field_validator("customer_name")
    def validate_name(cls, v: str) -> str:
        trimmed = v.strip()
        if not trimmed:
            raise ValueError("Customer name cannot be blank")
        return trimmed

    @field_validator("items")
    def validate_items(cls, v: List[str]) -> List[str]:
        cleaned = [item.strip() for item in v if item and item.strip()]
        if not cleaned:
            raise ValueError("Order must contain at least one non-empty item")
        return cleaned

class OrderStatusUpdate(BaseModel):
    status: OrderStatus = Field(..., description="Target next status")
    version: int = Field(..., ge=1, description="Order version known by client (for Optimistic Concurrency Control)")

class OrderResponse(BaseModel):
    id: str
    customer_name: str
    items: List[str]
    status: OrderStatus
    created_at: str
    version: int

class OrderConflictResponse(BaseModel):
    detail: str
    current_order: OrderResponse

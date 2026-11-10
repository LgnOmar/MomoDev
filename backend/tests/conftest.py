import os
import sys
import tempfile
import pytest

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from app.database import init_db
import app.database as database
from app.main import app

@pytest.fixture(autouse=True)
def test_db():
    """Create an isolated temporary SQLite database for each test session/function."""
    temp_dir = tempfile.mkdtemp()
    test_db_path = os.path.join(temp_dir, "test_restaurant.db")
    
    # Override database path
    original_path = database.DB_PATH
    database.DB_PATH = test_db_path
    
    init_db(test_db_path)
    
    yield test_db_path
    
    # Restore and cleanup
    database.DB_PATH = original_path
    try:
        if os.path.exists(test_db_path):
            os.remove(test_db_path)
    except Exception:
        pass

@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client

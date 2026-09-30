import sys
from pathlib import Path
import uuid
import pytest

from fastapi.testclient import TestClient

@pytest.fixture
def test_user():
    return {
        "email": "pytest_user@example.com",
        "password": "Test@12345"
    }

sys.path.append(str(Path(__file__).resolve().parents[1] / "backend"))

from app.main import app


client = TestClient(app)


def test_app_is_running():
    response = client.get("/docs")

    assert response.status_code == 200


def test_register_user():
    user_data = {
        "full_name": "Test User",
        "date_of_birth": "2000-01-01",
        "phone_number": "9876543210",
        "email": f"pytest_{uuid.uuid4().hex[:8]}@example.com",
        "password": "Test@12345",
        "address": "Rajkot"
    }

    response = client.post(
        "/users",
        json=user_data
    )

    assert response.status_code == 201


def test_login_user(test_user):
    response = client.post(
        "/login",
        json=test_user
    )

    assert response.status_code == 200

    data = response.json()

    assert "access_token" in data
    assert data["token_type"] == "bearer"

def test_profile_requires_authentication():
    response = client.get("/profile")

    assert response.status_code == 401

def test_profile_with_valid_token(test_user):
    login_response = client.post(
        "/login",
        json=test_user
    )

    assert login_response.status_code == 200

    token = login_response.json()["access_token"]

    response = client.get(
        "/profile",
        headers={
            "Authorization": f"Bearer {token}"
        }
    )

    assert response.status_code == 200

def test_profile_with_invalid_token():
    response = client.get(
        "/profile",
        headers={
            "Authorization": "Bearer this-is-not-a-real-jwt"
        }
    )

    assert response.status_code == 401

def test_create_account(test_user):
    login_response = client.post(
        "/login",
        json=test_user
    )

    assert login_response.status_code == 200

    token = login_response.json()["access_token"]

    account_data = {
        "account_type": "SAVINGS"
    }

    response = client.post(
        "/accounts",
        json=account_data,
        headers={
            "Authorization": f"Bearer {token}"
        }
    )

    assert response.status_code == 201

    data = response.json()

    assert "account_number" in data
    assert data["account_type"] == "SAVINGS"
    assert data["status"] == "ACTIVE"

def test_create_account_invalid_type(test_user):
    login_response = client.post(
        "/login",
        json=test_user
    )

    assert login_response.status_code == 200

    token = login_response.json()["access_token"]

    account_data = {
        "account_type": "INVALID"
    }

    response = client.post(
        "/accounts",
        json=account_data,
        headers={
            "Authorization": f"Bearer {token}"
        }
    )

    assert response.status_code == 400

def test_deposit(test_user):
    # Login
    login_response = client.post(
        "/login",
        json=test_user
    )

    assert login_response.status_code == 200

    token = login_response.json()["access_token"]

    # Get user's accounts
    accounts_response = client.get(
        "/accounts",
        headers={
            "Authorization": f"Bearer {token}"
        }
    )

    assert accounts_response.status_code == 200

    accounts = accounts_response.json()["accounts"]

    assert len(accounts) > 0

    account_id = accounts[0]["account_id"]

    # Deposit
    deposit_data = {
        "account_id": account_id,
        "amount": 100
    }

    response = client.post(
        "/deposit",
        json=deposit_data,
        headers={
            "Authorization": f"Bearer {token}"
        }
    )

    assert response.status_code == 200

def test_deposit_invalid_amount(test_user):
    # Login
    login_response = client.post(
        "/login",
        json=test_user
    )

    assert login_response.status_code == 200

    token = login_response.json()["access_token"]

    # Get account
    accounts_response = client.get(
        "/accounts",
        headers={
            "Authorization": f"Bearer {token}"
        }
    )

    assert accounts_response.status_code == 200

    accounts = accounts_response.json()["accounts"]
    assert len(accounts) > 0

    account_id = accounts[0]["account_id"]

    # Invalid deposit
    deposit_data = {
        "account_id": account_id,
        "amount": 0
    }

    response = client.post(
        "/deposit",
        json=deposit_data,
        headers={
            "Authorization": f"Bearer {token}"
        }
    )

    assert response.status_code == 422

def test_withdraw(test_user):
    # Login
    login_response = client.post(
        "/login",
        json=test_user
    )

    assert login_response.status_code == 200

    token = login_response.json()["access_token"]

    # Get account
    accounts_response = client.get(
        "/accounts",
        headers={
            "Authorization": f"Bearer {token}"
        }
    )

    assert accounts_response.status_code == 200

    accounts = accounts_response.json()["accounts"]
    assert len(accounts) > 0

    account_id = accounts[0]["account_id"]

    # Withdraw
    withdraw_data = {
        "account_id": account_id,
        "amount": 50
    }

    response = client.post(
        "/Withdraw",
        json=withdraw_data,
        headers={
            "Authorization": f"Bearer {token}"
        }
    )

    assert response.status_code == 200

def test_withdraw_insufficient_balance(test_user):
    # Login
    login_response = client.post(
        "/login",
        json=test_user
    )

    assert login_response.status_code == 200

    token = login_response.json()["access_token"]

    # Get account
    accounts_response = client.get(
        "/accounts",
        headers={
            "Authorization": f"Bearer {token}"
        }
    )

    assert accounts_response.status_code == 200

    accounts = accounts_response.json()["accounts"]
    assert len(accounts) > 0

    account_id = accounts[0]["account_id"]

    # Try to withdraw a very large amount
    withdraw_data = {
        "account_id": account_id,
        "amount": 999999999
    }

    response = client.post(
        "/Withdraw",
        json=withdraw_data,
        headers={
            "Authorization": f"Bearer {token}"
        }
    )

    assert response.status_code == 400

def test_transfer(test_user):
    # Login
    login_response = client.post(
        "/login",
        json=test_user
    )

    assert login_response.status_code == 200

    token = login_response.json()["access_token"]

    headers = {
        "Authorization": f"Bearer {token}"
    }

    # Get existing accounts
    accounts_response = client.get(
        "/accounts",
        headers=headers
    )

    assert accounts_response.status_code == 200

    accounts = accounts_response.json()["accounts"]

    # We need at least two accounts
    assert len(accounts) >= 2

    sender_id = accounts[0]["account_id"]
    receiver_id = accounts[1]["account_id"]

    # Transfer
    transfer_data = {
        "sender_account_id": sender_id,
        "receiver_account_id": receiver_id,
        "amount": 50
    }

    response = client.post(
        "/Transfer",
        json=transfer_data,
        headers=headers
    )

    assert response.status_code == 200

def test_transfer_same_account(test_user):
    # Login
    login_response = client.post(
        "/login",
        json=test_user
    )

    assert login_response.status_code == 200

    token = login_response.json()["access_token"]

    headers = {
        "Authorization": f"Bearer {token}"
    }

    # Get account
    accounts_response = client.get(
        "/accounts",
        headers=headers
    )

    assert accounts_response.status_code == 200

    accounts = accounts_response.json()["accounts"]
    assert len(accounts) > 0

    account_id = accounts[0]["account_id"]

    # Transfer to the same account
    transfer_data = {
        "sender_account_id": account_id,
        "receiver_account_id": account_id,
        "amount": 50
    }

    response = client.post(
        "/Transfer",
        json=transfer_data,
        headers=headers
    )

    assert response.status_code == 400


def test_transfer_invalid_amount(test_user):
    login_response = client.post("/login", json=test_user)
    assert login_response.status_code == 200

    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    accounts_response = client.get("/accounts", headers=headers)
    assert accounts_response.status_code == 200

    accounts = accounts_response.json()["accounts"]
    assert len(accounts) >= 2

    sender_id = accounts[0]["account_id"]
    receiver_id = accounts[1]["account_id"]

    response = client.post(
        "/Transfer",
        json={
            "sender_account_id": sender_id,
            "receiver_account_id": receiver_id,
            "amount": 0
        },
        headers=headers
    )

    assert response.status_code == 422

def test_transfer_insufficient_balance(test_user):
    login_response = client.post("/login", json=test_user)
    assert login_response.status_code == 200

    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    accounts_response = client.get("/accounts", headers=headers)
    assert accounts_response.status_code == 200

    accounts = accounts_response.json()["accounts"]
    assert len(accounts) >= 2

    sender_id = accounts[0]["account_id"]
    receiver_id = accounts[1]["account_id"]

    response = client.post(
        "/Transfer",
        json={
            "sender_account_id": sender_id,
            "receiver_account_id": receiver_id,
            "amount": 999999999
        },
        headers=headers
    )

    assert response.status_code == 400

def test_transaction_history(test_user):
    login_response = client.post("/login", json=test_user)
    assert login_response.status_code == 200

    token = login_response.json()["access_token"]

    response = client.get(
        "/Transactions",
        headers={
            "Authorization": f"Bearer {token}"
        }
    )

    assert response.status_code == 200

    data = response.json()

    assert "transactions" in data
    assert "page" in data
    assert "limit" in data

def test_profile(test_user):
    login_response = client.post("/login", json=test_user)
    assert login_response.status_code == 200

    token = login_response.json()["access_token"]

    response = client.get(
        "/profile",
        headers={
            "Authorization": f"Bearer {token}"
        }
    )

    assert response.status_code == 200

    data = response.json()

    assert "user_id" in data
    assert "email" in data
    assert "full_name" in data

def test_get_accounts(test_user):
    login_response = client.post("/login", json=test_user)
    assert login_response.status_code == 200

    token = login_response.json()["access_token"]

    response = client.get(
        "/accounts",
        headers={
            "Authorization": f"Bearer {token}"
        }
    )

    assert response.status_code == 200

    data = response.json()

    assert "accounts" in data
    assert isinstance(data["accounts"], list)

def test_customer_cannot_access_admin_dashboard(test_user):
    login_response = client.post("/login", json=test_user)
    assert login_response.status_code == 200

    token = login_response.json()["access_token"]

    response = client.get(
        "/admin/dashboard",
        headers={
            "Authorization": f"Bearer {token}"
        }
    )

    assert response.status_code == 403
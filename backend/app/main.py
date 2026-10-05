from fastapi import FastAPI , HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel,Field
from app.database import get_connection
import bcrypt
from jose import jwt,JWTError
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Optional
from mysql.connector import IntegrityError
import secrets
import os
from dotenv import load_dotenv
load_dotenv()





security=HTTPBearer()
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
    "http://127.0.0.1:5500",
    "http://localhost:5500",
    "https://smart-banking-system-1-1z08.onrender.com"
],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# create a Pydantic model for user registration
class UserRegistration(BaseModel):
    full_name: str
    date_of_birth: str
    phone_number: str
    email: str
    password: str
    address: str


# creating a pydantic model for user login
class Userlogin(BaseModel):
     email: str
     password: str



# create a function to generate JWT token
def create_access_token(user_id: int):
    payload={
        "user_id":user_id,
        "exp":datetime.utcnow() + timedelta(minutes=30)
    }
    token=jwt.encode(
        payload,
        SECRET_KEY,
        algorithm=ALGORITHM
    )
    return token


# create a authentication dependency to verify the JWT token
def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )
        user_id: int = payload.get("user_id")

        if user_id is None:
            raise HTTPException(
                status_code=401,
                detail="Invalid token"
            )
        return user_id
    except JWTError:
        raise HTTPException(
            status_code=401,
            detail="Invalid token"
        )


def get_current_admin(
    user_id: int = Depends(get_current_user)
):
    connection = get_connection()
    cursor = connection.cursor()

    try:
        cursor.execute(
            """
            SELECT role
            FROM users
            WHERE user_id = %s
            """,
            (user_id,)
        )

        result = cursor.fetchone()

        if result is None:
            raise HTTPException(
                status_code=404,
                detail="User not found"
            )

        role = result[0]

        if role != "ADMIN":
            raise HTTPException(
                status_code=403,
                detail="Admin access required"
            )

        return user_id

    finally:
        cursor.close()
        connection.close()



# to create a new bank for a new user
class AccountCreate(BaseModel):
    account_type: str



# deposit money
class DepositRequest(BaseModel):
    account_id:int
    amount:Decimal = Field(gt=0)

class WithdrawRequest(BaseModel):
    account_id:int
    amount:Decimal = Field(gt=0)

class TransferRequest(BaseModel):
    sender_account_id:int
    receiver_account_id:int
    amount:Decimal = Field(gt=0)

class ProfileUpdate(BaseModel):
    phone_number: str
    address: str




@app.get("/")
def home():
    return {"message": "Smart Banking API is running"}


@app.post("/users",status_code=201)
def registration(user: UserRegistration):

    connection = get_connection()
    cursor = connection.cursor()

    
    
    try:


        # check duplicate email
        cursor.execute(
            "SELECT user_id FROM users WHERE email=%s",(user.email,)
        )
        existing_user=cursor.fetchone()

        if existing_user is not None:
            raise HTTPException(
                status_code=409,
                detail="Email already registered"
            )


    
        # hash the password
        password_hash = bcrypt.hashpw(
            user.password.encode("utf-8"),
            bcrypt.gensalt()
        )


        query = """
        INSERT INTO users
        (full_name, date_of_birth, phone_number, email,
         password_hash, address)
        VALUES (%s, %s, %s, %s, %s, %s)
        """

        values = (
            user.full_name,
            user.date_of_birth,
            user.phone_number,
            user.email,
            password_hash.decode("utf-8"),
            user.address
        )

        cursor.execute(query, values)

        connection.commit()
        return {
            "message": "User created successfully"
        }

    except HTTPException:
            raise

    
    except Exception as e:
        connection.rollback()

        raise HTTPException(
            status_code=500,
            detail="User creation failed"
        )

    finally:
        cursor.close()
        connection.close()




@app.post("/login")
def login(user: Userlogin):

    connection=get_connection()
    cursor=connection.cursor()

    try:
        cursor.execute(
            """
            SELECT user_id,
            password_hash
            FROM users
            WHERE email=%s
            """,
            (user.email,)
        )
        result=cursor.fetchone()

        if result is None:
            raise HTTPException(
                status_code=401,
                detail="Invalid email or password"
            )

        user_id, stored_hash=result

        password_correct=bcrypt.checkpw(
            user.password.encode("utf-8"),
            stored_hash.encode("utf-8")
        )

        if not password_correct:
            raise HTTPException(
                status_code=401,
                detail="Invalid email or password"
            )
        access_token = create_access_token(user_id)

        return {
            "message": "Login successful",
            "access_token": access_token,
            "token_type": "bearer"
        }
    finally:
        cursor.close()
        connection.close()










@app.post("/accounts", status_code=201)
def create_account(
    request: AccountCreate,
    user_id: int = Depends(get_current_user)
):
    connection = get_connection()
    cursor = connection.cursor()

    try:
        # Convert input to uppercase
        account_type = request.account_type.upper()

        # Validate account type
        if account_type not in ["SAVINGS", "CURRENT"]:
            raise HTTPException(
                status_code=400,
                detail="Account type must be SAVINGS or CURRENT"
            )

        # Generate 10-digit account number
        account_number = str(
            secrets.randbelow(9000000000) + 1000000000
        )

        # Insert account
        cursor.execute(
            """
            INSERT INTO accounts
            (
                user_id,
                account_number,
                account_type,
                balance,
                status
            )
            VALUES (%s, %s, %s, %s, %s)
            """,
            (
                user_id,
                account_number,
                account_type,
                0.00,
                "ACTIVE"
            )
        )

        # Save changes
        connection.commit()

        return {
            "message": "Account created successfully",
            "account_number": account_number,
            "account_type": account_type,
            "balance": 0.00,
            "status": "ACTIVE"
        }

    except HTTPException:
        connection.rollback()
        raise

    except IntegrityError:
        connection.rollback()

        raise HTTPException(
            status_code=409,
            detail="Account number already exists"
        )

    except Exception as e:
        connection.rollback()

        print("ACCOUNT CREATION ERROR:", e)

        raise HTTPException(
            status_code=500,
            detail="Account creation failed"
        )

    finally:
        cursor.close()
        connection.close()








@app.get("/accounts")
def get_account(user_id:int=Depends(get_current_user)):
    connection = get_connection()
    cursor = connection.cursor(dictionary=True)

    try:
        cursor.execute(
            """
            SELECT account_id, account_number,
                   account_type, balance, status
            FROM accounts
            WHERE user_id = %s
            """,
            (user_id,)
        )

        accounts = cursor.fetchall()

        return {
            "user_id": user_id,
            "accounts": accounts
        }

    finally:
        cursor.close()
        connection.close()


@app.post("/deposit")
def deposit(request:DepositRequest,user_id:int=Depends(get_current_user)):
    connection=get_connection()
    cursor=connection.cursor()

    try:
        if request.amount <= 0:
            raise HTTPException(
                status_code=400,
                detail="Deposit amount must be greater than zero"
            )
        cursor.execute(
            """
            SELECT balance,status
            FROM accounts
            WHERE account_id=%s
            AND user_id=%s
            FOR UPDATE
            """,(request.account_id,user_id)
        )
        account=cursor.fetchone()

        if account is None:
            raise HTTPException(
                status_code=404,
                detail="Account not found"
            )
        balance,status=account

        if status !="ACTIVE":
            raise HTTPException(
                status_code=400,
                detail="Account is not active"
            )
        
        cursor.execute(
            """
            UPDATE accounts
            SET balance = balance + %s
            WHERE account_id = %s
            """,
            (request.amount, request.account_id)
        )
        cursor.execute(
            """
            INSERT INTO transactions
            (
                sender_account_id,
                receiver_account_id,
                amount,
                transaction_type,
                status
            )
            VALUES (%s, %s, %s, %s, %s)
            """,
            (
                None,
                request.account_id,
                request.amount,
                "DEPOSIT",
                "COMPLETED"
            )
        )
        connection.commit()

        return {
            "message": "Deposit successful",
            "account_id": request.account_id,
            "amount": request.amount
        }
    except HTTPException:
        connection.rollback()
        raise

    except Exception:
        connection.rollback()

        raise HTTPException(
            status_code=500,
            detail="Deposit failed"
        )
    finally:
        cursor.close()
        connection.close()


@app.post("/Withdraw")
def withdraw(request:WithdrawRequest,user_id:int=Depends(get_current_user)):
    connection=get_connection()
    cursor=connection.cursor()

    try:
        if request.amount<=0:
            raise HTTPException(
                status_code=400,
                detail="withdraw  amount must be greater than zero"
            )
        cursor.execute(
            """
            SELECT balance,status
            FROM accounts
            WHERE account_id=%s
            AND user_id=%s
            FOR UPDATE
            """,(request.account_id,user_id)
        )
        account=cursor.fetchone()

        if account is None:
            raise HTTPException(
                status_code=404,
                detail="Account not found"
            )
        balance,status=account

        if status !="ACTIVE":
            raise HTTPException(
                status_code=400,
                detail="Account is not active"
            )
        if request.amount>balance:
            raise HTTPException(
                status_code=400,
                detail="insufficient balance"
            )
        cursor.execute(
            """
            UPDATE accounts
            SET balance = balance - %s
            WHERE account_id = %s
            """,
            (request.amount, request.account_id)
        )
        cursor.execute(
            """
            INSERT INTO transactions
            (
                sender_account_id,
                receiver_account_id,
                amount,
                transaction_type,
                status
            )
            VALUES (%s, %s, %s, %s, %s)
            """,
            (
                request.account_id,
                None,
                request.amount,
                "WITHDRAW",
                "COMPLETED"
            )
        )
        connection.commit()

        return {
            "message": "Withdraw successful",
            "account_id": request.account_id,
            "amount": request.amount
        }
    except HTTPException:
        connection.rollback()
        raise
    except Exception:
            connection.rollback()
    
            raise HTTPException(
                status_code=500,
                detail="Withraw failed"
            )
    finally:
            cursor.close()
            connection.close()



@app.post("/Transfer")
def transfer(request:TransferRequest,user_id:int=Depends(get_current_user)):
    connection=get_connection()
    cursor=connection.cursor()

    try:
        if request.amount <= 0:
            raise HTTPException(
            status_code=400,
            detail="Transfer amount must be greater than zero"
            )
        
        if request.sender_account_id == request.receiver_account_id:
            raise HTTPException(
                status_code=400,
                detail="sender and receiver account cannot be same "
            )
        cursor.execute(
                    """
                    SELECT balance,status,user_id
                    FROM accounts
                    WHERE account_id=%s
                    AND user_id=%s
                    FOR UPDATE
                    """,(request.sender_account_id,user_id)
                )
        sender_account=cursor.fetchone()
        
        if sender_account is None:
            raise HTTPException(
                status_code=404,
                detail="sender Account not found"
            )
        sender_balance,sender_status,sender_user_id=sender_account

        if sender_user_id!=user_id:
            raise HTTPException(
                status_code=403,
                detail="you are not allowed to use this account"
            )
        
        if sender_status !="ACTIVE":
            raise HTTPException(
                status_code=400,
                detail="sender account is not active "
            )

        if sender_balance<request.amount:
            raise HTTPException(
                status_code=400,
                detail="Insufficient balance"
            )
        cursor.execute(
            """
            SELECT status
            FROM accounts
            WHERE account_id = %s
            FOR UPDATE
            """,
            (request.receiver_account_id,)
        )   

        receiver_account = cursor.fetchone()
        if receiver_account is None:
            raise HTTPException(
            status_code=404,
            detail="Receiver account not found"
        )
        receiver_status=receiver_account[0]
        if receiver_status != "ACTIVE":
            raise HTTPException(
                status_code=400,
                detail="Receiver account is not active"
        )
        cursor.execute(
            """
            UPDATE accounts
            SET balance = balance - %s
            WHERE account_id = %s
            """,
            (request.amount, request.sender_account_id)
        )
        cursor.execute(
            """
            UPDATE accounts
            SET balance = balance + %s
            WHERE account_id = %s
            """,
            (request.amount, request.receiver_account_id)
        )
        cursor.execute(
            """
            INSERT INTO transactions
            (
                sender_account_id,
                receiver_account_id,
                amount,
                transaction_type,
                status
            )
            VALUES (%s, %s, %s, %s, %s)
            """,
            (
                request.sender_account_id,
                request.receiver_account_id,
                request.amount,
                "TRANSFER",
                "COMPLETED"
            )
        )
        connection.commit()
        return {
            "message": "Transfer successful",
            "sender_account_id": request.sender_account_id,
            "receiver_account_id": request.receiver_account_id,
            "amount": request.amount
        }
    except HTTPException:
        connection.rollback()
        raise

    except Exception as e:
        connection.rollback()

        print("TRANSFER ERROR:", e)

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

    finally:
        cursor.close()
        connection.close()




@app.get("/Transactions")
def get_transaction(
    page: int = 1,
    limit: int = 10,
    transaction_type: Optional[str] = None,
    user_id:int=Depends(get_current_user)
    ):
    connection=get_connection()
    cursor=connection.cursor(dictionary=True)

    try:
        if page < 1:
            raise HTTPException(
                status_code=400,
                detail="Page must be greater than 0"
            )

        if limit < 1 or limit > 100:
            raise HTTPException(
                status_code=400,
                detail="Limit must be between 1 and 100"
            )

        offset = (page - 1) * limit
        query = """
            SELECT
                transaction_id,
                sender_account_id,
                receiver_account_id,
                amount,
                transaction_type,
                status,
                created_at
            FROM transactions
            WHERE (
                sender_account_id IN (
                    SELECT account_id
                    FROM accounts
                    WHERE user_id = %s
                )
                OR receiver_account_id IN (
                    SELECT account_id
                    FROM accounts
                    WHERE user_id = %s
                )
            )
        """

        parameters = [user_id, user_id]

        if transaction_type is not None:
            query += " AND transaction_type = %s"
            parameters.append(transaction_type)

        query += """
            ORDER BY created_at DESC
            LIMIT %s OFFSET %s
        """

        parameters.extend([limit, offset])

        cursor.execute(query, tuple(parameters))

        transactions = cursor.fetchall()

        return {
            "page": page,
            "limit": limit,
            "transactions": transactions
        }

    finally:
        cursor.close()
        connection.close()



@app.get("/dashboard")
def dashboard(user_id:int=Depends(get_current_user)):
    connection=get_connection()
    cursor=connection.cursor(dictionary=True)
    try:
        # total balance and account count
        cursor.execute(
            """
                SELECT 
                count(*) AS account_count,
                COALESCE(SUM(balance),0) AS total_balance
                FROM accounts
                WHERE user_id=%s
            """,(user_id,)
        )
        account_summary=cursor.fetchone()

        # Total deposits
        cursor.execute(
            """
            SELECT COALESCE(SUM(amount), 0) AS total_deposits
            FROM transactions
            WHERE transaction_type = 'DEPOSIT'
            AND receiver_account_id IN (
                SELECT account_id
                FROM accounts
                WHERE user_id = %s
            )
            AND status = 'COMPLETED'
            """,
            (user_id,)
        )
        total_deposits = cursor.fetchone()["total_deposits"]

        # Total withdrawals
        cursor.execute(
            """
            SELECT COALESCE(SUM(amount), 0) AS total_withdrawals
            FROM transactions
            WHERE transaction_type = 'WITHDRAW'
            AND sender_account_id IN (
                SELECT account_id
                FROM accounts
                WHERE user_id = %s
            )
            AND status = 'COMPLETED'
            """,
            (user_id,)
        )
        total_withdrawals = cursor.fetchone()["total_withdrawals"]

        # Total transfers sent
        cursor.execute(
            """
            SELECT COALESCE(SUM(amount), 0) AS total_transfers
            FROM transactions
            WHERE transaction_type = 'TRANSFER'
            AND sender_account_id IN (
                SELECT account_id
                FROM accounts
                WHERE user_id = %s
            )
            AND status = 'COMPLETED'
            """,
            (user_id,)
        )
        total_transfers = cursor.fetchone()["total_transfers"]

        # Recent transactions
        cursor.execute(
            """
            SELECT
                transaction_id,
                sender_account_id,
                receiver_account_id,
                amount,
                transaction_type,
                status,
                created_at
            FROM transactions
            WHERE
                sender_account_id IN (
                    SELECT account_id
                    FROM accounts
                    WHERE user_id = %s
                )
                OR receiver_account_id IN (
                    SELECT account_id
                    FROM accounts
                    WHERE user_id = %s
                )
            ORDER BY created_at DESC
            LIMIT 5
            """,
            (user_id, user_id)
        )

        recent_transactions = cursor.fetchall()

        return {
            "account_count": account_summary["account_count"],
            "total_balance": account_summary["total_balance"],
            "total_deposits": total_deposits,
            "total_withdrawals": total_withdrawals,
            "total_transfers": total_transfers,
            "recent_transactions": recent_transactions
        }

    finally:
        cursor.close()
        connection.close()


@app.get("/receiver/{account_number}")
def get_receiver_account(
    account_number: str,
    user_id: int = Depends(get_current_user)
):
    connection = get_connection()
    cursor = connection.cursor(dictionary=True)

    try:
        cursor.execute(
            """
            SELECT account_id, account_number, account_type, status
            FROM accounts
            WHERE account_number = %s
            """,
            (account_number,)
        )

        account = cursor.fetchone()

        if account is None:
            raise HTTPException(
                status_code=404,
                detail="Receiver account not found"
            )

        if account["status"] != "ACTIVE":
            raise HTTPException(
                status_code=400,
                detail="Receiver account is not active"
            )

        return account

    finally:
        cursor.close()
        connection.close()


@app.get("/profile")
def profile(user_id: int = Depends(get_current_user)):

    connection = get_connection()
    cursor = connection.cursor(dictionary=True)

    try:

        cursor.execute(
            """
            SELECT
                user_id,
                full_name,
                date_of_birth,
                phone_number,
                email,
                address,
                role,
                created_at
            FROM users
            WHERE user_id = %s
            """,
            (user_id,)
        )

        user = cursor.fetchone()

        if user is None:
            raise HTTPException(
                status_code=404,
                detail="User not found"
            )

        return user

    finally:

        cursor.close()
        connection.close()


@app.put("/profile")
def update_profile(
    request: ProfileUpdate,
    user_id: int = Depends(get_current_user)
):
    connection = get_connection()
    cursor = connection.cursor()

    try:
        cursor.execute(
            """
            UPDATE users
            SET phone_number = %s,
                address = %s
            WHERE user_id = %s
            """,
            (
                request.phone_number,
                request.address,
                user_id
            )
        )

        connection.commit()

        return {
            "message": "Profile updated successfully"
        }

    except Exception as e:
        connection.rollback()
        print("PROFILE UPDATE ERROR:", e)
        raise HTTPException(
            status_code=500,
            detail="Profile update failed"
        )

    finally:
        cursor.close()
        connection.close()


@app.put("/accounts/{account_id}/deactivate")
def deactivate_account(
    account_id: int,
    user_id: int = Depends(get_current_user)
):
    connection = get_connection()
    cursor = connection.cursor()

    try:
        cursor.execute(
            """
            SELECT balance, status
            FROM accounts
            WHERE account_id = %s
            AND user_id = %s
            FOR UPDATE
            """,
            (account_id, user_id)
        )

        account = cursor.fetchone()

        if account is None:
            raise HTTPException(
                status_code=404,
                detail="Account not found"
            )

        balance, status = account

        if status != "ACTIVE":
            raise HTTPException(
                status_code=400,
                detail="Account is already inactive"
            )

        if balance != 0:
            raise HTTPException(
                status_code=400,
                detail="Account balance must be zero before deactivation"
            )

        cursor.execute(
            """
            UPDATE accounts
            SET status = 'INACTIVE'
            WHERE account_id = %s
            """,
            (account_id,)
        )

        connection.commit()

        return {
            "message": "Account deactivated successfully",
            "account_id": account_id
        }

    except HTTPException:
        connection.rollback()
        raise

    except Exception as e:
        connection.rollback()
        print("ACCOUNT DEACTIVATION ERROR:", e)

        raise HTTPException(
            status_code=500,
            detail="Account deactivation failed"
        )

    finally:
        cursor.close()
        connection.close()

@app.get("/admin/users")
def get_all_users(
    admin_id: int = Depends(get_current_admin)
):
    connection = get_connection()
    cursor = connection.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT
                u.user_id,
                u.full_name,
                u.email,
                u.phone_number,
                u.role,
                u.created_at,

                a.account_id,
                a.account_number,
                a.account_type,
                a.balance,
                a.status AS account_status

            FROM users u

            LEFT JOIN accounts a
                ON u.user_id = a.user_id

            ORDER BY u.user_id
        """)

        users = cursor.fetchall()

        return {
            "users": users
        }

    finally:
        cursor.close()
        connection.close()


@app.get("/admin/dashboard")
def admin_dashboard(
    admin_id: int = Depends(get_current_admin)
):
    connection = get_connection()
    cursor = connection.cursor(dictionary=True)

    try:

        # Total users
        cursor.execute("""
            SELECT COUNT(*) AS total_users
            FROM users
        """)
        total_users = cursor.fetchone()["total_users"]

        # Total accounts
        cursor.execute("""
            SELECT COUNT(*) AS total_accounts
            FROM accounts
        """)
        total_accounts = cursor.fetchone()["total_accounts"]

        # Total balance
        cursor.execute("""
            SELECT COALESCE(SUM(balance), 0) AS total_balance
            FROM accounts
            WHERE status = 'ACTIVE'
        """)
        total_balance = cursor.fetchone()["total_balance"]

        # Total transactions
        cursor.execute("""
            SELECT COUNT(*) AS total_transactions
            FROM transactions
        """)
        total_transactions = cursor.fetchone()["total_transactions"]

        # Total deposits
        cursor.execute("""
            SELECT COALESCE(SUM(amount), 0) AS total_deposits
            FROM transactions
            WHERE transaction_type = 'DEPOSIT'
            AND status = 'COMPLETED'
        """)
        total_deposits = cursor.fetchone()["total_deposits"]

        # Total withdrawals
        cursor.execute("""
            SELECT COALESCE(SUM(amount), 0) AS total_withdrawals
            FROM transactions
            WHERE transaction_type = 'WITHDRAW'
            AND status = 'COMPLETED'
        """)
        total_withdrawals = cursor.fetchone()["total_withdrawals"]

        return {
            "total_users": total_users,
            "total_accounts": total_accounts,
            "total_balance": total_balance,
            "total_transactions": total_transactions,
            "total_deposits": total_deposits,
            "total_withdrawals": total_withdrawals
        }

    finally:
        cursor.close()
        connection.close()



@app.get("/admin/transactions")
def get_all_transactions(
    admin_id: int = Depends(get_current_admin)
):
    connection = get_connection()
    cursor = connection.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT
                t.transaction_id,
                t.sender_account_id,
                t.receiver_account_id,
                t.amount,
                t.transaction_type,
                t.status,
                t.created_at
            FROM transactions t
            ORDER BY t.created_at DESC
        """)

        transactions = cursor.fetchall()

        return {
            "transactions": transactions
        }

    finally:
        cursor.close()
        connection.close()
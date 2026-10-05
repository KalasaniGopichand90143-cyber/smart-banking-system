# 🏦 Smart Banking & Transaction Management System

A full-stack banking application designed to simulate essential banking operations such as user registration, authentication, account management, deposits, withdrawals, transfers, transaction tracking, dashboard analytics, and administrative management.

The project was developed using **Python, FastAPI, MySQL, HTML, CSS, and JavaScript**, with cloud deployment using **Render and Aiven**.

---

## 🌐 Live Application

- **Frontend:** https://smart-banking-system-1-1z08.onrender.com
- **Backend API:** https://smart-banking-system-kymh.onrender.com
- **Swagger API Documentation:** https://smart-banking-system-kymh.onrender.com/docs
- **GitHub Repository:** https://github.com/KalasaniGopichand90143-cyber/smart-banking-system

---

## 📌 Project Overview

The Smart Banking & Transaction Management System is a web-based banking application that provides a secure environment for managing users, bank accounts, and financial transactions.

The system follows a client-server architecture where the frontend communicates with a RESTful FastAPI backend. The backend handles authentication, business logic, validation, database operations, and transaction processing.

The application uses MySQL for persistent data storage and is deployed using cloud services.

---

## ✨ Features

### 👤 User Management

- User registration
- User login
- JWT-based authentication
- Password hashing using bcrypt
- User profile management
- Role-based access control
- Customer and Admin roles

### 🏦 Account Management

- Create bank accounts
- Support for Savings and Current accounts
- Unique account numbers
- Account balance management
- Account status management
- View user-owned accounts

### 💰 Banking Operations

- Deposit money
- Withdraw money
- Transfer money between accounts
- Balance validation
- Insufficient balance checking
- Account ownership validation
- Transaction status tracking

### 📜 Transaction Management

- Transaction history
- Deposit records
- Withdrawal records
- Transfer records
- Transaction timestamps
- Transaction status
- Transaction type filtering
- Pagination support

### 📊 Dashboard

The dashboard provides:

- Total number of accounts
- Total balance
- Total deposits
- Total withdrawals
- Total transfers
- Recent transactions

### 👨‍💼 Admin Features

Administrators can access additional functionality including:

- Admin dashboard
- View users
- View transactions
- Administrative user management
- Role-based authorization

### 🔐 Security

- JWT authentication
- Password hashing with bcrypt
- Protected API endpoints
- Role-based authorization
- SQL injection prevention using parameterized queries
- Input validation using Pydantic
- Environment variables for sensitive configuration
- CORS configuration
- Database transaction rollback
- Account ownership verification

---

# 🛠️ Technology Stack

## Backend

- Python
- FastAPI
- Uvicorn
- Pydantic
- MySQL Connector/Python
- bcrypt
- python-jose
- python-dotenv

## Frontend

- HTML5
- CSS3
- JavaScript
- Fetch API

## Database

- MySQL 8
- Aiven Cloud MySQL

## Testing

- Pytest
- HTTPX
- FastAPI TestClient

## Deployment

- Render — Backend
- Render — Frontend
- Aiven — MySQL Database

## Version Control

- Git
- GitHub

---

# 🏗️ System Architecture

```text
                    ┌──────────────────────┐
                    │        User          │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │   Render Frontend    │
                    │   HTML/CSS/JavaScript│
                    └──────────┬───────────┘
                               │
                         HTTPS / JSON
                               │
                               ▼
                    ┌──────────────────────┐
                    │   FastAPI Backend    │
                    │       Render         │
                    ├──────────────────────┤
                    │ Authentication       │
                    │ Business Logic       │
                    │ Validation           │
                    │ Authorization        │
                    │ Transaction Handling │
                    └──────────┬───────────┘
                               │
                        MySQL Connector
                               │
                               ▼
                    ┌──────────────────────┐
                    │    Aiven MySQL       │
                    │   Cloud Database     │
                    ├──────────────────────┤
                    │ users                │
                    │ accounts             │
                    │ transactions         │
                    └──────────────────────┘

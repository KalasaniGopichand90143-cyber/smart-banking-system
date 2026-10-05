
// SMART BANKING SYSTEM - script.js

// API CONFIGURATION
const API_BASE = "https://smart-banking-system-kymh.onrender.com";
const API_BASE_URL = API_BASE;

let currentPage = 1;
let adminUsers = [];
let adminTransactions = [];
let currentUserRole = null;







// HELPER FUNCTIONS


function getToken() {
    return localStorage.getItem("token");
}


async function getJsonResponse(response) {
    try {
        return await response.json();
    } catch (error) {
        return {};
    }
}


function logoutUser(message = "Logged out successfully") {

    localStorage.removeItem("token");
    currentUserRole = null;

    const dashboard = document.getElementById("dashboardSection");
    const login = document.getElementById("loginSection");
    const messageElement = document.getElementById("message");
    const adminButton = document.getElementById("adminButton");

    if (dashboard) {
        dashboard.style.display = "none";
    }

    if (login) {
        login.style.display = "block";
    }

    if (adminButton) {
        adminButton.style.display = "none";
    }

    if (messageElement) {
        messageElement.textContent = message;
    }
}


// ============================================================
// LOGIN
// ============================================================

const loginForm = document.getElementById("loginForm");

if (loginForm) {

    loginForm.addEventListener("submit", async function(event) {

        event.preventDefault();

        const emailElement = document.getElementById("email");
        const passwordElement = document.getElementById("password");
        const messageElement = document.getElementById("message");

        const email = emailElement ? emailElement.value.trim() : "";
        const password = passwordElement ? passwordElement.value : "";

        if (!email || !password) {

            if (messageElement) {
                messageElement.textContent =
                    "Please enter email and password.";
            }

            return;
        }

        try {

            const response = await fetch(
                `${API_BASE}/login`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({
                        email: email,
                        password: password
                    })
                }
            );

            const data = await getJsonResponse(response);

            if (!response.ok) {

                if (messageElement) {
                    messageElement.textContent =
                        data.detail || "Login failed.";
                }

                return;
            }

            if (!data.access_token) {

                if (messageElement) {
                    messageElement.textContent =
                        "Login failed: token not received.";
                }

                return;
            }

            localStorage.setItem(
                "token",
                data.access_token
            );

            if (messageElement) {
                messageElement.textContent =
                    "Login successful!";
            }

            await checkUserRole();

            await loadDashboard();
            await loadAccounts();
            await loadDepositAccounts();
            await loadWithdrawAccounts();
            await loadTransferAccounts();

            showSection("overview");

        } catch (error) {

            console.error("Login error:", error);

            if (messageElement) {
                messageElement.textContent =
                    "Unable to connect to server.";
            }
        }

    });
}



const showRegister = document.getElementById("showRegister");
const showLogin = document.getElementById("showLogin");

const registerSection = document.getElementById("registerSection");
const loginSection = document.getElementById("loginSection");

const registerForm = document.getElementById("registerForm");
const registerMessage = document.getElementById("registerMessage");


if (showRegister) {

    showRegister.addEventListener("click", function(event) {

        event.preventDefault();

        document.getElementById("loginSection").style.display = "none";
        document.getElementById("registerSection").style.display = "block";
        document.getElementById("dashboardSection").style.display = "none";

    });

}


if (showLogin) {

    showLogin.addEventListener("click", function(event) {

        event.preventDefault();

        document.getElementById("registerSection").style.display = "none";
        document.getElementById("loginSection").style.display = "block";
        document.getElementById("dashboardSection").style.display = "none";

    });

}

if (registerForm) {

    registerForm.addEventListener("submit", async function(event) {

        event.preventDefault();

        const fullName =
            document.getElementById("registerFullName").value.trim();

        const dateOfBirth =
            document.getElementById("registerDateOfBirth").value;

        const phone =
            document.getElementById("registerPhone").value.trim();

        const email =
            document.getElementById("registerEmail").value.trim();

        const password =
            document.getElementById("registerPassword").value;

        const address =
            document.getElementById("registerAddress").value.trim();


        if (
            !fullName ||
            !dateOfBirth ||
            !phone ||
            !email ||
            !password
        ) {

            registerMessage.textContent =
                "Please fill in all required fields.";

            return;
        }


        try {

            registerMessage.textContent =
                "Creating your account...";


            const response = await fetch(
                `${API_BASE}/users`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({

                        full_name: fullName,
                        date_of_birth: dateOfBirth,
                        phone_number: phone,
                        email: email,
                        password: password,
                        address: address

                    })
                }
            );


            const data = await getJsonResponse(response);


            if (!response.ok) {

                registerMessage.textContent =
                    data.detail || "Registration failed.";

                return;
            }


            registerMessage.textContent =
                "Registration successful! Please login.";


            // Put registered email into login form
            const loginEmail =
                document.getElementById("email");

            if (loginEmail) {
                loginEmail.value = email;
            }


            // Clear registration form
            registerForm.reset();


            // Go back to login page
            setTimeout(function() {

                registerSection.style.display = "none";
                loginSection.style.display = "block";

            }, 1000);


        } catch (error) {

            console.error("Registration error:", error);

            registerMessage.textContent =
                "Unable to connect to the server.";

        }

    });

}






// CHECK USER ROLE


async function checkUserRole() {

    const token = getToken();

    const adminButton =
        document.getElementById("adminButton");

    if (adminButton) {
        adminButton.style.display = "none";
    }

    if (!token) {

        currentUserRole = null;
        return;
    }

    try {

        const response = await fetch(
            `${API_BASE_URL}/profile`,
            {
                method: "GET",

                headers: {
                    "Authorization": `Bearer ${token}`
                }
            }
        );

        const data = await getJsonResponse(response);

        if (!response.ok) {

            console.error(
                "Role check failed:",
                data
            );

            currentUserRole = null;
            return;
        }

        currentUserRole = data.role || null;

        if (
            currentUserRole === "ADMIN" &&
            adminButton
        ) {

            adminButton.style.display = "block";
        }

    } catch (error) {

        console.error(
            "Role check error:",
            error
        );

        currentUserRole = null;
    }
}



// CUSTOMER DASHBOARD

async function loadDashboard() {

    const token = getToken();

    if (!token) {
        return;
    }

    try {

        const response = await fetch(
            `${API_BASE_URL}/dashboard`,
            {
                method: "GET",

                headers: {
                    "Authorization": `Bearer ${token}`
                }
            }
        );

        const data = await getJsonResponse(response);

        if (!response.ok) {

            if (response.status === 401) {

                logoutUser(
                    "Session expired. Please login again."
                );

                return;
            }

            console.error(
                "Dashboard error:",
                data
            );

            return;
        }

        const loginSection =
            document.getElementById("loginSection");

        const dashboardSection =
            document.getElementById("dashboardSection");

        if (loginSection) {
            loginSection.style.display = "none";
        }

        if (dashboardSection) {
            dashboardSection.style.display = "block";
        }

        const totalBalance =
            document.getElementById("totalBalance");

        const accountCount =
            document.getElementById("accountCount");

        const totalDeposits =
            document.getElementById("totalDeposits");

        const totalWithdrawals =
            document.getElementById("totalWithdrawals");

        const totalTransfers =
            document.getElementById("totalTransfers");

        if (totalBalance) {
            totalBalance.textContent =
                `₹${data.total_balance ?? 0}`;
        }

        if (accountCount) {
            accountCount.textContent =
                data.account_count ?? 0;
        }

        if (totalDeposits) {
            totalDeposits.textContent =
                `₹${data.total_deposits ?? 0}`;
        }

        if (totalWithdrawals) {
            totalWithdrawals.textContent =
                `₹${data.total_withdrawals ?? 0}`;
        }

        if (totalTransfers) {
            totalTransfers.textContent =
                `₹${data.total_transfers ?? 0}`;
        }

        const container =
            document.getElementById("transactions");

        if (!container) {
            return;
        }

        container.innerHTML = "";

        if (
            !data.recent_transactions ||
            data.recent_transactions.length === 0
        ) {

            container.innerHTML =
                "<p>No recent transactions.</p>";

            return;
        }

        data.recent_transactions.forEach(
            function(transaction) {

                const transactionDiv =
                    document.createElement("div");

                transactionDiv.className =
                    "transaction";

                transactionDiv.innerHTML = `
                    <strong>
                        ${transaction.transaction_type}
                    </strong>

                    <p>
                        Amount: ₹${transaction.amount}
                    </p>

                    <p>
                        Status: ${transaction.status}
                    </p>
                `;

                container.appendChild(
                    transactionDiv
                );
            }
        );

    } catch (error) {

        console.error(
            "Dashboard error:",
            error
        );
    }
}



// LOAD ACCOUNTS


async function loadAccounts() {

    const token = getToken();

    if (!token) {
        return;
    }

    try {

        const response = await fetch(
            `${API_BASE_URL}/accounts`,
            {
                method: "GET",

                headers: {
                    "Authorization": `Bearer ${token}`
                }
            }
        );

        const data =
            await getJsonResponse(response);

        if (!response.ok) {

            console.error(
                "Account error:",
                data
            );

            return;
        }

        const container =
            document.getElementById("accounts");

        if (!container) {
            return;
        }

        container.innerHTML = "";

        if (
            !data.accounts ||
            data.accounts.length === 0
        ) {

            container.innerHTML =
                "<p>No accounts found.</p>";

            return;
        }

        data.accounts.forEach(
            function(account) {

                const accountDiv =
                    document.createElement("div");

                accountDiv.className =
                    "bank-account-card";

                accountDiv.innerHTML = `
                    <div class="account-header">

                        <h3>
                            ${account.account_type} Account
                        </h3>

                        <span>
                            ${account.status}
                        </span>

                    </div>

                    <p>
                        <strong>Account Number:</strong>
                        ${account.account_number}
                    </p>

                    <p>
                        <strong>Balance:</strong>
                        ₹${account.balance}
                    </p>

                    ${
                        account.status === "ACTIVE"

                        ? `
                            <button
                                onclick="deactivateAccount(
                                    ${account.account_id}
                                )"
                            >
                                Deactivate Account
                            </button>
                        `

                        : `
                            <p>
                                Account is inactive
                            </p>
                        `
                    }
                `;

                container.appendChild(
                    accountDiv
                );
            }
        );

    } catch (error) {

        console.error(
            "Account error:",
            error
        );
    }
}



// DEACTIVATE ACCOUNT


async function deactivateAccount(accountId) {

    const token = getToken();

    if (!token) {
        return;
    }

    const confirmed =
        confirm(
            "Are you sure you want to deactivate this account?"
        );

    if (!confirmed) {
        return;
    }

    try {

        const response = await fetch(
            `${API_BASE_URL}/accounts/${accountId}/deactivate`,
            {
                method: "PUT",

                headers: {
                    "Authorization": `Bearer ${token}`
                }
            }
        );

        const data =
            await getJsonResponse(response);

        if (response.ok) {

            alert(
                "Account deactivated successfully!"
            );

            await loadAccounts();
            await loadDashboard();
            await loadDepositAccounts();
            await loadWithdrawAccounts();
            await loadTransferAccounts();

        } else {

            alert(
                data.detail ||
                "Account deactivation failed."
            );
        }

    } catch (error) {

        console.error(
            "Deactivate account error:",
            error
        );

        alert(
            "Unable to connect to server."
        );
    }
}



// LOAD DEPOSIT ACCOUNTS


async function loadDepositAccounts() {

    const token = getToken();

    if (!token) {
        return;
    }

    const select =
        document.getElementById("depositAccount");

    if (!select) {
        return;
    }

    try {

        const response = await fetch(
            `${API_BASE_URL}/accounts`,
            {
                method: "GET",

                headers: {
                    "Authorization": `Bearer ${token}`
                }
            }
        );

        const data =
            await getJsonResponse(response);

        if (!response.ok) {

            console.error(
                "Deposit account error:",
                data
            );

            return;
        }

        select.innerHTML = "";

        if (
            !data.accounts ||
            data.accounts.length === 0
        ) {

            const option =
                document.createElement("option");

            option.value = "";
            option.textContent =
                "No accounts available";

            select.appendChild(option);

            return;
        }

        data.accounts.forEach(
            function(account) {

                const option =
                    document.createElement("option");

                option.value =
                    account.account_id;

                option.textContent =
                    `${account.account_type} - ` +
                    `${account.account_number} - ` +
                    `₹${account.balance}`;

                select.appendChild(option);
            }
        );

    } catch (error) {

        console.error(
            "Deposit account error:",
            error
        );
    }
}



// DEPOSIT


const depositButton =
    document.getElementById("depositButton");

if (depositButton) {

    depositButton.addEventListener(
        "click",
        async function() {

            const token = getToken();

            const accountElement =
                document.getElementById(
                    "depositAccount"
                );

            const amountElement =
                document.getElementById(
                    "depositAmount"
                );

            const messageElement =
                document.getElementById(
                    "depositMessage"
                );

            const accountId =
                accountElement
                    ? accountElement.value
                    : "";

            const amount =
                amountElement
                    ? amountElement.value
                    : "";

            if (!accountId) {

                if (messageElement) {
                    messageElement.textContent =
                        "Please select an account.";
                }

                return;
            }

            if (
                !amount ||
                Number(amount) <= 0
            ) {

                if (messageElement) {
                    messageElement.textContent =
                        "Please enter a valid amount.";
                }

                return;
            }

            try {

                const response = await fetch(
                    `${API_BASE_URL}/deposit`,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json",

                            "Authorization":
                                `Bearer ${token}`
                        },

                        body: JSON.stringify({
                            account_id:
                                Number(accountId),

                            amount:
                                Number(amount)
                        })
                    }
                );

                const data =
                    await getJsonResponse(response);

                if (response.ok) {

                    if (messageElement) {
                        messageElement.textContent =
                            "Deposit successful!";
                    }

                    if (amountElement) {
                        amountElement.value = "";
                    }

                    await loadDashboard();
                    await loadAccounts();
                    await loadDepositAccounts();

                } else {

                    if (messageElement) {
                        messageElement.textContent =
                            data.detail ||
                            "Deposit failed.";
                    }
                }

            } catch (error) {

                console.error(
                    "Deposit error:",
                    error
                );

                if (messageElement) {
                    messageElement.textContent =
                        "Unable to connect to server.";
                }
            }
        }
    );
}



// LOAD WITHDRAW ACCOUNTS


async function loadWithdrawAccounts() {

    const token = getToken();

    if (!token) {
        return;
    }

    const select =
        document.getElementById(
            "withdrawAccount"
        );

    if (!select) {
        return;
    }

    try {

        const response = await fetch(
            `${API_BASE_URL}/accounts`,
            {
                method: "GET",

                headers: {
                    "Authorization":
                        `Bearer ${token}`
                }
            }
        );

        const data =
            await getJsonResponse(response);

        if (!response.ok) {

            console.error(
                "Withdraw account error:",
                data
            );

            return;
        }

        select.innerHTML = "";

        if (
            !data.accounts ||
            data.accounts.length === 0
        ) {

            const option =
                document.createElement("option");

            option.value = "";
            option.textContent =
                "No accounts available";

            select.appendChild(option);

            return;
        }

        data.accounts.forEach(
            function(account) {

                const option =
                    document.createElement("option");

                option.value =
                    account.account_id;

                option.textContent =
                    `${account.account_type} - ` +
                    `${account.account_number} - ` +
                    `₹${account.balance}`;

                select.appendChild(option);
            }
        );

    } catch (error) {

        console.error(
            "Withdraw account error:",
            error
        );
    }
}



// WITHDRAW


const withdrawButton =
    document.getElementById(
        "withdrawButton"
    );

if (withdrawButton) {

    withdrawButton.addEventListener(
        "click",
        async function() {

            const token = getToken();

            const accountElement =
                document.getElementById(
                    "withdrawAccount"
                );

            const amountElement =
                document.getElementById(
                    "withdrawAmount"
                );

            const messageElement =
                document.getElementById(
                    "withdrawMessage"
                );

            const accountId =
                accountElement
                    ? accountElement.value
                    : "";

            const amount =
                amountElement
                    ? amountElement.value
                    : "";

            if (!accountId) {

                if (messageElement) {
                    messageElement.textContent =
                        "Please select an account.";
                }

                return;
            }

            if (
                !amount ||
                Number(amount) <= 0
            ) {

                if (messageElement) {
                    messageElement.textContent =
                        "Enter a valid amount.";
                }

                return;
            }

            try {

                const response = await fetch(
                    `${API_BASE_URL}/Withdraw`,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json",

                            "Authorization":
                                `Bearer ${token}`
                        },

                        body: JSON.stringify({
                            account_id:
                                Number(accountId),

                            amount:
                                Number(amount)
                        })
                    }
                );

                const data =
                    await getJsonResponse(response);

                if (response.ok) {

                    if (messageElement) {
                        messageElement.textContent =
                            "Withdrawal successful!";
                    }

                    if (amountElement) {
                        amountElement.value = "";
                    }

                    await loadDashboard();
                    await loadAccounts();
                    await loadWithdrawAccounts();

                } else {

                    if (messageElement) {
                        messageElement.textContent =
                            data.detail ||
                            "Withdrawal failed.";
                    }
                }

            } catch (error) {

                console.error(
                    "Withdraw error:",
                    error
                );

                if (messageElement) {
                    messageElement.textContent =
                        "Unable to connect to server.";
                }
            }
        }
    );
}



// LOAD TRANSFER ACCOUNTS


async function loadTransferAccounts() {

    const token = getToken();

    if (!token) {
        return;
    }

    const select =
        document.getElementById(
            "transferSender"
        );

    if (!select) {
        return;
    }

    try {

        const response = await fetch(
            `${API_BASE_URL}/accounts`,
            {
                method: "GET",

                headers: {
                    "Authorization":
                        `Bearer ${token}`
                }
            }
        );

        const data =
            await getJsonResponse(response);

        if (!response.ok) {

            console.error(
                "Transfer account error:",
                data
            );

            return;
        }

        select.innerHTML = "";

        if (
            !data.accounts ||
            data.accounts.length === 0
        ) {

            const option =
                document.createElement("option");

            option.value = "";
            option.textContent =
                "No accounts available";

            select.appendChild(option);

            return;
        }

        data.accounts.forEach(
            function(account) {

                const option =
                    document.createElement("option");

                option.value =
                    account.account_id;

                option.textContent =
                    `${account.account_type} - ` +
                    `${account.account_number} - ` +
                    `₹${account.balance}`;

                select.appendChild(option);
            }
        );

    } catch (error) {

        console.error(
            "Transfer account error:",
            error
        );
    }
}



// TRANSFER


const transferButton =
    document.getElementById(
        "transferButton"
    );

if (transferButton) {

    transferButton.addEventListener(
        "click",
        async function() {

            const token = getToken();

            const senderElement =
                document.getElementById(
                    "transferSender"
                );

            const receiverElement =
                document.getElementById(
                    "transferReceiver"
                );

            const amountElement =
                document.getElementById(
                    "transferAmount"
                );

            const messageElement =
                document.getElementById(
                    "transferMessage"
                );

            const senderAccountId =
                senderElement
                    ? senderElement.value
                    : "";

            const receiverAccountNumber =
                receiverElement
                    ? receiverElement.value.trim()
                    : "";

            const amount =
                amountElement
                    ? amountElement.value
                    : "";

            if (!senderAccountId) {

                if (messageElement) {
                    messageElement.textContent =
                        "Please select your account.";
                }

                return;
            }

            if (!receiverAccountNumber) {

                if (messageElement) {
                    messageElement.textContent =
                        "Please enter receiver account number.";
                }

                return;
            }

            if (
                !amount ||
                Number(amount) <= 0
            ) {

                if (messageElement) {
                    messageElement.textContent =
                        "Enter a valid amount.";
                }

                return;
            }

            try {

                // Find receiver account

                const receiverResponse =
                    await fetch(
                        `${API_BASE_URL}/receiver/${encodeURIComponent(
                            receiverAccountNumber
                        )}`,
                        {
                            method: "GET",

                            headers: {
                                "Authorization":
                                    `Bearer ${token}`
                            }
                        }
                    );

                const receiverData =
                    await getJsonResponse(
                        receiverResponse
                    );

                if (!receiverResponse.ok) {

                    if (messageElement) {
                        messageElement.textContent =
                            receiverData.detail ||
                            "Receiver account not found.";
                    }

                    return;
                }

                // Perform transfer

                const response =
                    await fetch(
                        `${API_BASE_URL}/Transfer`,
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json",

                                "Authorization":
                                    `Bearer ${token}`
                            },

                            body: JSON.stringify({

                                sender_account_id:
                                    Number(
                                        senderAccountId
                                    ),

                                receiver_account_id:
                                    receiverData.account_id,

                                amount:
                                    Number(amount)
                            })
                        }
                    );

                const data =
                    await getJsonResponse(response);

                if (response.ok) {

                    if (messageElement) {
                        messageElement.textContent =
                            "Transfer successful!";
                    }

                    if (amountElement) {
                        amountElement.value = "";
                    }

                    if (receiverElement) {
                        receiverElement.value = "";
                    }

                    await loadDashboard();
                    await loadAccounts();
                    await loadTransferAccounts();

                } else {

                    if (messageElement) {
                        messageElement.textContent =
                            data.detail ||
                            "Transfer failed.";
                    }
                }

            } catch (error) {

                console.error(
                    "Transfer error:",
                    error
                );

                if (messageElement) {
                    messageElement.textContent =
                        "Unable to connect to server.";
                }
            }
        }
    );
}



// TRANSACTION HISTORY


async function loadTransactionHistory() {

    const token = getToken();

    if (!token) {
        return;
    }

    const typeElement =
        document.getElementById(
            "transactionType"
        );

    const container =
        document.getElementById(
            "transactionHistory"
        );

    if (!container) {
        return;
    }

    const type =
        typeElement
            ? typeElement.value
            : "";

    const limit = 10;

    let url =
        `${API_BASE_URL}/Transactions` +
        `?page=${currentPage}` +
        `&limit=${limit}`;

    if (type) {

        url +=
            `&transaction_type=${encodeURIComponent(type)}`;
    }

    try {

        const response =
            await fetch(
                url,
                {
                    method: "GET",

                    headers: {
                        "Authorization":
                            `Bearer ${token}`
                    }
                }
            );

        const data =
            await getJsonResponse(response);

        if (!response.ok) {

            container.innerHTML =
                `<p>${
                    data.detail ||
                    "Failed to load transactions."
                }</p>`;

            return;
        }

        container.innerHTML = "";

        if (
            !data.transactions ||
            data.transactions.length === 0
        ) {

            container.innerHTML =
                "<p>No transactions found.</p>";

            const nextButton =
                document.getElementById(
                    "nextPage"
                );

            if (nextButton) {
                nextButton.disabled = true;
            }

            return;
        }

        const table =
            document.createElement("table");

        table.className =
            "transaction-table";

        table.innerHTML = `
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Date</th>
                </tr>
            </thead>

            <tbody></tbody>
        `;

        const tbody =
            table.querySelector("tbody");

        data.transactions.forEach(
            function(transaction) {

                const row =
                    document.createElement("tr");

                row.innerHTML = `
                    <td>
                        ${transaction.transaction_id}
                    </td>

                    <td>
                        ${transaction.transaction_type}
                    </td>

                    <td>
                        ₹${transaction.amount}
                    </td>

                    <td>
                        ${transaction.status}
                    </td>

                    <td>
                        ${new Date(
                            transaction.created_at
                        ).toLocaleString()}
                    </td>
                `;

                tbody.appendChild(row);
            }
        );

        container.appendChild(table);

        const pageNumber =
            document.getElementById(
                "pageNumber"
            );

        if (pageNumber) {
            pageNumber.textContent =
                `Page ${currentPage}`;
        }

        const previousButton =
            document.getElementById(
                "previousPage"
            );

        if (previousButton) {
            previousButton.disabled =
                currentPage === 1;
        }

        const nextButton =
            document.getElementById(
                "nextPage"
            );

        if (nextButton) {
            nextButton.disabled =
                data.transactions.length < limit;
        }

    } catch (error) {

        console.error(
            "Transaction error:",
            error
        );
    }
}



// TRANSACTION PAGINATION


const previousPageButton =
    document.getElementById(
        "previousPage"
    );

if (previousPageButton) {

    previousPageButton.addEventListener(
        "click",
        function() {

            if (currentPage > 1) {

                currentPage--;

                loadTransactionHistory();
            }
        }
    );
}


const nextPageButton =
    document.getElementById(
        "nextPage"
    );

if (nextPageButton) {

    nextPageButton.addEventListener(
        "click",
        function() {

            currentPage++;

            loadTransactionHistory();
        }
    );
}


const loadTransactionsButton =
    document.getElementById(
        "loadTransactions"
    );

if (loadTransactionsButton) {

    loadTransactionsButton.addEventListener(
        "click",
        function() {

            currentPage = 1;

            loadTransactionHistory();
        }
    );
}



// CREATE ACCOUNT


const createAccountButton =
    document.getElementById(
        "createAccountButton"
    );

if (createAccountButton) {

    createAccountButton.addEventListener(
        "click",
        async function() {

            const token = getToken();

            const typeElement =
                document.getElementById(
                    "accountType"
                );

            const messageElement =
                document.getElementById(
                    "accountMessage"
                );

            const accountType =
                typeElement
                    ? typeElement.value
                    : "";

            if (!accountType) {

                if (messageElement) {
                    messageElement.textContent =
                        "Please select account type.";
                }

                return;
            }

            try {

                const response =
                    await fetch(
                        `${API_BASE_URL}/accounts`,
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json",

                                "Authorization":
                                    `Bearer ${token}`
                            },

                            body: JSON.stringify({
                                account_type:
                                    accountType
                            })
                        }
                    );

                const data =
                    await getJsonResponse(response);

                if (response.ok) {

                    if (messageElement) {
                        messageElement.textContent =
                            "Account created successfully!";
                    }

                    await loadAccounts();
                    await loadDashboard();
                    await loadDepositAccounts();
                    await loadWithdrawAccounts();
                    await loadTransferAccounts();

                } else {

                    if (messageElement) {
                        messageElement.textContent =
                            data.detail ||
                            "Account creation failed.";
                    }
                }

            } catch (error) {

                console.error(
                    "Account creation error:",
                    error
                );

                if (messageElement) {
                    messageElement.textContent =
                        "Unable to connect to server.";
                }
            }
        }
    );
}



// PROFILE


async function loadProfile() {

    const token = getToken();

    if (!token) {
        return;
    }

    try {

        const response =
            await fetch(
                `${API_BASE_URL}/profile`,
                {
                    method: "GET",

                    headers: {
                        "Authorization":
                            `Bearer ${token}`
                    }
                }
            );

        const data =
            await getJsonResponse(response);

        if (!response.ok) {

            console.error(
                "Profile error:",
                data
            );

            return;
        }

        const profileName =
            document.getElementById(
                "profileName"
            );

        const profileEmail =
            document.getElementById(
                "profileEmail"
            );

        const profileDob =
            document.getElementById(
                "profileDob"
            );

        const editPhone =
            document.getElementById(
                "editPhone"
            );

        const editAddress =
            document.getElementById(
                "editAddress"
            );

        if (profileName) {
            profileName.textContent =
                data.full_name ||
                "Not available";
        }

        if (profileEmail) {
            profileEmail.textContent =
                data.email ||
                "Not available";
        }

        if (profileDob) {
            profileDob.textContent =
                data.date_of_birth ||
                "Not available";
        }

        if (editPhone) {
            editPhone.value =
                data.phone_number || "";
        }

        if (editAddress) {
            editAddress.value =
                data.address || "";
        }

    } catch (error) {

        console.error(
            "Profile error:",
            error
        );
    }
}



// UPDATE PROFILE


const updateProfileButton =
    document.getElementById(
        "updateProfileButton"
    );

if (updateProfileButton) {

    updateProfileButton.addEventListener(
        "click",
        async function() {

            const token = getToken();

            const phoneElement =
                document.getElementById(
                    "editPhone"
                );

            const addressElement =
                document.getElementById(
                    "editAddress"
                );

            const messageElement =
                document.getElementById(
                    "profileMessage"
                );

            const phone =
                phoneElement
                    ? phoneElement.value.trim()
                    : "";

            const address =
                addressElement
                    ? addressElement.value.trim()
                    : "";

            try {

                const response =
                    await fetch(
                        `${API_BASE_URL}/profile`,
                        {
                            method: "PUT",

                            headers: {
                                "Content-Type":
                                    "application/json",

                                "Authorization":
                                    `Bearer ${token}`
                            },

                            body: JSON.stringify({
                                phone_number:
                                    phone,

                                address:
                                    address
                            })
                        }
                    );

                const data =
                    await getJsonResponse(response);

                if (response.ok) {

                    if (messageElement) {
                        messageElement.textContent =
                            "Profile updated successfully!";
                    }

                    await loadProfile();

                } else {

                    if (messageElement) {
                        messageElement.textContent =
                            data.detail ||
                            "Profile update failed.";
                    }
                }

            } catch (error) {

                console.error(
                    "Profile update error:",
                    error
                );

                if (messageElement) {
                    messageElement.textContent =
                        "Unable to connect to server.";
                }
            }
        }
    );
}



// SECTION SWITCHING

function showSection(sectionId) {

    if (
        sectionId === "adminSection" &&
        currentUserRole !== "ADMIN"
    ) {

        console.warn("Admin access denied.");
        return;
    }


    // Hide Login and Registration
    const loginSection =
        document.getElementById("loginSection");

    const registerSection =
        document.getElementById("registerSection");

    if (loginSection) {
        loginSection.style.display = "none";
    }

    if (registerSection) {
        registerSection.style.display = "none";
    }


    // Show Dashboard
    const dashboardSection =
        document.getElementById("dashboardSection");

    if (dashboardSection) {
        dashboardSection.style.display = "block";
    }


    // Dashboard content sections
    const sections = [
        "overview",
        "accountsSection",
        "depositSection",
        "withdrawSection",
        "transferSection",
        "transactionSection",
        "profileSection",
        "adminSection"
    ];


    // Hide all dashboard sections
    sections.forEach(function(id) {

        const section =
            document.getElementById(id);

        if (section) {
            section.style.display = "none";
        }

    });


    // Show selected section
    const selectedSection =
        document.getElementById(sectionId);

    if (!selectedSection) {

        console.error(
            "Section not found:",
            sectionId
        );

        return;
    }


    selectedSection.style.display = "block";


    // Load required data
    if (sectionId === "overview") {
        loadDashboard();
    }

    if (sectionId === "accountsSection") {
        loadAccounts();
    }

    if (sectionId === "depositSection") {
        loadDepositAccounts();
    }

    if (sectionId === "withdrawSection") {
        loadWithdrawAccounts();
    }

    if (sectionId === "transferSection") {
        loadTransferAccounts();
    }

    if (sectionId === "transactionSection") {
        loadTransactionHistory();
    }

    if (sectionId === "profileSection") {
        loadProfile();
    }

    if (sectionId === "adminSection") {
        loadAdminDashboard();
        loadAdminUsers();
        loadAdminTransactions();
    }
}

// LOGOUT


const logoutButton =
    document.getElementById(
        "logoutButton"
    );

if (logoutButton) {

    logoutButton.addEventListener(
        "click",
        function() {

            logoutUser();
        }
    );
}



// ADMIN DASHBOARD


async function loadAdminDashboard() {

    const token = getToken();

    if (!token) {
        return;
    }

    try {

        const response =
            await fetch(
                `${API_BASE_URL}/admin/dashboard`,
                {
                    method: "GET",

                    headers: {
                        "Authorization":
                            `Bearer ${token}`
                    }
                }
            );

        const data =
            await getJsonResponse(response);

        if (!response.ok) {

            console.error(
                "Admin dashboard error:",
                data
            );

            return;
        }

        const fields = {
            adminTotalUsers:
                data.total_users,

            adminTotalAccounts:
                data.total_accounts,

            adminTotalBalance:
                `₹${data.total_balance ?? 0}`,

            adminTotalTransactions:
                data.total_transactions,

            adminTotalDeposits:
                `₹${data.total_deposits ?? 0}`,

            adminTotalWithdrawals:
                `₹${data.total_withdrawals ?? 0}`
        };

        Object.keys(fields).forEach(
            function(id) {

                const element =
                    document.getElementById(id);

                if (element) {
                    element.textContent =
                        fields[id];
                }
            }
        );

    } catch (error) {

        console.error(
            "Admin dashboard error:",
            error
        );
    }
}



// ADMIN USERS


async function loadAdminUsers() {

    const token = getToken();

    if (!token) {
        return;
    }

    try {

        const response =
            await fetch(
                `${API_BASE_URL}/admin/users`,
                {
                    method: "GET",

                    headers: {
                        "Authorization":
                            `Bearer ${token}`
                    }
                }
            );

        const data =
            await getJsonResponse(response);

        if (!response.ok) {

            console.error(
                "Admin users error:",
                data
            );

            return;
        }

        adminUsers =
            data.users || [];

        displayAdminUsers(
            adminUsers
        );

    } catch (error) {

        console.error(
            "Admin users error:",
            error
        );
    }
}



// DISPLAY ADMIN USERS


function displayAdminUsers(users) {

    const container =
        document.getElementById(
            "adminUsersContainer"
        );

    if (!container) {
        return;
    }

    container.innerHTML = "";

    if (
        !users ||
        users.length === 0
    ) {

        container.innerHTML =
            "<p>No users found.</p>";

        return;
    }

    const table =
        document.createElement("table");

    table.className =
        "transaction-table";

    table.innerHTML = `
        <thead>

            <tr>
                <th>User ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Account Number</th>
                <th>Account Type</th>
                <th>Balance</th>
                <th>Status</th>
            </tr>

        </thead>

        <tbody></tbody>
    `;

    const tbody =
        table.querySelector("tbody");

    users.forEach(
        function(user) {

            const row =
                document.createElement("tr");

            row.innerHTML = `
                <td>
                    ${user.user_id}
                </td>

                <td>
                    ${user.full_name || "-"}
                </td>

                <td>
                    ${user.email || "-"}
                </td>

                <td>
                    ${user.role || "-"}
                </td>

                <td>
                    ${user.account_number || "No account"}
                </td>

                <td>
                    ${user.account_type || "-"}
                </td>

                <td>
                    ₹${user.balance ?? 0}
                </td>

                <td>
                    ${user.account_status || "-"}
                </td>
            `;

            tbody.appendChild(row);
        }
    );

    container.appendChild(table);
}



// ADMIN USER FILTER


function filterAdminUsers() {

    const searchElement =
        document.getElementById(
            "adminSearch"
        );

    const statusElement =
        document.getElementById(
            "adminStatusFilter"
        );

    const searchText =
        searchElement
            ? searchElement.value
                .toLowerCase()
                .trim()
            : "";

    const status =
        statusElement
            ? statusElement.value
            : "";

    const filteredUsers =
        adminUsers.filter(
            function(user) {

                const name =
                    (
                        user.full_name ||
                        ""
                    ).toLowerCase();

                const email =
                    (
                        user.email ||
                        ""
                    ).toLowerCase();

                const searchMatch =
                    name.includes(searchText) ||
                    email.includes(searchText);

                const statusMatch =
                    status === "" ||
                    user.account_status === status;

                return (
                    searchMatch &&
                    statusMatch
                );
            }
        );

    displayAdminUsers(
        filteredUsers
    );
}


const adminSearch =
    document.getElementById(
        "adminSearch"
    );

if (adminSearch) {

    adminSearch.addEventListener(
        "input",
        filterAdminUsers
    );
}


const adminStatusFilter =
    document.getElementById(
        "adminStatusFilter"
    );

if (adminStatusFilter) {

    adminStatusFilter.addEventListener(
        "change",
        filterAdminUsers
    );
}


const adminResetFilter =
    document.getElementById(
        "adminResetFilter"
    );

if (adminResetFilter) {

    adminResetFilter.addEventListener(
        "click",
        function() {

            const searchElement =
                document.getElementById(
                    "adminSearch"
                );

            const statusElement =
                document.getElementById(
                    "adminStatusFilter"
                );

            if (searchElement) {
                searchElement.value = "";
            }

            if (statusElement) {
                statusElement.value = "";
            }

            displayAdminUsers(
                adminUsers
            );
        }
    );
}



// ADMIN TRANSACTIONS


async function loadAdminTransactions() {

    const token = getToken();

    if (!token) {
        return;
    }

    try {

        const response =
            await fetch(
                `${API_BASE_URL}/admin/transactions`,
                {
                    method: "GET",

                    headers: {
                        "Authorization":
                            `Bearer ${token}`
                    }
                }
            );

        const data =
            await getJsonResponse(response);

        if (!response.ok) {

            console.error(
                "Admin transaction error:",
                data
            );

            return;
        }

        adminTransactions =
            data.transactions || [];

        displayAdminTransactions(
            adminTransactions
        );

    } catch (error) {

        console.error(
            "Admin transaction error:",
            error
        );
    }
}



// DISPLAY ADMIN TRANSACTIONS


function displayAdminTransactions(
    transactions
) {

    const container =
        document.getElementById(
            "adminTransactionsContainer"
        );

    if (!container) {
        return;
    }

    container.innerHTML = "";

    if (
        !transactions ||
        transactions.length === 0
    ) {

        container.innerHTML =
            "<p>No transactions found.</p>";

        return;
    }

    const table =
        document.createElement("table");

    table.className =
        "transaction-table";

    table.innerHTML = `
        <thead>

            <tr>
                <th>ID</th>
                <th>Sender</th>
                <th>Receiver</th>
                <th>Amount</th>
                <th>Type</th>
                <th>Status</th>
                <th>Date</th>
            </tr>

        </thead>

        <tbody></tbody>
    `;

    const tbody =
        table.querySelector("tbody");

    transactions.forEach(
        function(transaction) {

            const row =
                document.createElement("tr");

            row.innerHTML = `
                <td>
                    ${transaction.transaction_id}
                </td>

                <td>
                    ${transaction.sender_account_id || "-"}
                </td>

                <td>
                    ${transaction.receiver_account_id || "-"}
                </td>

                <td>
                    ₹${transaction.amount}
                </td>

                <td>
                    ${transaction.transaction_type}
                </td>

                <td>
                    ${transaction.status}
                </td>

                <td>
                    ${new Date(
                        transaction.created_at
                    ).toLocaleString()}
                </td>
            `;

            tbody.appendChild(row);
        }
    );

    container.appendChild(table);
}



// ADMIN TRANSACTION FILTER


function filterAdminTransactions() {

    const typeElement =
        document.getElementById(
            "adminTransactionType"
        );

    const statusElement =
        document.getElementById(
            "adminTransactionStatus"
        );

    const type =
        typeElement
            ? typeElement.value
            : "";

    const status =
        statusElement
            ? statusElement.value
            : "";

    const filteredTransactions =
        adminTransactions.filter(
            function(transaction) {

                const typeMatch =
                    type === "" ||
                    transaction.transaction_type === type;

                const statusMatch =
                    status === "" ||
                    transaction.status === status;

                return (
                    typeMatch &&
                    statusMatch
                );
            }
        );

    displayAdminTransactions(
        filteredTransactions
    );
}


const adminTransactionType =
    document.getElementById(
        "adminTransactionType"
    );

if (adminTransactionType) {

    adminTransactionType.addEventListener(
        "change",
        filterAdminTransactions
    );
}


const adminTransactionStatus =
    document.getElementById(
        "adminTransactionStatus"
    );

if (adminTransactionStatus) {

    adminTransactionStatus.addEventListener(
        "change",
        filterAdminTransactions
    );
}


const adminTransactionReset =
    document.getElementById(
        "adminTransactionReset"
    );

if (adminTransactionReset) {

    adminTransactionReset.addEventListener(
        "click",
        function() {

            const typeElement =
                document.getElementById(
                    "adminTransactionType"
                );

            const statusElement =
                document.getElementById(
                    "adminTransactionStatus"
                );

            if (typeElement) {
                typeElement.value = "";
            }

            if (statusElement) {
                statusElement.value = "";
            }

            displayAdminTransactions(
                adminTransactions
            );
        }
    );
}



// PAGE LOAD / AUTO LOGIN


window.addEventListener(
    "load",
    async function() {

        const token = getToken();

        const loginSection =
            document.getElementById(
                "loginSection"
            );

        const dashboardSection =
            document.getElementById(
                "dashboardSection"
            );

        const adminButton =
            document.getElementById(
                "adminButton"
            );

        if (adminButton) {
            adminButton.style.display =
                "none";
        }

        if (!token) {

            if (loginSection) {
                loginSection.style.display =
                    "block";
            }

            if (dashboardSection) {
                dashboardSection.style.display =
                    "none";
            }

            return;
        }

        await checkUserRole();

        await loadDashboard();
        await loadAccounts();
        await loadDepositAccounts();
        await loadWithdrawAccounts();
        await loadTransferAccounts();

        showSection("overview");
    }
);
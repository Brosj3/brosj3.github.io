// indexedDB.js - Database operations for user data

// Database configuration
const DB_NAME = 'UserDatabase';
const DB_VERSION = 1;
const STORE_NAME = 'users';

let db = null;

// Initialize the database
function initDatabase() {
    return new Promise((resolve, reject) => {
        // Check if IndexedDB is supported
        if (!('indexedDB' in window)) {
            reject('IndexedDB is not supported by your browser.');
            return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = function(event) {
            showStatus('Error opening database: ' + event.target.errorCode, 'error');
            reject('Failed to open database');
        };

        request.onsuccess = function(event) {
            db = event.target.result;
            showStatus('Database initialized successfully', 'success');
            resolve(db);
        };

        request.onupgradeneeded = function(event) {
            const db = event.target.result;
            
            // Create object store if it doesn't exist
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const objectStore = db.createObjectStore(STORE_NAME, {
                    keyPath: 'id',
                    autoIncrement: true
                });
                
                // Create indexes for searching
                objectStore.createIndex('name', 'name', { unique: false });
                objectStore.createIndex('email', 'email', { unique: true });
                
                showStatus('Database schema created', 'success');
            }
        };
    });
}

// Add a user to the database
function addUser(name, email) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject('Database not initialized');
            return;
        }

        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        
        const user = {
            name: name.trim(),
            email: email.trim(),
            created: new Date().toISOString()
        };
        
        const request = store.add(user);

        request.onsuccess = function() {
            showStatus(`User "${name}" added successfully`, 'success');
            resolve(request.result); // Returns the ID of the new user
        };

        request.onerror = function(event) {
            // Check if it's a duplicate email error
            if (event.target.error.name === 'ConstraintError') {
                showStatus('Error: Email already exists in the database', 'error');
                reject('Duplicate email');
            } else {
                showStatus('Error adding user: ' + event.target.error, 'error');
                reject('Failed to add user');
            }
        };
    });
}

// Get all users from the database
function getAllUsers() {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject('Database not initialized');
            return;
        }

        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = function() {
            resolve(request.result);
        };

        request.onerror = function(event) {
            showStatus('Error retrieving users: ' + event.target.error, 'error');
            reject('Failed to retrieve users');
        };
    });
}

// Delete a user by ID
function deleteUser(id) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject('Database not initialized');
            return;
        }

        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);

        request.onsuccess = function() {
            showStatus('User deleted successfully', 'success');
            resolve(true);
        };

        request.onerror = function(event) {
            showStatus('Error deleting user: ' + event.target.error, 'error');
            reject('Failed to delete user');
        };
    });
}

// Clear all users from the database
function clearAllUsers() {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject('Database not initialized');
            return;
        }

        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.clear();

        request.onsuccess = function() {
            showStatus('All users cleared successfully', 'success');
            resolve(true);
        };

        request.onerror = function(event) {
            showStatus('Error clearing users: ' + event.target.error, 'error');
            reject('Failed to clear users');
        };
    });
}

// Load demo data into the database
function loadDemoData() {
    const demoUsers = [
        { name: 'John Smith', email: 'john.smith@example.com' },
        { name: 'Emma Johnson', email: 'emma.johnson@example.com' },
        { name: 'Michael Brown', email: 'michael.brown@example.com' },
        { name: 'Sarah Williams', email: 'sarah.williams@example.com' },
        { name: 'David Miller', email: 'david.miller@example.com' }
    ];

    return new Promise(async (resolve, reject) => {
        try {
            for (const user of demoUsers) {
                await addUser(user.name, user.email);
            }
            showStatus('Demo data loaded successfully', 'success');
            resolve(true);
        } catch (error) {
            reject(error);
        }
    });
}

// Export data as JSON
function exportData() {
    return new Promise(async (resolve, reject) => {
        try {
            const users = await getAllUsers();
            const dataStr = JSON.stringify(users, null, 2);
            const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
            
            const exportFileDefaultName = 'users-export.json';
            
            const linkElement = document.createElement('a');
            linkElement.setAttribute('href', dataUri);
            linkElement.setAttribute('download', exportFileDefaultName);
            linkElement.click();
            
            showStatus('Data exported successfully', 'success');
            resolve(true);
        } catch (error) {
            reject(error);
        }
    });
}

// Display status messages
function showStatus(message, type) {
    const statusEl = document.getElementById('statusMessage');
    statusEl.textContent = message;
    statusEl.className = `status ${type}`;
    statusEl.style.display = 'block';
    
    // Hide status after 5 seconds
    setTimeout(() => {
        statusEl.style.display = 'none';
    }, 5000);
}

// Render users in the table
async function renderUsersTable() {
    try {
        const users = await getAllUsers();
        const tableBody = document.getElementById('tableBody');
        
        // Clear the table
        tableBody.innerHTML = '';
        
        if (users.length === 0) {
            const emptyRow = document.createElement('tr');
            emptyRow.id = 'emptyRow';
            emptyRow.innerHTML = `
                <td colspan="4" class="empty-table">No users found. Add some users to see them here.</td>
            `;
            tableBody.appendChild(emptyRow);
            return;
        }
        
        // Add each user as a row
        users.forEach(user => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${user.id}</td>
                <td>${user.name}</td>
                <td>${user.email}</td>
                <td class="actions">
                    <button class="btn btn-danger delete-btn" data-id="${user.id}">Delete</button>
                </td>
            `;
            tableBody.appendChild(row);
        });
        
        // Add event listeners to delete buttons
        document.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener('click', async function() {
                const id = Number(this.getAttribute('data-id'));
                const userName = this.closest('tr').querySelector('td:nth-child(2)').textContent;
                
                if (confirm(`Are you sure you want to delete user "${userName}"?`)) {
                    try {
                        await deleteUser(id);
                        await renderUsersTable();
                    } catch (error) {
                        console.error('Error deleting user:', error);
                    }
                }
            });
        });
        
    } catch (error) {
        console.error('Error rendering users table:', error);
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', async function() {
    // Initialize the database
    try {
        await initDatabase();
        await renderUsersTable();
    } catch (error) {
        console.error('Failed to initialize database:', error);
    }
    
    // Form submission handler
    document.getElementById('userForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        
        try {
            await addUser(name, email);
            await renderUsersTable();
            
            // Clear the form
            document.getElementById('userForm').reset();
        } catch (error) {
            console.error('Error adding user:', error);
        }
    });
    
    // Clear form button
    document.getElementById('clearForm').addEventListener('click', function() {
        document.getElementById('userForm').reset();
        showStatus('Form cleared', 'success');
    });
    
    // Load demo data button
    document.getElementById('loadDemo').addEventListener('click', async function() {
        if (confirm('This will add 5 demo users to the database. Continue?')) {
            try {
                await loadDemoData();
                await renderUsersTable();
            } catch (error) {
                console.error('Error loading demo data:', error);
            }
        }
    });
    
    // Clear all data button
    document.getElementById('clearAll').addEventListener('click', async function() {
        if (confirm('Are you sure you want to delete ALL users? This action cannot be undone.')) {
            try {
                await clearAllUsers();
                await renderUsersTable();
            } catch (error) {
                console.error('Error clearing all users:', error);
            }
        }
    });
    
    // Refresh table button
    document.getElementById('refreshTable').addEventListener('click', async function() {
        try {
            await renderUsersTable();
            showStatus('Table refreshed', 'success');
        } catch (error) {
            console.error('Error refreshing table:', error);
        }
    });
    
    // Export data button
    document.getElementById('exportData').addEventListener('click', async function() {
        try {
            await exportData();
        } catch (error) {
            console.error('Error exporting data:', error);
        }
    });
});
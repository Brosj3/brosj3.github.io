// contactsDB.js - IndexedDB operations for contact management
// No sample/demo data included

// Database configuration
const DB_CONFIG = {
    name: 'ContactsDB',
    version: 1,
    storeName: 'contacts'
};

let db = null;
let isInitialized = false;

// ============ DATABASE INITIALIZATION ============
function initDatabase() {
    return new Promise((resolve, reject) => {
        // Check browser support
        if (!window.indexedDB) {
            showStatus('Your browser does not support IndexedDB', 'error');
            reject('IndexedDB not supported');
            return;
        }

        const request = indexedDB.open(DB_CONFIG.name, DB_CONFIG.version);

        request.onerror = function(event) {
            console.error('Database error:', event.target.error);
            showStatus('Error opening database: ' + event.target.error.message, 'error');
            reject(event.target.error);
        };

        request.onsuccess = function(event) {
            db = event.target.result;
            isInitialized = true;
            
            // Set up database event handlers
            db.onerror = function(event) {
                console.error('Database error:', event.target.error);
                showStatus('Database error occurred', 'error');
            };
            
            console.log('Database initialized successfully');
            updateStorageInfo();
            resolve(db);
        };

        request.onupgradeneeded = function(event) {
            console.log('Database upgrade needed');
            const db = event.target.result;
            
            // Create object store if it doesn't exist
            if (!db.objectStoreNames.contains(DB_CONFIG.storeName)) {
                const objectStore = db.createObjectStore(DB_CONFIG.storeName, {
                    keyPath: 'id',
                    autoIncrement: true
                });
                
                // Create indexes for searching
                objectStore.createIndex('name', 'name', { unique: false });
                objectStore.createIndex('mobile', 'mobile', { unique: true });
                objectStore.createIndex('email', 'email', { unique: true });
                objectStore.createIndex('address', 'address', { unique: false });
                objectStore.createIndex('created', 'created', { unique: false });
                
                console.log('Object store created with indexes');
            }
        };
    });
}

// ============ CONTACT CRUD OPERATIONS ============
// Add a new contact
function addContact(contact) {
    return new Promise((resolve, reject) => {
        if (!isInitialized) {
            reject('Database not initialized');
            return;
        }

        // Validate contact data
        if (!contact.name || !contact.mobile || !contact.email) {
            reject('Name, mobile, and email are required');
            return;
        }

        // Format mobile number (remove any non-digits)
        contact.mobile = contact.mobile.replace(/\D/g, '');
        
        // Add timestamp
        contact.created = new Date().toISOString();
        contact.updated = contact.created;

        const transaction = db.transaction([DB_CONFIG.storeName], 'readwrite');
        const store = transaction.objectStore(DB_CONFIG.storeName);
        
        const request = store.add(contact);

        request.onsuccess = function() {
            console.log('Contact added with ID:', request.result);
            showStatus(`Contact "${contact.name}" added successfully`, 'success');
            updateStorageInfo();
            resolve(request.result);
        };

        request.onerror = function(event) {
            console.error('Error adding contact:', event.target.error);
            
            // Handle specific errors
            if (event.target.error.name === 'ConstraintError') {
                const field = event.target.error.message.includes('mobile') ? 'mobile number' : 'email';
                showStatus(`Error: This ${field} already exists`, 'error');
                reject(`Duplicate ${field}`);
            } else {
                showStatus('Error adding contact: ' + event.target.error.message, 'error');
                reject('Failed to add contact');
            }
        };
    });
}

// Get all contacts
function getAllContacts() {
    return new Promise((resolve, reject) => {
        if (!isInitialized) {
            reject('Database not initialized');
            return;
        }

        const transaction = db.transaction([DB_CONFIG.storeName], 'readonly');
        const store = transaction.objectStore(DB_CONFIG.storeName);
        const request = store.getAll();

        request.onsuccess = function() {
            resolve(request.result);
        };

        request.onerror = function(event) {
            console.error('Error getting contacts:', event.target.error);
            showStatus('Error loading contacts', 'error');
            reject(event.target.error);
        };
    });
}

// Get a single contact by ID
function getContact(id) {
    return new Promise((resolve, reject) => {
        if (!isInitialized) {
            reject('Database not initialized');
            return;
        }

        const transaction = db.transaction([DB_CONFIG.storeName], 'readonly');
        const store = transaction.objectStore(DB_CONFIG.storeName);
        const request = store.get(id);

        request.onsuccess = function() {
            resolve(request.result);
        };

        request.onerror = function(event) {
            reject(event.target.error);
        };
    });
}

// Update a contact
function updateContact(id, updatedData) {
    return new Promise((resolve, reject) => {
        if (!isInitialized) {
            reject('Database not initialized');
            return;
        }

        const transaction = db.transaction([DB_CONFIG.storeName], 'readwrite');
        const store = transaction.objectStore(DB_CONFIG.storeName);
        
        // First get the existing contact
        const getRequest = store.get(id);
        
        getRequest.onsuccess = function() {
            const contact = getRequest.result;
            if (!contact) {
                reject('Contact not found');
                return;
            }
            
            // Update the contact data
            const updatedContact = {
                ...contact,
                ...updatedData,
                updated: new Date().toISOString(),
                id: id // Ensure ID doesn't change
            };
            
            // Format mobile number
            if (updatedContact.mobile) {
                updatedContact.mobile = updatedContact.mobile.replace(/\D/g, '');
            }
            
            // Save updated contact
            const updateRequest = store.put(updatedContact);
            
            updateRequest.onsuccess = function() {
                showStatus(`Contact "${updatedContact.name}" updated successfully`, 'success');
                updateStorageInfo();
                resolve(updatedContact);
            };
            
            updateRequest.onerror = function(event) {
                console.error('Error updating contact:', event.target.error);
                
                if (event.target.error.name === 'ConstraintError') {
                    const field = event.target.error.message.includes('mobile') ? 'mobile number' : 'email';
                    showStatus(`Error: This ${field} already exists`, 'error');
                    reject(`Duplicate ${field}`);
                } else {
                    showStatus('Error updating contact', 'error');
                    reject(event.target.error);
                }
            };
        };
        
        getRequest.onerror = function(event) {
            reject(event.target.error);
        };
    });
}

// Delete a contact
function deleteContact(id) {
    return new Promise((resolve, reject) => {
        if (!isInitialized) {
            reject('Database not initialized');
            return;
        }

        const transaction = db.transaction([DB_CONFIG.storeName], 'readwrite');
        const store = transaction.objectStore(DB_CONFIG.storeName);
        const request = store.delete(id);

        request.onsuccess = function() {
            showStatus('Contact deleted successfully', 'success');
            updateStorageInfo();
            resolve(true);
        };

        request.onerror = function(event) {
            console.error('Error deleting contact:', event.target.error);
            showStatus('Error deleting contact', 'error');
            reject(event.target.error);
        };
    });
}

// Clear all contacts
function clearAllContacts() {
    return new Promise((resolve, reject) => {
        if (!isInitialized) {
            reject('Database not initialized');
            return;
        }

        const transaction = db.transaction([DB_CONFIG.storeName], 'readwrite');
        const store = transaction.objectStore(DB_CONFIG.storeName);
        const request = store.clear();

        request.onsuccess = function() {
            showStatus('All contacts cleared successfully', 'success');
            updateStorageInfo();
            resolve(true);
        };

        request.onerror = function(event) {
            console.error('Error clearing contacts:', event.target.error);
            showStatus('Error clearing contacts', 'error');
            reject(event.target.error);
        };
    });
}

// Search contacts
function searchContacts(searchTerm) {
    return new Promise((resolve, reject) => {
        if (!isInitialized) {
            reject('Database not initialized');
            return;
        }

        if (!searchTerm || searchTerm.trim() === '') {
            // If empty search, return all contacts
            getAllContacts().then(resolve).catch(reject);
            return;
        }

        const term = searchTerm.toLowerCase().trim();
        const results = [];
        
        const transaction = db.transaction([DB_CONFIG.storeName], 'readonly');
        const store = transaction.objectStore(DB_CONFIG.storeName);
        
        // We'll search through all records since we need to check multiple fields
        const request = store.openCursor();
        
        request.onsuccess = function(event) {
            const cursor = event.target.result;
            if (cursor) {
                const contact = cursor.value;
                
                // Search in name, mobile, email, and address
                if (contact.name.toLowerCase().includes(term) ||
                    contact.mobile.includes(term) ||
                    contact.email.toLowerCase().includes(term) ||
                    (contact.address && contact.address.toLowerCase().includes(term))) {
                    results.push(contact);
                }
                
                cursor.continue();
            } else {
                resolve(results);
            }
        };
        
        request.onerror = function(event) {
            reject(event.target.error);
        };
    });
}

// ============ DATA IMPORT/EXPORT ============
// Export contacts to JSON file
function exportContacts() {
    return new Promise(async (resolve, reject) => {
        try {
            const contacts = await getAllContacts();
            const exportData = {
                version: DB_CONFIG.version,
                database: DB_CONFIG.name,
                exportedAt: new Date().toISOString(),
                count: contacts.length,
                contacts: contacts
            };
            
            const dataStr = JSON.stringify(exportData, null, 2);
            const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
            
            const link = document.createElement('a');
            link.setAttribute('href', dataUri);
            link.setAttribute('download', `contacts-export-${new Date().toISOString().slice(0, 10)}.json`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            showStatus(`Exported ${contacts.length} contacts successfully`, 'success');
            resolve(exportData);
        } catch (error) {
            console.error('Export error:', error);
            showStatus('Error exporting contacts', 'error');
            reject(error);
        }
    });
}

// Import contacts from JSON file
function importContacts(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = async function(event) {
            try {
                const importData = JSON.parse(event.target.result);
                
                // Validate import data structure
                if (!importData.contacts || !Array.isArray(importData.contacts)) {
                    throw new Error('Invalid import file format');
                }
                
                let importedCount = 0;
                let skippedCount = 0;
                
                for (const contact of importData.contacts) {
                    try {
                        // Basic validation
                        if (contact.name && contact.mobile && contact.email) {
                            await addContact(contact);
                            importedCount++;
                        } else {
                            skippedCount++;
                        }
                    } catch (error) {
                        // Skip duplicate contacts
                        if (error === 'Duplicate mobile' || error === 'Duplicate email') {
                            skippedCount++;
                        } else {
                            console.error('Error importing contact:', error);
                        }
                    }
                }
                
                showStatus(`Imported ${importedCount} contacts, skipped ${skippedCount}`, 'success');
                resolve({ imported: importedCount, skipped: skippedCount });
            } catch (error) {
                console.error('Import error:', error);
                showStatus('Error importing contacts: Invalid file format', 'error');
                reject(error);
            }
        };
        
        reader.onerror = function() {
            showStatus('Error reading file', 'error');
            reject('File read error');
        };
        
        reader.readAsText(file);
    });
}

// ============ UTILITY FUNCTIONS ============
// Show status message
function showStatus(message, type = 'info') {
    const statusEl = document.getElementById('statusMessage');
    if (statusEl) {
        statusEl.textContent = message;
        statusEl.className = `status ${type}`;
        statusEl.style.display = 'block';
        
        // Auto-hide after 5 seconds for success messages
        if (type === 'success') {
            setTimeout(() => {
                statusEl.style.display = 'none';
            }, 5000);
        }
    }
}

// Update storage information
async function updateStorageInfo() {
    if (navigator.storage && navigator.storage.estimate) {
        try {
            const estimate = await navigator.storage.estimate();
            const usageMB = (estimate.usage / 1024 / 1024).toFixed(2);
            const quotaMB = (estimate.quota / 1024 / 1024).toFixed(2);
            const percentage = ((estimate.usage / estimate.quota) * 100).toFixed(1);
            
            document.getElementById('storageQuota').textContent = `${quotaMB} MB`;
            
            const storageStatus = document.getElementById('storageStatus');
            storageStatus.textContent = `${percentage}%`;
            
            // Color code based on usage
            if (percentage > 90) {
                storageStatus.style.color = '#e53e3e';
            } else if (percentage > 70) {
                storageStatus.style.color = '#ed8936';
            } else {
                storageStatus.style.color = '#48bb78';
            }
        } catch (error) {
            console.error('Error estimating storage:', error);
        }
    }
}

// Format mobile number for display
function formatMobileNumber(mobile) {
    if (!mobile) return '';
    // Format as (XXX) XXX-XXXX if 10 digits
    const cleaned = mobile.replace(/\D/g, '');
    if (cleaned.length === 10) {
        return `(${cleaned.substring(0, 3)}) ${cleaned.substring(3, 6)}-${cleaned.substring(6)}`;
    }
    return mobile;
}

// ============ TABLE RENDERING ============
async function renderContactsTable(filteredContacts = null) {
    try {
        const contacts = filteredContacts || await getAllContacts();
        const tableBody = document.getElementById('tableBody');
        const totalContactsEl = document.getElementById('totalContacts');
        const searchResultsEl = document.getElementById('searchResults');
        
        // Clear the table
        tableBody.innerHTML = '';
        
        // Update counters
        totalContactsEl.textContent = contacts.length;
        searchResultsEl.textContent = filteredContacts ? contacts.length : '-';
        
        if (contacts.length === 0) {
            const emptyRow = document.createElement('tr');
            emptyRow.innerHTML = `
                <td colspan="6" class="empty-table">
                    ${filteredContacts ? 'No matching contacts found' : 'No contacts yet. Add your first contact!'}
                </td>
            `;
            tableBody.appendChild(emptyRow);
            return;
        }
        
        // Sort contacts by name
        contacts.sort((a, b) => a.name.localeCompare(b.name));
        
        // Add each contact as a row
        contacts.forEach(contact => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${contact.id}</td>
                <td><strong>${contact.name}</strong></td>
                <td>${formatMobileNumber(contact.mobile)}</td>
                <td><a href="mailto:${contact.email}">${contact.email}</a></td>
                <td>${contact.address || '—'}</td>
                <td class="actions">
                    <button class="btn btn-warning edit-btn" data-id="${contact.id}">Edit</button>
                    <button class="btn btn-danger delete-btn" data-id="${contact.id}">Delete</button>
                </td>
            `;
            tableBody.appendChild(row);
        });
        
        // Add event listeners to action buttons
        attachTableEventListeners();
        
    } catch (error) {
        console.error('Error rendering contacts table:', error);
        showStatus('Error loading contacts', 'error');
    }
}

function attachTableEventListeners() {
    // Edit buttons
    document.querySelectorAll('.edit-btn').forEach(button => {
        button.addEventListener('click', async function() {
            const id = Number(this.getAttribute('data-id'));
            try {
                const contact = await getContact(id);
                if (contact) {
                    // Populate edit form
                    document.getElementById('editId').value = contact.id;
                    document.getElementById('editName').value = contact.name;
                    document.getElementById('editMobile').value = contact.mobile;
                    document.getElementById('editEmail').value = contact.email;
                    document.getElementById('editAddress').value = contact.address || '';
                    
                    // Show edit form
                    document.getElementById('editForm').style.display = 'block';
                    document.getElementById('contactForm').style.display = 'none';
                    
                    // Scroll to form
                    document.querySelector('.form-section').scrollIntoView({ behavior: 'smooth' });
                }
            } catch (error) {
                console.error('Error loading contact for edit:', error);
                showStatus('Error loading contact details', 'error');
            }
        });
    });
    
    // Delete buttons
    document.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', async function() {
            const id = Number(this.getAttribute('data-id'));
            const row = this.closest('tr');
            const contactName = row.querySelector('td:nth-child(2)').textContent;
            
            if (confirm(`Are you sure you want to delete "${contactName}"?`)) {
                try {
                    await deleteContact(id);
                    await renderContactsTable();
                } catch (error) {
                    console.error('Error deleting contact:', error);
                }
            }
        });
    });
}

// ============ INITIALIZATION AND EVENT HANDLERS ============
document.addEventListener('DOMContentLoaded', async function() {
    // Initialize database
    try {
        await initDatabase();
        await renderContactsTable();
    } catch (error) {
        console.error('Failed to initialize database:', error);
    }
    
    // Form submission handler - Add new contact
    document.getElementById('contactForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const contact = {
            name: document.getElementById('name').value.trim(),
            mobile: document.getElementById('mobile').value.trim(),
            email: document.getElementById('email').value.trim().toLowerCase(),
            address: document.getElementById('address').value.trim()
        };
        
        try {
            await addContact(contact);
            await renderContactsTable();
            
            // Clear the form
            document.getElementById('contactForm').reset();
        } catch (error) {
            console.error('Error adding contact:', error);
        }
    });
    
    // Update contact form
    document.getElementById('updateContactForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const id = Number(document.getElementById('editId').value);
        const updatedData = {
            name: document.getElementById('editName').value.trim(),
            mobile: document.getElementById('editMobile').value.trim(),
            email: document.getElementById('editEmail').value.trim().toLowerCase(),
            address: document.getElementById('editAddress').value.trim()
        };
        
        try {
            await updateContact(id, updatedData);
            await renderContactsTable();
            
            // Hide edit form and show add form
            document.getElementById('editForm').style.display = 'none';
            document.getElementById('contactForm').style.display = 'block';
            document.getElementById('updateContactForm').reset();
        } catch (error) {
            console.error('Error updating contact:', error);
        }
    });
    
    // Cancel edit
    document.getElementById('cancelEdit').addEventListener('click', function() {
        document.getElementById('editForm').style.display = 'none';
        document.getElementById('contactForm').style.display = 'block';
        document.getElementById('updateContactForm').reset();
    });
    
    // Clear form button
    document.getElementById('clearForm').addEventListener('click', function() {
        document.getElementById('contactForm').reset();
        showStatus('Form cleared', 'success');
    });
    
    // Export data button
    document.getElementById('exportData').addEventListener('click', async function() {
        try {
            await exportContacts();
        } catch (error) {
            console.error('Error exporting data:', error);
        }
    });
    
    // Import data button
    document.getElementById('importData').addEventListener('click', function() {
        document.getElementById('importFile').click();
    });
    
    // Import file change handler
    document.getElementById('importFile').addEventListener('change', async function(e) {
        if (e.target.files.length > 0) {
            try {
                await importContacts(e.target.files[0]);
                await renderContactsTable();
                e.target.value = ''; // Reset file input
            } catch (error) {
                console.error('Error importing data:', error);
            }
        }
    });
    
    // Clear all data button
    document.getElementById('clearAll').addEventListener('click', async function() {
        if (confirm('Are you sure you want to delete ALL contacts? This action cannot be undone.')) {
            try {
                await clearAllContacts();
                await renderContactsTable();
            } catch (error) {
                console.error('Error clearing all contacts:', error);
            }
        }
    });
    
    // Search functionality
    document.getElementById('searchInput').addEventListener('input', async function() {
        const searchTerm = this.value;
        try {
            const results = await searchContacts(searchTerm);
            await renderContactsTable(results);
        } catch (error) {
            console.error('Error searching contacts:', error);
        }
    });
    
    // Clear search button
    document.getElementById('clearSearch').addEventListener('click', function() {
        document.getElementById('searchInput').value = '';
        renderContactsTable();
    });
    
    // Refresh table button
    document.getElementById('refreshTable').addEventListener('click', async function() {
        try {
            await renderContactsTable();
            showStatus('Table refreshed', 'success');
        } catch (error) {
            console.error('Error refreshing table:', error);
        }
    });
    
    // Initialize storage info
    updateStorageInfo();
    
    // Periodically update storage info (every minute)
    setInterval(updateStorageInfo, 60000);
});
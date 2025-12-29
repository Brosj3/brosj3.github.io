const API_URL = 'http://localhost:3000/api';

// DOM Elements
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const loginBox = document.getElementById('login-form');
const registerBox = document.getElementById('register-form');
const dashboard = document.getElementById('dashboard');

// Form switching
function showRegister() {
    loginBox.classList.remove('active');
    registerBox.classList.add('active');
    clearMessages();
}

function showLogin() {
    registerBox.classList.remove('active');
    loginBox.classList.add('active');
    clearMessages();
}

// Toggle password visibility
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const icon = input.nextElementSibling;
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

// Clear all messages
function clearMessages() {
    document.querySelectorAll('.message').forEach(msg => {
        msg.textContent = '';
        msg.className = 'message';
    });
}

// Show message
function showMessage(elementId, message, type) {
    const element = document.getElementById(elementId);
    element.textContent = message;
    element.className = `message ${type}`;
    setTimeout(() => {
        element.className = 'message';
        element.textContent = '';
    }, 5000);
}

// Register form submission
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('registerUsername').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    // Basic validation
    if (password !== confirmPassword) {
        showMessage('registerMessage', 'Passwords do not match!', 'error');
        return;
    }
    
    if (password.length < 6) {
        showMessage('registerMessage', 'Password must be at least 6 characters!', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage('registerMessage', 'Registration successful! Please login.', 'success');
            registerForm.reset();
            setTimeout(() => showLogin(), 2000);
        } else {
            showMessage('registerMessage', data.error || 'Registration failed!', 'error');
        }
    } catch (error) {
        showMessage('registerMessage', 'Network error. Please try again.', 'error');
    }
});

// Login form submission
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Store user data
            localStorage.setItem('user', JSON.stringify(data.user));
            showDashboard(data.user);
            loginForm.reset();
        } else {
            showMessage('loginMessage', data.error || 'Login failed!', 'error');
        }
    } catch (error) {
        showMessage('loginMessage', 'Network error. Please try again.', 'error');
    }
});

// Show dashboard
function showDashboard(user) {
    loginBox.classList.remove('active');
    registerBox.classList.remove('active');
    dashboard.classList.add('active');
    
    document.getElementById('welcomeUser').textContent = user.username;
    document.getElementById('dashboardUsername').textContent = user.username;
    document.getElementById('dashboardEmail').textContent = user.email;
    document.getElementById('accountDate').textContent = new Date(user.createdAt).toLocaleDateString();
}

// Logout function
function logout() {
    localStorage.removeItem('user');
    dashboard.classList.remove('active');
    loginBox.classList.add('active');
    clearMessages();
}

// Check if user is already logged in
window.addEventListener('DOMContentLoaded', () => {
    const userData = localStorage.getItem('user');
    if (userData) {
        const user = JSON.parse(userData);
        showDashboard(user);
    }
});
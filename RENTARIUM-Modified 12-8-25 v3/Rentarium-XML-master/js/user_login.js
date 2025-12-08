// Initialize localStorage with demo data on first load
function initializeData() {
    if (!localStorage.getItem('rentarium_initialized')) {
        const users = [
            { id: 1, username: 'admin', password: 'admin123', fullName: 'System Administrator', email: 'admin@rentarium.com', role: 'admin' },
            { id: 2, username: 'user', password: 'user123', fullName: 'System User', email: 'user@rentarium.com', role: 'tenant' }
        ];

        const rooms = [
            { id: 1, roomNumber: '101', roomType: 'Studio Type', sizeSqm: 20, monthlyRent: 5000, amenities: 'WiFi, Water Included', status: 'available' }
        ];

        const announcements = [
            { id: 1, title: 'Welcome to Rentarium', message: 'Thank you for choosing Rentarium as your rental home. Please read the house rules carefully.', priority: 'high', createdAt: '2024-12-01T10:00:00', status: 'active' }
        ];

        localStorage.setItem('rentarium_users', JSON.stringify(users));
        localStorage.setItem('rentarium_rooms', JSON.stringify(rooms));
        localStorage.setItem('rentarium_announcements', JSON.stringify(announcements));
        localStorage.setItem('rentarium_initialized', 'true');
    }
}

// Form validation
function validateForm() {
    const username = document.getElementById('username');
    const password = document.getElementById('password');
    const usernameError = document.getElementById('usernameError');
    const passwordError = document.getElementById('passwordError');
    let isValid = true;

    username.classList.remove('error');
    password.classList.remove('error');
    usernameError.style.display = 'none';
    passwordError.style.display = 'none';

    if (username.value.trim() === '') {
        username.classList.add('error');
        usernameError.textContent = 'Username is required';
        usernameError.style.display = 'block';
        isValid = false;
    } else if (username.value.trim().length < 3) {
        username.classList.add('error');
        usernameError.textContent = 'Username must be at least 3 characters';
        usernameError.style.display = 'block';
        isValid = false;
    }

    if (password.value.trim() === '') {
        password.classList.add('error');
        passwordError.textContent = 'Password is required';
        passwordError.style.display = 'block';
        isValid = false;
    } else if (password.value.length < 6) {
        password.classList.add('error');
        passwordError.textContent = 'Password must be at least 6 characters';
        passwordError.style.display = 'block';
        isValid = false;
    }

    return isValid;
}

// Login function - checks both admin users and tenants with status
function login(username, password) {
    const users = JSON.parse(localStorage.getItem('rentarium_users')) || [];
    let user = users.find(u => u.username === username && u.password === password);

    if (user) {
        const session = {
            userId: user.id,
            username: user.username,
            fullName: user.fullName,
            email: user.email,
            role: user.role,
            loginTime: new Date().toISOString()
        };
        localStorage.setItem('rentarium_session', JSON.stringify(session));
        return { success: true, user: session };
    }

    const tenants = JSON.parse(localStorage.getItem('tenants')) || [];
    const tenant = tenants.find(t => t.username === username && t.password === password);

    if (tenant) {
        // Check tenant status
        switch (tenant.status.toLowerCase()) {
            case 'active':
                const session = {
                    userId: tenant.tenantId,
                    username: tenant.username,
                    fullName: tenant.name,
                    email: tenant.email,
                    role: 'tenant',
                    tenantId: tenant.tenantId,
                    unitAssigned: tenant.unitAssigned,
                    loginTime: new Date().toISOString()
                };
                localStorage.setItem('rentarium_session', JSON.stringify(session));
                return { success: true, user: session };

            case 'pending':
                return { success: false, error: 'Your account is pending approval.' };
            case 'expired':
                return { success: false, error: 'Your account has expired.' };
            case 'inactive':
                return { success: false, error: 'Your account is inactive.' };
            default:
                return { success: false, error: `Cannot login: ${tenant.status}` };
        }
    }

    return { success: false, error: 'Invalid username or password' };
}

// Toggle password visibility
function togglePasswordVisibility() {
    const passwordField = document.getElementById('password');
    const toggleIcon = document.getElementById('togglePassword');
    
    if (passwordField && toggleIcon) {
        if (passwordField.type === 'password') {
            passwordField.type = 'text';
            toggleIcon.textContent = '👁️';
        } else {
            passwordField.type = 'password';
            toggleIcon.textContent = '👁️‍🗨️';
        }
    }
}

// Handle form submission
document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();

    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');
    const loginBtn = document.getElementById('loginBtn');

    errorMessage.style.display = 'none';
    successMessage.style.display = 'none';

    if (!validateForm()) return;

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    loginBtn.disabled = true;
    loginBtn.textContent = 'Logging in...';

    setTimeout(() => {
        const result = login(username, password);

        if (result.success) {
            successMessage.textContent = 'Login successful! Redirecting...';
            successMessage.style.color = 'green';
            successMessage.style.display = 'block';

            setTimeout(() => {
                if (result.user.role === 'admin') {
                    window.location.href = '../ADMIN/Admin-Dashboard.html';
                } else {
                    window.location.href = '../Users/User-Dashboard.html';
                }
            }, 1000);
        } else {
            errorMessage.textContent = result.error;
            errorMessage.style.display = 'block';
            loginBtn.disabled = false;
            loginBtn.textContent = 'Login';
        }
    }, 500);
});

// Check if already logged in
window.addEventListener('load', function() {
    initializeData();
    
    const session = localStorage.getItem('rentarium_session');
    if (session) {
        const user = JSON.parse(session);
        if (user.role === 'admin') {
            window.location.href = '../ADMIN/Admin-Dashboard.html';
        } else {
            window.location.href = '../Users/User-Dashboard.html';
        }
    }

    // Attach password toggle event listener
    const togglePassword = document.getElementById('togglePassword');
    if (togglePassword) {
        togglePassword.addEventListener('click', togglePasswordVisibility);
    }
});

// Real-time validation
document.getElementById('username').addEventListener('input', function() {
    if (this.value.trim() !== '') {
        this.classList.remove('error');
        document.getElementById('usernameError').style.display = 'none';
    }
});

document.getElementById('password').addEventListener('input', function() {
    if (this.value !== '') {
        this.classList.remove('error');
        document.getElementById('passwordError').style.display = 'none';
    }
});
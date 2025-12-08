(function () {
  // CONFIG: change this if your tenants management page path differs
  const TENANTS_PAGE = '../ADMIN/Tenants-Section.html';

  // Helpers for localStorage
  function readJSON(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch (e) { return fallback; }
  }
  function writeJSON(key, value) { 
    localStorage.setItem(key, JSON.stringify(value)); 
  }

  // Initialize units if not present
  if (!localStorage.getItem('units')) {
    const sampleUnits = {
      "U001": { type: "Studio", price: 7500, status: "Vacant" },
      "U002": { type: "1BR", price: 9500, status: "Vacant" },
      "U003": { type: "2BR", price: 12000, status: "Vacant" }
    };
    writeJSON('units', sampleUnits);
  }

  // Generate tenant ID (TEN001, TEN002, etc.)
  function generateTenantId(tenants) {
    if (!tenants || tenants.length === 0) return 'TEN001';
    const nums = tenants
      .map(t => (t.tenantId || '').match(/\d+$/))
      .filter(m => m)
      .map(m => parseInt(m[0], 10));
    const next = (nums.length === 0) ? 1 : Math.max(...nums) + 1;
    return 'TEN' + String(next).padStart(3, '0');
  }

  // DOM
  const form = document.getElementById('tenantAccountForm') || document.getElementById('tenantForm');
  if (!form) {
    console.warn('Create Tenant: form element not found');
    return;
  }

  // Toast notification
  function showToast(message, type = 'success') {
    let t = document.createElement('div');
    t.className = 'rt-toast rt-toast-' + type;
    t.textContent = message;
    Object.assign(t.style, {
      position: 'fixed', 
      right: '24px', 
      bottom: '24px',
      background: type === 'success' ? '#10b981' : '#ef4444',
      color: '#fff', 
      padding: '12px 20px', 
      borderRadius: '8px', 
      boxShadow: '0 6px 18px rgba(0,0,0,.15)', 
      zIndex: 9999,
      fontSize: '14px',
      fontWeight: '500'
    });
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  }

  // Validation
  function validateForm(data) {
    if (!data.name || data.name.trim().length < 2) return 'Name is required (minimum 2 characters)';
    if (!data.username || data.username.trim().length < 4) return 'Username must be at least 4 characters';
    if (!data.email || !/^\S+@\S+\.\S+$/.test(data.email)) return 'Valid email is required';
    if (!data.phone || data.phone.trim().length < 10) return 'Valid phone number is required';
    if (!data.password || data.password.length < 8) return 'Password must be at least 8 characters';
    if (!data.unitAssigned) return 'Please select a unit';
    if (!data.leaseStart || !data.leaseEnd) return 'Lease start and end dates are required';
    if (new Date(data.leaseEnd) <= new Date(data.leaseStart)) return 'Lease end must be after lease start';
    return null;
  }

  // Password confirmation validation
  const pwd = document.getElementById('password');
  const confirmPwd = document.getElementById('confirmPassword');
  if (pwd && confirmPwd) {
    form.addEventListener('input', () => {
      if (confirmPwd.value && pwd.value !== confirmPwd.value) {
        confirmPwd.setCustomValidity('Passwords do not match');
      } else {
        confirmPwd.setCustomValidity('');
      }
    });
  }

  // Form submission
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    // Collect form data
    const firstName = (document.getElementById('firstName')?.value || '').trim();
    const lastName = (document.getElementById('lastName')?.value || '').trim();
    const name = (firstName || lastName) 
      ? `${firstName} ${lastName}`.trim() 
      : (document.getElementById('name')?.value || '').trim();

    const username = (document.getElementById('username')?.value || '').trim();
    const email = (document.getElementById('email')?.value || '').trim();
    const phone = (document.getElementById('phone')?.value || '').trim();
    const password = (document.getElementById('password')?.value || '').trim();
    const unitAssigned = (document.getElementById('unitNumber')?.value || document.getElementById('unitAssigned')?.value || '').trim();
    const leaseStart = (document.getElementById('leaseStart')?.value || '').trim();
    const leaseEnd = (document.getElementById('leaseEnd')?.value || '').trim();
    const status = (document.getElementById('status')?.value || 'active').toLowerCase();
    const notes = (document.getElementById('notes')?.value || '').trim();
    const deposit = parseInt(document.getElementById('securityDeposit')?.value || document.getElementById('deposit')?.value || 0, 10);
    const rentAmount = parseInt(document.getElementById('monthlyRent')?.value || document.getElementById('rentAmount')?.value || 0, 10);

    // Load existing data
    const tenants = readJSON('tenants', []);
    const units = readJSON('units', {});

    // Check for duplicates
    if (tenants.some(t => t.username === username)) {
      showToast('Username already exists', 'error');
      return;
    }
    if (tenants.some(t => t.email === email)) {
      showToast('Email already in use', 'error');
      return;
    }

    // Validate
    const formData = {
      name,
      username,
      email,
      phone,
      password,
      unitAssigned,
      leaseStart,
      leaseEnd
    };

    const validationError = validateForm(formData);
    if (validationError) {
      showToast(validationError, 'error');
      return;
    }

    // Create new tenant
    const newId = generateTenantId(tenants);

    const newTenant = {
      tenantId: newId,
      name: name,
      username: username,
      email: email,
      password: password,
      phone: phone,
      unitAssigned: unitAssigned,
      leaseStart: leaseStart,
      leaseEnd: leaseEnd,
      status: status,
      notes: notes,
      deposit: deposit,
      rentAmount: rentAmount,
      dateCreated: new Date().toISOString()
    };

    // Add to tenants array
    tenants.push(newTenant);
    writeJSON('tenants', tenants);

    // Update unit status
    if (units && units[unitAssigned]) {
      units[unitAssigned].status = 'Occupied';
      writeJSON('units', units);
    }

    // Log activity
    const activityLog = readJSON('activityLog', []);
    activityLog.push({
      id: 'ACT' + Date.now(),
      action: `Tenant ${newTenant.tenantId} created by Admin`,
      actor: 'Admin',
      date: new Date().toISOString(),
      details: { 
        tenantId: newTenant.tenantId, 
        username: newTenant.username,
        name: newTenant.name,
        unit: newTenant.unitAssigned
      }
    });
    writeJSON('activityLog', activityLog);

    console.log('New tenant created:', newTenant);

    // Show success message
    showToast('Tenant account created successfully!', 'success');

    // Trigger storage event for other tabs
    window.dispatchEvent(new Event('storage'));

    // Redirect to tenants page
    setTimeout(() => {
      if (TENANTS_PAGE) {
        window.location.href = TENANTS_PAGE;
      }
    }, 1000);
  });

  // Populate unit dropdown
  function populateUnits() {
    const select = document.getElementById('unitNumber') || document.getElementById('unitAssigned');
    if (!select) return;
    
    const units = readJSON('units', {});
    select.innerHTML = '<option value="">Select a unit</option>';
    
    for (const [id, u] of Object.entries(units)) {
      const isVacant = u.status === 'Vacant';
      select.insertAdjacentHTML('beforeend', 
        `<option value="${id}" ${!isVacant ? 'disabled' : ''}>
          ${id} - ${u.type} (${u.status})
        </option>`
      );
    }
  }

  // Initialize on page load
  document.addEventListener('DOMContentLoaded', populateUnits);
  
  // Listen for storage changes
  window.addEventListener('storage', populateUnits);
})();

// AUTO-FILL MONTHLY RENT AND SECURITY DEPOSIT WHEN UNIT IS SELECTED
document.addEventListener("DOMContentLoaded", () => {
    const unitSelect = document.getElementById("unitNumber");
    const monthlyRentInput = document.getElementById("monthlyRent");
    const securityDepositInput = document.getElementById("securityDeposit");

    if (!unitSelect || !monthlyRentInput) return;

    unitSelect.addEventListener("change", () => {
        const selectedUnit = unitSelect.value;
        const units = JSON.parse(localStorage.getItem("units")) || {};

        if (units[selectedUnit]) {
            const unitPrice = units[selectedUnit].price;
            
            // AUTO-FILL MONTHLY RENT
            monthlyRentInput.value = unitPrice;
            
            // AUTO-FILL SECURITY DEPOSIT (2 months rent)
            // Change multiplier to 1 if you want 1 month deposit
            if (securityDepositInput) {
                securityDepositInput.value = unitPrice * 1;
            }
        } else {
            monthlyRentInput.value = "";
            if (securityDepositInput) {
                securityDepositInput.value = "";
            }
        }
    });
});
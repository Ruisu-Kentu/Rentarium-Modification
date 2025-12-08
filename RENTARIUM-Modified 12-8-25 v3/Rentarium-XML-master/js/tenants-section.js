/* tenants-section.js - Enhanced with Automatic Contract Termination Sync */

(function () {
  'use strict';
  
  function readJSON(key, fallback) {
    try { 
      return JSON.parse(localStorage.getItem(key)) ?? fallback; 
    }
    catch (e) { 
      console.warn('readJSON error', key, e); 
      return fallback; 
    }
  }
  
  function writeJSON(key, value) {
    try { 
      localStorage.setItem(key, JSON.stringify(value)); 
    }
    catch (e) { 
      console.error('writeJSON error', key, e); 
    }
  }

  /* ---------------------------
     Default sample data
  --------------------------- */
  const sampleTenants = [
    { 
      tenantId: 'TEN001', 
      name: 'John Smith', 
      username: 'johnsmith', 
      password: 'password123', 
      email: 'john.smith@email.com', 
      phone: '09123456789', 
      unitAssigned: 'A-101', 
      rentAmount: 15000, 
      leaseStart: '2024-01-15', 
      leaseEnd: '2025-01-14', 
      status: 'active', 
      deposit: 30000, 
      notes: 'Good tenant, pays on time', 
      dateCreated: '2024-01-01T00:00:00Z' 
    }
  ];

  const sampleUnits = {
    "A-101": { 
      type: "1BR", 
      price: 15000, 
      status: "Occupied",
      tenantId: "TEN001",
      tenantName: "John Smith",
      moveInDate: "2024-01-15"
    },
    "A-102": { 
      type: "Studio", 
      price: 17000, 
      status: "Vacant",
      tenantId: null,
      tenantName: "",
      moveInDate: ""
    },
    "A-103": { 
      type: "2BR", 
      price: 25000, 
      status: "Vacant",
      tenantId: null,
      tenantName: "",
      moveInDate: ""
    },
    "A-104": { 
      type: "1BR", 
      price: 15000, 
      status: "Vacant",
      tenantId: null,
      tenantName: "",
      moveInDate: ""
    },
    "A-105": { 
      type: "Studio", 
      price: 17000, 
      status: "Maintenance",
      tenantId: null,
      tenantName: "",
      moveInDate: ""
    }
  };

  /* ---------------------------
     App state
  --------------------------- */
  let tenants = [];
  let units = {};
  let currentView = 'table';
  let editingId = null;
  let refs = {};
  let syncCheckInterval = null;

  /* ---------------------------
     Utilities
  --------------------------- */
  function formatDate(d) { 
    if (!d) return 'N/A'; 
    try { 
      return new Date(d).toLocaleDateString(); 
    } catch { 
      return d; 
    } 
  }
  
  function getInitials(name) { 
    return (name || '').split(' ').map(p => p[0] || '').slice(0,2).join('').toUpperCase(); 
  }
  
  function capitalize(s) { 
    return (s || '').toString().charAt(0).toUpperCase() + (s || '').toString().slice(1); 
  }
  
  function escapeHtml(s) { 
    return String(s || '').replace(/[&<>"']/g, m => ({ 
      '&':'&amp;',
      '<':'&lt;',
      '>':'&gt;',
      '"':'&quot;',
      "'":'&#39;'
    }[m])); 
  }

  function generateTenantId(tenants) {
    if (!tenants || tenants.length === 0) return 'TEN001';
    const nums = tenants
      .map(t => (t.tenantId || '').match(/\d+$/))
      .filter(m => m)
      .map(m => parseInt(m[0], 10));
    const next = (nums.length === 0) ? 1 : Math.max(...nums) + 1;
    return 'TEN' + String(next).padStart(3, '0');
  }

  /* ---------------------------
     Initialize storage
  --------------------------- */
  function ensureInitialData() {
    if (!localStorage.getItem('tenants')) writeJSON('tenants', sampleTenants);
    if (!localStorage.getItem('units')) writeJSON('units', sampleUnits);
    if (!localStorage.getItem('activityLog')) writeJSON('activityLog', []);
  }

  /* ---------------------------
     Activity Log
  --------------------------- */
  function appendActivity(message, data) {
    const log = readJSON('activityLog', []);
    log.push({
      id: 'ACT' + Date.now(),
      message, 
      data, 
      timestamp: new Date().toISOString()
    });
    writeJSON('activityLog', log);
  }

  /* ---------------------------
     🔥 AUTOMATIC CONTRACT TERMINATION SYNC - CORE FUNCTION
  --------------------------- */
  function syncContractTerminations() {
    const contracts = readJSON('rental_contracts', {});
    let hasChanges = false;
    let terminatedCount = 0;

    tenants = tenants.map(tenant => {
      const contract = contracts[tenant.username];
      
      // Check if contract exists and is terminated
      if (contract && contract.terminated) {
        
        // Only update if tenant is not already terminated
        if (tenant.status !== 'terminated') {
          console.log(`🔴 Auto-terminating tenant: ${tenant.name} (${tenant.username})`);
          
          // Update tenant status to terminated
          tenant.status = 'terminated';
          
          // Store termination details
          tenant.terminationDate = contract.terminatedDate;
          tenant.terminatedBy = contract.terminatedBy;
          tenant.terminationReason = contract.terminationReason;
          
          // Free up the unit
          if (tenant.unitAssigned && units[tenant.unitAssigned]) {
            units[tenant.unitAssigned].status = 'Vacant';
            units[tenant.unitAssigned].tenantId = null;
            units[tenant.unitAssigned].tenantName = '';
            units[tenant.unitAssigned].moveInDate = '';
            console.log(`🏠 Unit ${tenant.unitAssigned} set to Vacant`);
          }
          
          hasChanges = true;
          terminatedCount++;
          
          // Log the auto-termination
          appendActivity(
            `Auto-terminated tenant ${tenant.tenantId} - Contract terminated by ${contract.terminatedBy}`,
            { 
              tenantId: tenant.tenantId,
              username: tenant.username,
              terminatedBy: contract.terminatedBy,
              terminationDate: contract.terminatedDate,
              reason: contract.terminationReason
            }
          );
        }
      }
      
      return tenant;
    });

    // Save changes if any terminations occurred
    if (hasChanges) {
      writeJSON('tenants', tenants);
      writeJSON('units', units);
      console.log(`✅ Synced ${terminatedCount} terminated contract(s)`);
      
      // Refresh the UI
      renderStats();
      populateUnitFilter();
      filterTenants();
      
      // Show notification
      showSyncNotification(terminatedCount);
    }
    
    return terminatedCount;
  }

  /* ---------------------------
     Show sync notification
  --------------------------- */
  function showSyncNotification(count) {
    // Create notification element if it doesn't exist
    let notification = document.getElementById('syncNotification');
    
    if (!notification) {
      notification = document.createElement('div');
      notification.id = 'syncNotification';
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
        z-index: 10000;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 12px;
        animation: slideIn 0.3s ease-out;
      `;
      document.body.appendChild(notification);
      
      // Add animation
      const style = document.createElement('style');
      style.textContent = `
        @keyframes slideIn {
          from { transform: translateX(400px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(400px); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }
    
    notification.innerHTML = `
      <span style="font-size: 20px;">⚠️</span>
      <span>${count} tenant${count > 1 ? 's' : ''} auto-terminated due to contract termination</span>
    `;
    
    notification.style.display = 'flex';
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease-out';
      setTimeout(() => {
        notification.style.display = 'none';
      }, 300);
    }, 5000);
  }

  /* ---------------------------
     Start automatic sync checking
  --------------------------- */
  function startAutoSync() {
    // Run initial sync
    syncContractTerminations();
    
    // Set up interval to check every 3 seconds
    syncCheckInterval = setInterval(() => {
      syncContractTerminations();
    }, 3000);
    
    console.log('✅ Auto-sync started - checking every 3 seconds');
  }

  /* ---------------------------
     Stop automatic sync checking
  --------------------------- */
  function stopAutoSync() {
    if (syncCheckInterval) {
      clearInterval(syncCheckInterval);
      syncCheckInterval = null;
      console.log('🛑 Auto-sync stopped');
    }
  }

  /* ---------------------------
     Rendering
  --------------------------- */
  function renderStats() {
    const active = tenants.filter(t => t.status === 'active').length;
    const pending = tenants.filter(t => t.status === 'pending').length;
    const terminated = tenants.filter(t => t.status === 'terminated').length;
    const totalRevenue = tenants.filter(t => t.status === 'active')
      .reduce((s,t) => s + (t.rentAmount || 0), 0);

    if (!refs.statsSummary) return;
    refs.statsSummary.innerHTML = `
      <div class="stat-card">
        <div class="stat-value">${tenants.length}</div>
        <div class="stat-label">Total Tenants</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${active}</div>
        <div class="stat-label">Active</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${pending}</div>
        <div class="stat-label">Pending</div>
      </div>
      <div class="stat-card" style="${terminated > 0 ? 'background: #fee2e2; border: 2px solid #ef4444;' : ''}">
        <div class="stat-value" style="${terminated > 0 ? 'color: #991b1b;' : ''}">${terminated}</div>
        <div class="stat-label">Terminated</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">₱${totalRevenue.toLocaleString()}</div>
        <div class="stat-label">Monthly Revenue</div>
      </div>
    `;
  }

  function renderTable(list) {
    if (!refs.tenantsTbody) return;
    if (!list || list.length === 0) {
      refs.tenantsTbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:40px;color:#94a3b8">No tenants found</td></tr>';
      return;
    }
    refs.tenantsTbody.innerHTML = list.map(t => {
      const rowStyle = t.status === 'terminated' ? 'opacity: 0.7; background: #fee2e2;' : '';
      
      return `
      <tr style="${rowStyle}">
        <td>
          <div class="tenant-info">
            <div class="tenant-avatar" style="${t.status === 'terminated' ? 'background: #ef4444;' : ''}">${getInitials(t.name || t.username)}</div>
            <div class="tenant-details">
              <h4>${escapeHtml(t.name)}</h4>
              <p>${escapeHtml(t.email)}</p>
            </div>
          </div>
        </td>
        <td>${escapeHtml(t.phone || 'N/A')}</td>
        <td>${escapeHtml(t.unitAssigned || 'N/A')}</td>
        <td>₱${(t.rentAmount || 0).toLocaleString()}</td>
        <td>${formatDate(t.leaseStart)}</td>
        <td>${formatDate(t.leaseEnd)}</td>
        <td>
          <span class="status-badge ${t.status}">${capitalize(t.status)}</span>
          ${t.status === 'terminated' && t.terminatedBy ? `<br><small style="color: #64748b; font-size: 10px;">By: ${t.terminatedBy}</small>` : ''}
        </td>
        <td>
          <div class="action-btns">
            <button class="action-btn view" data-id="${t.tenantId}">View</button>
            ${t.status !== 'terminated' ? `
              <button class="action-btn edit" data-id="${t.tenantId}">Edit</button>
              <button class="action-btn delete" data-id="${t.tenantId}">Delete</button>
            ` : '<span style="color: #94a3b8; font-size: 11px;">Terminated</span>'}
          </div>
        </td>
      </tr>
    `}).join('');
  }

  function renderGrid(list) {
    if (!refs.gridItems) return;
    if (!list || list.length === 0) {
      refs.gridItems.innerHTML = '<p style="text-align:center;padding:40px;color:#94a3b8;grid-column:1/-1">No tenants found</p>';
      return;
    }
    refs.gridItems.innerHTML = list.map(t => {
      const cardStyle = t.status === 'terminated' ? 'opacity: 0.7; background: #fee2e2; border: 2px solid #fca5a5;' : '';
      
      return `
      <div class="tenant-card" style="${cardStyle}">
        <div class="tenant-card-header">
          <div class="tenant-card-avatar" style="${t.status === 'terminated' ? 'background: #ef4444;' : ''}">${getInitials(t.name || t.username)}</div>
          <div class="tenant-card-info">
            <h4>${escapeHtml(t.name)}</h4>
            <p>${escapeHtml(t.unitAssigned)}</p>
          </div>
        </div>
        <div class="tenant-card-details">
          <div class="detail-row">
            <span class="detail-label">Email</span>
            <span class="detail-value">${escapeHtml(t.email)}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Phone</span>
            <span class="detail-value">${escapeHtml(t.phone || 'N/A')}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Rent</span>
            <span class="detail-value">₱${(t.rentAmount || 0).toLocaleString()}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Lease End</span>
            <span class="detail-value">${formatDate(t.leaseEnd)}</span>
          </div>
          <div class="detail-row" style="border:none">
            <span class="detail-label">Status</span>
            <span class="status-badge ${t.status}">${capitalize(t.status)}</span>
          </div>
          ${t.status === 'terminated' && t.terminatedBy ? `
          <div class="detail-row" style="border:none">
            <span class="detail-label">Terminated By</span>
            <span class="detail-value" style="font-size: 12px; color: #991b1b;">${t.terminatedBy}</span>
          </div>
          ` : ''}
        </div>
        <div class="action-btns">
          <button class="action-btn view" data-id="${t.tenantId}">View</button>
          ${t.status !== 'terminated' ? `
            <button class="action-btn edit" data-id="${t.tenantId}">Edit</button>
            <button class="action-btn delete" data-id="${t.tenantId}">Delete</button>
          ` : ''}
        </div>
      </div>
    `}).join('');
  }

  function renderTenants(list) { 
    if (currentView === 'table') {
      renderTable(list); 
    } else {
      renderGrid(list); 
    }
  }

  /* ---------------------------
     Filters & dropdown
  --------------------------- */
  function populateUnitFilter() {
    if (!refs.unitFilter) return;
    refs.unitFilter.innerHTML = '<option value="all">All Units</option>';
    Object.keys(units).sort().forEach(k => {
      refs.unitFilter.insertAdjacentHTML('beforeend', 
        `<option value="${k}">${k} - ${escapeHtml(units[k].type)} (${escapeHtml(units[k].status)})</option>`
      );
    });
  }

  function populateUnitDropdown() {
    if (!refs.unitNumber) return;
    refs.unitNumber.innerHTML = '<option value="">Select Unit</option>';
    Object.entries(units).forEach(([id, u]) => {
      refs.unitNumber.insertAdjacentHTML('beforeend',
        `<option value="${id}">${id} - ${u.type} (${u.status})</option>`
      );
    });
  }

  function filterTenants() {
    const q = (refs.searchInput?.value || '').toLowerCase();
    const st = (refs.statusFilter?.value || 'all');
    const unit = (refs.unitFilter?.value || 'all');

    const filtered = tenants.filter(t => {
      const matchesQuery = !q || [
        t.name, 
        t.username, 
        t.email, 
        t.phone, 
        t.unitAssigned
      ].some(f => (f || '').toString().toLowerCase().includes(q));
      
      const matchesStatus = st === 'all' || t.status === st;
      const matchesUnit = unit === 'all' || t.unitAssigned === unit;
      
      return matchesQuery && matchesStatus && matchesUnit;
    });

    renderTenants(filtered);
    
    const statusText = st === 'all' ? 'All' : capitalize(st);
    const titleEl = document.getElementById('listTitle');
    if (titleEl) titleEl.textContent = `${statusText} Tenants (${filtered.length})`;
  }

  /* ---------------------------
     View / Edit / Delete
  --------------------------- */
  window.viewTenant = function(tenantId) {
    const t = tenants.find(x => x.tenantId === tenantId);
    if (!t) return alert('Tenant not found');
    showTenantDetails(t);
  };

  window.deleteTenant = function(tenantId) {
    if (!confirm('Delete this tenant? This action cannot be undone.')) return;
    
    const t = tenants.find(x => x.tenantId === tenantId);
    tenants = tenants.filter(x => x.tenantId !== tenantId);
    writeJSON('tenants', tenants);

    // Free up the unit
    if (t && t.unitAssigned && units[t.unitAssigned]) {
      units[t.unitAssigned].status = 'Vacant';
      units[t.unitAssigned].tenantId = null;
      units[t.unitAssigned].tenantName = '';
      units[t.unitAssigned].moveInDate = '';
      writeJSON('units', units);
    }

    appendActivity(`Tenant ${tenantId} deleted by Admin`, {tenantId});
    
    renderStats(); 
    populateUnitFilter(); 
    filterTenants();
  };

  window.editTenant = function(tenantId) {
    const t = tenants.find(x => x.tenantId === tenantId);
    if (!t) return alert('Tenant not found');
    
    // Prevent editing terminated tenants
    if (t.status === 'terminated') {
      alert('Cannot edit terminated tenant. Contract has been terminated.');
      return;
    }
    
    editingId = tenantId;
    refs.tenantModal?.classList.add('show');
    
    if (refs.modalTitle) refs.modalTitle.textContent = 'Edit Tenant';
    if (refs.tenantId) refs.tenantId.value = t.tenantId || '';
    if (refs.fullName) refs.fullName.value = t.name || '';
    if (refs.email) refs.email.value = t.email || '';
    if (refs.phone) refs.phone.value = t.phone || '';
    if (refs.unitNumber) refs.unitNumber.value = t.unitAssigned || '';
    if (refs.rentAmount) refs.rentAmount.value = t.rentAmount || '';
    if (refs.leaseStart) refs.leaseStart.value = t.leaseStart || '';
    if (refs.leaseEnd) refs.leaseEnd.value = t.leaseEnd || '';
    if (refs.status) refs.status.value = t.status || 'active';
    if (refs.deposit) refs.deposit.value = t.deposit || '';
    if (refs.notes) refs.notes.value = t.notes || '';
  };

  /* ---------------------------
     Tenant Details Modal
  --------------------------- */
  function showTenantDetails(t) {
    if (!refs.detailsModal) return;
    
    const detailsContent = refs.detailsModal.querySelector('#detailsContent');
    if (!detailsContent) return;
    
    // Check for contract details
    const contracts = readJSON('rental_contracts', {});
    const contract = contracts[t.username];
    
    detailsContent.innerHTML = `
      ${t.status === 'terminated' ? `
      <div style="background: #fee2e2; border: 2px solid #ef4444; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
        <h4 style="color: #991b1b; margin-bottom: 12px;">⚠️ Contract Terminated</h4>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
          <div>
            <p style="font-size: 12px; color: #7f1d1d; margin-bottom: 4px;">Terminated By</p>
            <p style="font-weight: 600; color: #991b1b;">${escapeHtml(t.terminatedBy || 'N/A')}</p>
          </div>
          <div>
            <p style="font-size: 12px; color: #7f1d1d; margin-bottom: 4px;">Termination Date</p>
            <p style="font-weight: 600; color: #991b1b;">${formatDate(t.terminationDate)}</p>
          </div>
        </div>
        ${t.terminationReason ? `
        <div style="margin-top: 12px;">
          <p style="font-size: 12px; color: #7f1d1d; margin-bottom: 4px;">Reason</p>
          <p style="color: #991b1b; line-height: 1.6;">${escapeHtml(t.terminationReason)}</p>
        </div>
        ` : ''}
      </div>
      ` : ''}
      
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:24px">
        <div>
          <h4 style="margin-bottom:16px;color:#1e293b">Personal Information</h4>
          <div style="display:flex;flex-direction:column;gap:12px">
            <div>
              <p style="font-size:12px;color:#64748b;margin-bottom:4px">Full Name</p>
              <p style="font-weight:500">${escapeHtml(t.name)}</p>
            </div>
            <div>
              <p style="font-size:12px;color:#64748b;margin-bottom:4px">Email</p>
              <p style="font-weight:500">${escapeHtml(t.email)}</p>
            </div>
            <div>
              <p style="font-size:12px;color:#64748b;margin-bottom:4px">Phone</p>
              <p style="font-weight:500">${escapeHtml(t.phone || 'N/A')}</p>
            </div>
            <div>
              <p style="font-size:12px;color:#64748b;margin-bottom:4px">Username</p>
              <p style="font-weight:500">${escapeHtml(t.username)}</p>
            </div>
          </div>
        </div>
        
        <div>
          <h4 style="margin-bottom:16px;color:#1e293b">Lease Information</h4>
          <div style="display:flex;flex-direction:column;gap:12px">
            <div>
              <p style="font-size:12px;color:#64748b;margin-bottom:4px">Unit Assigned</p>
              <p style="font-weight:500">${escapeHtml(t.unitAssigned)}</p>
            </div>
            <div>
              <p style="font-size:12px;color:#64748b;margin-bottom:4px">Monthly Rent</p>
              <p style="font-weight:500">₱${(t.rentAmount || 0).toLocaleString()}</p>
            </div>
            <div>
              <p style="font-size:12px;color:#64748b;margin-bottom:4px">Security Deposit</p>
              <p style="font-weight:500">₱${(t.deposit || 0).toLocaleString()}</p>
            </div>
            <div>
              <p style="font-size:12px;color:#64748b;margin-bottom:4px">Lease Period</p>
              <p style="font-weight:500">${formatDate(t.leaseStart)} - ${formatDate(t.leaseEnd)}</p>
            </div>
            <div>
              <p style="font-size:12px;color:#64748b;margin-bottom:4px">Status</p>
              <span class="status-badge ${t.status}">${capitalize(t.status)}</span>
            </div>
          </div>
        </div>
      </div>
      
      ${contract && contract.agreed ? `
      <div style="margin-top: 24px; background: #f8fafc; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea;">
        <h4 style="margin-bottom: 12px; color: #1e293b;">📝 Contract Status</h4>
        <p style="color: #64748b; font-size: 14px;">
          Contract agreed on: <strong>${formatDate(contract.agreedDate)}</strong>
        </p>
      </div>
      ` : ''}
      
      ${t.notes ? `
        <div style="margin-top:24px">
          <h4 style="margin-bottom:12px;color:#1e293b">Notes</h4>
          <p style="color:#64748b;line-height:1.6">${escapeHtml(t.notes)}</p>
        </div>
      ` : ''}
    `;
    
    refs.detailsModal.classList.add('show');
  }

  /* ---------------------------
     Tenant Form Submission
  --------------------------- */
  function handleTenantFormSubmit(e) {
    e.preventDefault();

    const id = refs.tenantId?.value || '';
    const name = (refs.fullName?.value || '').trim();
    const email = (refs.email?.value || '').trim();
    const phone = (refs.phone?.value || '').trim();
    const unitAssigned = (refs.unitNumber?.value || '').trim();
    const rentAmount = parseInt(refs.rentAmount?.value || 0, 10);
    const leaseStart = (refs.leaseStart?.value || '').trim();
    const leaseEnd = (refs.leaseEnd?.value || '').trim();
    const status = (refs.status?.value || 'active').toLowerCase();
    const deposit = parseInt(refs.deposit?.value || 0, 10);
    const notes = (refs.notes?.value || '').trim();

    if (!name) return alert('Name is required');
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) return alert('Valid email required');
    if (!unitAssigned) return alert('Unit is required');
    if (!leaseStart || !leaseEnd) return alert('Lease dates are required');

    if (id) {
      const idx = tenants.findIndex(t => t.tenantId === id);
      if (idx === -1) return alert('Tenant not found');

      const oldUnit = tenants[idx].unitAssigned;
      if (oldUnit && oldUnit !== unitAssigned && units[oldUnit]) {
        units[oldUnit].status = 'Vacant';
        units[oldUnit].tenantId = null;
        units[oldUnit].tenantName = '';
        units[oldUnit].moveInDate = '';
      }
      if (units[unitAssigned]) {
        units[unitAssigned].status = 'Occupied';
        units[unitAssigned].tenantId = id;
        units[unitAssigned].tenantName = name;
        units[unitAssigned].moveInDate = leaseStart;
        units[unitAssigned].price = rentAmount;
      }

      tenants[idx] = { 
        ...tenants[idx], 
        name, 
        email, 
        phone, 
        unitAssigned, 
        rentAmount, 
        leaseStart, 
        leaseEnd, 
        status, 
        deposit, 
        notes 
      };
      
      writeJSON('tenants', tenants);
      writeJSON('units', units);
      appendActivity(`Tenant ${id} updated by Admin`, { tenantId: id });

    } else {
      const newId = generateTenantId(tenants);

      let baseUsername = (email.split('@')[0] || name.split(' ')[0] || 'user')
        .replace(/[^a-z0-9]/ig, '').toLowerCase();
      let username = baseUsername || 'user' + Date.now();
      let counter = 0;
      while (tenants.some(t => t.username === username)) {
        counter++;
        username = baseUsername + counter;
      }

      const password = 'changeme123';

      const newTenant = {
        tenantId: newId,
        name,
        username,
        password,
        email,
        phone,
        unitAssigned,
        rentAmount,
        leaseStart,
        leaseEnd,
        status,
        deposit,
        notes,
        dateCreated: new Date().toISOString()
      };

      tenants.push(newTenant);

      if (units[unitAssigned]) {
        units[unitAssigned].status = 'Occupied';
        units[unitAssigned].tenantId = newId;
        units[unitAssigned].tenantName = name;
        units[unitAssigned].moveInDate = leaseStart;
        units[unitAssigned].price = rentAmount;
      }

      writeJSON('tenants', tenants);
      writeJSON('units', units);
      appendActivity(`New tenant ${newId} created by Admin`, { 
        tenantId: newId, 
        username 
      });
    }

    refs.tenantModal?.classList.remove('show');
    editingId = null;

    if (refs.statusFilter) refs.statusFilter.value = 'all';
    if (refs.unitFilter) refs.unitFilter.value = 'all';
    if (refs.searchInput) refs.searchInput.value = '';

    renderStats();
    populateUnitFilter();
    populateUnitDropdown();
    filterTenants();
  }

  /* ---------------------------
     Modal Handling
  --------------------------- */
  function closeModals() {
    refs.tenantModal?.classList.remove('show');
    refs.detailsModal?.classList.remove('show');
    editingId = null;
  }

  /* ---------------------------
     Export / Import / Reset
  --------------------------- */
  function exportCsv() {
    const headers = ['Tenant ID', 'Name', 'Email', 'Phone', 'Unit', 'Rent', 'Lease Start', 'Lease End', 'Status'];
    const rows = tenants.map(t => [
      t.tenantId,
      t.name,
      t.email,
      t.phone || '',
      t.unitAssigned,
      t.rentAmount,
      t.leaseStart,
      t.leaseEnd,
      t.status
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], {type: 'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tenants.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportXml() {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<tenants>\n';
    tenants.forEach(t => {
      xml += '  <tenant>\n';
      xml += `    <tenantId>${escapeHtml(t.tenantId)}</tenantId>\n`;
      xml += `    <name>${escapeHtml(t.name)}</name>\n`;
      xml += `    <username>${escapeHtml(t.username)}</username>\n`;
      xml += `    <email>${escapeHtml(t.email)}</email>\n`;
      xml += `    <phone>${escapeHtml(t.phone || '')}</phone>\n`;
      xml += `    <unitAssigned>${escapeHtml(t.unitAssigned)}</unitAssigned>\n`;
      xml += `    <rentAmount>${t.rentAmount}</rentAmount>\n`;
      xml += `    <leaseStart>${t.leaseStart}</leaseStart>\n`;
      xml += `    <leaseEnd>${t.leaseEnd}</leaseEnd>\n`;
      xml += `    <status>${t.status}</status>\n`;
      xml += `    <deposit>${t.deposit || 0}</deposit>\n`;
      xml += `    <notes>${escapeHtml(t.notes || '')}</notes>\n`;
      xml += '  </tenant>\n';
    });
    xml += '</tenants>';
    
    const blob = new Blob([xml], {type: 'application/xml'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tenants.xml';
    a.click();
    URL.revokeObjectURL(url);
  }

  function importXml(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(e.target.result, 'text/xml');
        const tenantNodes = xmlDoc.getElementsByTagName('tenant');
        
        const imported = [];
        for (let i = 0; i < tenantNodes.length; i++) {
          const node = tenantNodes[i];
          const tenant = {
            tenantId: node.querySelector('tenantId')?.textContent || '',
            name: node.querySelector('name')?.textContent || '',
            username: node.querySelector('username')?.textContent || '',
            password: 'changeme123',
            email: node.querySelector('email')?.textContent || '',
            phone: node.querySelector('phone')?.textContent || '',
            unitAssigned: node.querySelector('unitAssigned')?.textContent || '',
            rentAmount: parseInt(node.querySelector('rentAmount')?.textContent || 0),
            leaseStart: node.querySelector('leaseStart')?.textContent || '',
            leaseEnd: node.querySelector('leaseEnd')?.textContent || '',
            status: node.querySelector('status')?.textContent || 'active',
            deposit: parseInt(node.querySelector('deposit')?.textContent || 0),
            notes: node.querySelector('notes')?.textContent || '',
            dateCreated: new Date().toISOString()
          };
          imported.push(tenant);
        }
        
        if (imported.length > 0) {
          tenants = [...tenants, ...imported];
          writeJSON('tenants', tenants);
          renderStats();
          populateUnitFilter();
          filterTenants();
          appendActivity(`Imported ${imported.length} tenants via XML`, {});
          alert(`Successfully imported ${imported.length} tenants`);
        } else {
          alert('No valid tenant data found in XML');
        }
      } catch (err) {
        alert('Error parsing XML file');
        console.error(err);
      }
    };
    reader.readAsText(file);
  }

  function resetTenants() {
    if (confirm('Reset tenants to default sample data? This will delete all current data.')) {
      tenants = JSON.parse(JSON.stringify(sampleTenants));
      units = JSON.parse(JSON.stringify(sampleUnits));
      writeJSON('tenants', tenants);
      writeJSON('units', units);
      renderStats();
      populateUnitFilter();
      populateUnitDropdown();
      filterTenants();
      appendActivity('Tenant data reset to default', {});
    }
  }

  /* ---------------------------
     View Toggle
  --------------------------- */
  function switchView(view) {
    currentView = view;
    
    const tableBtn = document.getElementById('tableViewBtn');
    const gridBtn = document.getElementById('gridViewBtn');
    
    if (tableBtn && gridBtn) {
      if (view === 'table') {
        tableBtn.classList.add('active');
        gridBtn.classList.remove('active');
      } else {
        tableBtn.classList.remove('active');
        gridBtn.classList.add('active');
      }
    }
    
    const tableContainer = document.getElementById('tableContainer');
    const gridContainer = document.getElementById('gridContainer');
    
    if (tableContainer && gridContainer) {
      if (view === 'table') {
        tableContainer.style.display = 'block';
        gridContainer.style.display = 'none';
      } else {
        tableContainer.style.display = 'none';
        gridContainer.style.display = 'block';
      }
    }
    
    filterTenants();
  }

  /* ---------------------------
     Event Listeners
  --------------------------- */
  function bindEvents() {
    // Modal close buttons
    const closeModalBtn = document.getElementById('closeModalBtn');
    const closeDetailsBtn = document.getElementById('closeDetailsBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModals);
    if (closeDetailsBtn) closeDetailsBtn.addEventListener('click', closeModals);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModals);
    
    // Close modal on overlay click
    if (refs.tenantModal) {
      refs.tenantModal.addEventListener('click', (e) => {
        if (e.target === refs.tenantModal) closeModals();
      });
    }
    if (refs.detailsModal) {
      refs.detailsModal.addEventListener('click', (e) => {
        if (e.target === refs.detailsModal) closeModals();
      });
    }
    
    // Form submission
    if (refs.tenantForm) {
      refs.tenantForm.addEventListener('submit', handleTenantFormSubmit);
    }

    // Filters
    if (refs.searchInput) {
      refs.searchInput.addEventListener('input', filterTenants);
    }
    if (refs.statusFilter) {
      refs.statusFilter.addEventListener('change', filterTenants);
    }
    if (refs.unitFilter) {
      refs.unitFilter.addEventListener('change', filterTenants);
    }

    // View toggles
    const tableViewBtn = document.getElementById('tableViewBtn');
    const gridViewBtn = document.getElementById('gridViewBtn');
    
    if (tableViewBtn) {
      tableViewBtn.addEventListener('click', () => switchView('table'));
    }
    if (gridViewBtn) {
      gridViewBtn.addEventListener('click', () => switchView('grid'));
    }

    // Export/Import/Reset buttons
    const exportCsvBtn = document.getElementById('exportCsvBtn');
    const exportXmlBtn = document.getElementById('exportXmlBtn');
    const xmlFileInput = document.getElementById('xmlFileInput');
    const resetSampleBtn = document.getElementById('resetSampleBtn');
    
    if (exportCsvBtn) exportCsvBtn.addEventListener('click', exportCsv);
    if (exportXmlBtn) exportXmlBtn.addEventListener('click', exportXml);
    if (xmlFileInput) {
      xmlFileInput.addEventListener('change', (e) => {
        if (e.target.files[0]) importXml(e.target.files[0]);
        e.target.value = '';
      });
    }
    if (resetSampleBtn) resetSampleBtn.addEventListener('click', resetTenants);

    // Delegate action buttons
    document.body.addEventListener('click', (e) => {
      if (e.target.matches('.action-btn.view')) {
        const id = e.target.getAttribute('data-id');
        if (id) viewTenant(id);
      }
      if (e.target.matches('.action-btn.edit')) {
        const id = e.target.getAttribute('data-id');
        if (id) editTenant(id);
      }
      if (e.target.matches('.action-btn.delete')) {
        const id = e.target.getAttribute('data-id');
        if (id) deleteTenant(id);
      }
    });
  }

  /* ---------------------------
     Initialize App
  --------------------------- */
  function init() {
    refs = {
      statsSummary: document.getElementById('statsSummary'),
      tenantsTbody: document.getElementById('tenantsTbody'),
      gridItems: document.getElementById('gridItems'),
      searchInput: document.getElementById('searchInput'),
      statusFilter: document.getElementById('statusFilter'),
      unitFilter: document.getElementById('unitFilter'),
      tenantModal: document.getElementById('tenantModal'),
      detailsModal: document.getElementById('detailsModal'),
      tenantForm: document.getElementById('tenantForm'),
      modalTitle: document.getElementById('modalTitle'),
      tenantId: document.getElementById('tenantId'),
      fullName: document.getElementById('fullName'),
      email: document.getElementById('email'),
      phone: document.getElementById('phone'),
      unitNumber: document.getElementById('unitNumber'),
      rentAmount: document.getElementById('rentAmount'),
      leaseStart: document.getElementById('leaseStart'),
      leaseEnd: document.getElementById('leaseEnd'),
      status: document.getElementById('status'),
      deposit: document.getElementById('deposit'),
      notes: document.getElementById('notes')
    };

    ensureInitialData();
    tenants = readJSON('tenants', []);
    units = readJSON('units', {});
    
    renderStats();
    populateUnitFilter();
    populateUnitDropdown();
    filterTenants();
    bindEvents();
    
    // 🔥 START AUTO-SYNC
    startAutoSync();
    
    console.log('✅ Tenants Section initialized with auto-sync:', {
      tenantsCount: tenants.length,
      unitsCount: Object.keys(units).length,
      autoSyncEnabled: true
    });
  }

  // Initialize on DOM ready
  document.addEventListener('DOMContentLoaded', init);

  // Listen for storage changes
  window.addEventListener('storage', (e) => {
    if (e.key === 'tenants' || e.key === 'units' || e.key === 'rental_contracts') {
      tenants = readJSON('tenants', []);
      units = readJSON('units', {});
      syncContractTerminations();
      renderStats();
      populateUnitFilter();
      populateUnitDropdown();
      filterTenants();
      console.log('📡 Data synced from storage event');
    }
  });

  // Clean up on page unload
  window.addEventListener('beforeunload', () => {
    stopAutoSync();
  });

})();
/* unit-management-test.js - Linked with localStorage */

(function() {
  'use strict';

  /* ---------------------------
     Storage helpers
  --------------------------- */
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
     Sample data structure
     Changed from array to object to match tenant system
  --------------------------- */
  const sampleUnits = {
    "U001": { 
      type: "1BR", 
      price: 15000, 
      status: "Vacant",
      tenantId: null,
      tenantName: "",
      moveInDate: ""
    },
    "U002": { 
      type: "Studio", 
      price: 12000, 
      status: "Occupied",
      tenantId: "TEN001",
      tenantName: "John Smith",
      moveInDate: "2024-01-15"
    },
    "U003": { 
      type: "2BR", 
      price: 22000, 
      status: "Vacant",
      tenantId: null,
      tenantName: "",
      moveInDate: ""
    },
    "U004": { 
      type: "1BR", 
      price: 16500, 
      status: "Occupied",
      tenantId: null,
      tenantName: "Maria Garcia",
      moveInDate: "2024-03-01"
    },
    "U005": { 
      type: "Studio", 
      price: 11500, 
      status: "Maintenance",
      tenantId: null,
      tenantName: "",
      moveInDate: ""
    }
  };

  /* ---------------------------
     App state
  --------------------------- */
  let units = {};
  let tenants = [];
  let currentView = 'table';
  let editingId = null;
  let refs = {};

  /* ---------------------------
     Utilities
  --------------------------- */
  function formatDate(d) { 
    if (!d) return 'N/A'; 
    try { 
      const date = new Date(d);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch { 
      return d; 
    } 
  }
  
  function capitalize(s) { 
    return (s || '').toString().charAt(0).toUpperCase() + (s || '').toString().slice(1).toLowerCase(); 
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

  function escapeXml(str) {
    return String(str || '').replace(/[<>&'"]/g, (c) => {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '\'': return '&apos;';
        case '"': return '&quot;';
        default: return c;
      }
    });
  }

  function formatType(type) {
    const types = {
      'studio': 'Studio',
      'Studio': 'Studio',
      '1br': '1 Bedroom',
      '1BR': '1 Bedroom',
      '2br': '2 Bedroom',
      '2BR': '2 Bedroom',
      '3br': '3 Bedroom',
      '3BR': '3 Bedroom'
    };
    return types[type] || type;
  }

  /* ---------------------------
     Initialize storage
  --------------------------- */
  function ensureInitialData() {
    if (!localStorage.getItem('units')) {
      writeJSON('units', sampleUnits);
    }
    if (!localStorage.getItem('tenants')) {
      writeJSON('tenants', []);
    }
    if (!localStorage.getItem('activityLog')) {
      writeJSON('activityLog', []);
    }
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
     Sync with Tenants
  --------------------------- */
  function getTenantForUnit(unitId) {
    // Check if unit has a tenant assigned
    const unit = units[unitId];
    if (!unit) return null;
    
    // Find tenant by unit assignment or by tenantId stored in unit
    const tenant = tenants.find(t => 
      t.unitAssigned === unitId || 
      (unit.tenantId && t.tenantId === unit.tenantId)
    );
    
    return tenant;
  }

  function syncUnitsWithTenants() {
    // Update unit status based on tenant assignments
    for (const [unitId, unit] of Object.entries(units)) {
      const tenant = getTenantForUnit(unitId);
      
      if (tenant) {
        unit.status = 'Occupied';
        unit.tenantId = tenant.tenantId;
        unit.tenantName = tenant.name;
        unit.moveInDate = tenant.leaseStart || unit.moveInDate;
        unit.price = tenant.rentAmount || unit.price;
      } else if (unit.tenantId && !tenant) {
        // Tenant was removed, mark as vacant
        unit.status = 'Vacant';
        unit.tenantId = null;
        unit.tenantName = '';
      }
    }
    
    writeJSON('units', units);
  }

  /* ---------------------------
     Rendering
  --------------------------- */
  function renderStats() {
    const unitArray = Object.entries(units);
    const total = unitArray.length;
    const occupied = unitArray.filter(([, u]) => u.status === 'Occupied').length;
    const available = unitArray.filter(([, u]) => u.status === 'Vacant').length;
    const maintenance = unitArray.filter(([, u]) => u.status === 'Maintenance').length;
    const occupancyRate = total > 0 ? Math.round((occupied / total) * 100) : 0;

    if (!refs.statsSummary) return;
    refs.statsSummary.innerHTML = `
      <div class="stat-card">
        <div class="stat-value">${total}</div>
        <div class="stat-label">Total Units</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${occupied}</div>
        <div class="stat-label">Occupied Units</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${available}</div>
        <div class="stat-label">Available Units</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${occupancyRate}%</div>
        <div class="stat-label">Occupancy Rate</div>
      </div>
    `;
  }

  function renderTableView(data) {
    if (!refs.unitsTbody) return;
    
    if (!data || data.length === 0) {
      refs.unitsTbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:#94a3b8">No units found</td></tr>';
      return;
    }

    refs.unitsTbody.innerHTML = data.map(([unitId, unit]) => `
      <tr>
        <td style="font-weight:600;color:#1e293b">${escapeHtml(unitId)}</td>
        <td>${formatType(unit.type)}</td>
        <td>${escapeHtml(unit.tenantName || '-')}</td>
        <td style="font-weight:600">₱${(unit.price || 0).toLocaleString()}</td>
        <td><span class="status-badge ${unit.status.toLowerCase()}">${capitalize(unit.status)}</span></td>
        <td>${formatDate(unit.moveInDate)}</td>
        <td>
          <div class="action-btns">
            <button class="action-btn view" data-id="${unitId}">View</button>
            <button class="action-btn edit" data-id="${unitId}">Edit</button>
            <button class="action-btn delete" data-id="${unitId}">Delete</button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  function renderGridView(data) {
    if (!refs.gridItems) return;
    
    if (!data || data.length === 0) {
      refs.gridItems.innerHTML = '<p style="text-align:center;padding:40px;color:#94a3b8;grid-column:1/-1">No units found</p>';
      return;
    }

    refs.gridItems.innerHTML = data.map(([unitId, unit]) => `
      <div class="unit-card">
        <div class="unit-card-header">
          <div>
            <div class="unit-card-number">${escapeHtml(unitId)}</div>
            <div class="unit-card-type">${formatType(unit.type)}</div>
          </div>
          <span class="status-badge ${unit.status.toLowerCase()}">${capitalize(unit.status)}</span>
        </div>
        <div class="unit-card-details">
          <div class="detail-row">
            <span class="detail-label">Tenant</span>
            <span class="detail-value">${escapeHtml(unit.tenantName || 'Vacant')}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Monthly Rent</span>
            <span class="detail-value">₱${(unit.price || 0).toLocaleString()}</span>
          </div>
          <div class="detail-row" style="border:none">
            <span class="detail-label">Move-in Date</span>
            <span class="detail-value">${formatDate(unit.moveInDate)}</span>
          </div>
        </div>
        <div class="action-btns">
          <button class="action-btn view" data-id="${unitId}">View</button>
          <button class="action-btn edit" data-id="${unitId}">Edit</button>
          <button class="action-btn delete" data-id="${unitId}">Delete</button>
        </div>
      </div>
    `).join('');
  }

  function renderUnits(filteredUnits = null) {
    const data = filteredUnits || Object.entries(units);
    
    if (currentView === 'table') {
      renderTableView(data);
    } else {
      renderGridView(data);
    }
  }

  /* ---------------------------
     Filters
  --------------------------- */
  function filterUnits() {
    const search = (refs.searchInput?.value || '').toLowerCase();
    const statusFilter = (refs.statusFilter?.value || 'all');
    const typeFilter = (refs.typeFilter?.value || 'all');

    let filtered = Object.entries(units).filter(([unitId, unit]) => {
      const matchesSearch = 
        unitId.toLowerCase().includes(search) ||
        (unit.tenantName && unit.tenantName.toLowerCase().includes(search)) ||
        formatType(unit.type).toLowerCase().includes(search);
      
      const matchesStatus = statusFilter === 'all' || 
        unit.status.toLowerCase() === statusFilter.toLowerCase();
      
      const matchesType = typeFilter === 'all' || 
        unit.type.toLowerCase().replace(' ', '') === typeFilter.toLowerCase();

      return matchesSearch && matchesStatus && matchesType;
    });

    renderUnits(filtered);
    
    const statusText = statusFilter === 'all' ? 'All' : capitalize(statusFilter);
    const titleEl = document.getElementById('listTitle');
    if (titleEl) {
      titleEl.textContent = `${statusText} Units (${filtered.length})`;
    }
  }

  /* ---------------------------
     View / Edit / Delete
  --------------------------- */
  window.viewUnit = function(unitId) {
    const unit = units[unitId];
    if (!unit) return alert('Unit not found');

    const details = `
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:24px">
        <div>
          <h4 style="color:#1e293b;margin-bottom:16px;font-size:16px">Unit Information</h4>
          <div class="detail-row">
            <span class="detail-label">Unit Number</span>
            <span class="detail-value">${escapeHtml(unitId)}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Type</span>
            <span class="detail-value">${formatType(unit.type)}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Monthly Rent</span>
            <span class="detail-value">₱${(unit.price || 0).toLocaleString()}</span>
          </div>
          <div class="detail-row" style="border:none">
            <span class="detail-label">Status</span>
            <span class="status-badge ${unit.status.toLowerCase()}">${capitalize(unit.status)}</span>
          </div>
        </div>
        <div>
          <h4 style="color:#1e293b;margin-bottom:16px;font-size:16px">Tenant Information</h4>
          <div class="detail-row">
            <span class="detail-label">Tenant Name</span>
            <span class="detail-value">${escapeHtml(unit.tenantName || 'Vacant')}</span>
          </div>
          <div class="detail-row" style="border:none">
            <span class="detail-label">Move-in Date</span>
            <span class="detail-value">${formatDate(unit.moveInDate)}</span>
          </div>
        </div>
      </div>
    `;

    const existingDetailsModal = document.getElementById('detailsModal');
    if (existingDetailsModal) existingDetailsModal.remove();

    const detailsModal = document.createElement('div');
    detailsModal.id = 'detailsModal';
    detailsModal.className = 'modal-overlay show';
    detailsModal.innerHTML = `
      <div class="modal modal-large" role="dialog" aria-modal="true">
        <div class="modal-header">
          <h3>Unit Details - ${escapeHtml(unitId)}</h3>
          <button class="link" onclick="closeDetailsModal()">Close</button>
        </div>
        <div style="padding:20px">${details}</div>
      </div>
    `;
    document.body.appendChild(detailsModal);

    detailsModal.addEventListener('click', (e) => {
      if (e.target.id === 'detailsModal') window.closeDetailsModal();
    });
  };

  window.closeDetailsModal = function() {
    const modal = document.getElementById('detailsModal');
    if (modal) modal.remove();
  };

  window.editUnit = function(unitId) {
    const unit = units[unitId];
    if (!unit) return alert('Unit not found');

    editingId = unitId;
    refs.unitModal?.classList.add('show');
    
    if (refs.modalTitle) refs.modalTitle.textContent = 'Edit Unit';
    if (refs.unitId) refs.unitId.value = unitId;
    if (refs.unitNumber) {
      refs.unitNumber.value = unitId;
      refs.unitNumber.disabled = true; // Don't allow changing unit number
    }
    if (refs.unitType) refs.unitType.value = unit.type.toLowerCase().replace(' bedroom', 'br').replace(' ', '');
    if (refs.tenantName) refs.tenantName.value = unit.tenantName || '';
    if (refs.rentAmount) refs.rentAmount.value = unit.price || 0;
    if (refs.status) refs.status.value = unit.status.toLowerCase();
    if (refs.moveInDate) refs.moveInDate.value = unit.moveInDate || '';
  };

  window.deleteUnit = function(unitId) {
    if (!confirm('Are you sure you want to delete this unit? This cannot be undone.')) return;
    
    const unit = units[unitId];
    
    // Check if unit has a tenant
    if (unit.tenantId) {
      if (!confirm('This unit has an assigned tenant. Deleting it will unassign the tenant. Continue?')) {
        return;
      }
      
      // Unassign tenant
      const tenantIdx = tenants.findIndex(t => t.tenantId === unit.tenantId);
      if (tenantIdx !== -1) {
        tenants[tenantIdx].unitAssigned = '';
        writeJSON('tenants', tenants);
      }
    }
    
    delete units[unitId];
    writeJSON('units', units);
    
    appendActivity(`Unit ${unitId} deleted by Admin`, { unitId });
    
    renderStats();
    filterUnits();
  };

  /* ---------------------------
     Modal Handling
  --------------------------- */
  function openAddModal() {
    editingId = null;
    refs.unitModal?.classList.add('show');
    refs.unitForm?.reset();
    
    if (refs.modalTitle) refs.modalTitle.textContent = 'Add Unit';
    if (refs.unitId) refs.unitId.value = '';
    if (refs.unitNumber) refs.unitNumber.disabled = false;
  }

  function closeModal() {
    refs.unitModal?.classList.remove('show');
    editingId = null;
    if (refs.unitNumber) refs.unitNumber.disabled = false;
  }

  /* ---------------------------
     Form Submission
  --------------------------- */
  function handleFormSubmit(e) {
    e.preventDefault();

    const unitNumber = (refs.unitNumber?.value || '').trim().toUpperCase();
    const type = (refs.unitType?.value || 'studio').toLowerCase();
    const tenantName = (refs.tenantName?.value || '').trim();
    const rentAmount = parseInt(refs.rentAmount?.value || 0, 10);
    const status = (refs.status?.value || 'available').toLowerCase();
    const moveInDate = (refs.moveInDate?.value || '').trim();

    // Validation
    if (!unitNumber) return alert('Unit number is required');
    if (rentAmount < 0) return alert('Rent amount must be positive');

    // Check if unit number already exists (only for new units)
    if (!editingId && units[unitNumber]) {
      return alert('Unit number already exists');
    }

    // Format type for consistency
    let formattedType = type;
    if (type === '1br') formattedType = '1BR';
    else if (type === '2br') formattedType = '2BR';
    else if (type === '3br') formattedType = '3BR';
    else if (type === 'studio') formattedType = 'Studio';

    // Format status
    const formattedStatus = status === 'available' ? 'Vacant' : 
                           status === 'occupied' ? 'Occupied' :
                           status === 'maintenance' ? 'Maintenance' :
                           status === 'reserved' ? 'Reserved' : 'Vacant';

    if (editingId) {
      // Update existing unit
      const oldUnit = units[editingId];
      
      units[editingId] = {
        ...oldUnit,
        type: formattedType,
        price: rentAmount,
        status: formattedStatus,
        tenantName: tenantName,
        moveInDate: moveInDate
      };
      
      // If unit number changed (shouldn't happen, but handle it)
      if (editingId !== unitNumber && !units[unitNumber]) {
        units[unitNumber] = units[editingId];
        delete units[editingId];
        
        // Update any tenant assignments
        const affectedTenant = tenants.find(t => t.unitAssigned === editingId);
        if (affectedTenant) {
          affectedTenant.unitAssigned = unitNumber;
          writeJSON('tenants', tenants);
        }
      }
      
      writeJSON('units', units);
      appendActivity(`Unit ${editingId} updated by Admin`, { unitId: editingId });
      
    } else {
      // Create new unit
      units[unitNumber] = {
        type: formattedType,
        price: rentAmount,
        status: formattedStatus,
        tenantId: null,
        tenantName: tenantName,
        moveInDate: moveInDate
      };
      
      writeJSON('units', units);
      appendActivity(`New unit ${unitNumber} created by Admin`, { unitId: unitNumber });
    }

    closeModal();
    renderStats();
    filterUnits();
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
    
    renderUnits();
  }

  /* ---------------------------
     Export / Import / Reset
  --------------------------- */
  function exportToCSV() {
    const headers = ['Unit Number', 'Type', 'Tenant Name', 'Rent', 'Status', 'Move-in Date'];
    const rows = Object.entries(units).map(([unitId, u]) => [
      unitId,
      formatType(u.type),
      u.tenantName || '',
      u.price,
      u.status,
      u.moveInDate || ''
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    downloadFile(csv, 'units.csv', 'text/csv');
  }

  function exportToXML() {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<units>\n';
    
    Object.entries(units).forEach(([unitId, unit]) => {
      xml += '  <unit>\n';
      xml += `    <unitNumber>${escapeXml(unitId)}</unitNumber>\n`;
      xml += `    <type>${escapeXml(unit.type)}</type>\n`;
      xml += `    <tenantName>${escapeXml(unit.tenantName || '')}</tenantName>\n`;
      xml += `    <rentAmount>${unit.price}</rentAmount>\n`;
      xml += `    <status>${escapeXml(unit.status)}</status>\n`;
      xml += `    <moveInDate>${escapeXml(unit.moveInDate || '')}</moveInDate>\n`;
      xml += `    <tenantId>${escapeXml(unit.tenantId || '')}</tenantId>\n`;
      xml += '  </unit>\n';
    });
    
    xml += '</units>';
    downloadFile(xml, 'units.xml', 'text/xml');
  }

  function importFromXML(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(event.target.result, 'text/xml');
        const unitNodes = xmlDoc.getElementsByTagName('unit');
        
        const imported = {};
        for (let node of unitNodes) {
          const unitNumber = node.querySelector('unitNumber')?.textContent || 'U' + Date.now();
          imported[unitNumber] = {
            type: node.querySelector('type')?.textContent || 'Studio',
            tenantName: node.querySelector('tenantName')?.textContent || '',
            price: parseInt(node.querySelector('rentAmount')?.textContent) || 0,
            status: node.querySelector('status')?.textContent || 'Vacant',
            moveInDate: node.querySelector('moveInDate')?.textContent || '',
            tenantId: node.querySelector('tenantId')?.textContent || null
          };
        }

        if (Object.keys(imported).length > 0) {
          units = imported;
          writeJSON('units', units);
          renderStats();
          filterUnits();
          appendActivity(`Imported ${Object.keys(imported).length} units via XML`, {});
          alert(`Successfully imported ${Object.keys(imported).length} units!`);
        }
      } catch (err) {
        alert('Error importing XML: ' + err.message);
        console.error(err);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function resetToSample() {
    if (!confirm('Reset to sample data? This will discard all current units.')) return;
    
    units = JSON.parse(JSON.stringify(sampleUnits));
    writeJSON('units', units);
    
    renderStats();
    filterUnits();
    appendActivity('Unit data reset to default', {});
  }

  function downloadFile(content, filename, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  /* ---------------------------
     Event Listeners
  --------------------------- */
  function bindEvents() {
    // Modal controls
    const addUnitBtn = document.getElementById('addUnitBtn');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    
    if (addUnitBtn) addUnitBtn.addEventListener('click', openAddModal);
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
    
    // Form submission
    if (refs.unitForm) {
      refs.unitForm.addEventListener('submit', handleFormSubmit);
    }

    // View toggle
    const tableViewBtn = document.getElementById('tableViewBtn');
    const gridViewBtn = document.getElementById('gridViewBtn');
    
    if (tableViewBtn) tableViewBtn.addEventListener('click', () => switchView('table'));
    if (gridViewBtn) gridViewBtn.addEventListener('click', () => switchView('grid'));

    // Search and filters
    if (refs.searchInput) refs.searchInput.addEventListener('input', filterUnits);
    if (refs.statusFilter) refs.statusFilter.addEventListener('change', filterUnits);
    if (refs.typeFilter) refs.typeFilter.addEventListener('change', filterUnits);

    // Export/Import/Reset
    const exportCsvBtn = document.getElementById('exportCsvBtn');
    const exportXmlBtn = document.getElementById('exportXmlBtn');
    const xmlFileInput = document.getElementById('xmlFileInput');
    const resetSampleBtn = document.getElementById('resetSampleBtn');
    
    if (exportCsvBtn) exportCsvBtn.addEventListener('click', exportToCSV);
    if (exportXmlBtn) exportXmlBtn.addEventListener('click', exportToXML);
    if (xmlFileInput) xmlFileInput.addEventListener('change', importFromXML);
    if (resetSampleBtn) resetSampleBtn.addEventListener('click', resetToSample);

    // Close modal on overlay click
    if (refs.unitModal) {
      refs.unitModal.addEventListener('click', (e) => {
        if (e.target.id === 'unitModal') closeModal();
      });
    }

    // Delegate action buttons
    document.body.addEventListener('click', (e) => {
      if (e.target.matches('.action-btn.view')) {
        const id = e.target.getAttribute('data-id');
        if (id) window.viewUnit(id);
      }
      if (e.target.matches('.action-btn.edit')) {
        const id = e.target.getAttribute('data-id');
        if (id) window.editUnit(id);
      }
      if (e.target.matches('.action-btn.delete')) {
        const id = e.target.getAttribute('data-id');
        if (id) window.deleteUnit(id);
      }
    });
  }

  /* ---------------------------
     Initialize App
  --------------------------- */
  function init() {
    // Get DOM references
    refs = {
      statsSummary: document.getElementById('statsSummary'),
      unitsTbody: document.getElementById('unitsTbody'),
      gridItems: document.getElementById('gridItems'),
      searchInput: document.getElementById('searchInput'),
      statusFilter: document.getElementById('statusFilter'),
      typeFilter: document.getElementById('typeFilter'),
      unitModal: document.getElementById('unitModal'),
      unitForm: document.getElementById('unitForm'),
      modalTitle: document.getElementById('modalTitle'),
      unitId: document.getElementById('unitId'),
      unitNumber: document.getElementById('unitNumber'),
      unitType: document.getElementById('unitType'),
      tenantName: document.getElementById('tenantName'),
      rentAmount: document.getElementById('rentAmount'),
      status: document.getElementById('status'),
      moveInDate: document.getElementById('moveInDate')
    };

    // Initialize data
    ensureInitialData();
    units = readJSON('units', {});
    tenants = readJSON('tenants', []);
    
    // Sync units with tenant data
    syncUnitsWithTenants();
    
    // Initial render
    renderStats();
    filterUnits();
    
    // Bind events
    bindEvents();
    
    console.log('Units Management initialized:', {
      unitsCount: Object.keys(units).length,
      tenantsCount: tenants.length
    });
  }

  // Initialize on DOM ready
  document.addEventListener('DOMContentLoaded', init);

  // Listen for storage changes from other tabs/pages
  window.addEventListener('storage', (e) => {
    if (e.key === 'units' || e.key === 'tenants') {
      units = readJSON('units', {});
      tenants = readJSON('tenants', []);
      syncUnitsWithTenants();
      renderStats();
      filterUnits();
      console.log('Data synced from storage event');
    }
  });

})();
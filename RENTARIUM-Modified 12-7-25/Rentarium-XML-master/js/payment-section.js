// Sample payment data
let payments = [
  {
    id: 1,
    transactionId: "TXN-2024-001",
    tenantName: "John Smith",
    unitNumber: "A-101",
    amount: 15000,
    dueDate: "2024-12-05",
    paidDate: "2024-12-03",
    paymentMethod: "bank",
    status: "paid",
    referenceNumber: "BNK-789456",
    notes: "Paid 2 days early"
  },
  {
    id: 2,
    transactionId: "TXN-2024-002",
    tenantName: "Maria Garcia",
    unitNumber: "A-102",
    amount: 12000,
    dueDate: "2024-12-05",
    paidDate: "2024-12-05",
    paymentMethod: "gcash",
    status: "paid",
    referenceNumber: "GC-123789",
    notes: ""
  },
  {
    id: 3,
    transactionId: "TXN-2024-003",
    tenantName: "James Lee",
    unitNumber: "B-202",
    amount: 16500,
    dueDate: "2024-12-10",
    paidDate: "",
    paymentMethod: "bank",
    status: "pending",
    referenceNumber: "",
    notes: "Payment expected this week"
  },
  {
    id: 4,
    transactionId: "TXN-2024-004",
    tenantName: "Sarah Johnson",
    unitNumber: "B-201",
    amount: 22000,
    dueDate: "2024-11-15",
    paidDate: "",
    paymentMethod: "cash",
    status: "overdue",
    referenceNumber: "",
    notes: "Contacted tenant on Nov 20"
  },
  {
    id: 5,
    transactionId: "TXN-2024-005",
    tenantName: "Michael Chen",
    unitNumber: "D-402",
    amount: 11500,
    dueDate: "2024-12-01",
    paidDate: "2024-12-01",
    paymentMethod: "check",
    status: "paid",
    referenceNumber: "CHK-456123",
    notes: "Check cleared successfully"
  },
  {
    id: 6,
    transactionId: "TXN-2024-006",
    tenantName: "John Smith",
    unitNumber: "A-101",
    amount: 15000,
    dueDate: "2025-01-05",
    paidDate: "",
    paymentMethod: "bank",
    status: "pending",
    referenceNumber: "",
    notes: ""
  },
  {
    id: 7,
    transactionId: "TXN-2024-007",
    tenantName: "Maria Garcia",
    unitNumber: "A-102",
    amount: 12000,
    dueDate: "2024-11-20",
    paidDate: "2024-11-22",
    paymentMethod: "gcash",
    status: "paid",
    referenceNumber: "GC-987654",
    notes: "Paid 2 days late"
  },
  {
    id: 8,
    transactionId: "TXN-2024-008",
    tenantName: "Robert Wilson",
    unitNumber: "C-301",
    amount: 18000,
    dueDate: "2024-12-08",
    paidDate: "2024-12-08",
    paymentMethod: "cash",
    status: "partial",
    referenceNumber: "",
    notes: "Paid ₱10,000, balance pending"
  }
];

let currentView = 'table';
let editingId = null;
const sampleData = JSON.parse(JSON.stringify(payments));

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  renderStats();
  renderPayments();
  setupEventListeners();
});

function setupEventListeners() {
  // Modal controls
  document.getElementById('recordPaymentBtn').addEventListener('click', openAddModal);
  document.getElementById('closeModalBtn').addEventListener('click', closeModal);
  document.getElementById('closeDetailsBtn').addEventListener('click', closeDetailsModal);
  document.getElementById('cancelBtn').addEventListener('click', closeModal);
  document.getElementById('paymentForm').addEventListener('submit', handleFormSubmit);
  document.getElementById('printReceiptBtn').addEventListener('click', printReceipt);

  // View toggle
  document.getElementById('tableViewBtn').addEventListener('click', () => switchView('table'));
  document.getElementById('gridViewBtn').addEventListener('click', () => switchView('grid'));

  // Search and filters
  document.getElementById('searchInput').addEventListener('input', filterPayments);
  document.getElementById('statusFilter').addEventListener('change', filterPayments);
  document.getElementById('monthFilter').addEventListener('change', filterPayments);
  document.getElementById('methodFilter').addEventListener('change', filterPayments);

  // Export functions
  document.getElementById('exportCsvBtn').addEventListener('click', exportToCSV);
  document.getElementById('exportXmlBtn').addEventListener('click', exportToXML);
  document.getElementById('xmlFileInput').addEventListener('change', importFromXML);

  // Reset button
  document.getElementById('resetSampleBtn').addEventListener('click', resetToSample);

  // Close modal on overlay click
  document.getElementById('paymentModal').addEventListener('click', (e) => {
    if (e.target.id === 'paymentModal') closeModal();
  });
  document.getElementById('detailsModal').addEventListener('click', (e) => {
    if (e.target.id === 'detailsModal') closeDetailsModal();
  });
}

function renderStats() {
  const totalCollected = payments
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + p.amount, 0);
  
  const pending = payments
    .filter(p => p.status === 'pending')
    .reduce((sum, p) => sum + p.amount, 0);
  
  const overdue = payments
    .filter(p => p.status === 'overdue')
    .reduce((sum, p) => sum + p.amount, 0);
  
  const paidCount = payments.filter(p => p.status === 'paid').length;
  const totalCount = payments.length;
  const collectionRate = totalCount > 0 ? Math.round((paidCount / totalCount) * 100) : 0;

  document.getElementById('statsSummary').innerHTML = `
    <div class="stat-card">
      <div class="stat-value">₱${totalCollected.toLocaleString()}</div>
      <div class="stat-label">Total Collected</div>
      <span class="stat-trend positive">↑ ${paidCount} payments</span>
    </div>
    <div class="stat-card">
      <div class="stat-value">₱${pending.toLocaleString()}</div>
      <div class="stat-label">Pending Payments</div>
      <span class="stat-trend">${payments.filter(p => p.status === 'pending').length} pending</span>
    </div>
    <div class="stat-card">
      <div class="stat-value">₱${overdue.toLocaleString()}</div>
      <div class="stat-label">Overdue Amount</div>
      <span class="stat-trend negative">↓ ${payments.filter(p => p.status === 'overdue').length} overdue</span>
    </div>
    <div class="stat-card">
      <div class="stat-value">${collectionRate}%</div>
      <div class="stat-label">Collection Rate</div>
      <span class="stat-trend positive">${paidCount}/${totalCount} paid</span>
    </div>
  `;
}

function renderPayments(filteredPayments = payments) {
  if (currentView === 'table') {
    renderTableView(filteredPayments);
  } else {
    renderGridView(filteredPayments);
  }
}

function renderTableView(data) {
  const tbody = document.getElementById('paymentsTbody');
  
  if (data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:40px;color:#94a3b8">No payments found</td></tr>';
    return;
  }

  tbody.innerHTML = data.map(payment => `
    <tr>
      <td><span style="font-family:monospace;font-size:12px;color:#64748b">${payment.transactionId}</span></td>
      <td>
        <div class="tenant-info">
          <div class="tenant-avatar">${getInitials(payment.tenantName)}</div>
          <span>${payment.tenantName}</span>
        </div>
      </td>
      <td>${payment.unitNumber}</td>
      <td style="font-weight:600">₱${payment.amount.toLocaleString()}</td>
      <td>${formatDate(payment.dueDate)}</td>
      <td>${payment.paidDate ? formatDate(payment.paidDate) : '-'}</td>
      <td><span class="method-badge">${capitalizeMethod(payment.paymentMethod)}</span></td>
      <td><span class="status-badge ${payment.status}">${capitalize(payment.status)}</span></td>
      <td>
        <div class="action-btns">
          <button class="action-btn view" onclick="viewPayment(${payment.id})">View</button>
          <button class="action-btn edit" onclick="editPayment(${payment.id})">Edit</button>
          <button class="action-btn delete" onclick="deletePayment(${payment.id})">Delete</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function renderGridView(data) {
  const grid = document.getElementById('gridItems');
  
  if (data.length === 0) {
    grid.innerHTML = '<p style="text-align:center;padding:40px;color:#94a3b8;grid-column:1/-1">No payments found</p>';
    return;
  }

  grid.innerHTML = data.map(payment => `
    <div class="payment-card">
      <div class="payment-card-header">
        <div>
          <div class="payment-card-id">${payment.transactionId}</div>
          <div class="payment-card-tenant">${payment.tenantName}</div>
          <div class="payment-card-unit">Unit ${payment.unitNumber}</div>
        </div>
        <span class="status-badge ${payment.status}">${capitalize(payment.status)}</span>
      </div>
      <div class="payment-card-amount">₱${payment.amount.toLocaleString()}</div>
      <div class="payment-card-details">
        <div class="detail-row">
          <span class="detail-label">Due Date</span>
          <span class="detail-value">${formatDate(payment.dueDate)}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Paid Date</span>
          <span class="detail-value">${payment.paidDate ? formatDate(payment.paidDate) : 'Not paid'}</span>
        </div>
        <div class="detail-row" style="border:none">
          <span class="detail-label">Method</span>
          <span class="method-badge">${capitalizeMethod(payment.paymentMethod)}</span>
        </div>
      </div>
      <div class="action-btns">
        <button class="action-btn view" onclick="viewPayment(${payment.id})">View</button>
        <button class="action-btn edit" onclick="editPayment(${payment.id})">Edit</button>
        <button class="action-btn delete" onclick="deletePayment(${payment.id})">Delete</button>
      </div>
    </div>
  `).join('');
}

function switchView(view) {
  currentView = view;
  
  document.getElementById('tableViewBtn').classList.toggle('active', view === 'table');
  document.getElementById('gridViewBtn').classList.toggle('active', view === 'grid');
  
  document.getElementById('tableContainer').style.display = view === 'table' ? 'block' : 'none';
  document.getElementById('gridContainer').style.display = view === 'grid' ? 'block' : 'none';
  
  renderPayments();
}

function openAddModal() {
  editingId = null;
  document.getElementById('modalTitle').textContent = 'Record Payment';
  document.getElementById('paymentForm').reset();
  document.getElementById('paymentId').value = '';
  
  // Generate transaction ID
  const nextId = Math.max(...payments.map(p => p.id), 0) + 1;
  const year = new Date().getFullYear();
  const txnId = `TXN-${year}-${String(nextId).padStart(3, '0')}`;
  
  document.getElementById('paymentModal').classList.add('show');
}

function editPayment(id) {
  const payment = payments.find(p => p.id === id);
  if (!payment) return;

  editingId = id;
  document.getElementById('modalTitle').textContent = 'Edit Payment';
  document.getElementById('paymentId').value = payment.id;
  document.getElementById('tenantName').value = payment.tenantName;
  document.getElementById('unitNumber').value = payment.unitNumber;
  document.getElementById('amount').value = payment.amount;
  document.getElementById('paymentMethod').value = payment.paymentMethod;
  document.getElementById('dueDate').value = payment.dueDate;
  document.getElementById('paidDate').value = payment.paidDate || '';
  document.getElementById('status').value = payment.status;
  document.getElementById('referenceNumber').value = payment.referenceNumber || '';
  document.getElementById('notes').value = payment.notes || '';
  
  document.getElementById('paymentModal').classList.add('show');
}

function viewPayment(id) {
  const payment = payments.find(p => p.id === id);
  if (!payment) return;

  const daysLate = payment.paidDate 
    ? Math.ceil((new Date(payment.paidDate) - new Date(payment.dueDate)) / (1000 * 60 * 60 * 24))
    : Math.ceil((new Date() - new Date(payment.dueDate)) / (1000 * 60 * 60 * 24));

  document.getElementById('detailsModalTitle').textContent = 'Payment Receipt';
  document.getElementById('detailsContent').innerHTML = `
    <div class="receipt" id="printableReceipt">
      <div class="receipt-header">
        <div class="receipt-title">RENTARIUM</div>
        <div class="receipt-subtitle">Payment Receipt</div>
        <div style="margin-top:10px;font-size:14px;color:#64748b">Transaction ID: ${payment.transactionId}</div>
      </div>
      
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:30px;margin-bottom:30px">
        <div>
          <h4 style="color:#64748b;font-size:12px;text-transform:uppercase;margin-bottom:10px">Tenant Information</h4>
          <div style="color:#1e293b;font-size:16px;font-weight:600;margin-bottom:5px">${payment.tenantName}</div>
          <div style="color:#64748b;font-size:14px">Unit ${payment.unitNumber}</div>
        </div>
        <div>
          <h4 style="color:#64748b;font-size:12px;text-transform:uppercase;margin-bottom:10px">Payment Date</h4>
          <div style="color:#1e293b;font-size:16px;font-weight:600;margin-bottom:5px">${payment.paidDate ? formatDate(payment.paidDate) : 'Not Paid'}</div>
          <div style="color:#64748b;font-size:14px">Due: ${formatDate(payment.dueDate)}</div>
        </div>
      </div>

      <table style="width:100%;border-collapse:collapse;margin-bottom:30px">
        <thead style="background:#f8fafc">
          <tr>
            <th style="text-align:left;padding:12px;color:#64748b;font-size:13px;text-transform:uppercase">Description</th>
            <th style="text-align:right;padding:12px;color:#64748b;font-size:13px;text-transform:uppercase">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding:15px 12px;border-bottom:1px solid #e2e8f0">Monthly Rent - ${formatDate(payment.dueDate)}</td>
            <td style="padding:15px 12px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:600">₱${payment.amount.toLocaleString()}</td>
          </tr>
          ${daysLate > 0 && payment.status !== 'pending' ? `
          <tr>
            <td style="padding:15px 12px;border-bottom:1px solid #e2e8f0;color:#dc2626">Late Fee (${daysLate} days)</td>
            <td style="padding:15px 12px;border-bottom:1px solid #e2e8f0;text-align:right;color:#dc2626;font-weight:600">₱${(daysLate * 100).toLocaleString()}</td>
          </tr>
          ` : ''}
        </tbody>
        <tfoot>
          <tr>
            <td style="padding:20px 12px;font-size:18px;font-weight:bold">Total Amount</td>
            <td style="padding:20px 12px;text-align:right;font-size:24px;font-weight:bold;color:#667eea">
              ₱${(payment.amount + (daysLate > 0 && payment.status !== 'pending' ? daysLate * 100 : 0)).toLocaleString()}
            </td>
          </tr>
        </tfoot>
      </table>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;padding:20px;background:#f8fafc;border-radius:8px;margin-bottom:20px">
        <div>
          <div style="color:#64748b;font-size:12px;margin-bottom:4px">Payment Method</div>
          <div style="color:#1e293b;font-weight:600">${capitalizeMethod(payment.paymentMethod)}</div>
        </div>
        <div>
          <div style="color:#64748b;font-size:12px;margin-bottom:4px">Reference Number</div>
          <div style="color:#1e293b;font-weight:600">${payment.referenceNumber || 'N/A'}</div>
        </div>
        <div>
          <div style="color:#64748b;font-size:12px;margin-bottom:4px">Status</div>
          <span class="status-badge ${payment.status}">${capitalize(payment.status)}</span>
        </div>
        <div>
          <div style="color:#64748b;font-size:12px;margin-bottom:4px">Recorded</div>
          <div style="color:#1e293b;font-weight:600">${formatDate(new Date().toISOString().split('T')[0])}</div>
        </div>
      </div>

      ${payment.notes ? `
      <div style="padding:15px;background:#fffbeb;border-left:3px solid #f59e0b;border-radius:4px;margin-top:20px">
        <div style="font-weight:600;color:#92400e;margin-bottom:5px">Notes</div>
        <div style="color:#78350f;font-size:14px">${payment.notes}</div>
      </div>
      ` : ''}

      <div style="margin-top:30px;padding-top:20px;border-top:2px solid #e5e7eb;text-align:center;color:#94a3b8;font-size:12px">
        <p>Thank you for your payment!</p>
        <p style="margin-top:5px">For questions, contact admin@rentarium.com</p>
      </div>
    </div>
  `;
  
  document.getElementById('detailsModal').classList.add('show');
}

function deletePayment(id) {
  if (!confirm('Are you sure you want to delete this payment record?')) return;
  
  payments = payments.filter(p => p.id !== id);
  renderStats();
  renderPayments();
  filterPayments();
}

function handleFormSubmit(e) {
  e.preventDefault();
  
  const year = new Date().getFullYear();
  const nextId = editingId || Math.max(...payments.map(p => p.id), 0) + 1;
  const txnId = editingId 
    ? payments.find(p => p.id === editingId).transactionId
    : `TXN-${year}-${String(nextId).padStart(3, '0')}`;

  const formData = {
    transactionId: txnId,
    tenantName: document.getElementById('tenantName').value,
    unitNumber: document.getElementById('unitNumber').value,
    amount: parseFloat(document.getElementById('amount').value),
    paymentMethod: document.getElementById('paymentMethod').value,
    dueDate: document.getElementById('dueDate').value,
    paidDate: document.getElementById('paidDate').value,
    status: document.getElementById('status').value,
    referenceNumber: document.getElementById('referenceNumber').value,
    notes: document.getElementById('notes').value
  };

  if (editingId) {
    const index = payments.findIndex(p => p.id === editingId);
    payments[index] = { ...payments[index], ...formData };
  } else {
    payments.push({ id: nextId, ...formData });
  }

  closeModal();
  renderStats();
  renderPayments();
  filterPayments();
}

function closeModal() {
  document.getElementById('paymentModal').classList.remove('show');
}

function closeDetailsModal() {
  document.getElementById('detailsModal').classList.remove('show');
}

function printReceipt() {
  window.print();
}

function filterPayments() {
  const search = document.getElementById('searchInput').value.toLowerCase();
  const statusFilter = document.getElementById('statusFilter').value;
  const monthFilter = document.getElementById('monthFilter').value;
  const methodFilter = document.getElementById('methodFilter').value;

  let filtered = payments.filter(payment => {
    const matchesSearch = 
      payment.tenantName.toLowerCase().includes(search) ||
      payment.unitNumber.toLowerCase().includes(search) ||
      payment.transactionId.toLowerCase().includes(search);
    
    const matchesStatus = statusFilter === 'all' || payment.status === statusFilter;
    
    const matchesMonth = monthFilter === 'all' || 
      payment.dueDate.startsWith(monthFilter) ||
      (payment.paidDate && payment.paidDate.startsWith(monthFilter));
    
    const matchesMethod = methodFilter === 'all' || payment.paymentMethod === methodFilter;

    return matchesSearch && matchesStatus && matchesMonth && matchesMethod;
  });

  renderPayments(filtered);
  
  const statusText = statusFilter === 'all' ? 'All' : capitalize(statusFilter);
  document.getElementById('listTitle').textContent = 
    `${statusText} Payments (${filtered.length})`;
}

function exportToCSV() {
  const headers = ['Transaction ID', 'Tenant', 'Unit', 'Amount', 'Due Date', 'Paid Date', 'Method', 'Status', 'Reference', 'Notes'];
  const rows = payments.map(p => [
    p.transactionId,
    p.tenantName,
    p.unitNumber,
    p.amount,
    p.dueDate,
    p.paidDate || '',
    p.paymentMethod,
    p.status,
    p.referenceNumber || '',
    p.notes || ''
  ]);

  const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
  downloadFile(csv, 'payments.csv', 'text/csv');
}

function exportToXML() {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<payments>\n';
  
  payments.forEach(payment => {
    xml += '  <payment>\n';
    xml += `    <id>${payment.id}</id>\n`;
    xml += `    <transactionId>${escapeXml(payment.transactionId)}</transactionId>\n`;
    xml += `    <tenantName>${escapeXml(payment.tenantName)}</tenantName>\n`;
    xml += `    <unitNumber>${escapeXml(payment.unitNumber)}</unitNumber>\n`;
    xml += `    <amount>${payment.amount}</amount>\n`;
    xml += `    <dueDate>${payment.dueDate}</dueDate>\n`;
    xml += `    <paidDate>${payment.paidDate || ''}</paidDate>\n`;
    xml += `    <paymentMethod>${payment.paymentMethod}</paymentMethod>\n`;
    xml += `    <status>${payment.status}</status>\n`;
    xml += `    <referenceNumber>${escapeXml(payment.referenceNumber || '')}</referenceNumber>\n`;
    xml += `    <notes>${escapeXml(payment.notes || '')}</notes>\n`;
    xml += '  </payment>\n';
  });
  
  xml += '</payments>';
  downloadFile(xml, 'payments.xml', 'text/xml');
}

function importFromXML(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(event.target.result, 'text/xml');
      const paymentNodes = xmlDoc.getElementsByTagName('payment');
      
      const imported = [];
      for (let node of paymentNodes) {
        imported.push({
          id: parseInt(node.querySelector('id')?.textContent) || Date.now(),
          transactionId: node.querySelector('transactionId')?.textContent || '',
          tenantName: node.querySelector('tenantName')?.textContent || '',
          unitNumber: node.querySelector('unitNumber')?.textContent || '',
          amount: parseFloat(node.querySelector('amount')?.textContent) || 0,
          dueDate: node.querySelector('dueDate')?.textContent || '',
          paidDate: node.querySelector('paidDate')?.textContent || '',
          paymentMethod: node.querySelector('paymentMethod')?.textContent || 'cash',
          status: node.querySelector('status')?.textContent || 'pending',
          referenceNumber: node.querySelector('referenceNumber')?.textContent || '',
          notes: node.querySelector('notes')?.textContent || ''
        });
      }

      if (imported.length > 0) {
        payments = imported;
        renderStats();
        renderPayments();
        filterPayments();
        alert(`Successfully imported ${imported.length} payment records!`);
      }
    } catch (err) {
      alert('Error importing XML: ' + err.message);
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}

function resetToSample() {
  if (!confirm('Reset to sample data? This will discard all changes.')) return;
  payments = JSON.parse(JSON.stringify(sampleData));
  renderStats();
  renderPayments();
  filterPayments();
}

// Helper functions
function getInitials(name) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase();
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function capitalizeMethod(method) {
  const methods = {
    cash: 'Cash',
    bank: 'Bank Transfer',
    gcash: 'GCash',
    check: 'Check'
  };
  return methods[method] || method;
}

function escapeXml(str) {
  return str.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
    }
  });
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
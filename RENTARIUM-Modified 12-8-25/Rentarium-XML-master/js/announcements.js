// Sample announcements data
// NOTE: This data can be synced with User Dashboard via API/Database in production
let announcements = [
  {
    id: 1,
    title: "Monthly Maintenance Schedule - December",
    category: "maintenance",
    content: "Regular maintenance will be conducted on all units this December. Please ensure someone is available in your unit during the scheduled time. Elevator maintenance: Dec 10, 9AM-12PM. Water system check: Dec 15, 2PM-5PM. Thank you for your cooperation!",
    postedDate: "2024-12-01",
    expiryDate: "2024-12-31",
    status: "published",
    priority: "normal",
    pinned: true,
    targetAudience: "all",
    postedBy: "Admin"
  },
  {
    id: 2,
    title: "Rent Payment Due Reminder",
    category: "payment",
    content: "This is a friendly reminder that rent payments for December are due by December 5th. Please ensure timely payment to avoid late fees. You can pay via bank transfer, GCash, or cash at the office.",
    postedDate: "2024-12-02",
    expiryDate: "2024-12-05",
    status: "published",
    priority: "high",
    pinned: false,
    targetAudience: "all",
    postedBy: "Admin"
  },
  {
    id: 3,
    title: "Holiday Party - December 20th",
    category: "event",
    content: "You're invited to our annual holiday party! Join us on December 20th at 6PM in the Community Hall. There will be food, games, and prizes. Please RSVP by December 15th. Looking forward to seeing everyone!",
    postedDate: "2024-12-03",
    expiryDate: "2024-12-20",
    status: "published",
    priority: "normal",
    pinned: false,
    targetAudience: "all",
    postedBy: "Admin"
  },
  {
    id: 4,
    title: "Water Interruption Notice",
    category: "urgent",
    content: "URGENT: Water supply will be temporarily interrupted on December 8th from 8AM to 2PM due to pipe repairs. Please store sufficient water. We apologize for the inconvenience.",
    postedDate: "2024-12-04",
    expiryDate: "2024-12-08",
    status: "published",
    priority: "urgent",
    pinned: true,
    targetAudience: "all",
    postedBy: "Admin"
  },
  {
    id: 5,
    title: "New Parking Policy",
    category: "general",
    content: "Starting January 2025, we're implementing a new parking policy. Each unit will be assigned specific parking slots. Please register your vehicle at the office by December 31st to receive your parking sticker.",
    postedDate: "2024-11-28",
    expiryDate: "",
    status: "published",
    priority: "normal",
    pinned: false,
    targetAudience: "all",
    postedBy: "Admin"
  },
  {
    id: 6,
    title: "Security Update - Draft",
    category: "general",
    content: "We're upgrading our security system with new CCTV cameras and access cards. More details to follow.",
    postedDate: "2024-12-05",
    expiryDate: "",
    status: "draft",
    priority: "normal",
    pinned: false,
    targetAudience: "all",
    postedBy: "Admin"
  }
];

let currentView = 'card';
let editingId = null;
const sampleData = JSON.parse(JSON.stringify(announcements));

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  renderStats();
  renderAnnouncements();
  setupEventListeners();
  setTodayDate();
});

function setupEventListeners() {
  // Modal controls
  document.getElementById('createAnnouncementBtn').addEventListener('click', openCreateModal);
  document.getElementById('closeModalBtn').addEventListener('click', closeModal);
  document.getElementById('closeViewBtn').addEventListener('click', closeViewModal);
  document.getElementById('cancelBtn').addEventListener('click', closeModal);
  document.getElementById('announcementForm').addEventListener('submit', handleFormSubmit);

  // View toggle
  document.getElementById('cardViewBtn').addEventListener('click', () => switchView('card'));
  document.getElementById('listViewBtn').addEventListener('click', () => switchView('list'));

  // Search and filters
  document.getElementById('searchInput').addEventListener('input', filterAnnouncements);
  document.getElementById('categoryFilter').addEventListener('change', filterAnnouncements);
  document.getElementById('statusFilter').addEventListener('change', filterAnnouncements);

  // Export functions
  document.getElementById('exportCsvBtn').addEventListener('click', exportToCSV);
  document.getElementById('exportXmlBtn').addEventListener('click', exportToXML);
  document.getElementById('xmlFileInput').addEventListener('change', importFromXML);

  // Reset button
  document.getElementById('resetSampleBtn').addEventListener('click', resetToSample);

  // Close modal on overlay click
  document.getElementById('announcementModal').addEventListener('click', (e) => {
    if (e.target.id === 'announcementModal') closeModal();
  });
  document.getElementById('viewModal').addEventListener('click', (e) => {
    if (e.target.id === 'viewModal') closeViewModal();
  });
}

function setTodayDate() {
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('postedDate').value = today;
}

function renderStats() {
  const published = announcements.filter(a => a.status === 'published').length;
  const draft = announcements.filter(a => a.status === 'draft').length;
  const urgent = announcements.filter(a => a.priority === 'urgent' && a.status === 'published').length;
  const active = announcements.filter(a => {
    if (a.status !== 'published') return false;
    if (!a.expiryDate) return true;
    return new Date(a.expiryDate) >= new Date();
  }).length;

  document.getElementById('statsSummary').innerHTML = `
    <div class="stat-card">
      <div class="stat-value">${announcements.length}</div>
      <div class="stat-label">Total Announcements</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${published}</div>
      <div class="stat-label">Published</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${active}</div>
      <div class="stat-label">Active Now</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${urgent}</div>
      <div class="stat-label">Urgent Notices</div>
    </div>
  `;
}

function renderAnnouncements(filteredAnnouncements = announcements) {
  if (currentView === 'card') {
    renderCardView(filteredAnnouncements);
  } else {
    renderListView(filteredAnnouncements);
  }
}

function renderCardView(data) {
  const container = document.getElementById('announcementCards');
  
  if (data.length === 0) {
    container.innerHTML = '<p style="text-align:center;padding:40px;color:#94a3b8;grid-column:1/-1">No announcements found</p>';
    return;
  }

  // Sort: pinned first, then by date
  const sorted = [...data].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(b.postedDate) - new Date(a.postedDate);
  });

  container.innerHTML = sorted.map(ann => `
    <div class="announcement-card ${ann.pinned ? 'pinned' : ''}" onclick="viewAnnouncement(${ann.id})">
      ${ann.pinned ? '<div class="pin-badge">📌 Pinned</div>' : ''}
      <div class="announcement-header">
        <span class="category-badge ${ann.category}">
          ${getCategoryIcon(ann.category)} ${capitalize(ann.category)}
        </span>
      </div>
      <h3 class="announcement-title">${ann.title}</h3>
      <p class="announcement-content">${ann.content}</p>
      <div class="announcement-footer">
        <div class="announcement-meta">
          <span>📅 ${formatDate(ann.postedDate)}</span>
          ${ann.expiryDate ? `<span>⏰ Expires: ${formatDate(ann.expiryDate)}</span>` : ''}
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <span class="priority-badge ${ann.priority}">${capitalize(ann.priority)}</span>
          <span class="status-badge ${ann.status}">${capitalize(ann.status)}</span>
        </div>
      </div>
      <div class="card-actions" onclick="event.stopPropagation()">
        <button class="action-btn view" onclick="viewAnnouncement(${ann.id})">View</button>
        <button class="action-btn edit" onclick="editAnnouncement(${ann.id})">Edit</button>
        <button class="action-btn delete" onclick="deleteAnnouncement(${ann.id})">Delete</button>
      </div>
    </div>
  `).join('');
}

function renderListView(data) {
  const tbody = document.getElementById('announcementsTbody');
  
  if (data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:#94a3b8">No announcements found</td></tr>';
    return;
  }

  tbody.innerHTML = data.map(ann => `
    <tr onclick="viewAnnouncement(${ann.id})" style="cursor:pointer">
      <td>
        <div style="font-weight:600;color:#1e293b;margin-bottom:4px">${ann.title}</div>
        <div style="font-size:12px;color:#94a3b8">${ann.content.substring(0, 60)}...</div>
      </td>
      <td><span class="category-badge ${ann.category}">${getCategoryIcon(ann.category)} ${capitalize(ann.category)}</span></td>
      <td>${formatDate(ann.postedDate)}</td>
      <td><span class="status-badge ${ann.status}">${capitalize(ann.status)}</span></td>
      <td><span class="priority-badge ${ann.priority}">${capitalize(ann.priority)}</span></td>
      <td onclick="event.stopPropagation()">
        <div style="display:flex;gap:8px">
          <button class="action-btn view" onclick="viewAnnouncement(${ann.id})">View</button>
          <button class="action-btn edit" onclick="editAnnouncement(${ann.id})">Edit</button>
          <button class="action-btn delete" onclick="deleteAnnouncement(${ann.id})">Delete</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function switchView(view) {
  currentView = view;
  
  document.getElementById('cardViewBtn').classList.toggle('active', view === 'card');
  document.getElementById('listViewBtn').classList.toggle('active', view === 'list');
  
  document.getElementById('cardContainer').style.display = view === 'card' ? 'block' : 'none';
  document.getElementById('listContainer').style.display = view === 'list' ? 'block' : 'none';
  
  renderAnnouncements();
}

function openCreateModal() {
  editingId = null;
  document.getElementById('modalTitle').textContent = 'Create Announcement';
  document.getElementById('announcementForm').reset();
  document.getElementById('announcementId').value = '';
  setTodayDate();
  document.getElementById('announcementModal').classList.add('show');
}

function editAnnouncement(id) {
  const ann = announcements.find(a => a.id === id);
  if (!ann) return;

  editingId = id;
  document.getElementById('modalTitle').textContent = 'Edit Announcement';
  document.getElementById('announcementId').value = ann.id;
  document.getElementById('title').value = ann.title;
  document.getElementById('category').value = ann.category;
  document.getElementById('content').value = ann.content;
  document.getElementById('postedDate').value = ann.postedDate;
  document.getElementById('expiryDate').value = ann.expiryDate || '';
  document.getElementById('status').value = ann.status;
  document.getElementById('priority').value = ann.priority;
  document.getElementById('pinned').checked = ann.pinned;
  document.getElementById('targetAudience').value = ann.targetAudience;
  
  document.getElementById('announcementModal').classList.add('show');
}

function viewAnnouncement(id) {
  const ann = announcements.find(a => a.id === id);
  if (!ann) return;

  const isExpired = ann.expiryDate && new Date(ann.expiryDate) < new Date();

  document.getElementById('viewModalTitle').textContent = ann.title;
  document.getElementById('viewContent').innerHTML = `
    <div class="announcement-detail">
      <div class="detail-header">
        <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:12px">
          <h2 class="detail-title">${ann.title}</h2>
          ${ann.pinned ? '<div class="pin-badge">📌 Pinned</div>' : ''}
        </div>
        <div class="detail-meta">
          <span class="category-badge ${ann.category}">${getCategoryIcon(ann.category)} ${capitalize(ann.category)}</span>
          <span class="priority-badge ${ann.priority}">${capitalize(ann.priority)} Priority</span>
          <span class="status-badge ${ann.status}">${capitalize(ann.status)}</span>
        </div>
      </div>

      <div class="detail-content">${ann.content}</div>

      <div class="detail-footer">
        <div class="detail-row">
          <span class="detail-label">Posted Date</span>
          <span class="detail-value">${formatDate(ann.postedDate)}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Expiry Date</span>
          <span class="detail-value" style="color:${isExpired ? '#dc2626' : '#1e293b'}">
            ${ann.expiryDate ? formatDate(ann.expiryDate) + (isExpired ? ' (Expired)' : '') : 'No expiry'}
          </span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Target Audience</span>
          <span class="detail-value">${capitalize(ann.targetAudience === 'all' ? 'All Tenants' : ann.targetAudience)}</span>
        </div>
        <div class="detail-row" style="border:none">
          <span class="detail-label">Posted By</span>
          <span class="detail-value">${ann.postedBy}</span>
        </div>
      </div>
    </div>

    <div style="margin-top:20px;padding-top:20px;border-top:1px solid #e5e7eb;display:flex;gap:12px;justify-content:flex-end">
      <button class="btn" onclick="closeViewModal()">Close</button>
      <button class="btn btn-secondary" onclick="closeViewModal();editAnnouncement(${ann.id})">Edit</button>
      <button class="btn" style="background:#ef4444;color:white" onclick="deleteAnnouncement(${ann.id});closeViewModal()">Delete</button>
    </div>
  `;
  
  document.getElementById('viewModal').classList.add('show');
}

function deleteAnnouncement(id) {
  if (!confirm('Are you sure you want to delete this announcement?')) return;
  
  announcements = announcements.filter(a => a.id !== id);
  renderStats();
  renderAnnouncements();
  filterAnnouncements();
}

function handleFormSubmit(e) {
  e.preventDefault();
  
  const formData = {
    title: document.getElementById('title').value,
    category: document.getElementById('category').value,
    content: document.getElementById('content').value,
    postedDate: document.getElementById('postedDate').value,
    expiryDate: document.getElementById('expiryDate').value,
    status: document.getElementById('status').value,
    priority: document.getElementById('priority').value,
    pinned: document.getElementById('pinned').checked,
    targetAudience: document.getElementById('targetAudience').value,
    postedBy: "Admin"
  };

  if (editingId) {
    const index = announcements.findIndex(a => a.id === editingId);
    announcements[index] = { ...announcements[index], ...formData };
  } else {
    const newId = Math.max(...announcements.map(a => a.id), 0) + 1;
    announcements.push({ id: newId, ...formData });
  }

  closeModal();
  renderStats();
  renderAnnouncements();
  filterAnnouncements();

  // Show success message
  alert(editingId ? 'Announcement updated successfully!' : 'Announcement created successfully!');
}

function closeModal() {
  document.getElementById('announcementModal').classList.remove('show');
}

function closeViewModal() {
  document.getElementById('viewModal').classList.remove('show');
}

function filterAnnouncements() {
  const search = document.getElementById('searchInput').value.toLowerCase();
  const categoryFilter = document.getElementById('categoryFilter').value;
  const statusFilter = document.getElementById('statusFilter').value;

  let filtered = announcements.filter(ann => {
    const matchesSearch = 
      ann.title.toLowerCase().includes(search) ||
      ann.content.toLowerCase().includes(search);
    
    const matchesCategory = categoryFilter === 'all' || ann.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || ann.status === statusFilter;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  renderAnnouncements(filtered);
  
  const categoryText = categoryFilter === 'all' ? 'All' : capitalize(categoryFilter);
  document.getElementById('listTitle').textContent = 
    `${categoryText} Announcements (${filtered.length})`;
}

function exportToCSV() {
  const headers = ['ID', 'Title', 'Category', 'Content', 'Posted Date', 'Expiry Date', 'Status', 'Priority', 'Pinned', 'Target Audience'];
  const rows = announcements.map(a => [
    a.id,
    a.title,
    a.category,
    a.content,
    a.postedDate,
    a.expiryDate || '',
    a.status,
    a.priority,
    a.pinned,
    a.targetAudience
  ]);

  const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  downloadFile(csv, 'announcements.csv', 'text/csv');
}

function exportToXML() {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<announcements>\n';
  
  announcements.forEach(ann => {
    xml += '  <announcement>\n';
    xml += `    <id>${ann.id}</id>\n`;
    xml += `    <title>${escapeXml(ann.title)}</title>\n`;
    xml += `    <category>${ann.category}</category>\n`;
    xml += `    <content>${escapeXml(ann.content)}</content>\n`;
    xml += `    <postedDate>${ann.postedDate}</postedDate>\n`;
    xml += `    <expiryDate>${ann.expiryDate || ''}</expiryDate>\n`;
    xml += `    <status>${ann.status}</status>\n`;
    xml += `    <priority>${ann.priority}</priority>\n`;
    xml += `    <pinned>${ann.pinned}</pinned>\n`;
    xml += `    <targetAudience>${ann.targetAudience}</targetAudience>\n`;
    xml += `    <postedBy>${escapeXml(ann.postedBy)}</postedBy>\n`;
    xml += '  </announcement>\n';
  });
  
  xml += '</announcements>';
  downloadFile(xml, 'announcements.xml', 'text/xml');
}

function importFromXML(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(event.target.result, 'text/xml');
      const annNodes = xmlDoc.getElementsByTagName('announcement');
      
      const imported = [];
      for (let node of annNodes) {
        imported.push({
          id: parseInt(node.querySelector('id')?.textContent) || Date.now(),
          title: node.querySelector('title')?.textContent || '',
          category: node.querySelector('category')?.textContent || 'general',
          content: node.querySelector('content')?.textContent || '',
          postedDate: node.querySelector('postedDate')?.textContent || '',
          expiryDate: node.querySelector('expiryDate')?.textContent || '',
          status: node.querySelector('status')?.textContent || 'draft',
          priority: node.querySelector('priority')?.textContent || 'normal',
          pinned: node.querySelector('pinned')?.textContent === 'true',
          targetAudience: node.querySelector('targetAudience')?.textContent || 'all',
          postedBy: node.querySelector('postedBy')?.textContent || 'Admin'
        });
      }

      if (imported.length > 0) {
        announcements = imported;
        renderStats();
        renderAnnouncements();
        filterAnnouncements();
        alert(`Successfully imported ${imported.length} announcements!`);
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
  announcements = JSON.parse(JSON.stringify(sampleData));
  renderStats();
  renderAnnouncements();
  filterAnnouncements();
}

// Helper functions
function getCategoryIcon(category) {
  const icons = {
    general: '📰',
    maintenance: '🔧',
    payment: '💳',
    event: '🎉',
    urgent: '⚠️'
  };
  return icons[category] || '📰';
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
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

// API Integration Template (for future development)
// Uncomment and modify when connecting to backend

/*
async function syncWithUserDashboard() {
  try {
    const response = await fetch('/api/announcements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        announcements: announcements.filter(a => a.status === 'published')
      })
    });
    const data = await response.json();
    console.log('Synced with user dashboard:', data);
  } catch (error) {
    console.error('Sync error:', error);
  }
}

// Call this after creating/updating announcements
// syncWithUserDashboard();
*/
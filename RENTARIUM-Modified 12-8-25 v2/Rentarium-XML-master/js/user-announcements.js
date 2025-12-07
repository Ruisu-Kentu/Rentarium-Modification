// USER ANNOUNCEMENTS DISPLAY
// This script loads announcements from localStorage (created by Admin)
// and displays only PUBLISHED announcements to users

document.addEventListener('DOMContentLoaded', function() {
    // Get logged-in user info
    const session = localStorage.getItem('rentarium_session');
    let currentUser = null;
    
    if (session) {
        currentUser = JSON.parse(session);
        updateUserProfile(currentUser);
    }

    // Load and display announcements
    loadAnnouncements();
    
    // Listen for real-time updates from Admin
    window.addEventListener('storage', (e) => {
        if (e.key === 'rentarium_announcements') {
            loadAnnouncements();
        }
    });
});

function updateUserProfile(user) {
    const userInfoDiv = document.querySelector('.user-info');
    if (userInfoDiv && user) {
        const initials = getInitials(user.fullName || user.username);
        userInfoDiv.innerHTML = `
            <div class="user-avatar">${initials}</div>
            <div>
                <div style="font-weight: 600;">${user.fullName || user.username}</div>
                <div style="font-size: 12px; color: #cbd5e0;">Tenant</div>
            </div>
        `;
    }
}

function getInitials(name) {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
}

function loadAnnouncements() {
    // Get announcements from localStorage (created by Admin)
    const stored = localStorage.getItem('rentarium_announcements');
    let allAnnouncements = stored ? JSON.parse(stored) : [];
    
    // Filter: Only show PUBLISHED announcements
    let announcements = allAnnouncements.filter(a => a.status === 'published');
    
    // Sort: Pinned first, then by date (newest first)
    announcements.sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return new Date(b.postedDate) - new Date(a.postedDate);
    });
    
    // Display announcements
    displayAnnouncements(announcements);
}

function displayAnnouncements(announcements) {
    const container = document.getElementById('announcementsList');
    
    if (!container) {
        console.error('Announcements container not found');
        return;
    }
    
    if (announcements.length === 0) {
        container.innerHTML = `
            <div class="announcement-card" style="text-align:center;padding:40px">
                <p style="color:#94a3b8;font-size:16px">📭 No announcements at the moment</p>
                <p style="color:#cbd5e0;font-size:14px;margin-top:8px">Check back later for updates</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = announcements.map(ann => {
        const isExpired = ann.expiryDate && new Date(ann.expiryDate) < new Date();
        const priorityClass = getPriorityClass(ann.priority);
        const categoryIcon = getCategoryIcon(ann.category);
        
        return `
            <div class="announcement-card ${priorityClass}" data-priority="${ann.priority}" ${ann.pinned ? 'style="border: 2px solid #3b82f6"' : ''}>
                ${ann.pinned ? '<div style="background:#3b82f6;color:white;padding:4px 12px;font-size:12px;font-weight:600;margin:-16px -20px 12px;border-radius:8px 8px 0 0">📌 PINNED ANNOUNCEMENT</div>' : ''}
                <div class="announcement-header">
                    <div class="announcement-title">${categoryIcon} ${ann.title}</div>
                    <span class="priority-badge ${priorityClass}">${capitalize(ann.priority)} Priority</span>
                </div>
                <div class="announcement-meta">
                    <span>📅 ${formatDate(ann.postedDate)}</span>
                    ${ann.expiryDate ? `<span style="color:${isExpired ? '#dc2626' : '#64748b'}">⏰ ${isExpired ? 'Expired' : 'Valid until'}: ${formatDate(ann.expiryDate)}</span>` : ''}
                    <span>👤 ${ann.postedBy || 'Property Management'}</span>
                </div>
                <div class="announcement-content">
                    ${ann.content}
                </div>
                <div class="announcement-footer">
                    <div class="announcement-author">
                        <span style="background:#f1f5f9;padding:4px 8px;border-radius:4px;font-size:12px;color:#475569">
                            ${categoryIcon} ${capitalize(ann.category)}
                        </span>
                    </div>
                    <button class="read-more-btn" onclick="showFullAnnouncement('${escapeHtml(ann.title)}', \`${escapeHtml(ann.content)}\`, '${ann.postedDate}', '${ann.expiryDate || ''}', '${ann.category}', '${ann.priority}')">
                        Read More
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function getPriorityClass(priority) {
    const map = {
        'urgent': 'priority-high',
        'high': 'priority-high',
        'medium': 'priority-medium',
        'normal': 'priority-low',
        'low': 'priority-low'
    };
    return map[priority] || 'priority-low';
}

function getCategoryIcon(category) {
    const icons = {
        'general': '📰',
        'maintenance': '🔧',
        'payment': '💳',
        'event': '🎉',
        'urgent': '⚠️'
    };
    return icons[category] || '📰';
}

function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
        .replace(/`/g, '&#96;');
}

// Filter announcements by priority
function filterAnnouncements(priority) {
    const cards = document.querySelectorAll('.announcement-card');
    const buttons = document.querySelectorAll('.tab-btn');
    
    // Update active button
    buttons.forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    // Show/hide cards based on priority
    cards.forEach(card => {
        const cardPriority = card.dataset.priority;
        
        if (priority === 'all') {
            card.style.display = 'block';
        } else if (priority === 'high' && (cardPriority === 'high' || cardPriority === 'urgent')) {
            card.style.display = 'block';
        } else if (cardPriority === priority) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

// Show full announcement in modal
function showFullAnnouncement(title, content, postedDate, expiryDate, category, priority) {
    const modal = document.getElementById('announcementModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    
    if (!modal || !modalTitle || !modalBody) return;
    
    const isExpired = expiryDate && new Date(expiryDate) < new Date();
    const categoryIcon = getCategoryIcon(category);
    
    modalTitle.textContent = title;
    modalBody.innerHTML = `
        <div style="margin-bottom:16px;display:flex;gap:8px;flex-wrap:wrap">
            <span style="background:#f1f5f9;padding:6px 12px;border-radius:6px;font-size:13px;font-weight:500">
                ${categoryIcon} ${capitalize(category)}
            </span>
            <span style="background:${priority === 'urgent' || priority === 'high' ? '#fee2e2' : '#f1f5f9'};
                         color:${priority === 'urgent' || priority === 'high' ? '#dc2626' : '#475569'};
                         padding:6px 12px;border-radius:6px;font-size:13px;font-weight:500">
                ${capitalize(priority)} Priority
            </span>
        </div>
        <div style="margin-bottom:16px;padding-bottom:16px;border-bottom:1px solid #e5e7eb;color:#64748b;font-size:14px">
            <div style="margin-bottom:8px">📅 Posted: ${formatDate(postedDate)}</div>
            ${expiryDate ? `<div style="color:${isExpired ? '#dc2626' : '#64748b'}">⏰ ${isExpired ? 'Expired' : 'Valid until'}: ${formatDate(expiryDate)}</div>` : ''}
        </div>
        <div style="line-height:1.7;color:#334155;white-space:pre-wrap">${content}</div>
    `;
    
    modal.classList.add('active');
}

function closeModal() {
    const modal = document.getElementById('announcementModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// Close modal when clicking outside
document.addEventListener('click', function(e) {
    const modal = document.getElementById('announcementModal');
    if (modal && e.target === modal) {
        closeModal();
    }
});


//User Announcements

    function loadUserAnnouncements() {
        const announcements = JSON.parse(localStorage.getItem('announcements')) || [];
        const container = document.getElementById('userAnnouncements');

        if (announcements.length === 0) {
            container.innerHTML = "<p>No announcements available.</p>";
            return;
        }

        // Render each announcement
        container.innerHTML = announcements.map(a => `
            <div style="
                border: 1px solid #ccc;
                border-radius: 8px;
                padding: 12px;
                margin-bottom: 10px;
                background: #fafafa;
            ">
                <h3 style="margin-bottom: 6px;">${a.title}</h3>
                <p style="margin-bottom: 6px;">${a.message}</p>
                <small>📅 ${a.date}</small>
            </div>
        `).join('');
    }

    document.addEventListener('DOMContentLoaded', loadUserAnnouncements);


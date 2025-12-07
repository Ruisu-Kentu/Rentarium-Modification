/**
 * RENTARIUM PAYMENT STORAGE SYSTEM - ENHANCED VERSION
 * Prevents duplicate payments and tracks monthly payment cycles
 * Uses localStorage as mock database
 */

const PaymentStorage = {
  STORAGE_KEY: 'rentarium_payments',
  SESSION_KEY: 'rentarium_session',

  // Initialize storage
  init() {
    if (!localStorage.getItem(this.STORAGE_KEY)) {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify([]));
    }
  },

  // Generate unique payment ID
  generatePaymentId() {
    const payments = this.getAllPayments();
    const lastId = payments.length > 0 
      ? Math.max(...payments.map(p => parseInt(p.id.split('-')[1])))
      : 0;
    return `PAY-${String(lastId + 1).padStart(4, '0')}`;
  },

  // Generate reference number based on payment method
  generateReference(method) {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    const prefixes = {
      'gcash': 'GC',
      'bpi': 'BPI',
      'cash': 'CSH'
    };
    const prefix = prefixes[method.toLowerCase()] || 'REF';
    return `${prefix}-${timestamp}-${random}`;
  },

  // Get current tenant info from session and tenant database
  getCurrentTenant() {
    const session = localStorage.getItem(this.SESSION_KEY);
    if (!session) return null;

    const user = JSON.parse(session);
    const tenants = JSON.parse(localStorage.getItem('tenants')) || [];
    const tenant = tenants.find(t => t.username === user.username);
    
    if (!tenant) return null;

    return {
      id: tenant.username,
      name: tenant.name,
      unit: tenant.unitAssigned,
      monthlyRent: parseFloat(tenant.rentAmount) || 0,
      email: tenant.email || '',
      contactNumber: tenant.contactNumber || '',
      leaseStart: tenant.leaseStart || null,
      leaseEnd: tenant.leaseEnd || null
    };
  },

  // NEW: Get current payment period (month-year based on lease start)
  getCurrentPaymentPeriod() {
    const tenant = this.getCurrentTenant();
    if (!tenant || !tenant.leaseStart) return null;

    const today = new Date();
    const leaseStart = new Date(tenant.leaseStart);
    
    // Calculate which payment period we're in based on lease start date
    const monthsSinceStart = (today.getFullYear() - leaseStart.getFullYear()) * 12 + 
                             (today.getMonth() - leaseStart.getMonth());
    
    // Calculate the period start date
    const periodStart = new Date(leaseStart);
    periodStart.setMonth(periodStart.getMonth() + monthsSinceStart);
    
    // Format as YYYY-MM for comparison
    return `${periodStart.getFullYear()}-${String(periodStart.getMonth() + 1).padStart(2, '0')}`;
  },

  // NEW: Check if user can make a payment (duplicate prevention)
  canMakePayment(paymentType) {
    const tenant = this.getCurrentTenant();
    if (!tenant) return { allowed: false, reason: 'Tenant not found' };

    const currentPeriod = this.getCurrentPaymentPeriod();
    if (!currentPeriod) return { allowed: false, reason: 'Payment period cannot be determined' };

    // Get all verified/completed payments for current period
    const periodPayments = this.getAllPayments().filter(p => 
      p.tenantId === tenant.id &&
      (p.status === 'verified' || p.status === 'completed') &&
      p.dueDate && p.dueDate.startsWith(currentPeriod)
    );

    // Check if Monthly Rent is already paid
    const rentPaid = periodPayments.some(p => p.paymentType === 'Monthly Rent');
    
    // Check if Utility Bills are already paid
    const billsPaid = periodPayments.some(p => p.paymentType === 'Utility Bills');

    // Payment rules
    if (paymentType === 'Monthly Rent') {
      if (rentPaid) {
        return { 
          allowed: false, 
          reason: 'Monthly rent for this period has already been paid and verified.' 
        };
      }
    } else if (paymentType === 'Utility Bills') {
      if (billsPaid) {
        return { 
          allowed: false, 
          reason: 'Utility bills for this period have already been paid and verified.' 
        };
      }
    }

    // If both are paid, no more payments allowed this period
    if (rentPaid && billsPaid) {
      return { 
        allowed: false, 
        reason: 'All payments for this period are complete. Please wait for the next billing cycle.' 
      };
    }

    return { allowed: true };
  },

  // NEW: Get payment status summary for current period
  getPaymentStatus() {
    const tenant = this.getCurrentTenant();
    if (!tenant) return null;

    const currentPeriod = this.getCurrentPaymentPeriod();
    if (!currentPeriod) return null;

    const periodPayments = this.getAllPayments().filter(p => 
      p.tenantId === tenant.id &&
      (p.status === 'verified' || p.status === 'completed') &&
      p.dueDate && p.dueDate.startsWith(currentPeriod)
    );

    return {
      period: currentPeriod,
      rentPaid: periodPayments.some(p => p.paymentType === 'Monthly Rent'),
      billsPaid: periodPayments.some(p => p.paymentType === 'Utility Bills'),
      allPaid: periodPayments.some(p => p.paymentType === 'Monthly Rent') && 
               periodPayments.some(p => p.paymentType === 'Utility Bills')
    };
  },

  // Create new payment record
  createPayment(paymentData) {
    this.init();
    const payments = this.getAllPayments();
    const tenant = this.getCurrentTenant();

    if (!tenant) {
      console.error('No tenant found in session');
      return null;
    }

    const payment = {
      id: this.generatePaymentId(),
      tenantId: tenant.id,
      tenantName: tenant.name,
      unitNumber: tenant.unit,
      amount: paymentData.amount || tenant.monthlyRent,
      method: paymentData.method,
      status: paymentData.status || 'pending',
      reference: paymentData.reference || this.generateReference(paymentData.method),
      paymentType: paymentData.paymentType || 'Monthly Rent',
      billDetails: paymentData.billDetails || '',
      dueDate: paymentData.dueDate || this.getNextDueDate(),
      submittedDate: new Date().toISOString(),
      paidDate: paymentData.paidDate || null,
      proofUrl: paymentData.proofUrl || null,
      notes: paymentData.notes || '',
      adminNotes: '',
      metadata: paymentData.metadata || {}
    };

    payments.push(payment);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(payments));
    return payment;
  },

  // Get all payments
  getAllPayments() {
    this.init();
    const data = localStorage.getItem(this.STORAGE_KEY);
    return JSON.parse(data) || [];
  },

  // Get payments for current tenant
  getTenantPayments() {
    const tenant = this.getCurrentTenant();
    if (!tenant) return [];
    return this.getAllPayments().filter(p => p.tenantId === tenant.id);
  },

  // Get payment by ID
  getPaymentById(id) {
    return this.getAllPayments().find(p => p.id === id);
  },

  // Update payment status (Admin action)
  updatePaymentStatus(paymentId, status, adminNotes = '') {
    const payments = this.getAllPayments();
    const index = payments.findIndex(p => p.id === paymentId);
    
    if (index !== -1) {
      payments[index].status = status;
      payments[index].adminNotes = adminNotes;
      
      if (status === 'verified' || status === 'completed') {
        payments[index].paidDate = new Date().toISOString();
      }
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(payments));
      return payments[index];
    }
    return null;
  },

  // Update payment details
  updatePayment(paymentId, updates) {
    const payments = this.getAllPayments();
    const index = payments.findIndex(p => p.id === paymentId);
    
    if (index !== -1) {
      payments[index] = { ...payments[index], ...updates };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(payments));
      return payments[index];
    }
    return null;
  },

  // Delete payment
  deletePayment(paymentId) {
    let payments = this.getAllPayments();
    payments = payments.filter(p => p.id !== paymentId);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(payments));
    return true;
  },

  // Get next due date based on tenant's lease start date
  getNextDueDate() {
    const tenant = this.getCurrentTenant();
    const today = new Date();
    
    if (tenant && tenant.leaseStart) {
      const leaseStart = new Date(tenant.leaseStart);
      const leaseEnd = tenant.leaseEnd ? new Date(tenant.leaseEnd) : null;
      
      if (leaseStart > today) {
        return leaseStart.toISOString().split('T')[0];
      }
      
      if (leaseEnd && today > leaseEnd) {
        return leaseEnd.toISOString().split('T')[0];
      }
      
      const leaseDay = leaseStart.getDate();
      let nextDue = new Date(today.getFullYear(), today.getMonth(), leaseDay);
      
      if (nextDue <= today) {
        nextDue = new Date(today.getFullYear(), today.getMonth() + 1, leaseDay);
      }
      
      if (leaseEnd && nextDue > leaseEnd) {
        return leaseEnd.toISOString().split('T')[0];
      }
      
      return nextDue.toISOString().split('T')[0];
    }
    
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    return nextMonth.toISOString().split('T')[0];
  },

  // Get payment statistics (for dashboards)
  getPaymentStats() {
    const payments = this.getAllPayments();
    
    return {
      total: payments.length,
      pending: payments.filter(p => p.status === 'pending').length,
      verified: payments.filter(p => p.status === 'verified' || p.status === 'completed').length,
      rejected: payments.filter(p => p.status === 'rejected').length,
      totalAmount: payments.reduce((sum, p) => sum + p.amount, 0),
      paidAmount: payments.filter(p => p.status === 'verified' || p.status === 'completed')
        .reduce((sum, p) => sum + p.amount, 0),
      pendingAmount: payments.filter(p => p.status === 'pending')
        .reduce((sum, p) => sum + p.amount, 0)
    };
  },

  // Filter payments
  filterPayments(filters) {
    let payments = this.getAllPayments();

    if (filters.status && filters.status !== 'all') {
      payments = payments.filter(p => p.status === filters.status);
    }

    if (filters.method && filters.method !== 'all') {
      payments = payments.filter(p => p.method === filters.method);
    }

    if (filters.search) {
      const search = filters.search.toLowerCase();
      payments = payments.filter(p => 
        p.tenantName.toLowerCase().includes(search) ||
        p.unitNumber.toLowerCase().includes(search) ||
        p.id.toLowerCase().includes(search) ||
        p.reference.toLowerCase().includes(search)
      );
    }

    if (filters.startDate) {
      payments = payments.filter(p => p.submittedDate >= filters.startDate);
    }

    if (filters.endDate) {
      payments = payments.filter(p => p.submittedDate <= filters.endDate);
    }

    return payments;
  },

  // Clear all payments (for testing)
  clearAllPayments() {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify([]));
  }
};

// Initialize on load
PaymentStorage.init();

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PaymentStorage;
}
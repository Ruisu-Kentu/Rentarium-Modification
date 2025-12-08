/**
 * RENTARIUM ENHANCED PAYMENT STORAGE SYSTEM
 * Manages rent payments, partial payments, and utility bills
 * Uses localStorage as database
 */

const EnhancedPaymentStorage = {
  STORAGE_KEY: 'rentarium_payments',
  BILLS_KEY: 'rentarium_bills',
  RENT_STATUS_KEY: 'rentarium_rent_status',
  SESSION_KEY: 'rentarium_session',
  RATES_KEY: 'rentarium_utility_rates',

  // Initialize storage
  init() {
    if (!localStorage.getItem(this.STORAGE_KEY)) {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify([]));
    }
    if (!localStorage.getItem(this.BILLS_KEY)) {
      localStorage.setItem(this.BILLS_KEY, JSON.stringify([]));
    }
    if (!localStorage.getItem(this.RENT_STATUS_KEY)) {
      localStorage.setItem(this.RENT_STATUS_KEY, JSON.stringify([]));
    }
    if (!localStorage.getItem(this.RATES_KEY)) {
      // Default rates (can be modified by admin)
      const defaultRates = {
        electricity_rate: 11.50, // per kWh
        water_rate: 25.00 // per cubic meter
      };
      localStorage.setItem(this.RATES_KEY, JSON.stringify(defaultRates));
    }
  },

  // ========== UTILITY RATES MANAGEMENT ==========
  
  getUtilityRates() {
    const rates = localStorage.getItem(this.RATES_KEY);
    return JSON.parse(rates) || { electricity_rate: 11.50, water_rate: 25.00 };
  },

  updateUtilityRates(newRates) {
    const currentRates = this.getUtilityRates();
    const updatedRates = { ...currentRates, ...newRates };
    localStorage.setItem(this.RATES_KEY, JSON.stringify(updatedRates));
    return updatedRates;
  },

  // ========== UTILITY BILL MANAGEMENT ==========

  /**
   * Generate or get bill for a specific month
   * @param {string} tenantId - Tenant identifier
   * @param {string} month - Format: "YYYY-MM"
   * @param {number} electricity_kwh - Electricity consumption in kWh
   * @param {number} water_cubic - Water consumption in cubic meters
   */
  generateBill(tenantId, month, electricity_kwh, water_cubic) {
    const bills = this.getAllBills();
    const rates = this.getUtilityRates();
    
    // Check if bill already exists
    const existingBill = bills.find(b => b.tenantId === tenantId && b.month === month);
    
    const electricity_amount = parseFloat((electricity_kwh * rates.electricity_rate).toFixed(2));
    const water_amount = parseFloat((water_cubic * rates.water_rate).toFixed(2));
    const total_amount = parseFloat((electricity_amount + water_amount).toFixed(2));

    const bill = {
      id: existingBill ? existingBill.id : this.generateBillId(),
      tenantId: tenantId,
      month: month, // "YYYY-MM"
      electricity_kwh: electricity_kwh,
      electricity_rate: rates.electricity_rate,
      electricity_amount: electricity_amount,
      water_cubic: water_cubic,
      water_rate: rates.water_rate,
      water_amount: water_amount,
      total_amount: total_amount,
      paid_amount: existingBill ? existingBill.paid_amount : 0,
      status: existingBill ? existingBill.status : 'unpaid', // 'unpaid', 'partial', 'paid'
      createdDate: existingBill ? existingBill.createdDate : new Date().toISOString(),
      dueDate: this.getBillDueDate(month),
      payments: existingBill ? existingBill.payments : [] // Array of payment IDs
    };

    if (existingBill) {
      // Update existing bill
      const index = bills.findIndex(b => b.id === existingBill.id);
      bills[index] = bill;
    } else {
      bills.push(bill);
    }

    localStorage.setItem(this.BILLS_KEY, JSON.stringify(bills));
    return bill;
  },

  getAllBills() {
    this.init();
    return JSON.parse(localStorage.getItem(this.BILLS_KEY)) || [];
  },

  getBillById(billId) {
    return this.getAllBills().find(b => b.id === billId);
  },

  getTenantBills(tenantId) {
    return this.getAllBills().filter(b => b.tenantId === tenantId);
  },

  getBillForMonth(tenantId, month) {
    return this.getAllBills().find(b => b.tenantId === tenantId && b.month === month);
  },

  getCurrentMonthBill(tenantId) {
    const currentMonth = this.getCurrentMonth();
    return this.getBillForMonth(tenantId, currentMonth);
  },

  generateBillId() {
    const bills = this.getAllBills();
    const lastId = bills.length > 0 
      ? Math.max(...bills.map(b => parseInt(b.id.split('-')[1])))
      : 0;
    return `BILL-${String(lastId + 1).padStart(4, '0')}`;
  },

  getBillDueDate(month) {
    // Bills due on the 15th of the month
    const [year, monthNum] = month.split('-');
    return `${year}-${monthNum}-15`;
  },

  getCurrentMonth() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  },

  // ========== RENT STATUS MANAGEMENT ==========

  /**
   * Get or create rent status for tenant for specific month
   * @param {string} tenantId
   * @param {string} month - Format: "YYYY-MM"
   * @returns {object} Rent status object
   */
  getRentStatus(tenantId, month) {
    const statuses = JSON.parse(localStorage.getItem(this.RENT_STATUS_KEY)) || [];
    let status = statuses.find(s => s.tenantId === tenantId && s.month === month);
    
    if (!status) {
      const tenant = this.getCurrentTenantById(tenantId);
      const monthlyRent = tenant ? tenant.monthlyRent : 0;
      
      status = {
        id: this.generateRentStatusId(),
        tenantId: tenantId,
        month: month,
        required_amount: monthlyRent,
        paid_amount: 0,
        remaining_amount: monthlyRent,
        status: 'unpaid', // 'unpaid', 'partial', 'paid'
        payments: [], // Array of payment IDs
        createdDate: new Date().toISOString(),
        dueDate: this.getRentDueDate(month)
      };
      
      statuses.push(status);
      localStorage.setItem(this.RENT_STATUS_KEY, JSON.stringify(statuses));
    }
    
    return status;
  },

  getCurrentMonthRentStatus(tenantId) {
    const currentMonth = this.getCurrentMonth();
    return this.getRentStatus(tenantId, currentMonth);
  },

  getAllRentStatuses() {
    return JSON.parse(localStorage.getItem(this.RENT_STATUS_KEY)) || [];
  },

  getTenantRentHistory(tenantId) {
    return this.getAllRentStatuses().filter(s => s.tenantId === tenantId);
  },

  generateRentStatusId() {
    const statuses = this.getAllRentStatuses();
    const lastId = statuses.length > 0 
      ? Math.max(...statuses.map(s => parseInt(s.id.split('-')[1])))
      : 0;
    return `RENT-${String(lastId + 1).padStart(4, '0')}`;
  },

  getRentDueDate(month) {
    // Rent due on the 1st of the month
    const [year, monthNum] = month.split('-');
    return `${year}-${monthNum}-01`;
  },

  /**
   * Update rent status after payment
   * @param {string} tenantId
   * @param {string} month
   * @param {number} paidAmount
   * @param {string} paymentId
   */
  updateRentStatus(tenantId, month, paidAmount, paymentId) {
    const statuses = this.getAllRentStatuses();
    let status = statuses.find(s => s.tenantId === tenantId && s.month === month);
    
    if (!status) {
      status = this.getRentStatus(tenantId, month);
    }

    status.paid_amount = parseFloat((status.paid_amount + paidAmount).toFixed(2));
    status.remaining_amount = parseFloat((status.required_amount - status.paid_amount).toFixed(2));
    status.payments.push(paymentId);

    // Update status
    if (status.remaining_amount <= 0) {
      status.status = 'paid';
      status.remaining_amount = 0;
    } else if (status.paid_amount > 0) {
      status.status = 'partial';
    } else {
      status.status = 'unpaid';
    }

    const index = statuses.findIndex(s => s.id === status.id);
    statuses[index] = status;
    localStorage.setItem(this.RENT_STATUS_KEY, JSON.stringify(statuses));

    return status;
  },

  /**
   * Update bill status after payment
   */
  updateBillStatus(billId, paidAmount, paymentId) {
    const bills = this.getAllBills();
    const bill = bills.find(b => b.id === billId);
    
    if (!bill) return null;

    bill.paid_amount = parseFloat((bill.paid_amount + paidAmount).toFixed(2));
    bill.payments.push(paymentId);

    // Update status
    if (bill.paid_amount >= bill.total_amount) {
      bill.status = 'paid';
      bill.paid_amount = bill.total_amount; // Cap at total
    } else if (bill.paid_amount > 0) {
      bill.status = 'partial';
    } else {
      bill.status = 'unpaid';
    }

    const index = bills.findIndex(b => b.id === billId);
    bills[index] = bill;
    localStorage.setItem(this.BILLS_KEY, JSON.stringify(bills));

    return bill;
  },

  // ========== PAYMENT CREATION ==========

  generatePaymentId() {
    const payments = this.getAllPayments();
    const lastId = payments.length > 0 
      ? Math.max(...payments.map(p => parseInt(p.id.split('-')[1])))
      : 0;
    return `PAY-${String(lastId + 1).padStart(4, '0')}`;
  },

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
      contactNumber: tenant.contactNumber || ''
    };
  },

  getCurrentTenantById(tenantId) {
    const tenants = JSON.parse(localStorage.getItem('tenants')) || [];
    const tenant = tenants.find(t => t.username === tenantId);
    
    if (!tenant) return null;

    return {
      id: tenant.username,
      name: tenant.name,
      unit: tenant.unitAssigned,
      monthlyRent: parseFloat(tenant.rentAmount) || 0,
      email: tenant.email || '',
      contactNumber: tenant.contactNumber || ''
    };
  },

  /**
   * Create rent payment
   * @param {object} paymentData - Must include payment_type: 'rent'
   */
  createRentPayment(paymentData) {
    this.init();
    const payments = this.getAllPayments();
    const tenant = this.getCurrentTenant();

    if (!tenant) {
      console.error('No tenant found in session');
      return null;
    }

    const month = paymentData.month || this.getCurrentMonth();
    const rentStatus = this.getRentStatus(tenant.id, month);

    const payment = {
      id: this.generatePaymentId(),
      payment_type: 'rent',
      tenantId: tenant.id,
      tenantName: tenant.name,
      unitNumber: tenant.unit,
      amount: parseFloat(paymentData.amount),
      month: month,
      method: paymentData.method,
      status: paymentData.status || 'pending',
      reference: paymentData.reference || this.generateReference(paymentData.method),
      submittedDate: new Date().toISOString(),
      paidDate: null,
      notes: paymentData.notes || '',
      adminNotes: '',
      metadata: paymentData.metadata || {}
    };

    payments.push(payment);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(payments));

    // Update rent status if payment is verified
    if (payment.status === 'verified') {
      this.updateRentStatus(tenant.id, month, payment.amount, payment.id);
    }

    return payment;
  },

  /**
   * Create utility bill payment
   * @param {object} paymentData - Must include payment_type: 'bill' and billId
   */
  createBillPayment(paymentData) {
    this.init();
    const payments = this.getAllPayments();
    const tenant = this.getCurrentTenant();

    if (!tenant) {
      console.error('No tenant found in session');
      return null;
    }

    const bill = this.getBillById(paymentData.billId);
    if (!bill) {
      console.error('Bill not found');
      return null;
    }

    const payment = {
      id: this.generatePaymentId(),
      payment_type: 'bill',
      billId: bill.id,
      tenantId: tenant.id,
      tenantName: tenant.name,
      unitNumber: tenant.unit,
      amount: parseFloat(paymentData.amount),
      month: bill.month,
      method: paymentData.method,
      status: paymentData.status || 'pending',
      reference: paymentData.reference || this.generateReference(paymentData.method),
      submittedDate: new Date().toISOString(),
      paidDate: null,
      notes: paymentData.notes || `Payment for ${bill.month} utility bills`,
      adminNotes: '',
      metadata: paymentData.metadata || {}
    };

    payments.push(payment);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(payments));

    // Update bill status if payment is verified
    if (payment.status === 'verified') {
      this.updateBillStatus(bill.id, payment.amount, payment.id);
    }

    return payment;
  },

  // ========== PAYMENT MANAGEMENT ==========

  getAllPayments() {
    this.init();
    return JSON.parse(localStorage.getItem(this.STORAGE_KEY)) || [];
  },

  getTenantPayments(tenantId = null) {
    const tenant = tenantId ? this.getCurrentTenantById(tenantId) : this.getCurrentTenant();
    if (!tenant) return [];
    return this.getAllPayments().filter(p => p.tenantId === tenant.id);
  },

  getPaymentById(id) {
    return this.getAllPayments().find(p => p.id === id);
  },

  updatePaymentStatus(paymentId, status, adminNotes = '') {
    const payments = this.getAllPayments();
    const payment = payments.find(p => p.id === paymentId);
    
    if (!payment) return null;

    const oldStatus = payment.status;
    payment.status = status;
    payment.adminNotes = adminNotes;
    
    if (status === 'verified' || status === 'completed') {
      payment.paidDate = new Date().toISOString();
      
      // Update rent status or bill status
      if (payment.payment_type === 'rent') {
        this.updateRentStatus(payment.tenantId, payment.month, payment.amount, payment.id);
      } else if (payment.payment_type === 'bill') {
        this.updateBillStatus(payment.billId, payment.amount, payment.id);
      }
    } else if (status === 'rejected' && oldStatus === 'verified') {
      // Reverse the payment if it was previously verified
      if (payment.payment_type === 'rent') {
        this.updateRentStatus(payment.tenantId, payment.month, -payment.amount, payment.id);
      } else if (payment.payment_type === 'bill') {
        this.updateBillStatus(payment.billId, -payment.amount, payment.id);
      }
    }
    
    const index = payments.findIndex(p => p.id === paymentId);
    payments[index] = payment;
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(payments));
    
    return payment;
  },

  deletePayment(paymentId) {
    let payments = this.getAllPayments();
    payments = payments.filter(p => p.id !== paymentId);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(payments));
    return true;
  },

  // ========== STATISTICS ==========

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

  getTenantStats(tenantId) {
    const currentMonth = this.getCurrentMonth();
    const rentStatus = this.getRentStatus(tenantId, currentMonth);
    const billStatus = this.getCurrentMonthBill(tenantId);
    
    return {
      rent: rentStatus,
      bill: billStatus,
      total_due: (rentStatus?.remaining_amount || 0) + ((billStatus?.total_amount || 0) - (billStatus?.paid_amount || 0))
    };
  },

  // ========== FILTERS ==========

  filterPayments(filters) {
    let payments = this.getAllPayments();

    if (filters.status && filters.status !== 'all') {
      payments = payments.filter(p => p.status === filters.status);
    }

    if (filters.method && filters.method !== 'all') {
      payments = payments.filter(p => p.method === filters.method);
    }

    if (filters.payment_type && filters.payment_type !== 'all') {
      payments = payments.filter(p => p.payment_type === filters.payment_type);
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

    return payments;
  },

  // ========== NOTIFICATIONS ==========

  getNotifications(tenantId) {
    const notifications = [];
    const currentMonth = this.getCurrentMonth();
    
    // Check rent status
    const rentStatus = this.getRentStatus(tenantId, currentMonth);
    if (rentStatus.status === 'paid') {
      notifications.push({
        type: 'success',
        title: 'Rent Fully Paid',
        message: `Your rent for ${currentMonth} is fully paid. Thank you!`,
        date: new Date().toISOString()
      });
    } else if (rentStatus.status === 'partial') {
      notifications.push({
        type: 'warning',
        title: 'Partial Rent Payment',
        message: `You have paid ₱${rentStatus.paid_amount.toLocaleString()} out of ₱${rentStatus.required_amount.toLocaleString()}. Remaining: ₱${rentStatus.remaining_amount.toLocaleString()}`,
        date: new Date().toISOString()
      });
    } else if (rentStatus.status === 'unpaid') {
      notifications.push({
        type: 'error',
        title: 'Rent Unpaid',
        message: `Your rent for ${currentMonth} (₱${rentStatus.required_amount.toLocaleString()}) is due on ${rentStatus.dueDate}.`,
        date: new Date().toISOString()
      });
    }

    // Check bill status
    const bill = this.getCurrentMonthBill(tenantId);
    if (bill) {
      if (bill.status === 'paid') {
        notifications.push({
          type: 'success',
          title: 'Bills Fully Paid',
          message: `Your utility bills for ${bill.month} are fully paid.`,
          date: new Date().toISOString()
        });
      } else if (bill.status === 'partial') {
        const remaining = bill.total_amount - bill.paid_amount;
        notifications.push({
          type: 'warning',
          title: 'Partial Bill Payment',
          message: `Bills remaining: ₱${remaining.toLocaleString()} out of ₱${bill.total_amount.toLocaleString()}`,
          date: new Date().toISOString()
        });
      } else if (bill.status === 'unpaid') {
        notifications.push({
          type: 'error',
          title: 'Utility Bills Unpaid',
          message: `Your utility bills for ${bill.month} (₱${bill.total_amount.toLocaleString()}) are due on ${bill.dueDate}.`,
          date: new Date().toISOString()
        });
      }
    }

    return notifications;
  },

  // ========== UTILITIES ==========

  clearAllData() {
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.BILLS_KEY);
    localStorage.removeItem(this.RENT_STATUS_KEY);
    this.init();
  }
};

// Initialize on load
EnhancedPaymentStorage.init();

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EnhancedPaymentStorage;
}
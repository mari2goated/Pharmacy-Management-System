// lib/api.ts
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add token
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },                          
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ============= TYPES =============

// Supplier Types
export interface Supplier {
  id: number;
  name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  tax_id: string | null;
  payment_terms: string | null;
  lead_time_days: number | null;
  is_active: boolean;
  created_at: string;
  notes: string | null;
}

export interface SupplierCreate {
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  tax_id?: string;
  payment_terms?: string;
  lead_time_days?: number;
  notes?: string;
}

export interface SupplierUpdate {
  name?: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  tax_id?: string;
  payment_terms?: string;
  lead_time_days?: number;
  notes?: string;
  is_active?: boolean;
}

export interface GetSuppliersParams {
  skip?: number;
  limit?: number;
  search?: string;
  active_only?: boolean;
}

// Purchase Types
export type OrderStatus = 'pending' | 'ordered' | 'received' | 'cancelled' | 'partial';

export interface Purchase {
  id: number;
  purchase_number: string;
  supplier_id: number;
  order_date: string;
  expected_delivery: string | null;
  status: OrderStatus;
  total_amount: number;
  notes: string | null;
  created_by: number;
  created_at: string;
  updated_at: string;
  supplier: Supplier;
  items: PurchaseItem[];
}

export interface PurchaseItem {
  id: number;
  purchase_id: number;
  medicine_id: number;
  quantity: number;
  unit_cost: number;
  received_quantity: number | null;
  expiry_date: string | null;
  batch_number: string | null;
  created_at: string;
  medicine: {
    id: number;
    name: string;
    brand: string;
    sku: string;
    unit: string;
  };
}

export interface PurchaseItemCreate {
  medicine_id: number;
  quantity: number;
  unit_cost: number;
  expiry_date?: string;
  batch_number?: string;
}

export interface PurchaseCreate {
  supplier_id: number;
  expected_delivery?: string;
  notes?: string;
  items: PurchaseItemCreate[];
}

export interface PurchaseHistoryResponse {
  supplier: Supplier;
  total_purchases: number;
  purchases: Purchase[];
}

export interface GetPurchasesParams {
  skip?: number;
  limit?: number;
  status_filter?: OrderStatus;
  supplier_id?: number;
}

// User Types
export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: 'admin' | 'cashier' | 'manager';
  is_active: boolean;
  created_at: string;
}

export interface UserCreate {
  username: string;
  email: string;
  full_name: string;
  password: string;
  role: 'admin' | 'cashier' | 'manager';
}

export interface UserUpdate {
  email?: string;
  full_name?: string;
  password?: string;
  role?: 'admin' | 'cashier' | 'manager';
  is_active?: boolean;
}

// Category Types
export interface Category {
  id: number;
  name: string;
  description: string | null;
  parent_id: number | null;
  created_at: string;
  updated_at: string;
}

// Customer Types
export interface Customer {
  id: number;
  customer_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string;
  address: string | null;
  date_of_birth: string | null;
  loyalty_points: number;
  allergies: string | null;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface CustomerCreate {
  first_name: string;
  last_name: string;
  email?: string;
  phone: string;
  address?: string;
  date_of_birth?: string;
  allergies?: string;
}

export interface CustomerUpdate {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  date_of_birth?: string;
  allergies?: string;
  is_active?: boolean;
}

export interface CustomerHistoryResponse {
  customer: Customer;
  total_sales: number;
  total_spent: number;
  sales: Array<{
    id: number;
    receipt_number: string;
    created_at: string;
    grand_total: number;
  }>;
}

// ============= API FUNCTIONS =============

// Auth API calls
export const authAPI = {
  login: (username: string, password: string) =>
    api.post('/auth/login', { username, password }, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    }),
  
  getCurrentUser: () => api.get('/auth/me'),
};

// Dashboard API calls
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
  getRecentSales: (limit = 10) => api.get(`/dashboard/recent-sales?limit=${limit}`),
  getLowStock: () => api.get('/dashboard/low-stock'),
};

// POS API calls
export const posAPI = {
  searchMedicine: (query: string) => 
    api.get(`/pos/search-medicine?query=${encodeURIComponent(query)}`),
  
  processSale: (data: any) => 
    api.post('/pos/process-sale', data),
  
  getMedicineById: (medicine_id: string) => 
    api.get(`/pos/medicine/${medicine_id}`),

  searchCustomer: (query: string) => 
    api.get(`/pos/search-customer?query=${encodeURIComponent(query)}`),
};

// Inventory API calls
export const inventoryAPI = {
  getMedicines: (params?: any) => api.get('/inventory/medicines', { params }),
  createMedicine: (data: any) => api.post('/inventory/medicines', data),
  updateMedicine: (id: number, data: any) => api.put(`/inventory/medicines/${id}`, data),
  deleteMedicine: (id: number) => api.delete(`/inventory/medicines/${id}`),
  getCategories: () => api.get('/inventory/categories'),
  exportData: (format: string = 'csv') => 
    api.get(`/inventory/export?format=${format}`, { responseType: 'blob' }),
};

// Customers API calls
export const customersAPI = {
  getCustomers: (params?: any) => api.get('/customers', { params }),
  getCustomer: (id: number) => api.get(`/customers/${id}`),
  createCustomer: (data: any) => api.post('/customers', data),
  updateCustomer: (id: number, data: any) => api.put(`/customers/${id}`, data),
  deleteCustomer: (id: number) => api.delete(`/customers/${id}`),
  getCustomerHistory: (id: number) => api.get(`/customers/${id}/purchase-history`),
};

// Sales API calls
export const salesAPI = {
  getSales: (params?: any) => api.get('/sales', { params }),
  getSale: (id: number) => api.get(`/sales/${id}`),
  refundSale: (id: number, data: any) => api.post(`/sales/${id}/refund`, data),
};

// Reports API calls
export const reportsAPI = {
  generateSalesReport: (data: any) => api.post('/reports/sales', data),
  generateInventoryReport: (data: any) => api.post('/reports/inventory', data),
  generateFinancialReport: (data: any) => api.post('/reports/financial', data),
};

// Suppliers API calls
export const suppliersAPI = {
  // Get all suppliers
  getSuppliers: (params?: GetSuppliersParams) => {
    return api.get<Supplier[]>('/suppliers/', { params });
  },

  // Get single supplier by ID
  getSupplier: (id: number) => {
    return api.get<Supplier>(`/suppliers/${id}`);
  },

  // Create new supplier
  createSupplier: (data: SupplierCreate) => {
    return api.post<Supplier>('/suppliers/', data);
  },

  // Update supplier
  updateSupplier: (id: number, data: SupplierUpdate) => {
    return api.put<Supplier>(`/suppliers/${id}`, data);
  },

  // Get supplier purchase history
  getSupplierPurchaseHistory: (id: number) => {
    return api.get<PurchaseHistoryResponse>(`/suppliers/${id}/purchase-history`);
  },

  // Archive/Deactivate supplier
  archiveSupplier: (id: number) => {
    return api.patch<Supplier>(`/suppliers/${id}`, { is_active: false });
  },

  // Reactivate supplier
  reactivateSupplier: (id: number) => {
    return api.patch<Supplier>(`/suppliers/${id}`, { is_active: true });
  },

  // Delete supplier (hard delete - use with caution)
  deleteSupplier: (id: number) => {
    return api.delete(`/suppliers/${id}`);
  },
};

// Purchases API calls
export const purchasesAPI = {
  // Get all purchase orders
  getPurchases: (params?: GetPurchasesParams) => {
    return api.get<Purchase[]>('/purchases/', { params });
  },

  // Get single purchase order
  getPurchase: (id: number) => {
    return api.get<Purchase>(`/purchases/${id}`);
  },

  // Create new purchase order
  createPurchase: (data: PurchaseCreate) => {
    return api.post<Purchase>('/purchases/', data);
  },

  // Receive purchase order
  receivePurchase: (id: number, data: { received_quantities?: Record<string, number> }) => {
    return api.put<{ message: string }>(`/purchases/${id}/receive`, data);
  },

  // Update purchase status
  updatePurchaseStatus: (id: number, status: OrderStatus) => {
    return api.put<{ message: string }>(`/purchases/${id}/status`, { status });
  },
};

// Users API calls
export const usersAPI = {
  // Get all users
  getUsers: (params?: any) => api.get('/users', { params }),

  // Get single user
  getUser: (id: number) => api.get(`/users/${id}`),

  // Create new user
  createUser: (data: UserCreate) => api.post('/users', data),

  // Update user
  updateUser: (id: number, data: UserUpdate) => api.put(`/users/${id}`, data),

  // Delete user
  deleteUser: (id: number) => api.delete(`/users/${id}`),

  // Change password
  changePassword: (id: number, data: { current_password: string; new_password: string }) =>
    api.post(`/users/${id}/change-password`, data),
};

// Categories API calls
export const categoriesAPI = {
  // Get all categories
  getCategories: () => api.get('/categories'),

  // Get category tree
  getCategoryTree: () => api.get('/categories/tree'),

  // Create category
  createCategory: (data: any) => api.post('/categories', data),

  // Update category
  updateCategory: (id: number, data: any) => api.put(`/categories/${id}`, data),

  // Delete category
  deleteCategory: (id: number) => api.delete(`/categories/${id}`),
};

// ============= UTILITY FUNCTIONS =============

// Helper function to handle API errors
export const handleApiError = (error: any): string => {
  if (error.response) {
    // Server responded with error
    return error.response.data?.detail || error.response.data?.message || 'Server error occurred';
  } else if (error.request) {
    // Request made but no response
    return 'No response from server. Please check your connection.';
  } else {
    // Error in request setup
    return error.message || 'An error occurred';
  }
};

// Helper function to build query parameters
export const buildQueryParams = (params: Record<string, any>): string => {
  const filteredParams = Object.entries(params)
    .filter(([_, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
  
  return filteredParams.length > 0 ? `?${filteredParams.join('&')}` : '';
};

// Helper function to format currency
export const formatCurrency = (amount: number | string | null | undefined): string => {
  if (amount === null || amount === undefined) return 'PKR 0.00';
  
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numAmount)) return 'PKR 0.00';
  
  return 'PKR ' + numAmount.toFixed(2);
};

// Helper function to format date
export const formatDate = (dateString: string | null, options?: Intl.DateTimeFormatOptions): string => {
  if (!dateString) return 'N/A';
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };
  
  return new Date(dateString).toLocaleDateString('en-US', options || defaultOptions);
};

export interface PurchaseOrderItem {
  id: number;
  purchase_id: number;
  medicine_id: number;
  quantity: number;
  unit_cost: number; // This should be number
  received_quantity: number | null;
  expiry_date: string | null;
  batch_number: string | null;
  created_at: string;
  medicine: {
    id: number;
    name: string;
    brand: string;
    sku: string;
    unit: string;
  };
}

export default api;
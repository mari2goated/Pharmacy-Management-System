// types/index.ts
export interface User {
    id: number;
    username: string;
    email: string;
    full_name: string;
    role: 'admin' | 'cashier';
    is_active: boolean;
  }
  
  export interface LoginResponse {
    access_token: string;
    token_type: string;
    user: User;
  }
  
  export interface DashboardStats {
    sales_today: number | string;
    total_revenue: number | string;
    total_medicines: number;
    low_stock_items: number;
    average_sale: number | string;
    pending_orders: number;
    total_customers: number;
  }
  
  export interface Medicine {
    id: number;
    name: string;
    medicine_id: string;
    unit_price: number;
    stock_quantity: number;
    category_id?: number;
    status: 'active' | 'inactive' | 'discontinued';
  }
  
  export interface SaleItem {
    medicine_id: number;
    quantity: number;
    discount_percent: number;
  }
  
  export interface SaleCreate {
    customer_id?: number;
    items: SaleItem[];
    discount_amount: number;
    tax_amount: number;
    payment_method: 'cash' | 'card' | 'mobile';
    prescription_id?: number;
    notes?: string;
  }
  
  export type CurrencyValue = number | string;

  // Add to existing types/index.ts
export interface Medicine {
    id: number;
    name: string;
    generic_name?: string;
    medicine_id: string;
    category_id?: number;
    unit_price: number;
    cost_price: number;
    stock_quantity: number;
    reorder_level: number;
    expiry_date?: string;
    status: 'active' | 'inactive' | 'discontinued';
    manufacturer?: string;
    description?: string;
    created_at?: string;
    updated_at?: string;
  }
  
  export interface SaleItem {
    medicine_id: number;
    quantity: number;
    discount_percent: number;
  }
  
  export interface SaleCreate {
    customer_id?: number;
    items: SaleItem[];
    discount_amount: number;
    tax_amount: number;
    payment_method: 'cash' | 'card' | 'mobile';
    prescription_id?: number;
    notes?: string;
  }

  // Add to types/index.ts
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
    created_at: string;
    updated_at?: string;
  }
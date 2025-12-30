// TASK FOR COPILOT:
// Hide revenue, total sales, and average sale stats for cashier users.
// Admin users should continue to see all stats.
// Do not change backend logic or API calls.

// app/(dashboard)/dashboard/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { dashboardAPI } from '@/lib/api';
import {
  DollarSign,
  Package,
  AlertCircle,
  TrendingUp,
  Users,
  Clock,
  ShoppingCart,
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

interface DashboardStats {
  sales_today: number | string;
  total_revenue: number | string;
  total_medicines: number;
  low_stock_items: number;
  average_sale: number | string;
  pending_orders: number;
  total_customers: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [lowStock, setLowStock] = useState<any[]>([]);
  const { isAdmin } = useAuth();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, recentSalesRes, lowStockRes] = await Promise.all([
        dashboardAPI.getStats(),
        dashboardAPI.getRecentSales(5),
        dashboardAPI.getLowStock(),
      ]);
      
      setStats(statsRes.data);
      setRecentSales(recentSalesRes.data || []);
      setLowStock(lowStockRes.data || []);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to format currency values
  const formatCurrency = (value: number | string | undefined): string => {
    if (!value) return 'PKR 0.00';
    
    // Convert string to number if needed
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    
    // Check if it's a valid number
    if (isNaN(numValue)) return 'PKR 0.00';
    
    return `PKR ${numValue.toFixed(2)}`;
  };

  // Build stat cards and filter admin-only cards when user is not an admin
  const statCards = [
    {
      title: 'Sales Today',
      value: formatCurrency(stats?.sales_today),
      icon: DollarSign,
      color: 'bg-green-500',
      adminOnly: true,
    },
    {
      title: 'Total Revenue',
      value: formatCurrency(stats?.total_revenue),
      icon: TrendingUp,
      color: 'bg-blue-500',
      adminOnly: true,
    },
    {
      title: 'Medicines in Stock',
      value: stats?.total_medicines || 0,
      icon: Package,
      color: 'bg-purple-500',
    },
    {
      title: 'Low Stock Items',
      value: stats?.low_stock_items || 0,
      icon: AlertCircle,
      color: 'bg-red-500',
    },
    {
      title: 'Average Sale',
      value: formatCurrency(stats?.average_sale),
      icon: ShoppingCart,
      color: 'bg-yellow-500',
      adminOnly: true,
    },
    {
      title: 'Total Customers',
      value: stats?.total_customers || 0,
      icon: Users,
      color: 'bg-indigo-500',
    },
  ].filter((card) => (card.adminOnly ? isAdmin : true));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="bg-white rounded-xl shadow-sm border p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{card.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{card.value}</p>
                </div>
                <div className={`${card.color} p-3 rounded-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Sales */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Recent Sales</h3>
            <Clock className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            {recentSales.length > 0 ? (
              recentSales.map((sale) => {
                // Format sale amount safely
                const saleAmount = typeof sale.grand_total === 'string' 
                  ? parseFloat(sale.grand_total) 
                  : sale.grand_total;
                
                return (
                  <div key={sale.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{sale.receipt_number}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(sale.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        PKR {!isNaN(saleAmount) ? saleAmount.toFixed(2) : '0.00'}
                      </p>
                      <p className="text-sm text-gray-500 capitalize">{sale.payment_method}</p>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-center text-gray-500 py-4">No recent sales</p>
            )}
          </div>
        </div>

        {/* Low Stock Items */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Low Stock Alert</h3>
            <AlertCircle className="w-5 h-5 text-red-500" />
          </div>
          <div className="space-y-4">
            {lowStock.length > 0 ? (
              lowStock.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{item.name}</p>
                    <p className="text-sm text-gray-500">{item.medicine_id}</p>
                  </div>
                  <div className="text-right">
                    <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                      {item.stock_quantity} left
                    </div>
                    <p className="text-sm text-gray-500 mt-1">Reorder: {item.reorder_level}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-500 py-4">All items are well stocked</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
// app/(dashboard)/sales/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { salesAPI } from '@/lib/api';
import { Search, Filter, Calendar, Download, Receipt, User, CreditCard, Printer } from 'lucide-react';
import { format } from 'date-fns';

interface Sale {
  id: number;
  receipt_number: string;
  customer_id: number | null;
  customer: {
    first_name: string;
    last_name: string;
  } | null;
  cashier_id: number;
  cashier: {
    full_name: string;
  };
  total_amount: number;
  discount_amount: number;
  tax_amount: number;
  grand_total: number;
  payment_method: string;
  created_at: string;
  items: Array<{
    medicine: {
      name: string;
      medicine_id: string;
    };
    quantity: number;
    unit_price: number;
    total_price: number;
  }>;
}

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [filters, setFilters] = useState({
    startDate: format(new Date().setDate(new Date().getDate() - 30), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    paymentMethod: '',
    minAmount: '',
    maxAmount: '',
  });

  // Stats
  const [stats, setStats] = useState({
    totalSales: 0,
    totalRevenue: 0, // This will be a number
    averageSale: 0,
    todaySales: 0,
  });

  // Fetch sales
  useEffect(() => {
    fetchSales();
  }, [filters]);

  const fetchSales = async () => {
    setLoading(true);
    try {
      // Build query parameters
      const params = new URLSearchParams();
      
      // Always include date filters
      params.append('start_date', filters.startDate);
      params.append('end_date', filters.endDate);
      
      // Add optional filters
      if (filters.paymentMethod) {
        params.append('payment_method', filters.paymentMethod);
      }
      
      if (filters.minAmount) {
        const min = parseFloat(filters.minAmount);
        if (!isNaN(min)) {
          params.append('min_amount', min.toString());
        }
      }
      
      if (filters.maxAmount) {
        const max = parseFloat(filters.maxAmount);
        if (!isNaN(max)) {
          params.append('max_amount', max.toString());
        }
      }
  
      // Make API call with all parameters
      const response = await salesAPI.getSales({
        start_date: filters.startDate,
        end_date: filters.endDate,
        payment_method: filters.paymentMethod || undefined,
        min_amount: filters.minAmount ? parseFloat(filters.minAmount) : undefined,
        max_amount: filters.maxAmount ? parseFloat(filters.maxAmount) : undefined,
      });
      
      setSales(response.data || []);
      calculateStats(response.data || []);
    } catch (error) {
      console.error('Failed to fetch sales:', error);
      alert('Failed to fetch sales. Please check your filters.');
    } finally {
      setLoading(false);
    }
  };

  // In the calculateStats function, update:
// In the calculateStats function, update:
 const calculateStats = (salesData: Sale[]) => {
    const totalSales = salesData.length;
    
    // Convert string values to numbers
    const totalRevenue = salesData.reduce((sum, sale) => {
      const revenue = typeof sale.grand_total === 'string' 
        ? parseFloat(sale.grand_total) 
        : sale.grand_total;
      return sum + (revenue || 0);
    }, 0);
    
    const averageSale = totalSales > 0 ? totalRevenue / totalSales : 0;
    
    const today = format(new Date(), 'yyyy-MM-dd');
    const todaySales = salesData.filter(sale => 
      sale.created_at.startsWith(today)
    ).reduce((sum, sale) => {
      const revenue = typeof sale.grand_total === 'string' 
        ? parseFloat(sale.grand_total) 
        : sale.grand_total;
      return sum + (revenue || 0);
    }, 0);
  
    setStats({
      totalSales,
      totalRevenue,
      averageSale,
      todaySales,
    });
  };

  // Currency formatting helper
const formatCurrency = (value: number | string | undefined): string => {
    if (value === undefined || value === null) return 'PKR 0.00';
    
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    
    if (isNaN(numValue)) return 'PKR 0.00';
    
    return `PKR ${numValue.toFixed(2)}`;
  };


  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value };
    
    // Validate min/max amounts
    if (key === 'minAmount' && newFilters.maxAmount) {
      const min = parseFloat(value) || 0;
      const max = parseFloat(newFilters.maxAmount) || Infinity;
      if (min > max) {
        alert('Minimum amount cannot be greater than maximum amount');
        return;
      }
    }
    
    if (key === 'maxAmount' && newFilters.minAmount) {
      const min = parseFloat(newFilters.minAmount) || 0;
      const max = parseFloat(value) || Infinity;
      if (max < min) {
        alert('Maximum amount cannot be less than minimum amount');
        return;
      }
    }
    
    setFilters(newFilters);
  };

  const resetFilters = () => {
    setFilters({
      startDate: format(new Date().setDate(new Date().getDate() - 30), 'yyyy-MM-dd'),
      endDate: format(new Date(), 'yyyy-MM-dd'),
      paymentMethod: '',
      minAmount: '',
      maxAmount: '',
    });
    
    // Trigger a refetch after reset
    setTimeout(() => {
      fetchSales();
    }, 100);
  };

  const viewSaleDetails = (sale: Sale) => {
    setSelectedSale(sale);
    setShowDetails(true);
  };

  const printReceipt = (sale: Sale) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Receipt ${sale.receipt_number}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              .receipt { max-width: 400px; margin: 0 auto; }
              .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
              .item { display: flex; justify-content: space-between; margin: 5px 0; }
              .total { font-weight: bold; border-top: 2px solid #000; padding-top: 10px; margin-top: 20px; }
              .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
            </style>
          </head>
          <body>
            <div class="receipt">
              <div class="header">
                <h2>Novartis Pharmacy</h2>
                <p>Receipt: ${sale.receipt_number}</p>
                <p>Date: ${new Date(sale.created_at).toLocaleString()}</p>
              </div>
              
              ${sale.customer ? `<p>Customer: ${sale.customer.first_name} ${sale.customer.last_name}</p>` : ''}
              <p>Cashier: ${sale.cashier.full_name}</p>
              
              <h3>Items:</h3>
              ${sale.items.map(item => `
                <div class="item">
                  <span>${item.medicine.name} (${item.quantity} × $${item.unit_price})</span>
                  <span>$${item.total_price.toFixed(2)}</span>
                </div>
              `).join('')}
              
              <div class="item">
                <span>Subtotal:</span>
                <span>$${sale.total_amount.toFixed(2)}</span>
              </div>
              <div class="item">
                <span>Discount:</span>
                <span>-$${sale.discount_amount.toFixed(2)}</span>
              </div>
              <div class="item">
                <span>Tax:</span>
                <span>$${sale.tax_amount.toFixed(2)}</span>
              </div>
              <div class="item total">
                <span>Total:</span>
                <span>$${sale.grand_total.toFixed(2)}</span>
              </div>
              
              <p>Payment: ${sale.payment_method.toUpperCase()}</p>
              
              <div class="footer">
                <p>Thank you for your purchase!</p>
                <p>Novartis Pharmacy Management System</p>
              </div>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const exportSales = async () => {
    try {
      const response = await fetch('http://localhost:8000/reports/export?report_type=sales&format=pdf', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json',
        },
      });
      // Some backends may return a non-2xx status while still returning a file
      // (for example when using proxies or streaming responses). Try to
      // consume the body as a blob and treat it as a successful download if
      // the blob contains data and the content-type looks like a file.
      const blob = await response.blob();
      const contentType = response.headers.get('content-type') || '';
      const looksLikeFile = blob && blob.size > 0 && (contentType.includes('application/pdf') || contentType.includes('application/octet-stream') || contentType.includes('application/vnd'));

      if (response.ok || looksLikeFile) {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sales-export-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        console.error('Export failed:', response.status, await response.text());
        alert('Failed to export sales data');
      }
    } catch (error: any) {
      console.error('Export error', error);
      // Suppress alert for transient fetch errors (e.g. browser network behavior
      // after download). Keep error logged for debugging.
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Sales History</h1>
              <p className="text-gray-700">View and analyze past transactions</p>
            </div>
            <button
              onClick={exportSales}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center space-x-2 hover:bg-blue-700"
            >
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-sm border p-6">
                <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-gray-700">Total Sales</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalSales}</p>
                </div>
                <Receipt className="w-8 h-8 text-blue-500" />
                </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border p-6">
                <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-gray-700">Total Revenue</p>
                    <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(stats.totalRevenue)}
                    </p>
                </div>
                <CreditCard className="w-8 h-8 text-green-500" />
                </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border p-6">
                <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-gray-700">Average Sale</p>
                    <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(stats.averageSale)}
                    </p>
                </div>
                <Receipt className="w-8 h-8 text-purple-500" />
                </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border p-6">
                <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-gray-700">Today's Sales</p>
                    <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(stats.todaySales)}
                    </p>
                </div>
                <Calendar className="w-8 h-8 text-yellow-500" />
                </div>
            </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <div className="flex items-center mb-4">
            <Filter className="w-5 h-5 text-gray-500 mr-2" />
            <h3 className="font-medium text-gray-900">Filters</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
              <select
                value={filters.paymentMethod}
                onChange={(e) => handleFilterChange('paymentMethod', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Methods</option>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="mobile">Mobile</option>
              </select>
            </div>
            
            <div className="flex items-end space-x-2">
                <button
                    onClick={fetchSales}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                    Apply Filters
                </button>
                <button
                    onClick={resetFilters}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                    Reset All
                </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Amount (PKR)</label>
              <input
                type="number"
                value={filters.minAmount}
                onChange={(e) => handleFilterChange('minAmount', e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Amount (PKR)</label>
              <input
                type="number"
                value={filters.maxAmount}
                onChange={(e) => handleFilterChange('maxAmount', e.target.value)}
                placeholder="1000.00"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Sales Table */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-2 text-gray-700">Loading sales history...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Receipt</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Date & Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Cashier</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Payment</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900">{sale.receipt_number}</p>
                          <p className="text-sm text-gray-700">{sale.items.length} items</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <p className="text-gray-900">{new Date(sale.created_at).toLocaleDateString()}</p>
                          <p className="text-sm text-gray-700">{new Date(sale.created_at).toLocaleTimeString()}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {sale.customer ? (
                          <div className="flex items-center">
                            <User className="w-4 h-4 text-gray-400 mr-2" />
                            <span className="text-gray-900">
                              {sale.customer.first_name} {sale.customer.last_name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-500">Walk-in</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-gray-900">{sale.cashier.full_name}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          sale.payment_method === 'cash' ? 'bg-green-100 text-green-800' :
                          sale.payment_method === 'card' ? 'bg-blue-100 text-blue-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                          {sale.payment_method}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-right">
                            <p className="font-bold text-gray-900">
                            {formatCurrency(sale.grand_total)}
                            </p>    
                            {sale.discount_amount > 0 && (
                            <p className="text-sm text-gray-700">
                                -{formatCurrency(sale.discount_amount)}
                            </p>
                            )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => viewSaleDetails(sale)}
                            className="text-blue-600 hover:text-blue-900"
                            title="View Details"
                          >
                            <Search className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => printReceipt(sale)}
                            className="text-gray-600 hover:text-gray-900"
                            title="Print Receipt"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {sales.length === 0 && (
                <div className="text-center py-12">
                  <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-700">No sales found</p>
                  <p className="text-sm text-gray-600">Try adjusting your filters</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Sale Details Modal */}
      {showDetails && selectedSale && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Sale Details</h3>
                  <p className="text-sm text-gray-700">{selectedSale.receipt_number}</p>
                </div>
                <button
                  onClick={() => setShowDetails(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                <div className="bg-gray-50 rounded-lg p-6">
                  <h4 className="font-medium text-gray-900 mb-4">Transaction Info</h4>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-700">Date & Time</p>
                      <p className="font-medium text-gray-900">
                        {new Date(selectedSale.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-700">Cashier</p>
                      <p className="font-medium text-gray-900">{selectedSale.cashier.full_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-700">Payment Method</p>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        selectedSale.payment_method === 'cash' ? 'bg-green-100 text-green-800' :
                        selectedSale.payment_method === 'card' ? 'bg-blue-100 text-blue-800' :
                        'bg-purple-100 text-purple-800'
                      }`}>
                        {selectedSale.payment_method.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-6">
                  <h4 className="font-medium text-gray-900 mb-4">Customer Info</h4>
                  {selectedSale.customer ? (
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-gray-700">Name</p>
                        <p className="font-medium text-gray-900">
                          {selectedSale.customer.first_name} {selectedSale.customer.last_name}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-700">Walk-in customer</p>
                  )}
                </div>
                
                <div className="bg-gray-50 rounded-lg p-6">
                  <h4 className="font-medium text-gray-900 mb-4">Amount Summary</h4>
                  <div className="space-y-2">
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <span className="text-gray-700">Subtotal</span>
                            <span className="font-medium text-gray-900">
                            {formatCurrency(selectedSale.total_amount)}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-700">Discount</span>
                            <span className="font-medium text-red-600">
                            -{formatCurrency(selectedSale.discount_amount)}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-700">Tax</span>
                            <span className="font-medium text-gray-900">
                            {formatCurrency(selectedSale.tax_amount)}
                            </span>
                        </div>
                        <div className="flex justify-between border-t border-gray-300 pt-2 mt-2">
                            <span className="font-bold text-gray-900">Grand Total</span>
                            <span className="font-bold text-gray-900">
                            {formatCurrency(selectedSale.grand_total)}
                            </span>
                        </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-4">Items Purchased</h4>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Medicine</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Price</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Quantity</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {selectedSale.items.map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-medium text-gray-900">{item.medicine.name}</p>
                              <p className="text-sm text-gray-700">{item.medicine.medicine_id}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                             <p className="text-gray-900">{formatCurrency(item.unit_price)}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-gray-900">{item.quantity}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-900">{formatCurrency(item.total_price)}</p>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 pt-6 border-t">
                <button
                  onClick={() => printReceipt(selectedSale)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Receipt</span>
                </button>
                <button
                  onClick={() => setShowDetails(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
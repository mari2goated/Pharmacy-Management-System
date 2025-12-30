// app/(dashboard)/purchases/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { purchasesAPI, suppliersAPI, inventoryAPI } from '@/lib/api';
import { 
  Package, Plus, Search, Filter, Calendar, Truck, CheckCircle, 
  Clock, XCircle, AlertCircle, DollarSign, Hash, Eye, Download, 
  Printer, RefreshCw, Trash2, Edit, MoreVertical
} from 'lucide-react';

type OrderStatus = 'pending' | 'ordered' | 'received' | 'cancelled' | 'partial';

interface Purchase {
  id: number;
  purchase_number: string;
  supplier_id: number;
  order_date: string;
  expected_delivery: string | null;
  status: OrderStatus;
  total_amount: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  supplier: {
    id: number;
    name: string;
    contact_person: string | null;
    phone: string | null;
  };
  items: Array<{
    id: number;
    medicine_id: number;
    quantity: number;
    unit_cost: number;
    received_quantity: number | null;
    medicine: {
      id: number;
      name: string;
      brand: string;
      sku: string;
      unit: string;
    };
  }>;
}

interface Supplier {
  id: number;
  name: string;
}

interface Medicine {
  id: number;
  name: string;
  brand: string;
  sku: string;
  stock_quantity: number;
  unit_price: number;
  unit: string;
}

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [supplierFilter, setSupplierFilter] = useState<number | 'all'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [receiveQuantities, setReceiveQuantities] = useState<Record<string, number>>({});
  
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [loadingMedicines, setLoadingMedicines] = useState(false);
  
  const [newPurchase, setNewPurchase] = useState({
    supplier_id: '',
    expected_delivery: '',
    notes: '',
    items: [] as Array<{
      medicine_id: string;
      quantity: string;
      unit_cost: string;
      expiry_date: string;
      batch_number: string;
    }>,
  });
  
  const [newItem, setNewItem] = useState({
    medicine_id: '',
    quantity: '1',
    unit_cost: '',
    expiry_date: '',
    batch_number: '',
  });

  // Helper functions
  const toNumber = (value: any): number => {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const num = parseFloat(value);
      return isNaN(num) ? 0 : num;
    }
    return 0;
  };

  const formatCurrency = (amount: number | string): string => {
    const numAmount = toNumber(amount);
    return 'PKR ' + numAmount.toFixed(2);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status: OrderStatus) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: <Clock className="w-3 h-3" /> },
      ordered: { color: 'bg-blue-100 text-blue-800', icon: <Truck className="w-3 h-3" /> },
      received: { color: 'bg-green-100 text-green-800', icon: <CheckCircle className="w-3 h-3" /> },
      cancelled: { color: 'bg-red-100 text-red-800', icon: <XCircle className="w-3 h-3" /> },
      partial: { color: 'bg-orange-100 text-orange-800', icon: <AlertCircle className="w-3 h-3" /> },
    };

    const config = statusConfig[status] || statusConfig.pending;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.icon}
        <span className="ml-1">{status.charAt(0).toUpperCase() + status.slice(1)}</span>
      </span>
    );
  };

  // Fetch data
  useEffect(() => {
    fetchPurchases();
    fetchSuppliers();
    fetchMedicines();
  }, []);

  const fetchPurchases = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (statusFilter !== 'all') params.status_filter = statusFilter;
      if (supplierFilter !== 'all') params.supplier_id = supplierFilter;
      
      const response = await purchasesAPI.getPurchases(params);
      setPurchases(response.data || []);
    } catch (error) {
      console.error('Failed to fetch purchases:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    setLoadingSuppliers(true);
    try {
      const response = await suppliersAPI.getSuppliers({ active_only: true });
      setSuppliers(response.data || []);
    } catch (error) {
      console.error('Failed to fetch suppliers:', error);
    } finally {
      setLoadingSuppliers(false);
    }
  };

  const fetchMedicines = async () => {
    setLoadingMedicines(true);
    try {
      const response = await inventoryAPI.getMedicines();
      setMedicines(response.data || []);
    } catch (error) {
      console.error('Failed to fetch medicines:', error);
    } finally {
      setLoadingMedicines(false);
    }
  };

  const handleSearch = () => {
    fetchPurchases();
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setSupplierFilter('all');
    setDateFilter('all');
    fetchPurchases();
  };

  // Add item to new purchase
  const handleAddItem = () => {
    if (!newItem.medicine_id || !newItem.quantity || !newItem.unit_cost) {
      alert('Please fill in all required item fields');
      return;
    }

    const medicine = medicines.find(m => m.id === parseInt(newItem.medicine_id));
    if (!medicine) return;

    setNewPurchase(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          ...newItem,
          medicine_id: newItem.medicine_id,
          quantity: newItem.quantity,
          unit_cost: newItem.unit_cost,
        }
      ]
    }));

    setNewItem({
      medicine_id: '',
      quantity: '1',
      unit_cost: '',
      expiry_date: '',
      batch_number: '',
    });
  };

  const handleRemoveItem = (index: number) => {
    setNewPurchase(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const calculateTotal = () => {
    return newPurchase.items.reduce((total, item) => {
      const quantity = toNumber(item.quantity);
      const unitCost = toNumber(item.unit_cost);
      return total + (quantity * unitCost);
    }, 0);
  };

  // Create new purchase order - THIS IS THE MISSING BUTTON FUNCTION
  const handleCreatePurchase = async () => {
    if (!newPurchase.supplier_id || newPurchase.items.length === 0) {
      alert('Please select a supplier and add at least one item');
      return;
    }

    try {
      const purchaseData = {
        supplier_id: parseInt(newPurchase.supplier_id),
        expected_delivery: newPurchase.expected_delivery || undefined,
        notes: newPurchase.notes || undefined,
        items: newPurchase.items.map(item => ({
          medicine_id: parseInt(item.medicine_id),
          quantity: toNumber(item.quantity),
          unit_cost: toNumber(item.unit_cost),
          expiry_date: item.expiry_date || undefined,
          batch_number: item.batch_number || undefined,
        }))
      };

      await purchasesAPI.createPurchase(purchaseData);
      setShowAddModal(false);
      resetNewPurchase();
      fetchPurchases();
      alert('Purchase order created successfully!');
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to create purchase order');
    }
  };

  const resetNewPurchase = () => {
    setNewPurchase({
      supplier_id: '',
      expected_delivery: '',
      notes: '',
      items: [],
    });
    setNewItem({
      medicine_id: '',
      quantity: '1',
      unit_cost: '',
      expiry_date: '',
      batch_number: '',
    });
  };

  const viewPurchaseDetails = (purchase: Purchase) => {
    setSelectedPurchase(purchase);
    setShowDetailModal(true);
  };

  const prepareReceivePurchase = (purchase: Purchase) => {
    setSelectedPurchase(purchase);
    
    const quantities: Record<string, number> = {};
    purchase.items.forEach(item => {
      quantities[item.id.toString()] = item.quantity;
    });
    
    setReceiveQuantities(quantities);
    setShowReceiveModal(true);
  };

  const handleReceivePurchase = async () => {
    if (!selectedPurchase) return;

    try {
      await purchasesAPI.receivePurchase(selectedPurchase.id, {
        received_quantities: receiveQuantities
      });
      
      setShowReceiveModal(false);
      fetchPurchases();
      alert('Purchase order received successfully!');
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to receive purchase order');
    }
  };

  const handleUpdateStatus = async (purchaseId: number, status: OrderStatus) => {
    if (!confirm(`Are you sure you want to mark this order as ${status}?`)) return;

    try {
      await purchasesAPI.updatePurchaseStatus(purchaseId, status);
      fetchPurchases();
      alert('Purchase status updated successfully!');
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to update purchase status');
    }
  };

  const calculateStats = () => {
    const totalPurchases = purchases.length;
    const totalSpent = purchases.reduce((sum, purchase) => sum + toNumber(purchase.total_amount), 0);
    const pendingOrders = purchases.filter(p => p.status === 'pending' || p.status === 'ordered').length;
    const averageOrderValue = totalPurchases > 0 ? totalSpent / totalPurchases : 0;

    return {
      total_purchases: totalPurchases,
      total_spent: totalSpent,
      pending_orders: pendingOrders,
      average_order_value: averageOrderValue,
    };
  };

  const purchaseStats = calculateStats();

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1>
              <p className="text-gray-600">Manage supplier purchases and track inventory restocking</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => fetchPurchases()}
                className="px-4 py-2 border border-gray-300 rounded-lg flex items-center space-x-2 hover:bg-gray-50"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Refresh</span>
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center space-x-2 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                <span>New Purchase</span>
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Purchases</p>
                <p className="text-2xl font-bold text-gray-900">{purchaseStats.total_purchases}</p>
              </div>
              <Package className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Spent</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(purchaseStats.total_spent)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-green-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pending Orders</p>
                <p className="text-2xl font-bold text-gray-900">{purchaseStats.pending_orders}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Avg. Order Value</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(purchaseStats.average_order_value)}
                </p>
              </div>
              <Hash className="w-8 h-8 text-purple-500" />
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
            <div className="flex-1 flex flex-col md:flex-row md:items-center space-y-3 md:space-y-0 md:space-x-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Search by PO number or supplier..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div className="flex flex-wrap gap-3">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as OrderStatus | 'all')}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="ordered">Ordered</option>
                  <option value="received">Received</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                
                <select
                  value={supplierFilter}
                  onChange={(e) => setSupplierFilter(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Suppliers</option>
                  {suppliers.map(supplier => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
                
                <button
                  onClick={handleSearch}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Apply Filters
                </button>
                
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Purchases Table */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-2 text-gray-600">Loading purchases...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PO Number</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {purchases.map((purchase) => (
                    <tr key={purchase.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900">{purchase.purchase_number}</p>
                          <p className="text-sm text-gray-500">{purchase.items?.length || 0} items</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900">{purchase.supplier?.name || 'Unknown'}</p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(purchase.order_date)}
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(purchase.status)}
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900">
                          {formatCurrency(purchase.total_amount)}
                        </p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => viewPurchaseDetails(purchase)}
                            className="p-1.5 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          
                          {(purchase.status === 'pending' || purchase.status === 'ordered') && (
                            <>
                              <button
                                onClick={() => prepareReceivePurchase(purchase)}
                                className="p-1.5 text-green-600 hover:text-green-900 hover:bg-green-50 rounded"
                                title="Receive Order"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                              
                              <button
                                onClick={() => handleUpdateStatus(purchase.id, 'cancelled')}
                                className="p-1.5 text-red-600 hover:text-red-900 hover:bg-red-50 rounded"
                                title="Cancel Order"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {purchases.length === 0 && (
                <div className="text-center py-12">
                  <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No purchase orders found</p>
                  <p className="text-sm text-gray-400">Try adjusting your filters or create a new purchase order</p>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Create First Purchase Order
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add Purchase Modal - FIXED WITH CREATE BUTTON */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Create New Purchase Order</h3>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    resetNewPurchase();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Form */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Supplier Selection */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h4 className="font-medium text-gray-900 mb-4">Supplier Details</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Select Supplier *
                        </label>
                        <select
                          value={newPurchase.supplier_id}
                          onChange={(e) => setNewPurchase({ ...newPurchase, supplier_id: e.target.value })}
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Choose a supplier</option>
                          {suppliers.map(supplier => (
                            <option key={supplier.id} value={supplier.id}>
                              {supplier.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Expected Delivery Date
                          </label>
                          <input
                            type="date"
                            value={newPurchase.expected_delivery}
                            onChange={(e) => setNewPurchase({ ...newPurchase, expected_delivery: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Notes (Optional)
                          </label>
                          <textarea
                            value={newPurchase.notes}
                            onChange={(e) => setNewPurchase({ ...newPurchase, notes: e.target.value })}
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Add any notes or instructions..."
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Add Items Section */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h4 className="font-medium text-gray-900 mb-4">Add Items</h4>
                    
                    <div className="space-y-4 mb-6">
                      <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Medicine *
                          </label>
                          <select
                            value={newItem.medicine_id}
                            onChange={(e) => setNewItem({ ...newItem, medicine_id: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="">Select Medicine</option>
                            {medicines.map(medicine => (
                              <option key={medicine.id} value={medicine.id}>
                                {medicine.name} ({medicine.brand})
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Qty *
                          </label>
                          <input
                            type="number"
                            value={newItem.quantity}
                            onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                            min="1"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Unit Cost *
                          </label>
                          <input
                            type="number"
                            value={newItem.unit_cost}
                            onChange={(e) => setNewItem({ ...newItem, unit_cost: e.target.value })}
                            min="0"
                            step="0.01"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            &nbsp;
                          </label>
                          <button
                            onClick={handleAddItem}
                            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    {/* Items List */}
                    {newPurchase.items.length > 0 ? (
                      <div>
                        <h5 className="font-medium text-gray-900 mb-3">Order Items</h5>
                        <div className="border rounded-lg overflow-hidden">
                          <table className="w-full">
                            <thead className="bg-gray-100">
                              <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Medicine</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Qty</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Unit Cost</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Total</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500"></th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {newPurchase.items.map((item, index) => {
                                const medicine = medicines.find(m => m.id === parseInt(item.medicine_id));
                                const total = toNumber(item.quantity) * toNumber(item.unit_cost);
                                
                                return (
                                  <tr key={index}>
                                    <td className="px-4 py-3">
                                      {medicine ? `${medicine.name} (${medicine.brand})` : 'Unknown'}
                                    </td>
                                    <td className="px-4 py-3">{item.quantity}</td>
                                    <td className="px-4 py-3">{formatCurrency(item.unit_cost)}</td>
                                    <td className="px-4 py-3 font-medium">{formatCurrency(total)}</td>
                                    <td className="px-4 py-3">
                                      <button
                                        onClick={() => handleRemoveItem(index)}
                                        className="text-red-600 hover:text-red-900 p-1"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                        <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">No items added yet</p>
                        <p className="text-sm text-gray-400">Add items using the form above</p>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Right Column - Summary */}
                <div className="space-y-6">
                  <div className="bg-blue-50 rounded-lg p-6 sticky top-0">
                    <h4 className="font-medium text-gray-900 mb-4">Order Summary</h4>
                    
                    <div className="space-y-3 mb-6">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Items</span>
                        <span className="font-medium">{newPurchase.items.length}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-gray-600">Subtotal</span>
                        <span className="font-medium">{formatCurrency(calculateTotal())}</span>
                      </div>
                      
                      <div className="border-t pt-3">
                        <div className="flex justify-between text-lg font-bold">
                          <span>Total</span>
                          <span>{formatCurrency(calculateTotal())}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* THIS IS THE MISSING CREATE PURCHASE BUTTON */}
                    <button
                      onClick={handleCreatePurchase}
                      disabled={!newPurchase.supplier_id || newPurchase.items.length === 0}
                      className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    >
                      Create Purchase Order
                    </button>
                    
                    <button
                      onClick={() => {
                        setShowAddModal(false);
                        resetNewPurchase();
                      }}
                      className="w-full mt-3 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h4 className="font-medium text-gray-900 mb-3">Quick Tips</h4>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li className="flex items-start">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span>Select a supplier before adding items</span>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span>Add at least one item to create order</span>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span>Expected delivery date is optional</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Receive Purchase Modal */}
      {showReceiveModal && selectedPurchase && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Receive Purchase Order</h3>
                  <p className="text-sm text-gray-500">{selectedPurchase.purchase_number}</p>
                </div>
                <button
                  onClick={() => setShowReceiveModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-6">
                {selectedPurchase.items.map(item => (
                  <div key={item.id} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="font-medium text-gray-900">{item.medicine.name}</p>
                        <p className="text-sm text-gray-500">
                          {item.medicine.brand} • Ordered: {item.quantity}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {formatCurrency(toNumber(item.quantity) * toNumber(item.unit_cost))}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Received Quantity
                        </label>
                        <input
                          type="number"
                          value={receiveQuantities[item.id] || item.quantity}
                          onChange={(e) => {
                            const newQuantities = { ...receiveQuantities };
                            newQuantities[item.id.toString()] = parseInt(e.target.value) || 0;
                            setReceiveQuantities(newQuantities);
                          }}
                          min="0"
                          max={item.quantity}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div className="pt-6">
                        <span className="text-sm text-gray-500">
                          of {item.quantity}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="flex justify-end space-x-3 pt-6 border-t mt-6">
                <button
                  onClick={() => setShowReceiveModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReceivePurchase}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Confirm Receipt
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Purchase Details Modal */}
      {showDetailModal && selectedPurchase && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {selectedPurchase.purchase_number}
                  </h3>
                  <div className="flex items-center space-x-2 mt-1">
                    {getStatusBadge(selectedPurchase.status)}
                    <span className="text-sm text-gray-500">
                      Created: {formatDate(selectedPurchase.created_at)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-6">
                {/* Purchase Info */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h4 className="font-medium text-gray-900 mb-4">Purchase Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Supplier</p>
                      <p className="font-medium text-gray-900">{selectedPurchase.supplier?.name || 'Unknown'}</p>
                      {selectedPurchase.supplier?.contact_person && (
                        <p className="text-sm text-gray-600">{selectedPurchase.supplier.contact_person}</p>
                      )}
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-500">Dates</p>
                      <div className="space-y-1">
                        <p className="text-gray-900">Order Date: {formatDate(selectedPurchase.order_date)}</p>
                        <p className="text-gray-900">
                          Expected Delivery: {formatDate(selectedPurchase.expected_delivery) || 'Not specified'}
                        </p>
                      </div>
                    </div>
                    
                    {selectedPurchase.notes && (
                      <div className="md:col-span-2">
                        <p className="text-sm text-gray-500">Notes</p>
                        <div className="mt-1 p-3 bg-white border rounded-lg">
                          <p className="text-gray-900">{selectedPurchase.notes}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Items List */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-4">Order Items</h4>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Medicine</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Quantity</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Unit Cost</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Received</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {selectedPurchase.items.map(item => (
                          <tr key={item.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <div>
                                <p className="font-medium text-gray-900">{item.medicine.name}</p>
                                <p className="text-sm text-gray-500">
                                  {item.medicine.brand} • {item.medicine.sku}
                                </p>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              {item.quantity} {item.medicine.unit}
                            </td>
                            <td className="px-4 py-3">
                              {formatCurrency(item.unit_cost)}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                item.received_quantity === item.quantity
                                  ? 'bg-green-100 text-green-800'
                                  : item.received_quantity && item.received_quantity > 0
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {item.received_quantity || 0} / {item.quantity}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-medium">
                              {formatCurrency(toNumber(item.quantity) * toNumber(item.unit_cost))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50">
                        <tr>
                          <td colSpan={4} className="px-4 py-3 text-right font-medium">
                            Total Amount:
                          </td>
                          <td className="px-4 py-3 font-bold text-lg">
                            {formatCurrency(selectedPurchase.total_amount)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex justify-between pt-6 border-t">
                  <div className="flex space-x-3">
                    {(selectedPurchase.status === 'pending' || selectedPurchase.status === 'ordered') && (
                      <button
                        onClick={() => {
                          setShowDetailModal(false);
                          prepareReceivePurchase(selectedPurchase);
                        }}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>Receive Order</span>
                      </button>
                    )}
                    
                    {selectedPurchase.status === 'pending' && (
                      <button
                        onClick={() => {
                          if (confirm('Are you sure you want to cancel this order?')) {
                            handleUpdateStatus(selectedPurchase.id, 'cancelled');
                            setShowDetailModal(false);
                          }
                        }}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center space-x-2"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Cancel Order</span>
                      </button>
                    )}
                  </div>
                  
                  <div className="flex space-x-3">
                    <button
                      onClick={() => window.print()}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center space-x-2"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Print</span>
                    </button>
                    
                    <button
                      onClick={() => setShowDetailModal(false)}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
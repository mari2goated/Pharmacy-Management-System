// app/(dashboard)/suppliers/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { suppliersAPI } from '@/lib/api';
import { Building, Truck, Plus, Search, Phone, Mail, User, Calendar, Package, Edit, Filter, Archive, TrendingUp } from 'lucide-react';

interface Supplier {
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

interface Purchase {
  id: number;
  purchase_number: string;
  order_date: string;
  expected_delivery_date: string | null;
  status: string;
  total_amount: number;
  items_count: number;
}

interface PurchaseHistoryResponse {
  supplier: Supplier;
  total_purchases: number;
  purchases: Purchase[];
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeOnly, setActiveOnly] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [purchaseHistory, setPurchaseHistory] = useState<PurchaseHistoryResponse | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    tax_id: '',
    payment_terms: '',
    lead_time_days: 30,
    notes: '',
  });

  // Edit form state
  const [editFormData, setEditFormData] = useState({
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    tax_id: '',
    payment_terms: '',
    lead_time_days: 30,
    notes: '',
    is_active: true,
  });

  // Fetch suppliers
  useEffect(() => {
    fetchSuppliers();
  }, [activeOnly]);

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const response = await suppliersAPI.getSuppliers({
        search: searchQuery || undefined,
        active_only: activeOnly,
      });
      setSuppliers(response.data || []);
    } catch (error) {
      console.error('Failed to fetch suppliers:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle search
  const handleSearch = () => {
    fetchSuppliers();
  };

  // Handle form input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: name === 'lead_time_days' ? parseInt(value) || 0 : value 
    }));
  };

  // Handle edit form input
  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const target = e.target as HTMLInputElement;
      setEditFormData(prev => ({ ...prev, [name]: target.checked }));
    } else {
      setEditFormData(prev => ({ 
        ...prev, 
        [name]: name === 'lead_time_days' ? parseInt(value) || 0 : value 
      }));
    }
  };

  // Add new supplier
  const handleAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await suppliersAPI.createSupplier(formData);
      setShowAddModal(false);
      resetForm();
      fetchSuppliers();
      alert('Supplier added successfully!');
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to add supplier');
    }
  };

  // Update supplier
  const handleUpdateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSupplier) return;

    try {
      await suppliersAPI.updateSupplier(editingSupplier.id, editFormData);
      setEditingSupplier(null);
      fetchSuppliers();
      if (selectedSupplier?.id === editingSupplier.id) {
        // Refresh selected supplier if it's the one being edited
        viewSupplierDetails(editingSupplier);
      }
      alert('Supplier updated successfully!');
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to update supplier');
    }
  };

  // Toggle supplier status
  const handleToggleStatus = async (supplier: Supplier) => {
    const newStatus = !supplier.is_active;
    const confirmMessage = newStatus 
      ? 'Are you sure you want to activate this supplier?' 
      : 'Are you sure you want to deactivate this supplier?';

    if (!confirm(confirmMessage)) return;

    try {
      await suppliersAPI.updateSupplier(supplier.id, { is_active: newStatus });
      fetchSuppliers();
      if (selectedSupplier?.id === supplier.id) {
        setSelectedSupplier(prev => prev ? { ...prev, is_active: newStatus } : null);
      }
      alert(`Supplier ${newStatus ? 'activated' : 'deactivated'} successfully!`);
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to update supplier status');
    }
  };

  // View supplier details
  const viewSupplierDetails = async (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setHistoryLoading(true);
    try {
      const response = await suppliersAPI.getSupplierPurchaseHistory(supplier.id);
      //setPurchaseHistory(response.data);
      setShowDetailModal(true);
    } catch (error) {
      console.error('Failed to fetch supplier purchase history:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Start editing supplier
  const startEditingSupplier = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setEditFormData({
      name: supplier.name,
      contact_person: supplier.contact_person || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      address: supplier.address || '',
      tax_id: supplier.tax_id || '',
      payment_terms: supplier.payment_terms || '',
      lead_time_days: supplier.lead_time_days || 30,
      notes: supplier.notes || '',
      is_active: supplier.is_active,
    });
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      contact_person: '',
      email: '',
      phone: '',
      address: '',
      tax_id: '',
      payment_terms: '',
      lead_time_days: 30,
      notes: '',
    });
  };

  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Calculate supplier stats
  const totalSuppliers = suppliers.length;
  const activeSuppliers = suppliers.filter(s => s.is_active).length;
  const newSuppliersThisMonth = suppliers.filter(s => {
    const created = new Date(s.created_at);
    const now = new Date();
    return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
  }).length;

  // Calculate total spend from purchase history
  const totalSpend = purchaseHistory?.purchases?.reduce((sum, purchase) => sum + purchase.total_amount, 0) || 0;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Supplier Management</h1>
              <p className="text-gray-600">Manage supplier information and track purchase history</p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center space-x-2 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              <span>Add Supplier</span>
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Suppliers</p>
                <p className="text-2xl font-bold text-gray-900">{totalSuppliers}</p>
              </div>
              <Building className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Active Suppliers</p>
                <p className="text-2xl font-bold text-gray-900">{activeSuppliers}</p>
              </div>
              <Truck className="w-8 h-8 text-green-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">New This Month</p>
                <p className="text-2xl font-bold text-gray-900">{newSuppliersThisMonth}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-500" />
            </div>
          </div>
        </div>

        {/* Search and Filters Bar */}
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
                  placeholder="Search by name, contact person, email, or phone..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="activeOnly"
                    checked={activeOnly}
                    onChange={(e) => setActiveOnly(e.target.checked)}
                    className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                  />
                  <label htmlFor="activeOnly" className="ml-2 text-sm text-gray-700">
                    Show Active Only
                  </label>
                </div>
                
                <button
                  onClick={handleSearch}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Search
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Suppliers Table */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-2 text-gray-600">Loading suppliers...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact Information</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Terms</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {suppliers.map((supplier) => (
                    <tr key={supplier.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900">
                            {supplier.name}
                          </p>
                          <p className="text-sm text-gray-500">ID: {supplier.id}</p>
                          {supplier.contact_person && (
                            <p className="text-sm text-gray-500 flex items-center">
                              <User className="w-3 h-3 mr-1" />
                              {supplier.contact_person}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          {supplier.phone && (
                            <div className="flex items-center text-sm text-gray-900">
                              <Phone className="w-4 h-4 mr-2 text-gray-400" />
                              {supplier.phone}
                            </div>
                          )}
                          {supplier.email && (
                            <div className="flex items-center text-sm text-gray-500">
                              <Mail className="w-4 h-4 mr-2 text-gray-400" />
                              {supplier.email}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {supplier.payment_terms || 'N/A'}
                        </div>
                        {supplier.lead_time_days && (
                          <div className="text-xs text-gray-500">
                            Lead time: {supplier.lead_time_days} days
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                            supplier.is_active 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {supplier.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => viewSupplierDetails(supplier)}
                            className="text-blue-600 hover:text-blue-900"
                            title="View Details"
                          >
                            <Building className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => startEditingSupplier(supplier)}
                            className="text-green-600 hover:text-green-900"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(supplier)}
                            className={supplier.is_active 
                              ? "text-yellow-600 hover:text-yellow-900" 
                              : "text-green-600 hover:text-green-900"
                            }
                            title={supplier.is_active ? "Deactivate" : "Activate"}
                          >
                            <Archive className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {suppliers.length === 0 && (
                <div className="text-center py-12">
                  <Building className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No suppliers found</p>
                  <p className="text-sm text-gray-400">Try adjusting your filters or add a new supplier</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add Supplier Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Add New Supplier</h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <form onSubmit={handleAddSupplier} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Name *</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
                    <input
                      type="text"
                      name="contact_person"
                      value={formData.contact_person}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                    <textarea
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tax ID</label>
                    <input
                      type="text"
                      name="tax_id"
                      value={formData.tax_id}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms</label>
                    <select
                      name="payment_terms"
                      value={formData.payment_terms}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select payment terms</option>
                      <option value="Net 30">Net 30</option>
                      <option value="Net 60">Net 60</option>
                      <option value="Net 90">Net 90</option>
                      <option value="Due on Receipt">Due on Receipt</option>
                      <option value="Cash on Delivery">Cash on Delivery</option>
                      <option value="50% Advance">50% Advance</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Lead Time (Days)</label>
                    <input
                      type="number"
                      name="lead_time_days"
                      value={formData.lead_time_days}
                      onChange={handleInputChange}
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Additional notes about this supplier..."
                    />
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Add Supplier
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Supplier Modal */}
      {editingSupplier && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Edit Supplier</h3>
                <button
                  onClick={() => setEditingSupplier(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <form onSubmit={handleUpdateSupplier} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Name *</label>
                    <input
                      type="text"
                      name="name"
                      value={editFormData.name}
                      onChange={handleEditInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
                    <input
                      type="text"
                      name="contact_person"
                      value={editFormData.contact_person}
                      onChange={handleEditInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      name="email"
                      value={editFormData.email}
                      onChange={handleEditInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      name="phone"
                      value={editFormData.phone}
                      onChange={handleEditInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                    <textarea
                      name="address"
                      value={editFormData.address}
                      onChange={handleEditInputChange}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tax ID</label>
                    <input
                      type="text"
                      name="tax_id"
                      value={editFormData.tax_id}
                      onChange={handleEditInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms</label>
                    <select
                      name="payment_terms"
                      value={editFormData.payment_terms}
                      onChange={handleEditInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select payment terms</option>
                      <option value="Net 30">Net 30</option>
                      <option value="Net 60">Net 60</option>
                      <option value="Net 90">Net 90</option>
                      <option value="Due on Receipt">Due on Receipt</option>
                      <option value="Cash on Delivery">Cash on Delivery</option>
                      <option value="50% Advance">50% Advance</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Lead Time (Days)</label>
                    <input
                      type="number"
                      name="lead_time_days"
                      value={editFormData.lead_time_days}
                      onChange={handleEditInputChange}
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="is_active"
                        name="is_active"
                        checked={editFormData.is_active}
                        onChange={handleEditInputChange}
                        className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                      />
                      <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
                        Active Supplier
                      </label>
                    </div>
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <textarea
                      name="notes"
                      value={editFormData.notes}
                      onChange={handleEditInputChange}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Additional notes about this supplier..."
                    />
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => setEditingSupplier(null)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Update Supplier
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Supplier Details Modal */}
      {showDetailModal && selectedSupplier && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {selectedSupplier.name}
                  </h3>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      selectedSupplier.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {selectedSupplier.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <span className="text-sm text-gray-500">Supplier ID: {selectedSupplier.id}</span>
                  </div>
                </div>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Supplier Info */}
                <div className="lg:col-span-2">
                  <div className="bg-gray-50 rounded-lg p-6 mb-6">
                    <h4 className="font-medium text-gray-900 mb-4">Supplier Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Contact Information</p>
                        <div className="mt-2 space-y-2">
                          {selectedSupplier.contact_person && (
                            <div className="flex items-center">
                              <User className="w-4 h-4 mr-2 text-gray-400" />
                              <span className="text-gray-900">{selectedSupplier.contact_person}</span>
                            </div>
                          )}
                          {selectedSupplier.phone && (
                            <div className="flex items-center">
                              <Phone className="w-4 h-4 mr-2 text-gray-400" />
                              <span className="text-gray-900">{selectedSupplier.phone}</span>
                            </div>
                          )}
                          {selectedSupplier.email && (
                            <div className="flex items-center">
                              <Mail className="w-4 h-4 mr-2 text-gray-400" />
                              <span className="text-gray-900">{selectedSupplier.email}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div>
                        <p className="text-sm text-gray-500">Business Details</p>
                        <div className="mt-2 space-y-2">
                          {selectedSupplier.tax_id && (
                            <div>
                              <span className="text-gray-900 font-medium">Tax ID: </span>
                              <span className="text-gray-900">{selectedSupplier.tax_id}</span>
                            </div>
                          )}
                          {selectedSupplier.payment_terms && (
                            <div>
                              <span className="text-gray-900 font-medium">Payment Terms: </span>
                              <span className="text-gray-900">{selectedSupplier.payment_terms}</span>
                            </div>
                          )}
                          {selectedSupplier.lead_time_days && (
                            <div>
                              <span className="text-gray-900 font-medium">Lead Time: </span>
                              <span className="text-gray-900">{selectedSupplier.lead_time_days} days</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {selectedSupplier.address && (
                        <div className="md:col-span-2">
                          <p className="text-sm text-gray-500">Address</p>
                          <div className="mt-2">
                            <span className="text-gray-900">{selectedSupplier.address}</span>
                          </div>
                        </div>
                      )}
                      
                      <div>
                        <p className="text-sm text-gray-500">Registered Since</p>
                        <div className="mt-2 flex items-center">
                          <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                          <span className="text-gray-900">{formatDate(selectedSupplier.created_at)}</span>
                        </div>
                      </div>
                      
                      {selectedSupplier.notes && (
                        <div className="md:col-span-2">
                          <p className="text-sm text-gray-500">Notes</p>
                          <div className="mt-2 p-3 bg-white border rounded-lg">
                            <span className="text-gray-900">{selectedSupplier.notes}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Purchase History */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-4">Purchase History</h4>
                    {historyLoading ? (
                      <div className="text-center py-8">
                        <div className="inline-block w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        <p className="mt-2 text-gray-600">Loading history...</p>
                      </div>
                    ) : purchaseHistory ? (
                      <div className="space-y-4">
                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-gray-500">Total Purchases</p>
                              <p className="text-2xl font-bold text-gray-900">{purchaseHistory.total_purchases}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Total Spent</p>
                              <p className="text-2xl font-bold text-gray-900">
                                {formatCurrency(totalSpend)}
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        {purchaseHistory.purchases && purchaseHistory.purchases.length > 0 ? (
                          <div className="border rounded-lg overflow-hidden">
                            <table className="w-full">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Purchase #</th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Order Date</th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Expected Delivery</th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Status</th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Amount</th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Items</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200">
                                {purchaseHistory.purchases.map((purchase) => (
                                  <tr key={purchase.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3">
                                      <p className="font-medium text-gray-900">{purchase.purchase_number}</p>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-500">
                                      {formatDate(purchase.order_date)}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-500">
                                      {formatDate(purchase.expected_delivery_date)}
                                    </td>
                                    <td className="px-4 py-3">
                                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                        purchase.status === 'completed' ? 'bg-green-100 text-green-800' :
                                        purchase.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                        purchase.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                        'bg-blue-100 text-blue-800'
                                      }`}>
                                        {purchase.status}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3">
                                      <p className="font-medium text-gray-900">
                                        {formatCurrency(purchase.total_amount)}
                                      </p>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-500">
                                      {purchase.items_count} items
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="text-center py-8 bg-gray-50 rounded-lg">
                            <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500">No purchase history</p>
                            <p className="text-sm text-gray-400">No purchases have been made from this supplier yet</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8 bg-gray-50 rounded-lg">
                        <p className="text-gray-500">Unable to load purchase history</p>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Quick Actions */}
                <div>
                  <div className="bg-blue-50 rounded-lg p-6 mb-6">
                    <h4 className="font-medium text-gray-900 mb-4">Quick Actions</h4>
                    <div className="space-y-3">
                      <button
                        onClick={() => startEditingSupplier(selectedSupplier)}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center space-x-2"
                      >
                        <Edit className="w-4 h-4" />
                        <span>Edit Supplier</span>
                      </button>
                      
                      <button
                        onClick={() => handleToggleStatus(selectedSupplier)}
                        className={`w-full px-4 py-2 border rounded-lg flex items-center justify-center space-x-2 ${
                          selectedSupplier.is_active
                            ? 'border-yellow-300 text-yellow-700 hover:bg-yellow-50'
                            : 'border-green-300 text-green-700 hover:bg-green-50'
                        }`}
                      >
                        <Archive className="w-4 h-4" />
                        <span>{selectedSupplier.is_active ? 'Deactivate' : 'Activate'}</span>
                      </button>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h4 className="font-medium text-gray-900 mb-4">Supplier Notes</h4>
                    <p className="text-sm text-gray-500 mb-3">
                      {selectedSupplier.notes || 'No notes available.'}
                    </p>
                    <textarea
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows={4}
                      placeholder="Add or update notes here..."
                      value={selectedSupplier.notes || ''}
                      onChange={(e) => {
                        setSelectedSupplier(prev => prev ? { ...prev, notes: e.target.value } : null);
                      }}
                    />
                    <button 
                      onClick={() => {
                        // Implement update notes functionality
                        alert('Note update feature coming soon!');
                      }}
                      className="w-full mt-3 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                    >
                      Save Notes
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
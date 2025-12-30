// app/(dashboard)/inventory/page.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { inventoryAPI, suppliersAPI, Supplier } from '@/lib/api';
import { Plus, Search, Edit, Trash2, Package, AlertCircle, Filter, Download, Upload } from 'lucide-react';
import { Medicine } from '@/types';

export default function InventoryPage() {
  // State
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [filters, setFilters] = useState({
    lowStock: false,
    categoryId: '',
  });

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    medicine_id: '',
    category_id: '',
    unit_price: '',
    cost_price: '',
    stock_quantity: '',
    reorder_level: '10',
    manufacturer: '',
    description: '',
    status: 'active',
  });

  // Fetch data
  useEffect(() => {
    fetchData();
  }, [filters]);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [medicinesRes, categoriesRes] = await Promise.all([
        inventoryAPI.getMedicines({
          search: searchQuery || undefined,
          low_stock: filters.lowStock || undefined,
          category_id: filters.categoryId || undefined,
        }),
        inventoryAPI.getCategories(),
      ]);
      
      setMedicines(medicinesRes.data || []);
      setCategories(categoriesRes.data || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const suppliersRes = await suppliersAPI.getSuppliers({ active_only: true, limit: 500 });
      setSuppliers(suppliersRes.data || []);
    } catch (error) {
      console.error('Failed to load suppliers', error);
    }
  };

  const filteredSuppliers = useMemo(() => {
    if (!supplierSearch.trim()) return suppliers;
    return suppliers.filter((s) =>
      s.name.toLowerCase().includes(supplierSearch.toLowerCase())
    );
  }, [supplierSearch, suppliers]);

  // Handle form input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Add new medicine
  const handleAddMedicine = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const medicineData = {
        ...formData,
        unit_price: parseFloat(formData.unit_price),
        cost_price: parseFloat(formData.cost_price),
        stock_quantity: parseInt(formData.stock_quantity),
        reorder_level: parseInt(formData.reorder_level),
        category_id: formData.category_id ? parseInt(formData.category_id) : null,
      };

      await inventoryAPI.createMedicine(medicineData);
      setShowAddModal(false);
      resetForm();
      fetchData();
      alert('Medicine added successfully!');
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to add medicine');
    }
  };

  // Edit medicine
  const handleEditMedicine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMedicine) return;

    try {
      const medicineData = {
        ...formData,
        unit_price: formData.unit_price ? parseFloat(formData.unit_price) : undefined,
        cost_price: formData.cost_price ? parseFloat(formData.cost_price) : undefined,
        stock_quantity: formData.stock_quantity ? parseInt(formData.stock_quantity) : undefined,
        reorder_level: formData.reorder_level ? parseInt(formData.reorder_level) : undefined,
        category_id: formData.category_id ? parseInt(formData.category_id) : null,
      };

      await inventoryAPI.updateMedicine(selectedMedicine.id, medicineData);
      setShowEditModal(false);
      resetForm();
      fetchData();
      alert('Medicine updated successfully!');
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to update medicine');
    }
  };

  // Delete medicine
  const handleDeleteMedicine = async (id: number) => {
    if (!confirm('Are you sure you want to delete this medicine?')) return;

    try {
      await inventoryAPI.deleteMedicine(id);
      fetchData();
      alert('Medicine deleted successfully!');
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to delete medicine');
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      medicine_id: '',
      category_id: '',
      unit_price: '',
      cost_price: '',
      stock_quantity: '',
      reorder_level: '10',
      manufacturer: '',
      description: '',
      status: 'active',
    });
    setSelectedMedicine(null);
  };

  // Open edit modal
  const openEditModal = (medicine: Medicine) => {
    setSelectedMedicine(medicine);
    setFormData({
      name: medicine.name,
      medicine_id: medicine.medicine_id,
      category_id: medicine.category_id?.toString() || '',
      unit_price: medicine.unit_price.toString(),
      cost_price: medicine.cost_price.toString(),
      stock_quantity: medicine.stock_quantity.toString(),
      reorder_level: medicine.reorder_level.toString(),
      manufacturer: medicine.manufacturer || '',
      description: medicine.description || '',
      status: medicine.status,
    });
    setShowEditModal(true);
  };

  // Export data
  const handleExport = async () => {
    try {
      const response = await fetch('http://localhost:8000/reports/export?report_type=inventory&format=pdf', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json',
        },
      });
      
      const blob = await response.blob();
      const contentType = response.headers.get('content-type') || '';
      const looksLikeFile = blob && blob.size > 0 && (contentType.includes('application/pdf') || contentType.includes('application/octet-stream'));

      if (response.ok || looksLikeFile) {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `inventory-export-${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        console.error('Export failed:', response.status);
        alert('Failed to export inventory data');
      }
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  // Low stock items
  const lowStockItems = medicines.filter(m => m.stock_quantity <= m.reorder_level);
  const outOfStockItems = medicines.filter(m => m.stock_quantity === 0);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
              <p className="text-gray-600">Manage medicine stock and product data</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleExport}
                className="px-4 py-2 border border-gray-300 text-black rounded-lg flex items-center space-x-2 hover:bg-gray-50"
              >
                <Download className="w-4 h-4" />
                <span>Export</span>
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center space-x-2 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                <span>Add Medicine</span>
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Medicines</p>
                <p className="text-2xl font-bold text-gray-900">{medicines.length}</p>
              </div>
              <Package className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">In Stock</p>
                <p className="text-2xl font-bold text-gray-900">
                  {medicines.filter(m => m.stock_quantity > 0).length}
                </p>
              </div>
              <Package className="w-8 h-8 text-green-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Low Stock</p>
                <p className="text-2xl font-bold text-gray-900">{lowStockItems.length}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-yellow-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Out of Stock</p>
                <p className="text-2xl font-bold text-gray-900">{outOfStockItems.length}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchData()}
                placeholder="Search medicines..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={filters.lowStock}
                  onChange={(e) => setFilters({...filters, lowStock: e.target.checked})}
                  className="mr-2"
                />
                <span className="text-sm text-black">Low Stock Only</span>
              </label>
              
              <select
                value={filters.categoryId}
                onChange={(e) => setFilters({...filters, categoryId: e.target.value})}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Categories</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={fetchData}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>

        {/* Medicines Table */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-2 text-gray-600">Loading medicines...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Medicine</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Manufacturer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {medicines.map((medicine) => (
                    <tr key={medicine.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <p className="font-medium text-gray-900">{medicine.name}</p>
                          {medicine.generic_name && (
                            <p className="text-sm text-gray-500">{medicine.generic_name}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {medicine.medicine_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {medicine.category_id || 'Uncategorized'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {medicine.manufacturer || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className={`font-medium ${
                            medicine.stock_quantity === 0 ? 'text-red-600' :
                            medicine.stock_quantity <= medicine.reorder_level ? 'text-yellow-600' :
                            'text-green-600'
                          }`}>
                            {medicine.stock_quantity}
                          </span>
                          {medicine.stock_quantity <= medicine.reorder_level && (
                            <AlertCircle className="w-4 h-4 text-yellow-500 ml-2" />
                          )}
                        </div>
                        <div className="text-xs text-gray-500">Reorder: {medicine.reorder_level}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          PKR {medicine.unit_price}
                        </div>
                        <div className="text-xs text-gray-500">
                          Cost: PKR {medicine.cost_price}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          medicine.status === 'active' ? 'bg-green-100 text-green-800' :
                          medicine.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {medicine.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => openEditModal(medicine)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteMedicine(medicine.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {medicines.length === 0 && (
                <div className="text-center py-12">
                  <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No medicines found</p>
                  <p className="text-sm text-gray-400">Try adjusting your filters or add a new medicine</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add Medicine Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Add New Medicine</h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <form onSubmit={handleAddMedicine} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Medicine Name *</label>
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Medicine ID *</label>
                    <input
                      type="text"
                      name="medicine_id"
                      value={formData.medicine_id}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <select
                      name="category_id"
                      value={formData.category_id}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select Category</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="discontinued">Discontinued</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price *</label>
                    <input
                      type="number"
                      name="unit_price"
                      value={formData.unit_price}
                      onChange={handleInputChange}
                      required
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cost Price *</label>
                    <input
                      type="number"
                      name="cost_price"
                      value={formData.cost_price}
                      onChange={handleInputChange}
                      required
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Stock Quantity *</label>
                    <input
                      type="number"
                      name="stock_quantity"
                      value={formData.stock_quantity}
                      onChange={handleInputChange}
                      required
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Reorder Level</label>
                    <input
                      type="number"
                      name="reorder_level"
                      value={formData.reorder_level}
                      onChange={handleInputChange}
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Manufacturer / Supplier</label>
                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="Search suppliers..."
                        value={supplierSearch}
                        onChange={(e) => setSupplierSearch(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <select
                        name="manufacturer"
                        value={formData.manufacturer}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select supplier</option>
                        {filteredSuppliers.map((supplier) => (
                          <option key={supplier.id} value={supplier.name}>
                            {supplier.name}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500">Select from existing suppliers to keep inventory linked.</p>
                    </div>
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-black"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Add Medicine
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Medicine Modal */}
      {showEditModal && selectedMedicine && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Edit Medicine</h3>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <form onSubmit={handleEditMedicine} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Medicine Name</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Medicine ID</label>
                    <input
                      type="text"
                      name="medicine_id"
                      value={formData.medicine_id}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <select
                      name="category_id"
                      value={formData.category_id}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select Category</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="discontinued">Discontinued</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price</label>
                    <input
                      type="number"
                      name="unit_price"
                      value={formData.unit_price}
                      onChange={handleInputChange}
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cost Price</label>
                    <input
                      type="number"
                      name="cost_price"
                      value={formData.cost_price}
                      onChange={handleInputChange}
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Stock Quantity</label>
                    <input
                      type="number"
                      name="stock_quantity"
                      value={formData.stock_quantity}
                      onChange={handleInputChange}
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Reorder Level</label>
                    <input
                      type="number"
                      name="reorder_level"
                      value={formData.reorder_level}
                      onChange={handleInputChange}
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Manufacturer / Supplier</label>
                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="Search suppliers..."
                        value={supplierSearch}
                        onChange={(e) => setSupplierSearch(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <select
                        name="manufacturer"
                        value={formData.manufacturer}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select supplier</option>
                        {filteredSuppliers.map((supplier) => (
                          <option key={supplier.id} value={supplier.name}>
                            {supplier.name}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500">Select from existing suppliers to keep inventory linked.</p>
                    </div>
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-black"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
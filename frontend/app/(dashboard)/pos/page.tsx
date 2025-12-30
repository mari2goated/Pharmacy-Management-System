// TASK FOR COPILOT:
// Implement receipt printing functionality.
// Create a printable receipt section using existing POS data.
// Wire the "Print Receipt" button to window.print().
// Print only the receipt content using print-specific CSS.
// Do not change backend or POS logic.

// Create a new file with all fixes or replace your existing pos/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { posAPI } from '@/lib/api';
import { Search, Plus, Minus, Trash2, ShoppingCart, CreditCard, Smartphone, Wallet, Printer, User } from 'lucide-react';
import { Medicine, SaleItem } from '@/types';

interface CartItem extends SaleItem {
  medicine: Medicine;
  unit_price: number;
  total_price: number;
}

const PAYMENT_METHODS = [
  { id: 'cash', name: 'Cash', icon: Wallet },
  { id: 'card', name: 'Card', icon: CreditCard },
  { id: 'mobile', name: 'Mobile', icon: Smartphone },
];

const TAX_PERCENTAGE = 18;

export default function POSPage() {
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerId, setCustomerId] = useState<string>('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerSearchResults, setCustomerSearchResults] = useState<any[]>([]);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [discount, setDiscount] = useState(0);
  const tax = TAX_PERCENTAGE;
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [receiptNumber, setReceiptNumber] = useState('');

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + item.total_price, 0);
  const discountAmount = (subtotal * discount) / 100;
  const taxAmount = (subtotal * tax) / 100;
  const grandTotal = subtotal - discountAmount + taxAmount;

  // Search medicines
  const searchMedicines = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      const response = await posAPI.searchMedicine(query);
      setSearchResults(response.data || []);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Search customers
  const searchCustomers = useCallback(async (query: string) => {
    if (query.length < 2) {
      setCustomerSearchResults([]);
      return;
    }

    try {
      const response = await posAPI.searchCustomer(query);
      setCustomerSearchResults(response.data || []);
    } catch (error) {
      console.error('Customer search failed:', error);
      setCustomerSearchResults([]);
    }
  }, []);

  // Handle search input
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      searchMedicines(searchQuery);
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery, searchMedicines]);

  // Handle customer search input
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      searchCustomers(customerSearch);
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [customerSearch, searchCustomers]);

  // Add to cart
  const addToCart = (medicine: Medicine) => {
    const existingItem = cart.find(item => item.medicine_id === medicine.id);
    
    if (existingItem) {
      // Update quantity
      setCart(cart.map(item => 
        item.medicine_id === medicine.id 
          ? {
              ...item,
              quantity: item.quantity + 1,
              total_price: (item.quantity + 1) * item.unit_price * (1 - item.discount_percent / 100)
            }
          : item
      ));
    } else {
      // Add new item
      const newItem: CartItem = {
        medicine_id: medicine.id,
        medicine: medicine,
        quantity: 1,
        unit_price: medicine.unit_price,
        discount_percent: 0,
        total_price: medicine.unit_price
      };
      setCart([...cart, newItem]);
    }
    
    setSearchQuery('');
    setSearchResults([]);
  };

  // Update cart item
  const updateCartItem = (medicineId: number, updates: Partial<CartItem>) => {
    setCart(cart.map(item => {
      if (item.medicine_id === medicineId) {
        const updated = { ...item, ...updates };
        // Recalculate total price if quantity or discount changed
        if (updates.quantity !== undefined || updates.discount_percent !== undefined) {
          updated.total_price = updated.quantity * updated.unit_price * (1 - updated.discount_percent / 100);
        }
        return updated;
      }
      return item;
    }));
  };

  // Remove from cart
  const removeFromCart = (medicineId: number) => {
    setCart(cart.filter(item => item.medicine_id !== medicineId));
  };

  // Clear cart
  const clearCart = () => {
    setCart([]);
    setDiscount(0);
    setCustomerId('');
    setCustomerSearch('');
    setPaymentMethod('cash');
    setSuccess(false);
  };

  // Process sale
  const processSale = async () => {
    if (cart.length === 0) {
      alert('Cart is empty!');
      return;
    }

    setProcessing(true);
    try {
      const saleData = {
        customer_id: customerId ? parseInt(customerId) : null,
        items: cart.map(item => ({
          medicine_id: item.medicine_id,
          quantity: item.quantity,
          discount_percent: item.discount_percent
        })),
        discount_amount: discountAmount,
        tax_amount: taxAmount,
        payment_method: paymentMethod,
        notes: ''
      };

      const response = await posAPI.processSale(saleData);
      setReceiptNumber(response.data.receipt_number);
      setSuccess(true);
      
      // Clear cart after successful sale
      setTimeout(() => {
        clearCart();
      }, 5000);
      
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Sale processing failed');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Point of Sale</h1>
          <p className="text-gray-700">Process customer sales and transactions</p>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center">
              <ShoppingCart className="w-5 h-5 text-green-600 mr-2" />
              <p className="text-green-800">
                Sale processed successfully! Receipt: <strong>{receiptNumber}</strong>
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Product Search & Cart */}
          <div className="lg:col-span-2 space-y-6">
            {/* Product Search */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by medicine name, ID, or barcode..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900"
                />
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="mt-4 border border-gray-300 rounded-lg max-h-60 overflow-y-auto bg-white">
                  {searchResults.map((medicine) => (
                    <button
                      key={medicine.id}
                      onClick={() => addToCart(medicine)}
                      className="w-full text-left p-3 hover:bg-gray-50 border-b border-gray-200 last:border-b-0 flex items-center justify-between"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{medicine.name}</p>
                        <p className="text-sm text-gray-700">{medicine.medicine_id}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">{`PKR ${Number(medicine.unit_price).toFixed(2)}`}</p>
                        <p className="text-sm text-gray-700">Stock: {medicine.stock_quantity}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {loading && (
                <div className="mt-4 text-center">
                  <div className="inline-block w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>

            {/* Shopping Cart */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  Shopping Cart ({cart.length} items)
                </h2>
                {cart.length > 0 && (
                  <button
                    onClick={clearCart}
                    className="text-sm text-red-600 hover:text-red-800 flex items-center"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Clear Cart
                  </button>
                )}
              </div>

              {cart.length === 0 ? (
                <div className="text-center py-8">
                  <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-700">Your cart is empty</p>
                  <p className="text-sm text-gray-600">Search and add medicines to begin</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {cart.map((item) => (
                    <div key={item.medicine_id} className="flex items-center p-4 border border-gray-300 rounded-lg bg-gray-50">
                      <div className="flex-1">
                        <p className="font-medium text-gray-800">{item.medicine.name}</p>
                        <p className="text-sm text-gray-700">{item.medicine.medicine_id}</p>
                        <div className="mt-2 flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => updateCartItem(item.medicine_id, { quantity: Math.max(1, item.quantity - 1) })}
                              className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-100 text-gray-700"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="w-12 text-center font-medium text-gray-900">{item.quantity}</span>
                            <button
                              onClick={() => updateCartItem(item.medicine_id, { quantity: item.quantity + 1 })}
                              className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-100 text-gray-700"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900">{`PKR ${item.total_price.toFixed(2)}`}</p>
                        <p className="text-sm text-gray-700">{`PKR ${item.unit_price.toFixed(2)} × ${item.quantity}`}</p>
                        <button
                          onClick={() => removeFromCart(item.medicine_id)}
                          className="mt-2 text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Payment & Summary */}
          <div className="space-y-6">
            {/* Customer Info */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <User className="w-5 h-5 mr-2" />
                Customer Information
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer (Search by name, phone, or ID)
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
                    <input
                      type="text"
                      value={customerSearch}
                      onChange={(e) => {
                        setCustomerSearch(e.target.value);
                      }}
                      placeholder="Start typing to search customers..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    />
                    
                    {/* Customer dropdown */}
                    {customerSearchResults.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {customerSearchResults.map((customer) => (
                          <button
                            key={customer.id}
                            type="button"
                            onClick={() => {
                              setCustomerId(customer.id.toString());
                              setCustomerSearch(`${customer.name} (${customer.phone})`);
                              setCustomerSearchResults([]);
                            }}
                            className="w-full text-left p-3 hover:bg-gray-50 border-b border-gray-200 last:border-b-0 flex items-center justify-between"
                          >
                            <div>
                              <p className="font-medium text-gray-900">{customer.name}</p>
                              <p className="text-sm text-gray-700">{customer.phone}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium text-gray-900">{customer.customer_id}</p>
                              <p className="text-xs text-gray-700">{customer.loyalty_points} points</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-700">Subtotal</span>
                  <span className="font-medium text-gray-900">{`PKR ${subtotal.toFixed(2)}`}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Discount</span>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={discount}
                      onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                      className="w-20 px-2 py-1 border border-gray-300 rounded text-sm bg-white text-gray-900"
                    />
                    <span className="font-medium text-gray-900">{`PKR ${discountAmount.toFixed(2)}`}</span>
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Tax ({TAX_PERCENTAGE}%)</span>
                  <span className="font-medium text-gray-900">{`PKR ${taxAmount.toFixed(2)}`}</span>
                </div>
                
                <div className="border-t border-gray-300 pt-3">
                  <div className="flex justify-between text-lg font-bold">
                    <span className="text-gray-900">Grand Total</span>
                    <span className="text-gray-900">{`PKR ${grandTotal.toFixed(2)}`}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Method</h3>
              <div className="grid grid-cols-3 gap-2">
                {PAYMENT_METHODS.map((method) => {
                  const Icon = method.icon;
                  return (
                    <button
                      key={method.id}
                      onClick={() => setPaymentMethod(method.id)}
                      className={`p-4 border rounded-lg flex flex-col items-center justify-center ${
                        paymentMethod === method.id
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-300 hover:bg-gray-50 text-gray-800'
                      }`}
                    >
                      <Icon className="w-6 h-6 mb-2" />
                      <span className="text-sm font-medium">{method.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={processSale}
                disabled={processing || cart.length === 0}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {processing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-5 h-5" />
                    <span>Complete Sale (PKR {grandTotal.toFixed(2)})</span>
                  </>
                )}
              </button>

              <button
                onClick={clearCart}
                className="w-full border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium py-3 px-4 rounded-lg transition duration-200 flex items-center justify-center space-x-2"
              >
                <Trash2 className="w-5 h-5" />
                <span>Cancel Transaction</span>
              </button>

              <button
                onClick={() => window.print()}
                className="w-full border border-blue-300 text-blue-700 hover:bg-blue-50 font-medium py-3 px-4 rounded-lg transition duration-200 flex items-center justify-center space-x-2"
              >
                <Printer className="w-5 h-5" />
                <span>Print Receipt</span>
              </button>

              {/* Printable receipt - hidden on screen, visible only during print */}
              <div className="printable" aria-hidden="true">
                <div className="max-w-md mx-auto p-6 bg-white text-black">
                  <h2 className="text-center text-lg font-bold mb-2">Pharmacy Receipt</h2>
                  {receiptNumber && (
                    <p className="text-sm text-gray-700 text-center mb-2">Receipt: <strong>{receiptNumber}</strong></p>
                  )}
                  <p className="text-xs text-gray-700 text-center mb-4">{new Date().toLocaleString()}</p>

                  <table className="w-full text-sm">
                    <thead>
                      <tr>
                        <th className="text-left">Item</th>
                        <th className="text-center">Qty</th>
                        <th className="text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cart.map((item) => (
                        <tr key={item.medicine_id}>
                          <td>{item.medicine.name}</td>
                          <td className="text-center">{item.quantity}</td>
                          <td className="text-right">{`PKR ${item.total_price.toFixed(2)}`}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="mt-4 text-sm">
                    <div className="flex justify-between"><span>Subtotal</span><span>{`PKR ${subtotal.toFixed(2)}`}</span></div>
                    <div className="flex justify-between"><span>Discount</span><span>{`PKR ${discountAmount.toFixed(2)}`}</span></div>
                    <div className="flex justify-between"><span>Tax ({TAX_PERCENTAGE}%)</span><span>{`PKR ${taxAmount.toFixed(2)}`}</span></div>
                    <div className="flex justify-between font-bold mt-2"><span>Grand Total</span><span>{`PKR ${grandTotal.toFixed(2)}`}</span></div>
                  </div>
                </div>
              </div>

              <style>{`@media screen { .printable { display: none; } } @media print { body * { visibility: hidden; } .printable, .printable * { visibility: visible; } .printable { position: absolute; left: 0; top: 0; width: 100%; } }`}</style>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
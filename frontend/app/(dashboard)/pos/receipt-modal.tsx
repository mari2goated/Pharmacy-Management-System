'use client';

import { Printer, X } from 'lucide-react';
import { useRef } from 'react';

interface ReceiptItem {
  medicine: {
    name: string;
    medicine_id: string;
  };
  quantity: number;
  unit_price: number;
  discount_percent: number;
  total_price: number;
}

interface ReceiptModalProps {
  isOpen: boolean;
  receiptNumber: string;
  items: ReceiptItem[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  grandTotal: number;
  paymentMethod: string;
  customerInfo?: {
    name: string;
    phone: string;
    loyalty_points: number;
  };
  cashierName?: string;
  onClose: () => void;
}

export default function ReceiptModal({
  isOpen,
  receiptNumber,
  items,
  subtotal,
  discountAmount,
  taxAmount,
  grandTotal,
  paymentMethod,
  customerInfo,
  cashierName,
  onClose,
}: ReceiptModalProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  // Safe number conversion helper
  const toNumber = (value: any): number => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') return parseFloat(value) || 0;
    return 0;
  };

  // Convert all values to numbers
  const safeSubtotal = toNumber(subtotal);
  const safeDiscountAmount = toNumber(discountAmount);
  const safeTaxAmount = toNumber(taxAmount);
  const safeGrandTotal = toNumber(grandTotal);

  const handlePrint = () => {
    if (receiptRef.current) {
      const printWindow = window.open('', '', 'height=600,width=800');
      if (printWindow) {
        const printContent = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Receipt - ${receiptNumber}</title>
              <style>
                * {
                  margin: 0;
                  padding: 0;
                  box-sizing: border-box;
                }
                
                body {
                  font-family: 'Courier New', monospace;
                  font-size: 12px;
                  background: white;
                  padding: 20px;
                }
                
                .receipt {
                  max-width: 400px;
                  margin: 0 auto;
                  border: 1px solid #000;
                  padding: 20px;
                  background: white;
                }
                
                .receipt-header {
                  text-align: center;
                  border-bottom: 2px dashed #000;
                  padding-bottom: 15px;
                  margin-bottom: 15px;
                }
                
                .receipt-header h1 {
                  font-size: 20px;
                  font-weight: bold;
                  margin-bottom: 5px;
                }
                
                .receipt-header p {
                  font-size: 11px;
                  margin: 3px 0;
                }
                
                .receipt-section {
                  margin-bottom: 15px;
                  border-bottom: 1px dashed #000;
                  padding-bottom: 10px;
                }
                
                .receipt-section:last-of-type {
                  border-bottom: 2px dashed #000;
                }
                
                .customer-info {
                  font-size: 11px;
                  margin-bottom: 15px;
                  padding: 10px;
                  border: 1px solid #000;
                }
                
                .customer-info p {
                  margin: 2px 0;
                }
                
                .items-header {
                  display: grid;
                  grid-template-columns: 2fr 0.8fr 1.2fr;
                  gap: 8px;
                  font-weight: bold;
                  border-bottom: 1px solid #000;
                  padding-bottom: 5px;
                  margin-bottom: 10px;
                  font-size: 10px;
                }
                
                .item-row {
                  display: grid;
                  grid-template-columns: 2fr 0.8fr 1.2fr;
                  gap: 8px;
                  padding: 4px 0;
                  border-bottom: 1px dotted #ccc;
                  font-size: 11px;
                }
                
                .item-name {
                  word-wrap: break-word;
                  word-break: break-word;
                }
                
                .item-qty {
                  text-align: center;
                }
                
                .item-price {
                  text-align: right;
                }
                
                .totals {
                  margin-top: 15px;
                }
                
                .total-row {
                  display: flex;
                  justify-content: space-between;
                  padding: 5px 0;
                  font-size: 11px;
                }
                
                .total-row.grand-total {
                  font-weight: bold;
                  font-size: 13px;
                  border-top: 2px solid #000;
                  border-bottom: 2px solid #000;
                  padding: 10px 0;
                  margin: 10px 0;
                }
                
                .payment-info {
                  margin-top: 15px;
                  padding-top: 10px;
                  border-top: 1px dashed #000;
                  font-size: 11px;
                }
                
                .payment-row {
                  display: flex;
                  justify-content: space-between;
                  margin: 3px 0;
                }
                
                .receipt-footer {
                  text-align: center;
                  margin-top: 15px;
                  padding-top: 15px;
                  border-top: 1px dashed #000;
                  font-size: 10px;
                }
                
                .receipt-footer p {
                  margin: 5px 0;
                }
                
                @media print {
                  body {
                    padding: 0;
                  }
                  
                  .receipt {
                    border: none;
                    max-width: 100%;
                  }
                }
              </style>
            </head>
            <body>
              <div class="receipt">
                ${receiptRef.current.innerHTML}
              </div>
            </body>
          </html>
        `;
        
        printWindow.document.write(printContent);
        printWindow.document.close();
        
        // Wait for content to load then print
        setTimeout(() => {
          printWindow.focus();
          printWindow.print();
          printWindow.close();
        }, 250);
      }
    }
  };

  const paymentMethodLabel = {
    cash: 'Cash',
    card: 'Credit Card',
    mobile: 'Mobile Payment',
  }[paymentMethod] || paymentMethod;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 p-6 sticky top-0 bg-white z-10">
          <h2 className="text-2xl font-bold text-gray-900">Sale Receipt</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Receipt Content */}
        <div ref={receiptRef} className="p-6 bg-white" style={{ fontFamily: 'Courier New, monospace', fontSize: '12px', lineHeight: '1.4', color: '#000' }}>
          {/* Receipt Header */}
          <div style={{ textAlign: 'center', borderBottom: '2px dashed #000', paddingBottom: '15px', marginBottom: '15px' }}>
            <h1 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '5px', margin: '0 0 5px 0' }}>RECEIPT</h1>
            <p style={{ fontSize: '14px', fontWeight: 'bold', margin: '3px 0' }}>Receipt #: {receiptNumber}</p>
            <p style={{ fontSize: '12px', margin: '3px 0' }}>
              {new Date().toLocaleString('en-PK', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true,
              })}
            </p>
          </div>

          {/* Customer Info */}
          {customerInfo && (
            <div style={{ fontSize: '12px', marginBottom: '15px', padding: '10px', border: '1px solid #000', color: '#000' }}>
              <p style={{ fontWeight: 'bold', marginBottom: '5px', color: '#000' }}>CUSTOMER INFORMATION</p>
              <p style={{ margin: '2px 0', color: '#000' }}>
                <span style={{ fontWeight: 'bold' }}>Name:</span> {customerInfo.name}
              </p>
              <p style={{ margin: '2px 0', color: '#000' }}>
                <span style={{ fontWeight: 'bold' }}>Phone:</span> {customerInfo.phone}
              </p>
              <p style={{ margin: '2px 0', color: '#000' }}>
                <span style={{ fontWeight: 'bold' }}>Loyalty Points:</span> {customerInfo.loyalty_points}
              </p>
            </div>
          )}

          {/* Items Table */}
          <div style={{ marginBottom: '15px' }}>
            <div style={{ borderBottom: '1px solid #000', marginBottom: '10px', paddingBottom: '8px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 0.6fr 1.4fr', gap: '8px', fontWeight: 'bold', fontSize: '11px', color: '#000' }}>
                <div>ITEM</div>
                <div style={{ textAlign: 'center' }}>QTY</div>
                <div style={{ textAlign: 'right' }}>PRICE</div>
              </div>
            </div>

            {items.map((item, index) => {
              const itemQty = toNumber(item.quantity);
              const itemPrice = toNumber(item.unit_price);
              const itemDiscount = toNumber(item.discount_percent);
              const itemTotal = toNumber(item.total_price);
              
              return (
              <div key={index} style={{ display: 'grid', gridTemplateColumns: '2fr 0.6fr 1.4fr', gap: '8px', padding: '5px 0', borderBottom: '1px dotted #ccc', fontSize: '12px', color: '#000', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ fontWeight: 'bold', margin: '0', color: '#000' }}>{item.medicine.name}</p>
                  <p style={{ fontSize: '10px', margin: '2px 0', color: '#333' }}>{item.medicine.medicine_id}</p>
                </div>
                <div style={{ textAlign: 'center', color: '#000' }}>{itemQty}</div>
                <div style={{ textAlign: 'right', color: '#000' }}>PKR {itemTotal.toFixed(2)}</div>
              </div>
            );
            })}
          </div>

          {/* Totals Section */}
          <div style={{ marginTop: '15px', borderTop: '1px dashed #000', paddingTop: '10px' }}>
            <div style={{ fontSize: '12px', color: '#000' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', color: '#000' }}>
                <span>Subtotal:</span>
                <span style={{ fontWeight: 'bold' }}>PKR {safeSubtotal.toFixed(2)}</span>
              </div>
              {safeDiscountAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', color: '#000' }}>
                  <span>Discount:</span>
                  <span style={{ fontWeight: 'bold' }}>-PKR {safeDiscountAmount.toFixed(2)}</span>
                </div>
              )}
              {safeTaxAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', color: '#000' }}>
                  <span>Tax (GST):</span>
                  <span style={{ fontWeight: 'bold' }}>PKR {safeTaxAmount.toFixed(2)}</span>
                </div>
              )}
              <div style={{ borderTop: '2px solid #000', borderBottom: '2px solid #000', padding: '10px 0', margin: '10px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 'bold', color: '#000' }}>
                  <span>TOTAL AMOUNT:</span>
                  <span style={{ color: '#000' }}>PKR {safeGrandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Information */}
          <div style={{ marginTop: '15px', paddingTop: '10px', borderTop: '1px dashed #000', fontSize: '12px', color: '#000' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <p style={{ fontWeight: 'bold', fontSize: '11px', marginBottom: '3px', color: '#000' }}>PAYMENT METHOD</p>
                <p style={{ margin: '0', color: '#000' }}>{paymentMethodLabel}</p>
              </div>
              {cashierName && (
                <div>
                  <p style={{ fontWeight: 'bold', fontSize: '11px', marginBottom: '3px', color: '#000' }}>CASHIER</p>
                  <p style={{ margin: '0', color: '#000' }}>{cashierName}</p>
                </div>
              )}
            </div>
          </div>

          {/* Footer Message */}
          <div style={{ textAlign: 'center', marginTop: '15px', paddingTop: '15px', borderTop: '1px dashed #000', fontSize: '11px', color: '#000' }}>
            <p style={{ fontWeight: 'bold', marginBottom: '5px', color: '#000' }}>
              Thank you for your purchase!
            </p>
            <p style={{ margin: '3px 0', color: '#000' }}>
              Please keep this receipt for your records.
            </p>
            <p style={{ margin: '5px 0 0 0', color: '#000' }}>
              For inquiries, please contact us during business hours.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="border-t border-gray-200 p-6 bg-gray-50 sticky bottom-0 flex gap-3">
          <button
            onClick={handlePrint}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 flex items-center justify-center space-x-2"
          >
            <Printer className="w-5 h-5" />
            <span>Print Receipt</span>
          </button>
          <button
            onClick={onClose}
            className="flex-1 border border-gray-300 text-gray-700 hover:bg-gray-100 font-medium py-3 px-4 rounded-lg transition duration-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

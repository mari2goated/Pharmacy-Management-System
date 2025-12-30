// app/(dashboard)/reports/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { reportsAPI } from '@/lib/api';
import { BarChart3, PieChart, TrendingUp, Filter } from 'lucide-react';

type ReportType = 'sales' | 'inventory' | 'financial';

export default function ReportsPage() {
  const [reportType, setReportType] = useState<ReportType>('sales');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [filters, setFilters] = useState({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    groupBy: 'day',
  });

  const generateReport = async () => {
    setLoading(true);
    try {
      let response;
      switch (reportType) {
        case 'sales':
          response = await reportsAPI.generateSalesReport({
            start_date: filters.startDate,
            end_date: filters.endDate,
            group_by: filters.groupBy,
          });
          break;
        case 'inventory':
          response = await reportsAPI.generateInventoryReport({
            low_stock_only: false,
            expiring_soon: true,
          });
          break;
        case 'financial':
          response = await reportsAPI.generateFinancialReport({
            start_date: filters.startDate,
            end_date: filters.endDate,
            include_cogs: true,
            include_profit: true,
            group_by: filters.groupBy,
          });
          break;
      }
      setReportData(response?.data || null);
    } catch (error) {
      const message = (error as any)?.response?.data?.detail || 'Failed to generate report';
      console.error('Failed to generate report:', error);
      alert(message)
    } finally {
      setLoading(false);
    }
  };

  // Auto-generate when filters or report type change
  useEffect(() => {
    generateReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportType, filters.startDate, filters.endDate, filters.groupBy]);

  // Sales chart data: X = transactions, Y = revenue
  const salesChartData = useMemo(() => {
    if (!reportData?.data) return [];
    return reportData.data.map((d: any) => ({
      label: `${d.transaction_count || d.transactions || 0} tx`,
      revenue: d.total_sales ?? d.revenue ?? 0,
    }));
  }, [reportData]);

  // Financial summary bars: revenue / COGS / gross profit
  const financialSummaryBars = useMemo(() => {
    if (!reportData?.revenue_metrics || !reportData?.cost_metrics) return [];
    const revenue = reportData.revenue_metrics.total_revenue || 0;
    const cogs = reportData.cost_metrics.cost_of_goods_sold || 0;
    const gross = reportData.cost_metrics.gross_profit || 0;
    return [
      { label: 'Total Revenue', value: revenue },
      { label: 'Cost of Goods', value: cogs },
      { label: 'Gross Profit', value: gross },
    ];
  }, [reportData]);

  // Simple bar chart for lightweight visualization without extra deps
  const BarChart = ({
    data,
    valueFormatter = (v: number) => v.toFixed(2),
    barColor = 'from-blue-500 to-blue-400',
    maxBars = 30,
  }: {
    data: { label: string; value: number }[];
    valueFormatter?: (v: number) => string;
    barColor?: string;
    maxBars?: number;
  }) => {
    if (!data || data.length === 0) return null;
    const trimmed = data.slice(0, maxBars);
    const max = Math.max(...trimmed.map((d) => d.value || 0), 0.01);

    return (
      <div className="w-full h-80">
        <div className="flex items-end justify-between gap-2 h-full pb-12 px-2">
          {trimmed.map((item, idx) => {
            const heightPct = (item.value / max) * 100;
            return (
              <div key={idx} className="flex flex-col items-center flex-1 h-full justify-end">
                <div className="flex flex-col items-center h-full justify-end w-full">
                  <span className="text-xs font-semibold text-gray-700 mb-2 text-center truncate w-full">
                    {valueFormatter(item.value)}
                  </span>
                  <div
                    className={`w-3/4 bg-gradient-to-t ${barColor} rounded-t-lg shadow-md hover:shadow-lg transition-shadow duration-200`}
                    style={{ 
                      height: `${Math.max(heightPct, 8)}%`,
                      minHeight: '8px'
                    }}
                  title={`${item.label}: ${valueFormatter(item.value)}`}
                  />
                </div>
                <span className="mt-2 text-xs text-gray-500 text-center truncate w-full max-w-[80px]">
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderReport = () => {
    if (!reportData) return null;

    switch (reportType) {
      case 'sales':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="font-medium text-gray-900 mb-4">Sales Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-blue-700">Total Revenue</p>
                  <p className="text-2xl font-bold text-blue-900">
                    PKR {reportData.summary?.total_revenue?.toFixed(2) || '0.00'}
                  </p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-sm text-green-700">Total Transactions</p>
                  <p className="text-2xl font-bold text-green-900">
                    {reportData.summary?.total_transactions || 0}
                  </p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <p className="text-sm text-purple-700">Average Sale</p>
                  <p className="text-2xl font-bold text-purple-900">
                   PKR {reportData.summary?.average_sale?.toFixed(2) || '0.00'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'inventory':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="font-medium text-gray-900 mb-4">Inventory Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-blue-700">Total Items</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {reportData.summary?.total_items || 0}
                  </p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-sm text-green-700">Stock Value</p>
                  <p className="text-2xl font-bold text-green-900">
                    PKR {reportData.summary?.total_stock_value?.toFixed(2) || '0.00'}
                  </p>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4">
                  <p className="text-sm text-yellow-700">Low Stock Items</p>
                  <p className="text-2xl font-bold text-yellow-900">
                    {reportData.items?.filter((item: any) => item.is_low_stock).length || 0}
                  </p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <p className="text-sm text-purple-700">Potential Profit</p>
                  <p className="text-2xl font-bold text-purple-900">
                    PKR {reportData.summary?.potential_profit?.toFixed(2) || '0.00'}
                  </p>
                </div>
              </div>
            </div>

            {reportData.items && reportData.items.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-gray-900">Top Stock Value Items</h3>
                  <p className="text-sm text-gray-500">Top 10 by stock value</p>
                </div>
                <BarChart
                  data={reportData.items
                    .map((item: any) => ({
                      label: item.name,
                      value: item.stock_value || (item.stock_quantity || 0) * (item.unit_price || 0)
                    }))
                    .sort((a: any, b: any) => (b.value || 0) - (a.value || 0))
                    .slice(0, 10)}
                  valueFormatter={(v: number) => `PKR ${(v || 0).toFixed(2)}`}
                  barColor="from-purple-600 to-purple-400"
                />
              </div>
            )}
          </div>
        );

      case 'financial':
        return (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="font-medium text-gray-900 mb-4">Financial Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-blue-700">Total Revenue</p>
                  <p className="text-2xl font-bold text-blue-900">
                    PKR {reportData.revenue_metrics?.total_revenue?.toFixed(2) || '0.00'}
                  </p>
                </div>
                <div className="bg-red-50 rounded-lg p-4">
                  <p className="text-sm text-red-700">Cost of Goods</p>
                  <p className="text-2xl font-bold text-red-900">
                    PKR {reportData.cost_metrics?.cost_of_goods_sold?.toFixed(2) || '0.00'}
                  </p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-sm text-green-700">Gross Profit</p>
                  <p className="text-2xl font-bold text-green-900">
                    PKR {reportData.cost_metrics?.gross_profit?.toFixed(2) || '0.00'}
                  </p>
                </div>
              </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Bar Chart - Revenue vs COGS vs Profit */}
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h3 className="font-medium text-gray-900 mb-4">Revenue Breakdown</h3>
                <BarChart 
                  data={financialSummaryBars}
                  valueFormatter={(v) => `PKR ${(v / 1000).toFixed(1)}k`}
                  barColor="from-blue-500 to-blue-400"
                />
              </div>

              {/* Pie Chart - Cost Distribution */}
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h3 className="font-medium text-gray-900 mb-4">Cost Distribution</h3>
                {reportData.cost_metrics?.cost_of_goods_sold && reportData.cost_metrics?.gross_profit && (
                  <div className="flex flex-col items-center justify-center py-8">
                    <div className="relative w-48 h-48">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                        {/* COGS Slice */}
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          fill="none"
                          stroke="#ef4444"
                          strokeWidth="20"
                          strokeDasharray={`${((reportData.cost_metrics.cost_of_goods_sold / (reportData.cost_metrics.cost_of_goods_sold + reportData.cost_metrics.gross_profit)) * 251.3).toFixed(1)} 251.3`}
                        />
                        {/* Profit Slice */}
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          fill="none"
                          stroke="#10b981"
                          strokeWidth="20"
                          strokeDasharray={`${(((reportData.cost_metrics.gross_profit) / (reportData.cost_metrics.cost_of_goods_sold + reportData.cost_metrics.gross_profit)) * 251.3).toFixed(1)} 251.3`}
                          strokeDashoffset={-((reportData.cost_metrics.cost_of_goods_sold / (reportData.cost_metrics.cost_of_goods_sold + reportData.cost_metrics.gross_profit)) * 251.3).toFixed(1)}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <p className="text-sm text-gray-600">Gross Margin</p>
                          <p className="text-2xl font-bold text-green-600">
                            {reportData.cost_metrics?.gross_margin?.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-6 flex gap-6">
                      <div className="text-center">
                        <div className="w-4 h-4 bg-red-500 rounded-full mx-auto mb-2"></div>
                        <p className="text-xs text-gray-600">COGS</p>
                        <p className="text-sm font-semibold">
                          {(((reportData.cost_metrics.cost_of_goods_sold / (reportData.cost_metrics.cost_of_goods_sold + reportData.cost_metrics.gross_profit)) * 100).toFixed(1))}%
                        </p>
                      </div>
                      <div className="text-center">
                        <div className="w-4 h-4 bg-green-500 rounded-full mx-auto mb-2"></div>
                        <p className="text-xs text-gray-600">Profit</p>
                        <p className="text-sm font-semibold">
                          {(((reportData.cost_metrics.gross_profit / (reportData.cost_metrics.cost_of_goods_sold + reportData.cost_metrics.gross_profit)) * 100).toFixed(1))}%
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Daily Revenue Trend */}
            {reportData.daily_breakdown && reportData.daily_breakdown.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h3 className="font-medium text-gray-900 mb-4">Daily Revenue Trend</h3>
                <BarChart 
                  data={reportData.daily_breakdown.map((d: any) => ({
                    label: d.date ? new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A',
                    value: d.revenue || 0,
                  }))}
                  valueFormatter={(v) => `PKR ${(v / 1000).toFixed(0)}k`}
                  barColor="from-purple-500 to-purple-400"
                  maxBars={30}
                />
              </div>
            )}

            {/* Gross Margin Progress removed per request */}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
              <p className="text-gray-700">Visualize insights across sales, inventory, and finance</p>
            </div>
          </div>
        </div>

        {/* Report Type Selection */}
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <div className="flex flex-wrap gap-4 mb-6">
            <button
              onClick={() => setReportType('sales')}
              className={`px-6 py-3 rounded-lg flex items-center space-x-2 ${
                reportType === 'sales'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <BarChart3 className="w-5 h-5" />
              <span>Sales Report</span>
            </button>
            
            
            <button
              onClick={() => setReportType('financial')}
              className={`px-6 py-3 rounded-lg flex items-center space-x-2 ${
                reportType === 'financial'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <TrendingUp className="w-5 h-5" />
              <span>Financial Report</span>
            </button>
          </div>

          {/* Filters */}
          <div className="border-t pt-6">
            <div className="flex items-center mb-4">
              <Filter className="w-5 h-5 text-gray-500 mr-2" />
              <h3 className="font-medium text-gray-900">Report Filters</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              {(reportType === 'sales' || reportType === 'financial') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Group By</label>
                  <select
                    value={filters.groupBy}
                    onChange={(e) => setFilters({...filters, groupBy: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="day">Daily</option>
                    <option value="week">Weekly</option>
                    <option value="month">Monthly</option>
                  </select>
                </div>
              )}
            </div>
            
          </div>
        </div>

        {/* Report Display */}
        <div>
          {loading ? (
            <div className="text-center py-12 bg-white rounded-xl shadow-sm border">
              <div className="inline-block w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-2 text-gray-700">Generating report...</p>
            </div>
          ) : reportData ? (
            renderReport()
          ) : (
            <div className="text-center py-12 bg-white rounded-xl shadow-sm border">
              <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-700">No report generated yet</p>
              <p className="text-sm text-gray-600">Select filters and click "Generate Report"</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
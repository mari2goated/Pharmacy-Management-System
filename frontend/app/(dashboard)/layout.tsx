// app/(dashboard)/layout.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import {
  LayoutDashboard,
  ShoppingCart,
  ClipboardList,
  Users,
  Package,
  Truck,
  History,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  User,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'cashier'] },
  { name: 'Point of Sale', href: '/pos', icon: ShoppingCart, roles: ['admin', 'cashier'] },
  { name: 'Customers', href: '/customers', icon: Users, roles: ['admin', 'cashier'] },
  { name: 'Inventory', href: '/inventory', icon: Package, roles: ['admin'] },
  { name: 'Suppliers', href: '/suppliers', icon: Truck, roles: ['admin'] },
  { name: 'Purchases', href: '/purchases', icon: Package, roles: ['admin'] },
  { name: 'Sales History', href: '/sales', icon: History, roles: ['admin', 'cashier'] },
  { name: 'Reports', href: '/reports', icon: BarChart3, roles: ['admin'] },
];

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, isAdmin } = useAuth();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (!user) {
    return null;
  }

  const filteredNavigation = navigation.filter(item => 
    item.roles.includes(user.role)
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-xl">
          <div className="flex items-center justify-between h-16 px-4 border-b">
            <span className="text-xl font-bold text-blue-600">Novartis PMS</span>
            <button onClick={() => setSidebarOpen(false)}>
              <X className="w-6 h-6" />
            </button>
          </div>
          <nav className="mt-4 px-2 space-y-1">
            {filteredNavigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="mr-3 w-5 h-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Static sidebar for desktop */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-1 bg-white border-r">
          <div className="flex items-center h-16 px-4 border-b">
            <span className="text-xl font-bold text-blue-600">Novartis PMS</span>
          </div>
          <nav className="flex-1 px-2 pt-4 space-y-1">
            {filteredNavigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <item.icon className="mr-3 w-5 h-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
          
          {/* User profile */}
          <div className="p-4 border-t">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">{user.full_name}</p>
                <p className="text-xs text-gray-500 capitalize">{user.role}</p>
              </div>
              <button
                onClick={handleLogout}
                className="ml-auto p-2 text-gray-500 hover:text-red-600"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        <div className="sticky top-0 z-40 bg-white border-b lg:static">
          <div className="flex items-center h-16 px-4">
            <button
              type="button"
              className="lg:hidden p-2"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex-1">
              <h1 className="text-xl font-semibold text-gray-900">
                {filteredNavigation.find(item => pathname === item.href)?.name || 'Dashboard'}
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="hidden lg:flex items-center">
                <div className="text-right mr-3">
                  <p className="text-sm font-medium text-gray-900">{user.full_name}</p>
                  <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                </div>
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-blue-600" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <main className="p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
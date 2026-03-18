"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  LayoutDashboard, Users, FileText, CheckSquare, Calendar,
  Receipt, Menu, X, ChevronRight, LogOut, BarChart3, Bot
} from "lucide-react";

const allNavigation = [
  { name: "Tableau de bord", href: "/dashboard", icon: LayoutDashboard, roles: ["accountant", "payroll_manager", "firm_admin"] },
  { name: "Portail Client", href: "/portal", icon: Users, roles: ["client_admin", "client_hr", "client_readonly"] },
  { name: "Clients", href: "/clients", icon: Users, roles: ["accountant", "payroll_manager", "firm_admin"] },
  { name: "CRM", href: "/crm", icon: Users, roles: ["firm_admin"] },
  { name: "Documents", href: "/documents", icon: FileText, roles: ["accountant", "payroll_manager", "firm_admin", "client_admin", "client_hr", "client_readonly"] },
  { name: "Tâches", href: "/tasks", icon: CheckSquare, roles: ["accountant", "payroll_manager", "firm_admin", "client_admin"] },
  { name: "Échéances", href: "/deadlines", icon: Calendar, roles: ["accountant", "payroll_manager", "firm_admin", "client_admin"] },
  { name: "Factures", href: "/invoices", icon: Receipt, roles: ["accountant", "firm_admin", "client_admin"] },
  { name: "Analytics IA", href: "/analytics", icon: BarChart3, roles: ["accountant", "firm_admin"] },
  { name: "Automatisation", href: "/automation", icon: Bot, roles: ["firm_admin"] },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut, isLoading } = useAuth();

  const role = user?.role || "firm_admin";

  const navigation = allNavigation.filter(
    (item) => item.roles.includes("all") || item.roles.includes(role)
  );

  const handleLogout = async () => {
    await signOut();
    router.push("/login");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
        <div className="animate-pulse text-gray-400">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-[#0e0e16] border-b border-gray-800 px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 rounded-xl hover:bg-gray-800 transition-colors"
        >
          <Menu className="w-5 h-5 text-gray-300" />
        </button>
        <img
          src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69526909c9abd3fd3f363e37/2bf5526b2_Sygma-Conseils-logo-320-1.png"
          alt="SYGMA Conseils"
          className="h-6 w-auto"
        />
        <div className="w-9" />
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-72 bg-[#0e0e16] border-r border-gray-800 z-50 transform transition-transform duration-300 ease-out lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-gray-800">
            <div className="flex items-center justify-between">
              <img
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69526909c9abd3fd3f363e37/2bf5526b2_Sygma-Conseils-logo-320-1.png"
                alt="SYGMA Conseils"
                className="h-8 w-auto"
              />
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-800"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                    isActive
                      ? "bg-[#1a1a2e] text-white border-l-2 border-purple-500"
                      : "text-gray-300 hover:bg-gray-800/50"
                  }`}
                >
                  <item.icon
                    className={`w-5 h-5 ${
                      isActive ? "text-white" : "text-gray-400 group-hover:text-indigo-400"
                    }`}
                  />
                  <span className="font-medium">{item.name}</span>
                  {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-gray-800">
            {user && (
              <div className="px-4 py-2 mb-2">
                <p className="text-sm text-white font-medium truncate">{user.full_name}</p>
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-gray-300 hover:bg-red-900/20 hover:text-red-400 transition-all"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Deconnexion</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-72 min-h-screen pt-16 lg:pt-0">
        <div className="p-4 lg:p-8">{children}</div>
      </main>
    </div>
  );
}

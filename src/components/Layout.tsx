import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Package, Building2, ArrowRightLeft,
  FileBarChart2, Warehouse, ClipboardList, LogOut, Menu, X, ChevronRight, PackagePlus
} from 'lucide-react';
import { useStore } from '../store/useStore';

interface NavItem {
  label: string;
  to: string;
  icon: React.ReactNode;
}

const adminNav: NavItem[] = [
  { label: 'Dashboard', to: '/admin', icon: <LayoutDashboard size={20} /> },
  { label: 'Produtos', to: '/admin/produtos', icon: <Package size={20} /> },
  { label: 'Empresas', to: '/admin/empresas', icon: <Building2 size={20} /> },
  { label: 'Distribuições', to: '/admin/distribuicoes', icon: <ArrowRightLeft size={20} /> },
  { label: 'Relatórios / NF', to: '/admin/relatorios', icon: <FileBarChart2 size={20} /> },
];

const empresaNav: NavItem[] = [
  { label: 'Meu Estoque', to: '/empresa', icon: <Warehouse size={20} /> },
  { label: 'Entrada de Material', to: '/empresa/entrada', icon: <PackagePlus size={20} /> },
  { label: 'Registrar Uso', to: '/empresa/registrar', icon: <ClipboardList size={20} /> },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const { currentUser, logout } = useStore();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const nav = currentUser?.role === 'admin' ? adminNav : empresaNav;

  return (
    <div className="flex h-screen bg-slate-950 text-white overflow-hidden">
      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed md:static inset-y-0 left-0 z-30
          w-64 bg-slate-900 border-r border-slate-800 flex flex-col
          transition-transform duration-300
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* Logo */}
        <div className="p-5 border-b border-slate-800 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
            <Package size={18} />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-white text-sm leading-tight">Controle de</p>
            <p className="font-bold text-blue-400 text-sm leading-tight">Estoque</p>
          </div>
          <button
            className="ml-auto md:hidden text-slate-400 hover:text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        {/* User info */}
        <div className="px-4 py-3 border-b border-slate-800">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Logado como</p>
          <p className="text-sm font-semibold text-white truncate">{currentUser?.nome}</p>
          <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block ${
            currentUser?.role === 'admin'
              ? 'bg-blue-900/60 text-blue-300'
              : 'bg-emerald-900/60 text-emerald-300'
          }`}>
            {currentUser?.role === 'admin' ? 'Administrador' : 'Empresa'}
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {nav.map((item) => {
            const active = location.pathname === item.to ||
              (item.to !== '/admin' && item.to !== '/empresa' && location.pathname.startsWith(item.to));
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                  transition-all duration-150 group
                  ${active
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }
                `}
              >
                <span className={active ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}>
                  {item.icon}
                </span>
                {item.label}
                {active && <ChevronRight size={14} className="ml-auto" />}
              </Link>
            );
          })}
        </nav>

        {/* Logout + versão */}
        <div className="p-3 border-t border-slate-800 space-y-2">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-950/40 transition-all"
          >
            <LogOut size={20} />
            Sair
          </button>
          <p className="text-center text-slate-700 text-xs select-none">
            v{__APP_VERSION__}
          </p>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar mobile */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-slate-900 border-b border-slate-800">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-slate-400 hover:text-white"
          >
            <Menu size={22} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
              <Package size={14} />
            </div>
            <span className="font-bold text-sm">Controle de Estoque</span>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

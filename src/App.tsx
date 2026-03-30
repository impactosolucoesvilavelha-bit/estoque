import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Package } from 'lucide-react';
import { useStore } from './store/useStore';
import { Login } from './pages/Login';
import { DefinirSenha } from './pages/DefinirSenha';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/admin/Dashboard';
import { Produtos } from './pages/admin/Produtos';
import { Empresas } from './pages/admin/Empresas';
import { EmpresaDetalhe } from './pages/admin/EmpresaDetalhe';
import { Distribuicoes } from './pages/admin/Distribuicoes';
import { Relatorios } from './pages/admin/Relatorios';
import { MeuEstoque } from './pages/empresa/MeuEstoque';
import { Entrada } from './pages/empresa/Entrada';
import { RegistrarUso } from './pages/empresa/RegistrarUso';
import { Historico } from './pages/empresa/Historico';

function ProtectedRoute({ children, role }: { children: React.ReactNode; role?: 'admin' | 'empresa' }) {
  const { currentUser } = useStore();
  if (!currentUser) return <Navigate to="/login" replace />;
  if (role && currentUser.role !== role) {
    return <Navigate to={currentUser.role === 'admin' ? '/admin' : '/empresa'} replace />;
  }
  return <Layout>{children}</Layout>;
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center animate-pulse">
          <Package size={28} />
        </div>
        <p className="text-slate-400 text-sm">Conectando...</p>
      </div>
    </div>
  );
}

export default function App() {
  const { currentUser, authReady, aguardandoSenha, initAuth } = useStore();

  useEffect(() => {
    const unsubscribe = initAuth();
    return unsubscribe;
  }, []);

  if (!authReady) return <LoadingScreen />;
  if (aguardandoSenha) return <DefinirSenha />;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={currentUser ? <Navigate to={currentUser.role === 'admin' ? '/admin' : '/empresa'} replace /> : <Login />} />

        {/* Admin */}
        <Route path="/admin" element={<ProtectedRoute role="admin"><Dashboard /></ProtectedRoute>} />
        <Route path="/admin/produtos" element={<ProtectedRoute role="admin"><Produtos /></ProtectedRoute>} />
        <Route path="/admin/empresas" element={<ProtectedRoute role="admin"><Empresas /></ProtectedRoute>} />
        <Route path="/admin/empresas/:id" element={<ProtectedRoute role="admin"><EmpresaDetalhe /></ProtectedRoute>} />
        <Route path="/admin/distribuicoes" element={<ProtectedRoute role="admin"><Distribuicoes /></ProtectedRoute>} />
        <Route path="/admin/relatorios" element={<ProtectedRoute role="admin"><Relatorios /></ProtectedRoute>} />

        {/* Empresa */}
        <Route path="/empresa" element={<ProtectedRoute role="empresa"><MeuEstoque /></ProtectedRoute>} />
        <Route path="/empresa/entrada" element={<ProtectedRoute role="empresa"><Entrada /></ProtectedRoute>} />
        <Route path="/empresa/registrar" element={<ProtectedRoute role="empresa"><RegistrarUso /></ProtectedRoute>} />
        <Route path="/empresa/historico" element={<ProtectedRoute role="empresa"><Historico /></ProtectedRoute>} />

        {/* Default */}
        <Route path="*" element={
          currentUser
            ? <Navigate to={currentUser.role === 'admin' ? '/admin' : '/empresa'} replace />
            : <Navigate to="/login" replace />
        } />
      </Routes>
    </BrowserRouter>
  );
}

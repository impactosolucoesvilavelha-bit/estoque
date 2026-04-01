import { useState } from 'react';
import { Package, Lock, User, AlertCircle } from 'lucide-react';
import { useStore } from '../store/useStore';

export function Login() {
  const { login } = useStore();
  const [nome, setNome] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const ok = await login(nome.trim(), senha);
      if (!ok) setError('Nome ou senha incorretos.');
    } catch {
      setError('Erro ao conectar. Verifique sua internet.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-900/50">
            <Package size={32} />
          </div>
          <h1 className="text-2xl font-bold text-white">Controle de Estoque</h1>
          <p className="text-slate-400 text-sm mt-1">Entre com suas credenciais para continuar</p>
        </div>

        {/* Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Nome</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Seu nome de usuário"
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Senha</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="Sua senha"
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-950/50 border border-red-800/50 rounded-xl">
                <AlertCircle size={16} className="text-red-400 flex-shrink-0" />
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-xl transition-all duration-200 shadow-lg shadow-blue-900/40 text-sm"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-slate-800 space-y-1">
            <p className="text-xs text-slate-600 text-center">
              <span className="text-slate-500">Empresa:</span> use o <strong className="text-slate-400">mesmo nome</strong> cadastrado no admin (acentos e espaços são ignorados na busca).
            </p>
            <p className="text-xs text-slate-600 text-center">
              <span className="text-slate-500">Senha inicial:</span> os <strong className="text-slate-400">8 primeiros dígitos do CNPJ</strong> (só números). Se o CNPJ tiver menos de 6 dígitos, use <strong className="text-slate-400">empresa123</strong>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { KeyRound, Eye, EyeOff, CheckCircle, AlertCircle, Package } from 'lucide-react';
import { useStore } from '../store/useStore';

export function DefinirSenha() {
  const { nomeAguardando, definirSenha, logout } = useStore();
  const [senha, setSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarConfirmar, setMostrarConfirmar] = useState(false);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  const validar = () => {
    if (senha.length < 6) return 'A senha deve ter no mínimo 6 caracteres.';
    if (senha !== confirmar) return 'As senhas não coincidem.';
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const erroValidacao = validar();
    if (erroValidacao) { setErro(erroValidacao); return; }
    setErro('');
    setCarregando(true);
    const ok = await definirSenha(senha);
    if (!ok) {
      setErro('Não foi possível definir a senha. Tente novamente.');
    }
    setCarregando(false);
  };

  const forca = (() => {
    if (senha.length === 0) return null;
    if (senha.length < 6) return { label: 'Muito curta', cor: 'bg-red-500', largura: 'w-1/4' };
    if (senha.length < 8) return { label: 'Fraca', cor: 'bg-orange-400', largura: 'w-2/4' };
    if (senha.length < 12) return { label: 'Boa', cor: 'bg-yellow-400', largura: 'w-3/4' };
    return { label: 'Forte', cor: 'bg-green-500', largura: 'w-full' };
  })();

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center mb-4">
            <Package size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Controle de Estoque</h1>
        </div>

        {/* Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <KeyRound size={20} className="text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Primeiro acesso</h2>
              <p className="text-sm text-slate-400">Bem-vindo(a), <span className="text-blue-400 font-medium">{nomeAguardando}</span></p>
            </div>
          </div>

          <p className="text-slate-400 text-sm mt-4 mb-6">
            Para continuar, escolha uma senha de sua preferência. Você usará ela em todos os próximos acessos.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nova senha */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Nova senha
              </label>
              <div className="relative">
                <input
                  type={mostrarSenha ? 'text' : 'password'}
                  value={senha}
                  onChange={(e) => { setSenha(e.target.value); setErro(''); }}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 pr-12 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
                >
                  {mostrarSenha ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {/* Indicador de força */}
              {forca && (
                <div className="mt-2 space-y-1">
                  <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-300 ${forca.cor} ${forca.largura}`} />
                  </div>
                  <p className="text-xs text-slate-500">{forca.label}</p>
                </div>
              )}
            </div>

            {/* Confirmar senha */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Confirmar senha
              </label>
              <div className="relative">
                <input
                  type={mostrarConfirmar ? 'text' : 'password'}
                  value={confirmar}
                  onChange={(e) => { setConfirmar(e.target.value); setErro(''); }}
                  placeholder="Repita a senha"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 pr-12 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setMostrarConfirmar((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
                >
                  {mostrarConfirmar ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {/* Indicador de match */}
              {confirmar.length > 0 && (
                <div className={`flex items-center gap-1.5 mt-1.5 text-xs ${senha === confirmar ? 'text-green-400' : 'text-red-400'}`}>
                  {senha === confirmar
                    ? <><CheckCircle size={12} /> Senhas coincidem</>
                    : <><AlertCircle size={12} /> Senhas não coincidem</>
                  }
                </div>
              )}
            </div>

            {/* Erro */}
            {erro && (
              <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                <AlertCircle size={16} className="shrink-0" />
                {erro}
              </div>
            )}

            {/* Botão */}
            <button
              type="submit"
              disabled={carregando || senha.length < 6 || senha !== confirmar}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2"
            >
              {carregando ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <KeyRound size={18} />
                  Definir senha e entrar
                </>
              )}
            </button>
          </form>
        </div>

        <button
          onClick={() => logout()}
          className="w-full mt-4 text-sm text-slate-500 hover:text-slate-400 transition py-2"
        >
          Voltar para o login
        </button>
      </div>
    </div>
  );
}

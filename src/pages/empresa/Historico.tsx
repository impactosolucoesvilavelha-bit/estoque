import { useMemo, useState } from 'react';
import { FileBarChart2, Search, Church, Hash, Package } from 'lucide-react';
import { useStore } from '../../store/useStore';

export function Historico() {
  const { currentUser, empresas, usos } = useStore();
  const [search, setSearch] = useState('');

  const empresa = useMemo(
    () => empresas.find((e) => e.id === currentUser?.empresaId),
    [empresas, currentUser]
  );

  /* Agrupa por numeroPedido para exibir todos materiais juntos */
  const pedidosAgrupados = useMemo(() => {
    if (!empresa) return [];

    const filtered = usos.filter((u) => {
      if (u.empresaId !== empresa.id) return false;
      if (!search) return true;
      const s = search.toLowerCase();
      return (
        u.igreja.toLowerCase().includes(s) ||
        u.numeroPedido.toLowerCase().includes(s) ||
        u.produtoNome.toLowerCase().includes(s)
      );
    });

    const map: Record<string, {
      numeroPedido: string;
      igreja: string;
      data: string;
      itens: { produtoNome: string; quantidade: number; observacao?: string }[];
    }> = {};

    filtered.forEach((u) => {
      const key = `${u.numeroPedido}__${u.empresaId}`;
      if (!map[key]) {
        map[key] = { numeroPedido: u.numeroPedido, igreja: u.igreja, data: u.data, itens: [] };
      }
      if (u.data > map[key].data) map[key].data = u.data;
      map[key].itens.push({ produtoNome: u.produtoNome, quantidade: u.quantidade, observacao: u.observacao });
    });

    return Object.values(map).sort((a, b) => b.data.localeCompare(a.data));
  }, [empresa, usos, search]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">Histórico de Uso</h1>
        <p className="text-slate-400 text-sm mt-0.5">Atendimentos registrados por pedido</p>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por igreja, pedido ou material..."
          className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {pedidosAgrupados.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <FileBarChart2 size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhum registro encontrado.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pedidosAgrupados.map((pedido) => (
            <div key={pedido.numeroPedido} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              {/* Cabeçalho do pedido */}
              <div className="px-5 py-4 flex items-start justify-between gap-3 border-b border-slate-800 bg-slate-800/30">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Church size={15} className="text-blue-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-white font-bold truncate">{pedido.igreja}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Hash size={12} className="text-violet-400 flex-shrink-0" />
                      <p className="text-violet-400 font-mono text-xs font-semibold">{pedido.numeroPedido}</p>
                    </div>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-slate-500">{new Date(pedido.data).toLocaleDateString('pt-BR')}</p>
                  <p className="text-xs text-slate-600 mt-0.5">{pedido.itens.length} material(is)</p>
                </div>
              </div>

              {/* Materiais do pedido */}
              <div className="divide-y divide-slate-800/60">
                {pedido.itens.map((item, i) => (
                  <div key={i} className="px-5 py-3 flex items-center gap-3">
                    <div className="w-6 h-6 rounded-md bg-emerald-600/20 flex items-center justify-center flex-shrink-0">
                      <Package size={13} className="text-emerald-400" />
                    </div>
                    <p className="text-slate-300 text-sm flex-1 truncate">{item.produtoNome}</p>
                    {item.observacao && (
                      <p className="text-slate-600 text-xs truncate max-w-32 hidden sm:block">{item.observacao}</p>
                    )}
                    <p className="text-amber-400 font-bold text-sm flex-shrink-0 ml-auto">{item.quantidade}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import { useMemo } from 'react';
import { Warehouse, Package, AlertTriangle } from 'lucide-react';
import { useStore } from '../../store/useStore';
import type { MiniEstoque } from '../../types';

export function MeuEstoque() {
  const { currentUser, empresas, distribuicoes, usos, produtos } = useStore();

  const empresa = useMemo(
    () => empresas.find((e) => e.id === currentUser?.empresaId),
    [empresas, currentUser]
  );

  const miniEstoque = useMemo((): MiniEstoque[] => {
    if (!empresa) return [];

    const map: Record<string, MiniEstoque> = {};

    distribuicoes
      .filter((d) => d.empresaId === empresa.id)
      .forEach((d) => {
        if (!map[d.produtoId]) {
          const prod = produtos.find((p) => p.id === d.produtoId);
          map[d.produtoId] = {
            empresaId: empresa.id,
            produtoId: d.produtoId,
            produtoNome: d.produtoNome,
            unidade: prod?.unidade || 'un',
            quantidadeRecebida: 0,
            quantidadeUsada: 0,
            quantidadeDisponivel: 0,
          };
        }
        map[d.produtoId].quantidadeRecebida += d.quantidade;
      });

    usos
      .filter((u) => u.empresaId === empresa.id)
      .forEach((u) => {
        if (map[u.produtoId]) {
          map[u.produtoId].quantidadeUsada += u.quantidade;
        }
      });

    return Object.values(map).map((item) => ({
      ...item,
      quantidadeDisponivel: item.quantidadeRecebida - item.quantidadeUsada,
    }));
  }, [empresa, distribuicoes, usos, produtos]);

  const totalDisponivel = useMemo(
    () => miniEstoque.reduce((a, m) => a + m.quantidadeDisponivel, 0),
    [miniEstoque]
  );

  if (!empresa) {
    if (currentUser?.empresaId && empresas.length === 0) {
      return (
        <div className="flex items-center justify-center py-32">
          <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
        </div>
      );
    }
    return (
      <div className="text-center py-20 text-slate-500">
        <AlertTriangle size={40} className="mx-auto mb-3 opacity-40" />
        <p className="text-sm">Empresa não encontrada no sistema.</p>
        <p className="text-xs mt-1 text-slate-600">Entre em contato com o administrador.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Meu Estoque</h1>
        <p className="text-slate-400 text-sm mt-0.5">{empresa.nome}</p>
      </div>

      <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-2xl px-5 py-4">
        <div className="w-10 h-10 rounded-xl bg-emerald-600/20 flex items-center justify-center flex-shrink-0">
          <Warehouse size={20} className="text-emerald-400" />
        </div>
        <div>
          <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Total disponível</p>
          <p className="text-2xl font-bold text-emerald-400">{totalDisponivel}</p>
        </div>
        <p className="ml-auto text-slate-600 text-sm">{miniEstoque.length} {miniEstoque.length === 1 ? 'tipo de material' : 'tipos de material'}</p>
      </div>

      {miniEstoque.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <Warehouse size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhum material recebido ainda.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-slate-400">Materiais</p>
          {miniEstoque.map((item) => {
            const baixo = item.quantidadeDisponivel < 5;
            return (
              <div key={item.produtoId} className="bg-slate-900 border border-slate-800 rounded-2xl px-5 py-4 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${baixo ? 'bg-amber-600/20' : 'bg-emerald-600/20'}`}>
                  <Package size={18} className={baixo ? 'text-amber-400' : 'text-emerald-400'} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold truncate">{item.produtoNome}</p>
                  <p className="text-slate-500 text-xs mt-0.5">{item.unidade}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`text-2xl font-bold ${baixo ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {item.quantidadeDisponivel}
                  </p>
                  {baixo && (
                    <div className="flex items-center justify-end gap-1 mt-0.5">
                      <AlertTriangle size={11} className="text-amber-500" />
                      <p className="text-amber-500 text-xs">estoque baixo</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

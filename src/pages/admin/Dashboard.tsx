import { useMemo } from 'react';
import { Package, Building2, ArrowRightLeft, ClipboardList, TrendingDown, AlertTriangle } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { StatCard } from '../../components/StatCard';

export function Dashboard() {
  const { produtos, empresas, distribuicoes, usos } = useStore();

  const stats = useMemo(() => {
    const totalDistribuido = distribuicoes.reduce((acc, d) => acc + d.quantidade, 0);
    const totalUsado = usos.reduce((acc, u) => acc + u.quantidade, 0);
    const produtosBaixos = produtos.filter((p) => p.estoqueTotal < 10).length;
    return { totalDistribuido, totalUsado, produtosBaixos };
  }, [produtos, empresas, distribuicoes, usos]);

  const recentUsos = useMemo(() => [...usos].sort((a, b) => b.data.localeCompare(a.data)).slice(0, 5), [usos]);
  const recentDists = useMemo(() => [...distribuicoes].sort((a, b) => b.data.localeCompare(a.data)).slice(0, 5), [distribuicoes]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">Visão geral do estoque</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Produtos"
          value={produtos.length}
          icon={<Package size={22} />}
          color="blue"
          subtitle="cadastrados"
        />
        <StatCard
          title="Empresas"
          value={empresas.length}
          icon={<Building2 size={22} />}
          color="emerald"
          subtitle="clientes"
        />
        <StatCard
          title="Distribuições"
          value={stats.totalDistribuido}
          icon={<ArrowRightLeft size={22} />}
          color="violet"
          subtitle="unidades enviadas"
        />
        <StatCard
          title="Uso Registrado"
          value={stats.totalUsado}
          icon={<ClipboardList size={22} />}
          color="amber"
          subtitle="unidades usadas"
        />
      </div>

      {stats.produtosBaixos > 0 && (
        <div className="flex items-center gap-3 p-4 bg-amber-950/40 border border-amber-800/40 rounded-2xl">
          <AlertTriangle size={20} className="text-amber-400 flex-shrink-0" />
          <p className="text-amber-300 text-sm">
            <strong>{stats.produtosBaixos} produto(s)</strong> com estoque abaixo de 10 unidades.
          </p>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Últimas distribuições */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingDown size={18} className="text-violet-400" />
            <h2 className="font-semibold text-white text-sm">Últimas Distribuições</h2>
          </div>
          {recentDists.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-4">Nenhuma distribuição ainda.</p>
          ) : (
            <div className="space-y-2">
              {recentDists.map((d) => (
                <div key={d.id} className="flex items-start justify-between py-2 border-b border-slate-800 last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm text-white font-medium truncate">{d.produtoNome}</p>
                    <p className="text-xs text-slate-500 truncate">{d.empresaNome}</p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-3">
                    <p className="text-sm font-semibold text-violet-400">{d.quantidade}</p>
                    <p className="text-xs text-slate-600">{new Date(d.data).toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Últimos usos */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <ClipboardList size={18} className="text-amber-400" />
            <h2 className="font-semibold text-white text-sm">Últimos Usos Registrados</h2>
          </div>
          {recentUsos.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-4">Nenhum uso registrado ainda.</p>
          ) : (
            <div className="space-y-2">
              {recentUsos.map((u) => (
                <div key={u.id} className="flex items-start justify-between py-2 border-b border-slate-800 last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm text-white font-medium truncate">{u.produtoNome}</p>
                    <p className="text-xs text-slate-500 truncate">{u.empresaNome} → <span className="text-slate-400">{u.igreja}</span></p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-3">
                    <p className="text-sm font-semibold text-amber-400">{u.quantidade}</p>
                    <p className="text-xs text-slate-600">{new Date(u.data).toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Building2, Package, Plus, ArrowRightLeft,
  ClipboardList, AlertTriangle, TrendingDown, Warehouse
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Modal } from '../../components/Modal';
import { StatCard } from '../../components/StatCard';

interface DistForm {
  produtoId: string;
  quantidade: number;
  data: string;
  observacao: string;
}

const today = () => new Date().toISOString().slice(0, 10);

export function EmpresaDetalhe() {
  const { id } = useParams<{ id: string }>();
  const { empresas, produtos, distribuicoes, usos, addDistribuicao } = useStore();
  const [modalDist, setModalDist] = useState(false);
  const [distForm, setDistForm] = useState<DistForm>({ produtoId: '', quantidade: 1, data: today(), observacao: '' });

  const empresa = useMemo(() => empresas.find((e) => e.id === id), [empresas, id]);

  const minhasDists = useMemo(
    () => distribuicoes.filter((d) => d.empresaId === id).sort((a, b) => b.data.localeCompare(a.data)),
    [distribuicoes, id]
  );

  const meusUsos = useMemo(
    () => usos.filter((u) => u.empresaId === id).sort((a, b) => b.data.localeCompare(a.data)),
    [usos, id]
  );

  const miniEstoque = useMemo(() => {
    const map: Record<string, { produtoNome: string; unidade: string; recebido: number; usado: number }> = {};
    minhasDists.forEach((d) => {
      if (!map[d.produtoId]) {
        const prod = produtos.find((p) => p.id === d.produtoId);
        map[d.produtoId] = { produtoNome: d.produtoNome, unidade: prod?.unidade || 'un', recebido: 0, usado: 0 };
      }
      map[d.produtoId].recebido += d.quantidade;
    });
    meusUsos.forEach((u) => {
      if (map[u.produtoId]) map[u.produtoId].usado += u.quantidade;
    });
    return Object.entries(map).map(([produtoId, v]) => ({
      produtoId,
      ...v,
      disponivel: v.recebido - v.usado,
    }));
  }, [minhasDists, meusUsos, produtos]);

  const totais = useMemo(() => ({
    recebido: miniEstoque.reduce((a, m) => a + m.recebido, 0),
    usado: miniEstoque.reduce((a, m) => a + m.usado, 0),
    disponivel: miniEstoque.reduce((a, m) => a + m.disponivel, 0),
  }), [miniEstoque]);

  const selectedProduto = produtos.find((p) => p.id === distForm.produtoId);

  const handleDistribuir = () => {
    if (!empresa || !distForm.produtoId || distForm.quantidade <= 0) return;
    const produto = produtos.find((p) => p.id === distForm.produtoId)!;
    addDistribuicao({
      empresaId: empresa.id,
      empresaNome: empresa.nome,
      produtoId: produto.id,
      produtoNome: produto.nome,
      quantidade: distForm.quantidade,
      data: new Date(distForm.data).toISOString(),
      observacao: distForm.observacao,
    });
    setModalDist(false);
    setDistForm({ produtoId: '', quantidade: 1, data: today(), observacao: '' });
  };

  if (!empresa) {
    return (
      <div className="text-center py-20 text-slate-500">
        <AlertTriangle size={40} className="mx-auto mb-3 opacity-40" />
        <p className="text-sm">Empresa não encontrada.</p>
        <Link to="/admin/empresas" className="text-blue-400 text-sm mt-2 inline-flex items-center gap-1 hover:underline">
          <ArrowLeft size={14} /> Voltar
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link
          to="/admin/empresas"
          className="mt-1 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all flex-shrink-0"
        >
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="w-9 h-9 rounded-xl bg-emerald-600/20 flex items-center justify-center flex-shrink-0">
              <Building2 size={18} className="text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white leading-tight">{empresa.nome}</h1>
              <p className="text-slate-500 text-xs">{empresa.cnpj || 'CNPJ não informado'}{empresa.contato ? ` · ${empresa.contato}` : ''}</p>
            </div>
          </div>
        </div>
        <button
          onClick={() => setModalDist(true)}
          disabled={produtos.length === 0}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-blue-900/40 flex-shrink-0"
        >
          <Plus size={18} />
          <span className="hidden sm:inline">Distribuir Material</span>
        </button>
      </div>

      {/* Totais */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard title="Recebido" value={totais.recebido} icon={<Package size={20} />} color="blue" />
        <StatCard title="Usado" value={totais.usado} icon={<TrendingDown size={20} />} color="amber" />
        <StatCard title="Disponível" value={totais.disponivel} icon={<Warehouse size={20} />} color="emerald" />
      </div>

      {/* Mini-estoque desta empresa */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center gap-2">
          <Package size={16} className="text-blue-400" />
          <h2 className="text-sm font-semibold text-white">Estoque desta Empresa</h2>
        </div>
        {miniEstoque.length === 0 ? (
          <div className="text-center py-10 text-slate-500">
            <p className="text-sm">Nenhum material distribuído ainda.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {miniEstoque.map((item) => {
              const pct = item.recebido > 0 ? Math.min((item.usado / item.recebido) * 100, 100) : 0;
              return (
                <div key={item.produtoId} className="px-5 py-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-white text-sm font-medium">{item.produtoNome}</p>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span>Recebido: <span className="text-blue-400 font-semibold">{item.recebido}</span></span>
                      <span>Usado: <span className="text-amber-400 font-semibold">{item.usado}</span></span>
                      <span className={`font-bold ${item.disponivel < 5 ? 'text-red-400' : 'text-emerald-400'}`}>
                        Disponível: {item.disponivel} {item.unidade}
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${pct > 80 ? 'bg-red-500' : pct > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        {/* Distribuições para esta empresa */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800 flex items-center gap-2">
            <ArrowRightLeft size={16} className="text-violet-400" />
            <h2 className="text-sm font-semibold text-white">Entradas Recebidas</h2>
            <span className="ml-auto text-xs text-slate-600">{minhasDists.length} registro(s)</span>
          </div>
          {minhasDists.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-sm">Nenhuma entrada registrada.</div>
          ) : (
            <div className="divide-y divide-slate-800/60 max-h-72 overflow-y-auto">
              {minhasDists.map((d) => (
                <div key={d.id} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium truncate">{d.produtoNome}</p>
                    {d.observacao && <p className="text-slate-600 text-xs truncate">{d.observacao}</p>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-violet-400 font-bold text-sm">{d.quantidade}</p>
                    <p className="text-slate-600 text-xs">{new Date(d.data).toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Usos registrados por esta empresa */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800 flex items-center gap-2">
            <ClipboardList size={16} className="text-amber-400" />
            <h2 className="text-sm font-semibold text-white">Usos Registrados</h2>
            <span className="ml-auto text-xs text-slate-600">{meusUsos.length} registro(s)</span>
          </div>
          {meusUsos.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-sm">Nenhum uso registrado.</div>
          ) : (
            <div className="divide-y divide-slate-800/60 max-h-72 overflow-y-auto">
              {meusUsos.map((u) => (
                <div key={u.id} className="px-5 py-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium truncate">{u.produtoNome}</p>
                    <p className="text-slate-500 text-xs truncate">
                      Igreja: <span className="text-slate-400">{u.igreja}</span>
                    </p>
                    <p className="text-slate-600 text-xs truncate font-mono">{u.numeroPedido}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-amber-400 font-bold text-sm">{u.quantidade}</p>
                    <p className="text-slate-600 text-xs">{new Date(u.data).toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal distribuição */}
      {modalDist && (
        <Modal title={`Distribuir para ${empresa.nome}`} onClose={() => setModalDist(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Produto *</label>
              <select
                value={distForm.produtoId}
                onChange={(e) => setDistForm((f) => ({ ...f, produtoId: e.target.value, quantidade: 1 }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecione um produto</option>
                {produtos.filter((p) => p.estoqueTotal > 0).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome} — disponível: {p.estoqueTotal} {p.unidade}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Quantidade *{selectedProduto && <span className="text-slate-500 font-normal"> — máx: {selectedProduto.estoqueTotal} {selectedProduto.unidade}</span>}
              </label>
              <input
                type="number"
                min={1}
                max={selectedProduto?.estoqueTotal}
                value={distForm.quantidade}
                onChange={(e) => setDistForm((f) => ({ ...f, quantidade: Number(e.target.value) }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Data</label>
              <input
                type="date"
                value={distForm.data}
                onChange={(e) => setDistForm((f) => ({ ...f, data: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Observação</label>
              <textarea
                value={distForm.observacao}
                onChange={(e) => setDistForm((f) => ({ ...f, observacao: e.target.value }))}
                placeholder="Opcional..."
                rows={2}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setModalDist(false)} className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-sm font-medium">
                Cancelar
              </button>
              <button
                onClick={handleDistribuir}
                disabled={!distForm.produtoId || distForm.quantidade <= 0 || (selectedProduto ? distForm.quantidade > selectedProduto.estoqueTotal : false)}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold"
              >
                Distribuir
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

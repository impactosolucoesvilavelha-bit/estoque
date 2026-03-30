import { useState } from 'react';
import { Plus, Trash2, ArrowRightLeft, Search, ChevronDown, ChevronUp, Package } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Modal } from '../../components/Modal';

interface FormData {
  empresaId: string;
  produtoId: string;
  quantidade: number;
  data: string;
  observacao: string;
}

const today = () => new Date().toISOString().slice(0, 10);

export function Distribuicoes() {
  const { empresas, produtos, distribuicoes, addDistribuicao, deleteDistribuicao } = useStore();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [form, setForm] = useState<FormData>({
    empresaId: '',
    produtoId: '',
    quantidade: 1,
    data: today(),
    observacao: '',
  });

  const filtered = distribuicoes
    .filter(
      (d) =>
        d.empresaNome.toLowerCase().includes(search.toLowerCase()) ||
        d.produtoNome.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => b.data.localeCompare(a.data));

  // Agrupa por empresa + dia
  const groups = filtered.reduce<Record<string, typeof filtered>>((acc, d) => {
    const dia = new Date(d.data).toISOString().slice(0, 10);
    const chave = `${d.empresaId}_${dia}`;
    if (!acc[chave]) acc[chave] = [];
    acc[chave].push(d);
    return acc;
  }, {});

  const groupKeys = Object.keys(groups).sort((a, b) => {
    const dataA = groups[a][0].data;
    const dataB = groups[b][0].data;
    return dataB.localeCompare(dataA);
  });

  const toggleGroup = (chave: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(chave)) next.delete(chave);
      else next.add(chave);
      return next;
    });
  };

  const selectedProduto = produtos.find((p) => p.id === form.produtoId);

  const handleSave = () => {
    if (!form.empresaId || !form.produtoId || form.quantidade <= 0) return;
    const empresa = empresas.find((e) => e.id === form.empresaId)!;
    const produto = produtos.find((p) => p.id === form.produtoId)!;
    addDistribuicao({
      empresaId: form.empresaId,
      empresaNome: empresa.nome,
      produtoId: form.produtoId,
      produtoNome: produto.nome,
      quantidade: form.quantidade,
      data: new Date(form.data).toISOString(),
      observacao: form.observacao,
    });
    setModalOpen(false);
    setForm({ empresaId: '', produtoId: '', quantidade: 1, data: today(), observacao: '' });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Distribuições</h1>
          <p className="text-slate-400 text-sm mt-0.5">Envie materiais para as empresas</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          disabled={empresas.length === 0 || produtos.length === 0}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-blue-900/40"
        >
          <Plus size={18} />
          <span className="hidden sm:inline">Nova Distribuição</span>
        </button>
      </div>

      {(empresas.length === 0 || produtos.length === 0) && (
        <div className="p-4 bg-amber-950/30 border border-amber-800/40 rounded-2xl text-amber-300 text-sm">
          Cadastre pelo menos uma empresa e um produto antes de criar distribuições.
        </div>
      )}

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por empresa ou produto..."
          className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {groupKeys.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <ArrowRightLeft size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhuma distribuição encontrada.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {groupKeys.map((chave) => {
            const itens = groups[chave];
            const primeiro = itens[0];
            const expanded = expandedGroups.has(chave);
            const totalItens = itens.length;
            const data = new Date(primeiro.data).toLocaleDateString('pt-BR');

            return (
              <div key={chave} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                {/* Cabeçalho do grupo */}
                <button
                  onClick={() => toggleGroup(chave)}
                  className="w-full flex items-center gap-4 px-5 py-4 hover:bg-slate-800/50 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-xl bg-violet-600/20 flex items-center justify-center flex-shrink-0">
                    <ArrowRightLeft size={18} className="text-violet-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold truncate">{primeiro.empresaNome}</p>
                    <p className="text-slate-400 text-xs mt-0.5">
                      {totalItens} {totalItens === 1 ? 'item' : 'itens'} distribuídos
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0 mr-2">
                    <p className="text-sm font-semibold text-slate-300">{data}</p>
                  </div>
                  {expanded
                    ? <ChevronUp size={18} className="text-slate-500 flex-shrink-0" />
                    : <ChevronDown size={18} className="text-slate-500 flex-shrink-0" />
                  }
                </button>

                {/* Itens expandidos */}
                {expanded && (
                  <div className="border-t border-slate-800">
                    {itens.map((d, idx) => (
                      <div
                        key={d.id}
                        className={`flex items-center gap-4 px-5 py-3 ${idx !== itens.length - 1 ? 'border-b border-slate-800/60' : ''}`}
                      >
                        <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0">
                          <Package size={14} className="text-slate-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-slate-200 text-sm font-medium truncate">{d.produtoNome}</p>
                          {d.observacao && (
                            <p className="text-slate-500 text-xs mt-0.5 truncate">{d.observacao}</p>
                          )}
                        </div>
                        <p className="text-violet-400 font-bold text-sm flex-shrink-0">{d.quantidade}</p>
                        <button
                          onClick={() => setConfirmDelete(d.id)}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-950/40 transition-all flex-shrink-0"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {modalOpen && (
        <Modal title="Nova Distribuição" onClose={() => setModalOpen(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Empresa *</label>
              <select
                value={form.empresaId}
                onChange={(e) => setForm((f) => ({ ...f, empresaId: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecione uma empresa</option>
                {empresas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Produto *</label>
              <select
                value={form.produtoId}
                onChange={(e) => setForm((f) => ({ ...f, produtoId: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecione um produto</option>
                {produtos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome} (disponível: {p.estoqueTotal} {p.unidade})
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
                value={form.quantidade}
                onChange={(e) => setForm((f) => ({ ...f, quantidade: Number(e.target.value) }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Data</label>
              <input
                type="date"
                value={form.data}
                onChange={(e) => setForm((f) => ({ ...f, data: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Observação</label>
              <textarea
                value={form.observacao}
                onChange={(e) => setForm((f) => ({ ...f, observacao: e.target.value }))}
                placeholder="Opcional..."
                rows={2}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setModalOpen(false)} className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-sm font-medium transition-all">
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={!form.empresaId || !form.produtoId || form.quantidade <= 0 || (selectedProduto ? form.quantidade > selectedProduto.estoqueTotal : false)}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold transition-all"
              >
                Distribuir
              </button>
            </div>
          </div>
        </Modal>
      )}

      {confirmDelete && (
        <Modal title="Confirmar exclusão" onClose={() => setConfirmDelete(null)}>
          <p className="text-slate-300 text-sm mb-5">
            Tem certeza que deseja excluir esta distribuição? O estoque será devolvido.
          </p>
          <div className="flex gap-3">
            <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-sm font-medium">
              Cancelar
            </button>
            <button
              onClick={() => { deleteDistribuicao(confirmDelete); setConfirmDelete(null); }}
              className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-semibold"
            >
              Excluir
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

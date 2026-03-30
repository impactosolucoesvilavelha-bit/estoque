import { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, Package, Search, ChevronDown, ChevronUp, Building2 } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Modal } from '../../components/Modal';
import type { Produto } from '../../types';

type FormData = Omit<Produto, 'id' | 'criadoEm'>;
const empty: FormData = { nome: '', unidade: 'un', estoqueTotal: 0 };

export function Produtos() {
  const { produtos, distribuicoes, usos, addProduto, updateProduto, deleteProduto } = useStore();
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<'add' | 'edit' | null>(null);
  const [selected, setSelected] = useState<Produto | null>(null);
  const [form, setForm] = useState<FormData>(empty);
  const [confirmDelete, setConfirmDelete] = useState<Produto | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  /* Para cada produto, calcula quanto está nas empresas (distribuído - usado) */
  const estoqueNasEmpresas = useMemo(() => {
    const map: Record<string, Record<string, { empresaNome: string; disponivel: number }>> = {};

    distribuicoes.forEach((d) => {
      if (!map[d.produtoId]) map[d.produtoId] = {};
      if (!map[d.produtoId][d.empresaId]) {
        map[d.produtoId][d.empresaId] = { empresaNome: d.empresaNome, disponivel: 0 };
      }
      map[d.produtoId][d.empresaId].disponivel += d.quantidade;
    });

    usos.forEach((u) => {
      if (map[u.produtoId]?.[u.empresaId]) {
        map[u.produtoId][u.empresaId].disponivel -= u.quantidade;
      }
    });

    /* Total por produto */
    const totais: Record<string, { total: number; empresas: { id: string; nome: string; qtd: number }[] }> = {};
    Object.entries(map).forEach(([produtoId, empresasMap]) => {
      const empresas = Object.entries(empresasMap)
        .map(([id, v]) => ({ id, nome: v.empresaNome, qtd: v.disponivel }))
        .filter((e) => e.qtd > 0);
      totais[produtoId] = { total: empresas.reduce((a, e) => a + e.qtd, 0), empresas };
    });

    return totais;
  }, [distribuicoes, usos]);

  const filtered = produtos.filter((p) =>
    p.nome.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => { setForm(empty); setModal('add'); };
  const openEdit = (p: Produto) => {
    setSelected(p);
    setForm({ nome: p.nome, unidade: p.unidade, estoqueTotal: p.estoqueTotal });
    setModal('edit');
  };
  const closeModal = () => { setModal(null); setSelected(null); };

  const handleSave = () => {
    if (!form.nome.trim()) return;
    if (modal === 'add') addProduto(form);
    else if (modal === 'edit' && selected) updateProduto(selected.id, form);
    closeModal();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Produtos</h1>
          <p className="text-slate-400 text-sm mt-0.5">Gerencie os materiais do estoque</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-blue-900/40"
        >
          <Plus size={18} />
          <span className="hidden sm:inline">Novo Produto</span>
        </button>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar produto..."
          className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <Package size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhum produto encontrado.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((p) => {
            const nasEmpresas = estoqueNasEmpresas[p.id];
            const totalNasEmpresas = nasEmpresas?.total ?? 0;
            const isExpanded = expandedId === p.id;
            const hasEmpresas = (nasEmpresas?.empresas?.length ?? 0) > 0;

            return (
              <div key={p.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="px-5 py-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center flex-shrink-0">
                    <Package size={18} className="text-blue-400" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold truncate">{p.nome}</p>
                    <p className="text-slate-500 text-xs mt-0.5">Unidade: {p.unidade}</p>
                  </div>

                  {/* Estoque central */}
                  <div className="text-center flex-shrink-0">
                    <p className={`text-lg font-bold ${p.estoqueTotal < 10 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {p.estoqueTotal}
                    </p>
                    <p className="text-xs text-slate-600">central</p>
                  </div>

                  {/* Nas empresas */}
                  {totalNasEmpresas > 0 && (
                    <div className="text-center flex-shrink-0 border-l border-slate-800 pl-4">
                      <p className="text-lg font-bold text-violet-400">{totalNasEmpresas}</p>
                      <p className="text-xs text-slate-600">empresas</p>
                    </div>
                  )}

                  <div className="flex gap-1 flex-shrink-0">
                    {hasEmpresas && (
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : p.id)}
                        className="p-2 rounded-lg text-slate-400 hover:text-violet-400 hover:bg-violet-950/40 transition-all"
                        title="Ver distribuição por empresa"
                      >
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    )}
                    <button
                      onClick={() => openEdit(p)}
                      className="p-2 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-blue-950/40 transition-all"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => setConfirmDelete(p)}
                      className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-950/40 transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Breakdown por empresa */}
                {isExpanded && hasEmpresas && (
                  <div className="border-t border-slate-800 bg-slate-950/50 px-5 py-3 space-y-2">
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-2">
                      Distribuição por empresa
                    </p>
                    {nasEmpresas.empresas.map((e) => (
                      <div key={e.id} className="flex items-center justify-between py-1.5 border-b border-slate-800/50 last:border-0">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-emerald-600/20 flex items-center justify-center">
                            <Building2 size={12} className="text-emerald-400" />
                          </div>
                          <p className="text-slate-300 text-sm">{e.nome}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <p className="text-violet-400 font-semibold text-sm">{e.qtd}</p>
                          <p className="text-slate-600 text-xs">{p.unidade}</p>
                        </div>
                      </div>
                    ))}
                    <div className="flex items-center justify-between pt-1">
                      <p className="text-xs text-slate-500">Total nas empresas</p>
                      <p className="text-violet-300 font-bold text-sm">{totalNasEmpresas} {p.unidade}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-slate-500">Estoque central</p>
                      <p className={`font-bold text-sm ${p.estoqueTotal < 10 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {p.estoqueTotal} {p.unidade}
                      </p>
                    </div>
                    <div className="flex items-center justify-between border-t border-slate-800 pt-2 mt-1">
                      <p className="text-xs text-slate-400 font-semibold">Total geral</p>
                      <p className="text-white font-bold text-sm">{p.estoqueTotal + totalNasEmpresas} {p.unidade}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <Modal title={modal === 'add' ? 'Novo Produto' : 'Editar Produto'} onClose={closeModal}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Nome do Produto *</label>
              <input
                type="text"
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                placeholder="Ex: Parafuso M8"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Unidade de Medida</label>
              <select
                value={form.unidade}
                onChange={(e) => setForm((f) => ({ ...f, unidade: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="un">Unidade (un)</option>
                <option value="kg">Quilograma (kg)</option>
                <option value="m">Metro (m)</option>
                <option value="m²">Metro Quadrado (m²)</option>
                <option value="l">Litro (l)</option>
                <option value="cx">Caixa (cx)</option>
                <option value="pc">Peça (pc)</option>
                <option value="rolo">Rolo</option>
                <option value="fardo">Fardo</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Quantidade em Estoque</label>
              <input
                type="number"
                min={0}
                value={form.estoqueTotal}
                onChange={(e) => setForm((f) => ({ ...f, estoqueTotal: Number(e.target.value) }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={closeModal} className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:text-white text-sm font-medium transition-all">
                Cancelar
              </button>
              <button onClick={handleSave} disabled={!form.nome.trim()} className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold transition-all">
                Salvar
              </button>
            </div>
          </div>
        </Modal>
      )}

      {confirmDelete && (
        <Modal title="Confirmar exclusão" onClose={() => setConfirmDelete(null)}>
          <p className="text-slate-300 text-sm mb-5">
            Tem certeza que deseja excluir o produto <strong className="text-white">{confirmDelete.nome}</strong>?
            Esta ação não pode ser desfeita.
          </p>
          <div className="flex gap-3">
            <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-sm font-medium">
              Cancelar
            </button>
            <button
              onClick={() => { deleteProduto(confirmDelete.id); setConfirmDelete(null); }}
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

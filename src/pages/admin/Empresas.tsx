import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, Building2, Search, KeyRound, ChevronRight } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Modal } from '../../components/Modal';
import type { Empresa } from '../../types';

type FormData = Omit<Empresa, 'id' | 'criadoEm'>;
const empty: FormData = { nome: '', cnpj: '', contato: '' };

export function Empresas() {
  const { empresas, addEmpresa, updateEmpresa, deleteEmpresa } = useStore();
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<'add' | 'edit' | null>(null);
  const [selected, setSelected] = useState<Empresa | null>(null);
  const [form, setForm] = useState<FormData>(empty);
  const [confirmDelete, setConfirmDelete] = useState<Empresa | null>(null);

  const filtered = empresas.filter(
    (e) =>
      e.nome.toLowerCase().includes(search.toLowerCase()) ||
      e.cnpj.includes(search)
  );

  const openAdd = () => { setForm(empty); setModal('add'); };
  const openEdit = (e: Empresa) => {
    setSelected(e);
    setForm({ nome: e.nome, cnpj: e.cnpj, contato: e.contato });
    setModal('edit');
  };
  const closeModal = () => { setModal(null); setSelected(null); };

  const handleSave = () => {
    if (!form.nome.trim()) return;
    if (modal === 'add') addEmpresa(form);
    else if (modal === 'edit' && selected) updateEmpresa(selected.id, form);
    closeModal();
  };

  const formatCnpj = (v: string) => {
    const nums = v.replace(/\D/g, '').slice(0, 14);
    return nums.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Empresas</h1>
          <p className="text-slate-400 text-sm mt-0.5">Gerencie as empresas clientes</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-blue-900/40"
        >
          <Plus size={18} />
          <span className="hidden sm:inline">Nova Empresa</span>
        </button>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar empresa ou CNPJ..."
          className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <Building2 size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhuma empresa encontrada.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((e) => {
            const senhaInicial = 'empresa123';
            return (
              <div key={e.id} className="bg-slate-900 border border-slate-800 rounded-2xl px-5 py-4 flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-600/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Building2 size={18} className="text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold truncate">{e.nome}</p>
                  <p className="text-slate-500 text-xs mt-0.5">{e.cnpj || 'CNPJ não informado'}</p>
                  {e.contato && <p className="text-slate-600 text-xs">{e.contato}</p>}
                  <div className="flex items-center gap-1 mt-1.5">
                    <KeyRound size={11} className="text-slate-600" />
                    <span className="text-xs text-slate-600">Senha inicial: <span className="text-slate-500 font-mono">{senhaInicial}</span></span>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0 items-center">
                  <Link
                    to={`/admin/empresas/${e.id}`}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-emerald-400 hover:bg-emerald-950/40 border border-emerald-900/40 transition-all"
                  >
                    Ver estoque
                    <ChevronRight size={13} />
                  </Link>
                  <button
                    onClick={() => openEdit(e)}
                    className="p-2 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-blue-950/40 transition-all"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => setConfirmDelete(e)}
                    className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-950/40 transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <Modal title={modal === 'add' ? 'Nova Empresa' : 'Editar Empresa'} onClose={closeModal}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Nome da Empresa *</label>
              <input
                type="text"
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                placeholder="Ex: Construtora ABC"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">CNPJ</label>
              <input
                type="text"
                value={form.cnpj}
                onChange={(e) => setForm((f) => ({ ...f, cnpj: formatCnpj(e.target.value) }))}
                placeholder="00.000.000/0000-00"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {modal === 'add' && (
                <p className="text-xs text-slate-500 mt-1">
                  Senha inicial para login da empresa: <span className="font-mono text-slate-400">empresa123</span>
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Contato</label>
              <input
                type="text"
                value={form.contato}
                onChange={(e) => setForm((f) => ({ ...f, contato: e.target.value }))}
                placeholder="Telefone ou email"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            Tem certeza que deseja excluir a empresa <strong className="text-white">{confirmDelete.nome}</strong>?
          </p>
          <div className="flex gap-3">
            <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-sm font-medium transition-all">
              Cancelar
            </button>
            <button onClick={() => { deleteEmpresa(confirmDelete.id); setConfirmDelete(null); }} className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition-all">
              Excluir
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

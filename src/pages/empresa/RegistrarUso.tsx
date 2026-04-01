import { useState, useMemo } from 'react';
import {
  ClipboardList,
  CheckCircle,
  AlertTriangle,
  Church,
  Hash,
  Trash2,
  Package,
  Calendar,
  ShoppingCart,
  History,
  ChevronDown,
  ChevronUp,
  Search,
  Plus,
  Minus,
  XCircle,
} from 'lucide-react';
import { useStore } from '../../store/useStore';

interface ItemLote {
  produtoId: string;
  produtoNome: string;
  produtoMarca?: string;
  produtoModelo?: string;
  unidade: string;
  quantidade: number;
  disponivel: number;
  observacao: string;
}

const today = () => new Date().toISOString().slice(0, 10);

export function RegistrarUso() {
  const { currentUser, empresas, distribuicoes, usos, addUsos, produtos } = useStore();
  const [success, setSuccess] = useState(false);
  const [erro, setErro] = useState(false);
  const [erroDetalhe, setErroDetalhe] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [igreja, setIgreja] = useState('');
  const [numeroPedido, setNumeroPedido] = useState('');
  const [data, setData] = useState(today());
  const [lote, setLote] = useState<ItemLote[]>([]);
  const [busca, setBusca] = useState('');
  const [expandedPedidos, setExpandedPedidos] = useState<Set<string>>(new Set());

  const empresa = useMemo(
    () => empresas.find((e) => String(e.id) === String(currentUser?.empresaId)),
    [empresas, currentUser]
  );

  const disponivelPorProduto = useMemo(() => {
    if (!empresa) return {};
    const map: Record<string, { nome: string; disponivel: number; unidade: string }> = {};
    distribuicoes.filter((d) => d.empresaId === empresa.id).forEach((d) => {
      if (!map[d.produtoId]) {
        const prod = produtos.find((p) => p.id === d.produtoId);
        map[d.produtoId] = { nome: d.produtoNome, disponivel: 0, unidade: prod?.unidade || 'un' };
      }
      map[d.produtoId].disponivel += d.quantidade;
    });
    usos.filter((u) => u.empresaId === empresa.id).forEach((u) => {
      if (map[u.produtoId]) map[u.produtoId].disponivel -= u.quantidade;
    });
    return map;
  }, [empresa, distribuicoes, usos, produtos]);

  const disponivelReal = useMemo(() => {
    const base = { ...disponivelPorProduto };
    lote.forEach((item) => {
      if (base[item.produtoId]) {
        base[item.produtoId] = {
          ...base[item.produtoId],
          disponivel: base[item.produtoId].disponivel - item.quantidade,
        };
      }
    });
    return base;
  }, [disponivelPorProduto, lote]);

  const linhasDisponiveis = useMemo(() => {
    return Object.entries(disponivelReal)
      .filter(([, v]) => v.disponivel > 0)
      .map(([id, v]) => {
        const p = produtos.find((x) => x.id === id);
        return {
          id,
          nome: v.nome,
          unidade: v.unidade,
          disponivel: v.disponivel,
          marca: p?.marca,
          modelo: p?.modelo,
        };
      })
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }, [disponivelReal, produtos]);

  const produtosFiltrados = useMemo(() => {
    const q = busca.toLowerCase().trim();
    if (!q) return linhasDisponiveis;
    return linhasDisponiveis.filter((row) =>
      [row.nome, row.marca, row.modelo].filter(Boolean).join(' ').toLowerCase().includes(q)
    );
  }, [linhasDisponiveis, busca]);

  const idsNoLote = useMemo(() => new Set(lote.map((i) => i.produtoId)), [lote]);

  const historicoPedidos = useMemo(() => {
    if (!empresa) return [];
    const meus = usos.filter((u) => u.empresaId === empresa.id);
    const map: Record<string, { numeroPedido: string; igreja: string; data: string; itens: typeof meus }> = {};
    meus.forEach((u) => {
      const key = `${u.numeroPedido}__${u.empresaId}`;
      if (!map[key]) map[key] = { numeroPedido: u.numeroPedido, igreja: u.igreja, data: u.data, itens: [] };
      if (u.data > map[key].data) map[key].data = u.data;
      map[key].itens.push(u);
    });
    return Object.values(map).sort((a, b) => b.data.localeCompare(a.data));
  }, [empresa, usos]);

  const togglePedido = (chave: string) => {
    setExpandedPedidos((prev) => {
      const next = new Set(prev);
      if (next.has(chave)) next.delete(chave);
      else next.add(chave);
      return next;
    });
  };

  const adicionarAoLote = (produtoId: string) => {
    const v = disponivelReal[produtoId];
    if (!v || v.disponivel <= 0 || idsNoLote.has(produtoId)) return;
    const p = produtos.find((x) => x.id === produtoId);
    setLote((prev) => [
      ...prev,
      {
        produtoId,
        produtoNome: v.nome,
        produtoMarca: p?.marca,
        produtoModelo: p?.modelo,
        unidade: v.unidade,
        quantidade: 1,
        disponivel: disponivelPorProduto[produtoId]?.disponivel ?? 0,
        observacao: '',
      },
    ]);
  };

  const removerDoLote = (produtoId: string) =>
    setLote((prev) => prev.filter((i) => i.produtoId !== produtoId));

  const atualizarQtdLote = (produtoId: string, delta: number) => {
    const max = disponivelPorProduto[produtoId]?.disponivel ?? 999;
    setLote((prev) =>
      prev.map((i) =>
        i.produtoId === produtoId
          ? { ...i, quantidade: Math.max(1, Math.min(i.quantidade + delta, max)) }
          : i
      )
    );
  };

  const setQtdLote = (produtoId: string, val: number) => {
    const max = disponivelPorProduto[produtoId]?.disponivel ?? 999;
    setLote((prev) =>
      prev.map((i) =>
        i.produtoId === produtoId
          ? { ...i, quantidade: Math.max(1, Math.min(val, max)) }
          : i
      )
    );
  };

  const setObsLote = (produtoId: string, obs: string) =>
    setLote((prev) => prev.map((i) => (i.produtoId === produtoId ? { ...i, observacao: obs } : i)));

  const isValido = igreja.trim() && numeroPedido.trim() && lote.length > 0;

  const lancarAtendimento = async () => {
    if (!isValido || !empresa || salvando) return;
    setSalvando(true);
    setErroDetalhe(null);
    const dataISO = new Date(data + 'T12:00:00').toISOString();
    try {
      await addUsos(
        lote.map((item) => ({
          empresaId: empresa.id,
          empresaNome: empresa.nome,
          igreja: igreja.trim(),
          numeroPedido: numeroPedido.trim(),
          produtoId: item.produtoId,
          produtoNome: item.produtoNome,
          quantidade: item.quantidade,
          data: dataISO,
          observacao: item.observacao.trim() || undefined,
        }))
      );
      setSuccess(true);
      setTimeout(() => setSuccess(false), 5000);
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'code' in e && 'message' in e
          ? `${String((e as { code: unknown }).code)} — ${String((e as { message: unknown }).message)}`
          : e instanceof Error
            ? e.message
            : String(e);
      setErroDetalhe(msg);
      setErro(true);
      setTimeout(() => {
        setErro(false);
        setErroDetalhe(null);
      }, 12000);
    } finally {
      setSalvando(false);
      setLote([]);
      setIgreja('');
      setNumeroPedido('');
      setData(today());
      setBusca('');
    }
  };

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
        <p className="text-sm">Empresa não encontrada. Entre em contato com o administrador.</p>
      </div>
    );
  }

  const semEstoque = Object.keys(disponivelPorProduto).length === 0;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">Registrar Uso</h1>
        <p className="text-slate-400 text-sm mt-0.5">Lance todos os materiais de um atendimento de uma vez</p>
      </div>

      {success && (
        <div className="flex items-center gap-3 p-4 bg-emerald-950/50 border border-emerald-700/50 rounded-2xl">
          <CheckCircle size={20} className="text-emerald-400 flex-shrink-0" />
          <div>
            <p className="text-emerald-300 text-sm font-medium">Atendimento lançado com sucesso!</p>
            <p className="text-emerald-700 text-xs mt-0.5">Os materiais foram descontados do seu estoque.</p>
          </div>
        </div>
      )}

      {erro && (
        <div className="flex items-center gap-3 p-4 bg-red-950/50 border border-red-700/50 rounded-2xl">
          <XCircle size={20} className="text-red-400 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-red-300 text-sm font-medium">Erro ao salvar uso</p>
            {erroDetalhe ? (
              <p className="text-red-400/90 text-xs font-mono break-all mt-1">{erroDetalhe}</p>
            ) : (
              <p className="text-red-700 text-xs mt-1">Tente de novo ou fale com o administrador.</p>
            )}
            {erroDetalhe?.includes('PERMISSION_DENIED') || erroDetalhe?.includes('permission_denied') ? (
              <p className="text-red-700 text-xs mt-2">
                Publique as regras do <span className="font-mono">database.rules.json</span> no Firebase Console (Realtime
                Database → Regras).
              </p>
            ) : null}
          </div>
        </div>
      )}

      {semEstoque && (
        <div className="flex items-center gap-3 p-4 bg-amber-950/30 border border-amber-800/40 rounded-2xl">
          <AlertTriangle size={18} className="text-amber-400 flex-shrink-0" />
          <p className="text-amber-300 text-sm">Nenhum material disponível. Registre uma entrada primeiro.</p>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,480px)_1fr] gap-5 items-start">
        {/* ── Esquerda: atendimento + lista de materiais ── */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800 bg-slate-800/30">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Dados do Atendimento</p>
            <div className="space-y-3">
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 mb-1.5">
                  <Church size={13} className="text-blue-400" /> IGREJA *
                </label>
                <input
                  type="text"
                  value={igreja}
                  onChange={(e) => setIgreja(e.target.value)}
                  placeholder="Nome da igreja atendida"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 mb-1.5">
                    <Hash size={13} className="text-violet-400" /> PEDIDO *
                  </label>
                  <input
                    type="text"
                    value={numeroPedido}
                    onChange={(e) => setNumeroPedido(e.target.value)}
                    placeholder="Nº do pedido"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 mb-1.5">
                    <Calendar size={13} className="text-slate-400" /> DATA
                  </label>
                  <input
                    type="date"
                    value={data}
                    onChange={(e) => setData(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="px-5 pt-4 pb-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Materiais disponíveis
                <span className="ml-2 text-slate-600 normal-case font-normal">— clique em + para adicionar</span>
              </p>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar por nome, marca ou modelo..."
                  disabled={semEstoque}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-8 pr-4 py-2 text-white text-sm placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                />
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/60 border-t border-slate-800/60">
              {produtosFiltrados.length === 0 ? (
                <div className="px-5 py-6 text-center text-slate-600 text-sm">
                  {semEstoque ? 'Sem estoque para uso.' : 'Nenhum material encontrado.'}
                </div>
              ) : (
                produtosFiltrados.map((row) => {
                  const noLote = idsNoLote.has(row.id);
                  return (
                    <div
                      key={row.id}
                      className={`flex items-center gap-3 px-5 py-3 transition-colors ${
                        noLote ? 'bg-emerald-950/20' : 'hover:bg-slate-800/40'
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          noLote ? 'bg-emerald-600/20' : 'bg-slate-800'
                        }`}
                      >
                        <Package size={14} className={noLote ? 'text-emerald-400' : 'text-slate-500'} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${noLote ? 'text-emerald-300' : 'text-white'}`}>
                          {row.nome}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          {row.marca && (
                            <span className="text-xs text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">{row.marca}</span>
                          )}
                          {row.modelo && (
                            <span className="text-xs text-blue-400 bg-blue-950/50 px-1.5 py-0.5 rounded font-medium">
                              {row.modelo}
                            </span>
                          )}
                          <span className="text-xs text-slate-600">
                            {row.disponivel} {row.unidade} disp.
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => (noLote ? removerDoLote(row.id) : adicionarAoLote(row.id))}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all text-sm font-bold ${
                          noLote
                            ? 'bg-emerald-600/20 text-emerald-400 hover:bg-red-950/40 hover:text-red-400'
                            : 'bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white'
                        }`}
                        title={noLote ? 'Remover do atendimento' : 'Adicionar ao atendimento'}
                      >
                        {noLote ? '✓' : '+'}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* ── Direita: pedido + histórico ── */}
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-800 bg-slate-800/30 flex items-center gap-2">
              <ShoppingCart size={15} className="text-violet-400" />
              <p className="text-sm font-semibold text-white">Atendimento</p>
              {lote.length > 0 && (
                <span className="ml-auto text-xs bg-violet-600/30 text-violet-300 font-semibold px-2 py-0.5 rounded-full">
                  {lote.length} {lote.length === 1 ? 'item' : 'itens'}
                </span>
              )}
            </div>

            {lote.length === 0 ? (
              <div className="px-5 py-8 text-center text-slate-600">
                <ShoppingCart size={26} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Nenhum material no atendimento.</p>
                <p className="text-xs mt-1 text-slate-700">Use a lista à esquerda para adicionar.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/60">
                {lote.map((item) => (
                  <div key={item.produtoId} className="px-5 py-3 space-y-2">
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg bg-violet-600/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Package size={14} className="text-violet-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{item.produtoNome}</p>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          {item.produtoMarca && (
                            <span className="text-xs text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                              {item.produtoMarca}
                            </span>
                          )}
                          {item.produtoModelo && (
                            <span className="text-xs text-blue-400 bg-blue-950/50 px-1.5 py-0.5 rounded font-medium">
                              {item.produtoModelo}
                            </span>
                          )}
                        </div>
                        <input
                          type="text"
                          value={item.observacao}
                          onChange={(e) => setObsLote(item.produtoId, e.target.value)}
                          placeholder="Observação deste material (opcional)"
                          className="mt-2 w-full bg-slate-800/80 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-white text-xs placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => atualizarQtdLote(item.produtoId, -1)}
                          disabled={item.quantidade <= 1}
                          className="w-6 h-6 rounded-md bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-400 flex items-center justify-center transition-all"
                        >
                          <Minus size={12} />
                        </button>
                        <input
                          type="number"
                          min={1}
                          max={item.disponivel}
                          value={item.quantidade}
                          onChange={(e) => setQtdLote(item.produtoId, Number(e.target.value))}
                          className="w-12 text-center bg-slate-800 border border-slate-700 rounded-md text-white font-bold text-sm py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => atualizarQtdLote(item.produtoId, 1)}
                          disabled={item.quantidade >= item.disponivel}
                          className="w-6 h-6 rounded-md bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-400 flex items-center justify-center transition-all"
                        >
                          <Plus size={12} />
                        </button>
                        <span className="text-slate-600 text-xs ml-1 w-6">{item.unidade}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removerDoLote(item.produtoId)}
                        className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-950/40 transition-all flex-shrink-0"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="px-5 py-4 border-t border-slate-800">
              {!igreja.trim() && lote.length > 0 && (
                <p className="text-amber-400 text-xs mb-2 text-center">Preencha Igreja e Pedido para confirmar.</p>
              )}
              <button
                type="button"
                onClick={() => void lancarAtendimento()}
                disabled={!isValido || salvando}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm transition-all shadow-lg shadow-blue-900/30"
              >
                {salvando ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <ClipboardList size={18} />
                )}
                {salvando ? 'Salvando...' : 'Lançar Atendimento'}
                {!salvando && lote.length > 0 && (
                  <span className="bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded-full ml-1">
                    {lote.length} {lote.length === 1 ? 'material' : 'materiais'}
                  </span>
                )}
              </button>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 bg-slate-800/30 flex items-center gap-2">
              <History size={16} className="text-blue-400" />
              <p className="text-sm font-semibold text-white">Histórico de Atendimentos</p>
              {historicoPedidos.length > 0 && (
                <span className="ml-auto text-xs text-slate-500">{historicoPedidos.length} pedidos</span>
              )}
            </div>

            {historicoPedidos.length === 0 ? (
              <div className="px-5 py-12 text-center text-slate-600">
                <ClipboardList size={28} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Nenhum atendimento registrado ainda.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/60 max-h-[600px] overflow-y-auto">
                {historicoPedidos.map((pedido) => {
                  const chave = pedido.numeroPedido;
                  const expanded = expandedPedidos.has(chave);
                  return (
                    <div key={chave}>
                      <button
                        type="button"
                        onClick={() => togglePedido(chave)}
                        className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-slate-800/40 transition-colors text-left"
                      >
                        <div className="w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center flex-shrink-0">
                          <Church size={14} className="text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-slate-200 text-sm font-medium truncate">{pedido.igreja}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Hash size={11} className="text-violet-400 flex-shrink-0" />
                            <p className="text-violet-400 font-mono text-xs">{pedido.numeroPedido}</p>
                            <span className="text-slate-700 text-xs">·</span>
                            <p className="text-slate-500 text-xs">
                              {new Date(pedido.data).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                        </div>
                        <p className="text-xs text-slate-600 flex-shrink-0 mr-1">{pedido.itens.length} mat.</p>
                        {expanded ? (
                          <ChevronUp size={15} className="text-slate-600 flex-shrink-0" />
                        ) : (
                          <ChevronDown size={15} className="text-slate-600 flex-shrink-0" />
                        )}
                      </button>
                      {expanded && (
                        <div className="bg-slate-800/20 border-t border-slate-800/60">
                          {pedido.itens.map((u, i) => (
                            <div
                              key={`${u.id}-${i}`}
                              className="flex items-center gap-3 px-5 py-2.5 border-b border-slate-800/40 last:border-0"
                            >
                              <div className="w-6 h-6 rounded-md bg-slate-800 flex items-center justify-center flex-shrink-0">
                                <Package size={12} className="text-slate-400" />
                              </div>
                              <p className="text-slate-300 text-xs flex-1 truncate">{u.produtoNome}</p>
                              {u.observacao && (
                                <p className="text-slate-600 text-xs truncate max-w-24 hidden sm:block">{u.observacao}</p>
                              )}
                              <p className="text-amber-400 font-bold text-sm flex-shrink-0">{u.quantidade}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

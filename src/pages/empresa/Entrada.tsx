import { useState, useMemo } from 'react';
import { PackagePlus, CheckCircle, AlertTriangle, Trash2, Package, Calendar, ShoppingCart, History, ChevronDown, ChevronUp, ArrowRightLeft, Search, Plus, Minus, XCircle } from 'lucide-react';
import { useStore } from '../../store/useStore';

interface ItemLote {
  produtoId: string;
  produtoNome: string;
  produtoMarca?: string;
  produtoModelo?: string;
  unidade: string;
  quantidade: number;
  disponivel: number;
}

const today = () => new Date().toISOString().slice(0, 10);

export function Entrada() {
  const { currentUser, empresas, produtos, distribuicoes, addDistribuicoes } = useStore();
  const [success, setSuccess] = useState(false);
  const [erro, setErro] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [data, setData] = useState(today());
  const [observacao, setObservacao] = useState('');
  const [lote, setLote] = useState<ItemLote[]>([]);
  const [busca, setBusca] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const empresa = useMemo(
    () => empresas.find((e) => e.id === currentUser?.empresaId),
    [empresas, currentUser]
  );

  const produtosDisponiveis = useMemo(
    () =>
      produtos
        .filter((p) => p.estoqueTotal > 0)
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
    [produtos]
  );

  const idsNoLote = useMemo(() => new Set(lote.map((i) => i.produtoId)), [lote]);

  const produtosFiltrados = useMemo(() => {
    const q = busca.toLowerCase().trim();
    if (!q) return produtosDisponiveis;
    return produtosDisponiveis.filter((p) =>
      [p.nome, p.marca, p.modelo].filter(Boolean).join(' ').toLowerCase().includes(q)
    );
  }, [produtosDisponiveis, busca]);

  // Histórico de entradas agrupado por data
  const historicoGrupos = useMemo(() => {
    if (!empresa) return [];
    const minhas = distribuicoes
      .filter((d) => d.empresaId === empresa.id)
      .sort((a, b) => b.data.localeCompare(a.data));

    const map: Record<string, typeof minhas> = {};
    minhas.forEach((d) => {
      const dia = new Date(d.data).toISOString().slice(0, 10);
      if (!map[dia]) map[dia] = [];
      map[dia].push(d);
    });
    return Object.entries(map).sort(([a], [b]) => b.localeCompare(a));
  }, [empresa, distribuicoes]);

  const toggleGroup = (chave: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(chave)) next.delete(chave);
      else next.add(chave);
      return next;
    });
  };

  const adicionarAoLote = (produtoId: string) => {
    const p = produtos.find((x) => x.id === produtoId);
    if (!p || idsNoLote.has(produtoId)) return;
    setLote((prev) => [
      ...prev,
      {
        produtoId: p.id,
        produtoNome: p.nome,
        produtoMarca: p.marca,
        produtoModelo: p.modelo,
        unidade: p.unidade,
        quantidade: 1,
        disponivel: p.estoqueTotal,
      },
    ]);
  };

  const removerDoLote = (produtoId: string) =>
    setLote((prev) => prev.filter((i) => i.produtoId !== produtoId));

  const atualizarQtdLote = (produtoId: string, delta: number) =>
    setLote((prev) =>
      prev.map((i) =>
        i.produtoId === produtoId
          ? { ...i, quantidade: Math.max(1, Math.min(i.quantidade + delta, i.disponivel)) }
          : i
      )
    );

  const setQtdLote = (produtoId: string, val: number) =>
    setLote((prev) =>
      prev.map((i) =>
        i.produtoId === produtoId
          ? { ...i, quantidade: Math.max(1, Math.min(val, i.disponivel)) }
          : i
      )
    );

  const confirmarEntrada = async () => {
    if (!empresa || lote.length === 0 || salvando) return;
    setSalvando(true);
    const dataISO = new Date(data + 'T12:00:00').toISOString();
    try {
      await addDistribuicoes(
        lote.map((item) => ({
          empresaId: empresa.id,
          empresaNome: empresa.nome,
          produtoId: item.produtoId,
          produtoNome: item.produtoNome,
          quantidade: item.quantidade,
          data: dataISO,
          observacao: observacao.trim() || undefined,
        }))
      );
      setSuccess(true);
      setTimeout(() => setSuccess(false), 5000);
    } catch {
      setErro(true);
      setTimeout(() => setErro(false), 8000);
    } finally {
      setSalvando(false);
      setLote([]);
      setData(today());
      setObservacao('');
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

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">Entrada de Material</h1>
        <p className="text-slate-400 text-sm mt-0.5">Registre o que sua empresa retirou do estoque central</p>
      </div>

      {success && (
        <div className="flex items-center gap-3 p-4 bg-emerald-950/50 border border-emerald-700/50 rounded-2xl">
          <CheckCircle size={20} className="text-emerald-400 flex-shrink-0" />
          <div>
            <p className="text-emerald-300 text-sm font-medium">Entrada confirmada!</p>
            <p className="text-emerald-700 text-xs">Os materiais foram adicionados ao seu estoque.</p>
          </div>
        </div>
      )}

      {erro && (
        <div className="flex items-center gap-3 p-4 bg-red-950/50 border border-red-700/50 rounded-2xl">
          <XCircle size={20} className="text-red-400 flex-shrink-0" />
          <div>
            <p className="text-red-300 text-sm font-medium">Erro ao salvar entrada</p>
            <p className="text-red-700 text-xs">Verifique as permissões do banco de dados no Firebase Console.</p>
          </div>
        </div>
      )}

      {produtosDisponiveis.length === 0 && (
        <div className="flex items-center gap-3 p-4 bg-amber-950/30 border border-amber-800/40 rounded-2xl">
          <AlertTriangle size={18} className="text-amber-400 flex-shrink-0" />
          <p className="text-amber-300 text-sm">Nenhum material disponível no estoque central.</p>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,480px)_1fr] gap-5 items-start">

        {/* ── Coluna esquerda: dados + lista de seleção ── */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">

          {/* Data e obs */}
          <div className="px-5 py-4 border-b border-slate-800 bg-slate-800/30">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Dados da Retirada</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-slate-400 mb-1.5">
                  <Calendar size={12} /> Data
                </label>
                <input
                  type="date"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-400 mb-1.5 block">Observação</label>
                <input
                  type="text"
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  placeholder="Opcional..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Lista de materiais disponíveis */}
          <div>
            <div className="px-5 pt-4 pb-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Materiais disponíveis
                <span className="ml-2 text-slate-600 normal-case font-normal">— clique em + para selecionar</span>
              </p>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar por nome, marca ou modelo..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-8 pr-4 py-2 text-white text-sm placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/60">
              {produtosFiltrados.length === 0 ? (
                <div className="px-5 py-6 text-center text-slate-600 text-sm">
                  Nenhum material encontrado.
                </div>
              ) : (
                produtosFiltrados.map((p) => {
                  const noLote = idsNoLote.has(p.id);
                  return (
                    <div
                      key={p.id}
                      className={`flex items-center gap-3 px-5 py-3 transition-colors ${
                        noLote ? 'bg-emerald-950/20' : 'hover:bg-slate-800/40'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${noLote ? 'bg-emerald-600/20' : 'bg-slate-800'}`}>
                        <Package size={14} className={noLote ? 'text-emerald-400' : 'text-slate-500'} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${noLote ? 'text-emerald-300' : 'text-white'}`}>
                          {p.nome}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          {p.marca && (
                            <span className="text-xs text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">{p.marca}</span>
                          )}
                          {p.modelo && (
                            <span className="text-xs text-blue-400 bg-blue-950/50 px-1.5 py-0.5 rounded font-medium">{p.modelo}</span>
                          )}
                          <span className="text-xs text-slate-600">{p.estoqueTotal} {p.unidade} disp.</span>
                        </div>
                      </div>
                      <button
                        onClick={() => noLote ? removerDoLote(p.id) : adicionarAoLote(p.id)}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all text-sm font-bold ${
                          noLote
                            ? 'bg-emerald-600/20 text-emerald-400 hover:bg-red-950/40 hover:text-red-400'
                            : 'bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white'
                        }`}
                        title={noLote ? 'Remover do pedido' : 'Adicionar ao pedido'}
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

        {/* ── Coluna direita: pedido + histórico ── */}
        <div className="space-y-4">

          {/* Pedido atual */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-800 bg-slate-800/30 flex items-center gap-2">
              <ShoppingCart size={15} className="text-violet-400" />
              <p className="text-sm font-semibold text-white">Pedido</p>
              {lote.length > 0 && (
                <span className="ml-auto text-xs bg-violet-600/30 text-violet-300 font-semibold px-2 py-0.5 rounded-full">
                  {lote.length} {lote.length === 1 ? 'item' : 'itens'}
                </span>
              )}
            </div>

            {lote.length === 0 ? (
              <div className="px-5 py-8 text-center text-slate-600">
                <ShoppingCart size={26} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Nenhum material selecionado.</p>
                <p className="text-xs mt-1 text-slate-700">Clique em + na lista ao lado.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/60">
                {lote.map((item) => (
                  <div key={item.produtoId} className="px-5 py-3 flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-violet-600/20 flex items-center justify-center flex-shrink-0">
                      <Package size={14} className="text-violet-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{item.produtoNome}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {item.produtoMarca && (
                          <span className="text-xs text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">{item.produtoMarca}</span>
                        )}
                        {item.produtoModelo && (
                          <span className="text-xs text-blue-400 bg-blue-950/50 px-1.5 py-0.5 rounded font-medium">{item.produtoModelo}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
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
                        onClick={() => atualizarQtdLote(item.produtoId, 1)}
                        disabled={item.quantidade >= item.disponivel}
                        className="w-6 h-6 rounded-md bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-400 flex items-center justify-center transition-all"
                      >
                        <Plus size={12} />
                      </button>
                      <span className="text-slate-600 text-xs ml-1 w-6">{item.unidade}</span>
                    </div>
                    <button
                      onClick={() => removerDoLote(item.produtoId)}
                      className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-950/40 transition-all flex-shrink-0"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="px-5 py-4 border-t border-slate-800">
              <button
                onClick={confirmarEntrada}
                disabled={lote.length === 0 || salvando}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm transition-all shadow-lg shadow-violet-900/30"
              >
                {salvando ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <PackagePlus size={18} />
                )}
                {salvando ? 'Salvando...' : 'Confirmar Entrada'}
                {!salvando && lote.length > 0 && (
                  <span className="bg-violet-500 text-white text-xs font-bold px-2 py-0.5 rounded-full ml-1">
                    {lote.length} {lote.length === 1 ? 'item' : 'itens'}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Histórico de entradas */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 bg-slate-800/30 flex items-center gap-2">
              <History size={16} className="text-violet-400" />
              <p className="text-sm font-semibold text-white">Histórico de Entradas</p>
              {historicoGrupos.length > 0 && (
                <span className="ml-auto text-xs text-slate-500">{historicoGrupos.reduce((s, [, itens]) => s + itens.length, 0)} registros</span>
              )}
            </div>

            {historicoGrupos.length === 0 ? (
              <div className="px-5 py-12 text-center text-slate-600">
                <ArrowRightLeft size={28} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Nenhuma entrada registrada ainda.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/60 max-h-96 overflow-y-auto">
                {historicoGrupos.map(([dia, itens]) => {
                  const expanded = expandedGroups.has(dia);
                  const dataFormatada = new Date(dia + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
                  return (
                    <div key={dia}>
                      <button
                        onClick={() => toggleGroup(dia)}
                        className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-slate-800/40 transition-colors text-left"
                      >
                        <div className="w-8 h-8 rounded-lg bg-violet-600/20 flex items-center justify-center flex-shrink-0">
                          <ArrowRightLeft size={14} className="text-violet-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-slate-200 text-sm font-medium">{dataFormatada}</p>
                          <p className="text-slate-500 text-xs mt-0.5">{itens.length} {itens.length === 1 ? 'item' : 'itens'} recebidos</p>
                        </div>
                        {expanded
                          ? <ChevronUp size={15} className="text-slate-600 flex-shrink-0" />
                          : <ChevronDown size={15} className="text-slate-600 flex-shrink-0" />
                        }
                      </button>
                      {expanded && (
                        <div className="bg-slate-800/20 border-t border-slate-800/60">
                          {itens.map((item) => (
                            <div key={item.id} className="flex items-center gap-3 px-5 py-2.5 border-b border-slate-800/40 last:border-0">
                              <div className="w-6 h-6 rounded-md bg-slate-800 flex items-center justify-center flex-shrink-0">
                                <Package size={12} className="text-slate-400" />
                              </div>
                              <p className="text-slate-300 text-xs flex-1 truncate">{item.produtoNome}</p>
                              {item.observacao && (
                                <p className="text-slate-600 text-xs truncate max-w-24 hidden sm:block">{item.observacao}</p>
                              )}
                              <p className="text-violet-400 font-bold text-sm flex-shrink-0">{item.quantidade}</p>
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

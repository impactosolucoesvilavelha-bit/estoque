import { useState, useMemo } from 'react';
import { PackagePlus, CheckCircle, AlertTriangle, Plus, Trash2, Package, Calendar, ShoppingCart, History, ChevronDown, ChevronUp, ArrowRightLeft } from 'lucide-react';
import { useStore } from '../../store/useStore';

interface ItemLote {
  produtoId: string;
  produtoNome: string;
  unidade: string;
  quantidade: number;
  disponivel: number;
}

const today = () => new Date().toISOString().slice(0, 10);

export function Entrada() {
  const { currentUser, empresas, produtos, distribuicoes, addDistribuicoes } = useStore();
  const [success, setSuccess] = useState(false);
  const [data, setData] = useState(today());
  const [observacao, setObservacao] = useState('');
  const [lote, setLote] = useState<ItemLote[]>([]);
  const [selecionado, setSelecionado] = useState('');
  const [qtdTemp, setQtdTemp] = useState(1);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const empresa = useMemo(
    () => empresas.find((e) => e.id === currentUser?.empresaId),
    [empresas, currentUser]
  );

  const produtosDisponiveis = useMemo(
    () => produtos.filter((p) => p.estoqueTotal > 0),
    [produtos]
  );

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

  /* Produto selecionado no picker */
  const produtoSelecionado = produtos.find((p) => p.id === selecionado);

  /* IDs já no lote para desabilitar duplicatas */
  const idsNoLote = new Set(lote.map((i) => i.produtoId));

  const adicionarAoLote = () => {
    if (!produtoSelecionado || qtdTemp <= 0 || qtdTemp > produtoSelecionado.estoqueTotal) return;
    setLote((prev) => [
      ...prev,
      {
        produtoId: produtoSelecionado.id,
        produtoNome: produtoSelecionado.nome,
        unidade: produtoSelecionado.unidade,
        quantidade: qtdTemp,
        disponivel: produtoSelecionado.estoqueTotal,
      },
    ]);
    setSelecionado('');
    setQtdTemp(1);
  };

  const removerDoLote = (produtoId: string) =>
    setLote((prev) => prev.filter((i) => i.produtoId !== produtoId));

  const atualizarQtdLote = (produtoId: string, qtd: number) =>
    setLote((prev) =>
      prev.map((i) =>
        i.produtoId === produtoId
          ? { ...i, quantidade: Math.max(1, Math.min(qtd, i.disponivel)) }
          : i
      )
    );

  const confirmarEntrada = () => {
    if (!empresa || lote.length === 0) return;
    const dataISO = new Date(data).toISOString();
    addDistribuicoes(
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
    setLote([]);
    setData(today());
    setObservacao('');
    setSuccess(true);
    setTimeout(() => setSuccess(false), 5000);
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

      {produtosDisponiveis.length === 0 && (
        <div className="flex items-center gap-3 p-4 bg-amber-950/30 border border-amber-800/40 rounded-2xl">
          <AlertTriangle size={18} className="text-amber-400 flex-shrink-0" />
          <p className="text-amber-300 text-sm">Nenhum material disponível no estoque central.</p>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,480px)_1fr] gap-5 items-start">

        {/* ── Coluna esquerda: formulário ── */}
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

          {/* Picker de material */}
          <div className="px-5 py-4 border-b border-slate-800">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Adicionar Material</p>
            <div className="flex gap-2">
              <select
                value={selecionado}
                onChange={(e) => { setSelecionado(e.target.value); setQtdTemp(1); }}
                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-0"
              >
                <option value="">Selecione o material</option>
                {produtosDisponiveis
                  .filter((p) => !idsNoLote.has(p.id))
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome} ({p.estoqueTotal} {p.unidade})
                    </option>
                  ))}
              </select>
              <input
                type="number"
                min={1}
                max={produtoSelecionado?.estoqueTotal}
                value={qtdTemp}
                onChange={(e) => setQtdTemp(Number(e.target.value))}
                className="w-20 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm text-center font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={adicionarAoLote}
                disabled={!selecionado || qtdTemp <= 0 || (produtoSelecionado ? qtdTemp > produtoSelecionado.estoqueTotal : false)}
                className="w-10 h-10 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-all flex-shrink-0"
              >
                <Plus size={18} className="text-white" />
              </button>
            </div>
            {produtoSelecionado && (
              <p className="text-xs text-slate-600 mt-1.5">
                Disponível no estoque central: <span className="text-slate-400 font-medium">{produtoSelecionado.estoqueTotal} {produtoSelecionado.unidade}</span>
              </p>
            )}
          </div>

          {/* Lista do lote */}
          {lote.length === 0 ? (
            <div className="px-5 py-8 text-center text-slate-600">
              <ShoppingCart size={28} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">Nenhum material adicionado ainda.</p>
            </div>
          ) : (
            <div>
              <div className="px-5 py-2 bg-slate-800/30 flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Materiais a receber — {lote.length} item(ns)
                </p>
              </div>
              <div className="divide-y divide-slate-800/60">
                {lote.map((item) => (
                  <div key={item.produtoId} className="px-5 py-3 flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-violet-600/20 flex items-center justify-center flex-shrink-0">
                      <Package size={14} className="text-violet-400" />
                    </div>
                    <p className="text-white text-sm font-medium flex-1 truncate">{item.produtoNome}</p>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => atualizarQtdLote(item.produtoId, item.quantidade - 1)}
                        className="w-6 h-6 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-400 flex items-center justify-center text-xs font-bold transition-all"
                      >−</button>
                      <span className="w-10 text-center text-white font-bold text-sm">{item.quantidade}</span>
                      <button
                        onClick={() => atualizarQtdLote(item.produtoId, item.quantidade + 1)}
                        disabled={item.quantidade >= item.disponivel}
                        className="w-6 h-6 rounded-md bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-400 flex items-center justify-center text-xs font-bold transition-all"
                      >+</button>
                      <span className="text-slate-600 text-xs ml-1">{item.unidade}</span>
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
            </div>
          )}

          {/* Confirmar */}
          <div className="px-5 py-4 border-t border-slate-800">
            <button
              onClick={confirmarEntrada}
              disabled={lote.length === 0}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm transition-all shadow-lg shadow-violet-900/30"
            >
              <PackagePlus size={18} />
              Confirmar Entrada
              {lote.length > 0 && (
                <span className="bg-violet-500 text-white text-xs font-bold px-2 py-0.5 rounded-full ml-1">
                  {lote.length} {lote.length === 1 ? 'item' : 'itens'}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* ── Coluna direita: histórico de entradas ── */}
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
            <div className="divide-y divide-slate-800/60 max-h-[600px] overflow-y-auto">
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
  );
}

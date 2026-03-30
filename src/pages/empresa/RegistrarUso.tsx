import { useState, useMemo } from 'react';
import { ClipboardList, CheckCircle, AlertTriangle, Church, Hash, Plus, Trash2, Package, Calendar, ShoppingCart, History, ChevronDown, ChevronUp } from 'lucide-react';
import { useStore } from '../../store/useStore';

interface ItemLote {
  produtoId: string;
  produtoNome: string;
  unidade: string;
  quantidade: number;
  disponivel: number;
  observacao: string;
}

const today = () => new Date().toISOString().slice(0, 10);

export function RegistrarUso() {
  const { currentUser, empresas, distribuicoes, usos, addUsos, produtos } = useStore();
  const [success, setSuccess] = useState(false);
  const [igreja, setIgreja] = useState('');
  const [numeroPedido, setNumeroPedido] = useState('');
  const [data, setData] = useState(today());
  const [lote, setLote] = useState<ItemLote[]>([]);
  const [selecionado, setSelecionado] = useState('');
  const [qtdTemp, setQtdTemp] = useState(1);
  const [obsTemp, setObsTemp] = useState('');
  const [expandedPedidos, setExpandedPedidos] = useState<Set<string>>(new Set());

  const empresa = useMemo(
    () => empresas.find((e) => e.id === currentUser?.empresaId),
    [empresas, currentUser]
  );

  /* Calcula disponível por produto no mini-estoque desta empresa */
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

  /* Descontando o que já está no lote atual */
  const disponivelReal = useMemo(() => {
    const base = { ...disponivelPorProduto };
    lote.forEach((item) => {
      if (base[item.produtoId]) {
        base[item.produtoId] = { ...base[item.produtoId], disponivel: base[item.produtoId].disponivel - item.quantidade };
      }
    });
    return base;
  }, [disponivelPorProduto, lote]);

  const produtosDisponiveis = Object.entries(disponivelReal).filter(([, v]) => v.disponivel > 0);
  const idsNoLote = new Set(lote.map((i) => i.produtoId));
  const produtoSelecionado = selecionado ? disponivelReal[selecionado] : null;

  // Histórico de usos agrupado por pedido
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

  const adicionarAoLote = () => {
    if (!selecionado || !produtoSelecionado || qtdTemp <= 0 || qtdTemp > produtoSelecionado.disponivel) return;
    setLote((prev) => [
      ...prev,
      {
        produtoId: selecionado,
        produtoNome: produtoSelecionado.nome,
        unidade: produtoSelecionado.unidade,
        quantidade: qtdTemp,
        disponivel: (disponivelPorProduto[selecionado]?.disponivel ?? 0),
        observacao: obsTemp.trim(),
      },
    ]);
    setSelecionado('');
    setQtdTemp(1);
    setObsTemp('');
  };

  const removerDoLote = (produtoId: string) =>
    setLote((prev) => prev.filter((i) => i.produtoId !== produtoId));

  const atualizarQtdLote = (produtoId: string, qtd: number) => {
    const max = disponivelPorProduto[produtoId]?.disponivel ?? 999;
    setLote((prev) =>
      prev.map((i) =>
        i.produtoId === produtoId
          ? { ...i, quantidade: Math.max(1, Math.min(qtd, max)) }
          : i
      )
    );
  };

  const isValido = igreja.trim() && numeroPedido.trim() && lote.length > 0;

  const lancarAtendimento = () => {
    if (!isValido || !empresa) return;
    const dataISO = new Date(data).toISOString();
    addUsos(
      lote.map((item) => ({
        empresaId: empresa.id,
        empresaNome: empresa.nome,
        igreja: igreja.trim(),
        numeroPedido: numeroPedido.trim(),
        produtoId: item.produtoId,
        produtoNome: item.produtoNome,
        quantidade: item.quantidade,
        data: dataISO,
        observacao: item.observacao || undefined,
      }))
    );
    setLote([]);
    setIgreja('');
    setNumeroPedido('');
    setData(today());
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

      {semEstoque && (
        <div className="flex items-center gap-3 p-4 bg-amber-950/30 border border-amber-800/40 rounded-2xl">
          <AlertTriangle size={18} className="text-amber-400 flex-shrink-0" />
          <p className="text-amber-300 text-sm">Nenhum material disponível. Registre uma entrada primeiro.</p>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,480px)_1fr] gap-5 items-start">

      {/* ── Coluna esquerda: formulário ── */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">

        {/* Bloco: Atendimento */}
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

        {/* Bloco: Adicionar material */}
        <div className="px-5 py-4 border-b border-slate-800">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Adicionar Material</p>

          <div className="flex gap-2 mb-2">
            <select
              value={selecionado}
              onChange={(e) => { setSelecionado(e.target.value); setQtdTemp(1); }}
              disabled={semEstoque}
              className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-0 disabled:opacity-50"
            >
              <option value="">Selecione o material</option>
              {produtosDisponiveis
                .filter(([id]) => !idsNoLote.has(id))
                .map(([id, item]) => (
                  <option key={id} value={id}>
                    {item.nome} ({item.disponivel} {item.unidade})
                  </option>
                ))}
            </select>
            <input
              type="number"
              min={1}
              max={produtoSelecionado?.disponivel}
              value={qtdTemp}
              onChange={(e) => setQtdTemp(Number(e.target.value))}
              className="w-20 bg-slate-800 border border-slate-700 rounded-xl px-2 py-2.5 text-white text-sm text-center font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={adicionarAoLote}
              disabled={!selecionado || qtdTemp <= 0 || (produtoSelecionado ? qtdTemp > produtoSelecionado.disponivel : false)}
              className="w-10 h-10 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-all flex-shrink-0"
            >
              <Plus size={18} className="text-white" />
            </button>
          </div>

          {selecionado && (
            <input
              type="text"
              value={obsTemp}
              onChange={(e) => setObsTemp(e.target.value)}
              placeholder="Observação deste material (opcional)"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}
        </div>

        {/* Lista do lote */}
        {lote.length === 0 ? (
          <div className="px-5 py-8 text-center text-slate-600">
            <ShoppingCart size={28} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">Nenhum material adicionado ainda.</p>
            <p className="text-xs mt-1 text-slate-700">Selecione os materiais utilizados no atendimento acima.</p>
          </div>
        ) : (
          <div>
            <div className="px-5 py-2 bg-slate-800/30 flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Materiais do atendimento — {lote.length} item(ns)
              </p>
            </div>
            <div className="divide-y divide-slate-800/60">
              {lote.map((item) => (
                <div key={item.produtoId} className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-blue-600/20 flex items-center justify-center flex-shrink-0">
                      <Package size={14} className="text-blue-400" />
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
                  {item.observacao && (
                    <p className="text-slate-600 text-xs mt-1 pl-10 truncate">{item.observacao}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Botão lançar */}
        <div className="px-5 py-4 border-t border-slate-800">
          {!igreja.trim() && lote.length > 0 && (
            <p className="text-amber-400 text-xs mb-2 text-center">Preencha o nome da Igreja e o Pedido para confirmar.</p>
          )}
          <button
            onClick={lancarAtendimento}
            disabled={!isValido}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm transition-all shadow-lg shadow-blue-900/30"
          >
            <ClipboardList size={18} />
            Lançar Atendimento
            {lote.length > 0 && (
              <span className="bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded-full ml-1">
                {lote.length} {lote.length === 1 ? 'material' : 'materiais'}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── Coluna direita: histórico de atendimentos ── */}
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
                        <p className="text-slate-500 text-xs">{new Date(pedido.data).toLocaleDateString('pt-BR')}</p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 flex-shrink-0 mr-1">{pedido.itens.length} mat.</p>
                    {expanded
                      ? <ChevronUp size={15} className="text-slate-600 flex-shrink-0" />
                      : <ChevronDown size={15} className="text-slate-600 flex-shrink-0" />
                    }
                  </button>
                  {expanded && (
                    <div className="bg-slate-800/20 border-t border-slate-800/60">
                      {pedido.itens.map((item, i) => (
                        <div key={i} className="flex items-center gap-3 px-5 py-2.5 border-b border-slate-800/40 last:border-0">
                          <div className="w-6 h-6 rounded-md bg-slate-800 flex items-center justify-center flex-shrink-0">
                            <Package size={12} className="text-slate-400" />
                          </div>
                          <p className="text-slate-300 text-xs flex-1 truncate">{item.produtoNome}</p>
                          {item.observacao && (
                            <p className="text-slate-600 text-xs truncate max-w-24 hidden sm:block">{item.observacao}</p>
                          )}
                          <p className="text-amber-400 font-bold text-sm flex-shrink-0">{item.quantidade}</p>
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

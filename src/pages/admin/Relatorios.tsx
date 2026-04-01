import { useState, useMemo } from 'react';
import {
  FileBarChart2, Download, Search, Building2, Church, Hash,
  PackageIcon, ChevronDown, ChevronUp, CheckCircle2, Clock,
  Archive, ArchiveRestore, FileCheck2, AlertCircle
} from 'lucide-react';
import { useStore } from '../../store/useStore';

interface ItemRelatorio {
  produtoId: string;
  produtoNome: string;
  quantidade: number;
  observacao?: string;
  /** Data/hora deste lançamento (cada linha de uso) */
  data: string;
}

interface PedidoAgrupado {
  chave: string;
  numeroPedido: string;
  igreja: string;
  empresaId: string;
  empresaNome: string;
  data: string;
  itens: ItemRelatorio[];
  totalItens: number;
}

export function Relatorios() {
  const { empresas, usos, produtos, pedidosNF, atualizarStatusNF, arquivarPedidoNF, desarquivarPedidoNF } = useStore();
  const [filtroEmpresa, setFiltroEmpresa] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'em_aberto' | 'emitida'>('todos');
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');
  const [search, setSearch] = useState('');
  const [mostrarArquivados, setMostrarArquivados] = useState(false);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const [confirmEmitir, setConfirmEmitir] = useState<string | null>(null);

  const toggleExpand = (key: string) =>
    setExpandedKeys((prev) => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });

  const getStatus = (chave: string) => pedidosNF[chave]?.status ?? 'em_aberto';
  const isArquivado = (chave: string) => pedidosNF[chave]?.arquivado ?? false;
  const getEmitidaEm = (chave: string) => pedidosNF[chave]?.emitidaEm;

  const usosFiltrados = useMemo(() => {
    return usos.filter((u) => {
      if (filtroEmpresa && u.empresaId !== filtroEmpresa) return false;
      if (filtroDataInicio && u.data < filtroDataInicio) return false;
      if (filtroDataFim && u.data > filtroDataFim + 'T23:59:59') return false;
      if (search) {
        const s = search.toLowerCase();
        const pr = produtos.find((p) => p.id === u.produtoId);
        const marcaModelo = [pr?.marca, pr?.modelo].filter(Boolean).join(' ').toLowerCase();
        return (
          u.igreja.toLowerCase().includes(s) ||
          u.numeroPedido.toLowerCase().includes(s) ||
          u.produtoNome.toLowerCase().includes(s) ||
          u.empresaNome.toLowerCase().includes(s) ||
          marcaModelo.includes(s) ||
          u.produtoId.toLowerCase().includes(s)
        );
      }
      return true;
    });
  }, [usos, produtos, filtroEmpresa, filtroDataInicio, filtroDataFim, search]);

  const pedidosAgrupados = useMemo((): PedidoAgrupado[] => {
    const map: Record<string, PedidoAgrupado> = {};
    usosFiltrados.forEach((u) => {
      const chave = `${u.empresaId}__${u.numeroPedido}`;
      if (!map[chave]) {
        map[chave] = { chave, numeroPedido: u.numeroPedido, igreja: u.igreja, empresaId: u.empresaId, empresaNome: u.empresaNome, data: u.data, itens: [], totalItens: 0 };
      }
      if (u.data > map[chave].data) map[chave].data = u.data;
      map[chave].itens.push({
        produtoId: u.produtoId,
        produtoNome: u.produtoNome,
        quantidade: u.quantidade,
        observacao: u.observacao,
        data: u.data,
      });
      map[chave].totalItens += u.quantidade;
    });
    return Object.values(map)
      .filter((p) => {
        const status = getStatus(p.chave);
        const arq = isArquivado(p.chave);
        if (!mostrarArquivados && arq) return false;
        if (filtroStatus !== 'todos' && status !== filtroStatus) return false;
        return true;
      })
      .sort((a, b) => b.data.localeCompare(a.data));
  }, [usosFiltrados, pedidosNF, filtroStatus, mostrarArquivados]);

  const contadores = useMemo(() => {
    const todos: Record<string, PedidoAgrupado> = {};
    usos.forEach((u) => {
      const chave = `${u.empresaId}__${u.numeroPedido}`;
      if (!todos[chave]) todos[chave] = { chave, numeroPedido: u.numeroPedido, igreja: u.igreja, empresaId: u.empresaId, empresaNome: u.empresaNome, data: u.data, itens: [], totalItens: 0 };
    });
    const list = Object.keys(todos);
    return {
      emAberto: list.filter((c) => getStatus(c) === 'em_aberto' && !isArquivado(c)).length,
      emitidas: list.filter((c) => getStatus(c) === 'emitida' && !isArquivado(c)).length,
      arquivados: list.filter((c) => isArquivado(c)).length,
    };
  }, [usos, pedidosNF]);

  const expandirTodos = () => setExpandedKeys(new Set(pedidosAgrupados.map((p) => p.chave)));
  const recolherTodos = () => setExpandedKeys(new Set());

  const exportarCSV = () => {
    const rows = pedidosAgrupados.flatMap((p) =>
      p.itens.map((item) => {
        const pr = produtos.find((x) => x.id === item.produtoId);
        return [
          new Date(p.data).toLocaleDateString('pt-BR'),
          p.empresaNome,
          p.numeroPedido,
          p.igreja,
          getStatus(p.chave) === 'emitida' ? 'Emitida' : 'Em Aberto',
          item.produtoId,
          item.produtoNome,
          pr?.marca || '',
          pr?.modelo || '',
          pr?.unidade || '',
          new Date(item.data).toLocaleString('pt-BR'),
          item.quantidade,
          item.observacao || '',
        ];
      })
    );
    const headers = [
      'Data pedido',
      'Empresa',
      'Nº Pedido',
      'Igreja',
      'Status NF',
      'ID produto',
      'Produto',
      'Marca',
      'Modelo',
      'Unidade',
      'Data/hora uso',
      'Quantidade',
      'Observação',
    ];
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-nf-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">Relatórios / NF</h1>
          <p className="text-slate-400 text-sm mt-0.5">Gerencie os pedidos e emissão de nota fiscal</p>
        </div>
        <button
          onClick={exportarCSV}
          disabled={pedidosAgrupados.length === 0}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all"
        >
          <Download size={18} />
          <span className="hidden sm:inline">Exportar CSV</span>
        </button>
      </div>

      {/* Cards de status */}
      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={() => setFiltroStatus(filtroStatus === 'em_aberto' ? 'todos' : 'em_aberto')}
          className={`rounded-2xl border p-4 text-left transition-all ${filtroStatus === 'em_aberto' ? 'border-amber-500 bg-amber-950/40' : 'border-slate-800 bg-slate-900 hover:border-slate-700'}`}
        >
          <div className="flex items-center justify-between mb-2">
            <Clock size={18} className="text-amber-400" />
            {filtroStatus === 'em_aberto' && <span className="text-xs text-amber-400 font-medium">filtrado</span>}
          </div>
          <p className="text-2xl font-bold text-white">{contadores.emAberto}</p>
          <p className="text-xs text-slate-400 mt-0.5">Em Aberto</p>
        </button>

        <button
          onClick={() => setFiltroStatus(filtroStatus === 'emitida' ? 'todos' : 'emitida')}
          className={`rounded-2xl border p-4 text-left transition-all ${filtroStatus === 'emitida' ? 'border-emerald-500 bg-emerald-950/40' : 'border-slate-800 bg-slate-900 hover:border-slate-700'}`}
        >
          <div className="flex items-center justify-between mb-2">
            <CheckCircle2 size={18} className="text-emerald-400" />
            {filtroStatus === 'emitida' && <span className="text-xs text-emerald-400 font-medium">filtrado</span>}
          </div>
          <p className="text-2xl font-bold text-white">{contadores.emitidas}</p>
          <p className="text-xs text-slate-400 mt-0.5">NF Emitida</p>
        </button>

        <button
          onClick={() => setMostrarArquivados(!mostrarArquivados)}
          className={`rounded-2xl border p-4 text-left transition-all ${mostrarArquivados ? 'border-slate-600 bg-slate-800/60' : 'border-slate-800 bg-slate-900 hover:border-slate-700'}`}
        >
          <div className="flex items-center justify-between mb-2">
            <Archive size={18} className="text-slate-500" />
            {mostrarArquivados && <span className="text-xs text-slate-400 font-medium">visível</span>}
          </div>
          <p className="text-2xl font-bold text-white">{contadores.arquivados}</p>
          <p className="text-xs text-slate-400 mt-0.5">Arquivados</p>
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
        <p className="text-sm font-medium text-slate-400">Filtros</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <select
            value={filtroEmpresa}
            onChange={(e) => setFiltroEmpresa(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todas as empresas</option>
            {empresas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
          </select>
          <input type="date" value={filtroDataInicio} onChange={(e) => setFiltroDataInicio(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <input type="date" value={filtroDataFim} onChange={(e) => setFiltroDataFim(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por empresa, pedido, igreja ou material..."
            className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Lista */}
      {pedidosAgrupados.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <FileBarChart2 size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhum pedido encontrado com os filtros aplicados.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-400">
              <span className="text-white font-semibold">{pedidosAgrupados.length}</span> pedido(s)
            </p>
            <div className="flex gap-3 text-xs">
              <button onClick={expandirTodos} className="text-slate-400 hover:text-white transition-colors">Expandir todos</button>
              <span className="text-slate-700">|</span>
              <button onClick={recolherTodos} className="text-slate-400 hover:text-white transition-colors">Recolher todos</button>
            </div>
          </div>

          {pedidosAgrupados.map((pedido) => {
            const status = getStatus(pedido.chave);
            const arq = isArquivado(pedido.chave);
            const emitidaEm = getEmitidaEm(pedido.chave);
            const isExpanded = expandedKeys.has(pedido.chave);
            const emAberto = status === 'em_aberto';

            return (
              <div
                key={pedido.chave}
                className={`rounded-2xl overflow-hidden border transition-all ${
                  arq
                    ? 'border-slate-800/50 opacity-60'
                    : emAberto
                    ? 'border-amber-800/40 bg-slate-900'
                    : 'border-emerald-800/30 bg-slate-900'
                }`}
              >
                {/* Status badge topo */}
                <div className={`px-5 py-2 flex items-center justify-between ${
                  arq ? 'bg-slate-800/40' : emAberto ? 'bg-amber-950/30' : 'bg-emerald-950/20'
                }`}>
                  <div className="flex items-center gap-2">
                    {arq ? (
                      <><Archive size={13} className="text-slate-500" /><span className="text-slate-500 text-xs font-semibold">ARQUIVADO</span></>
                    ) : emAberto ? (
                      <><Clock size={13} className="text-amber-400" /><span className="text-amber-400 text-xs font-semibold uppercase">Em Aberto</span></>
                    ) : (
                      <><CheckCircle2 size={13} className="text-emerald-400" /><span className="text-emerald-400 text-xs font-semibold uppercase">NF Emitida</span></>
                    )}
                    {emitidaEm && !arq && (
                      <span className="text-slate-600 text-xs">em {new Date(emitidaEm).toLocaleDateString('pt-BR')}</span>
                    )}
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-2">
                    {arq ? (
                      <button
                        onClick={() => desarquivarPedidoNF(pedido.chave)}
                        className="flex items-center gap-1 text-xs text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 px-2.5 py-1 rounded-lg transition-all"
                      >
                        <ArchiveRestore size={13} />
                        Desarquivar
                      </button>
                    ) : emAberto ? (
                      <button
                        onClick={() => setConfirmEmitir(pedido.chave)}
                        className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 border border-emerald-800/50 hover:border-emerald-600 px-2.5 py-1 rounded-lg transition-all"
                      >
                        <FileCheck2 size={13} />
                        Marcar NF Emitida
                      </button>
                    ) : (
                      <button
                        onClick={() => arquivarPedidoNF(pedido.chave)}
                        className="flex items-center gap-1 text-xs text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 px-2.5 py-1 rounded-lg transition-all"
                      >
                        <Archive size={13} />
                        Arquivar
                      </button>
                    )}
                  </div>
                </div>

                {/* Corpo do card */}
                <button
                  className="w-full px-5 py-4 flex items-start gap-4 hover:bg-slate-800/20 transition-colors text-left"
                  onClick={() => toggleExpand(pedido.chave)}
                >
                  <div className="w-9 h-9 rounded-xl bg-emerald-600/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Building2 size={16} className="text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-400 text-xs">{pedido.empresaNome}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Church size={14} className="text-blue-400 flex-shrink-0" />
                      <p className="text-white font-bold text-base truncate">{pedido.igreja}</p>
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <Hash size={12} className="text-violet-400" />
                      <p className="text-violet-400 font-mono text-xs font-semibold">{pedido.numeroPedido}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 flex flex-col items-end gap-1">
                    <p className="text-xs text-slate-500">{new Date(pedido.data).toLocaleDateString('pt-BR')}</p>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-slate-500">{pedido.itens.length} produto(s)</span>
                      <span className="bg-amber-600/20 text-amber-400 text-xs font-bold px-2 py-0.5 rounded-full">
                        {pedido.totalItens} itens
                      </span>
                    </div>
                    <span className="text-slate-600 mt-1">
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </span>
                  </div>
                </button>

                {/* Itens expandidos */}
                {isExpanded && (
                  <div className="border-t border-slate-800">
                    <div className="px-5 py-2 bg-slate-800/50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      <span className="flex items-center gap-1.5"><PackageIcon size={12} /> Materiais utilizados</span>
                    </div>
                    {pedido.itens.map((item, i) => {
                      const pr = produtos.find((x) => x.id === item.produtoId);
                      const dataUso = new Date(item.data);
                      return (
                        <div
                          key={`${item.produtoId}-${item.data}-${i}`}
                          className="px-5 py-3 border-t border-slate-800/60 hover:bg-slate-800/20 transition-colors"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-emerald-900/50 flex items-center justify-center flex-shrink-0">
                              <PackageIcon size={16} className="text-emerald-500" />
                            </div>
                            <div className="flex-1 min-w-0 space-y-2">
                              <p className="text-white text-sm font-semibold leading-snug">{item.produtoNome}</p>
                              <div className="flex flex-wrap gap-2 text-xs">
                                {pr?.marca && (
                                  <span className="text-slate-300 bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700">
                                    Marca: <span className="text-slate-100">{pr.marca}</span>
                                  </span>
                                )}
                                {pr?.modelo && (
                                  <span className="text-blue-300 bg-blue-950/40 px-2 py-0.5 rounded-md border border-blue-900/50">
                                    Modelo: <span className="text-blue-100">{pr.modelo}</span>
                                  </span>
                                )}
                                <span className="text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-md">
                                  Unidade: <span className="text-slate-200">{pr?.unidade ?? '—'}</span>
                                </span>
                                <span className="text-slate-500 bg-slate-800/50 px-2 py-0.5 rounded-md">
                                  ID: <span className="font-mono text-slate-400">{item.produtoId}</span>
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                                <span>
                                  Data/hora do uso:{' '}
                                  <span className="text-slate-300">
                                    {dataUso.toLocaleString('pt-BR', {
                                      day: '2-digit',
                                      month: 'short',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </span>
                                </span>
                              </div>
                              <p className="text-slate-400 text-xs leading-relaxed border-l-2 border-slate-600 pl-2">
                                <span className="text-slate-500">Observação: </span>
                                {item.observacao || '—'}
                              </p>
                            </div>
                            <div className="flex sm:flex-col items-center sm:items-end gap-1 sm:min-w-[5rem] flex-shrink-0">
                              <span className="text-[10px] uppercase text-slate-500 font-semibold sm:hidden">Quantidade</span>
                              <span className="text-amber-400 font-bold text-lg tabular-nums">{item.quantidade}</span>
                              <span className="text-slate-500 text-xs">{pr?.unidade ?? 'un'}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div className="px-5 py-3 bg-slate-800/30 border-t border-slate-700/50 flex items-center justify-between">
                      <p className="text-xs text-slate-500">Total do pedido</p>
                      <p className="text-amber-400 font-bold">{pedido.totalItens} itens</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Confirm emitir modal */}
      {confirmEmitir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setConfirmEmitir(null)} />
          <div className="relative bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-600/20 flex items-center justify-center">
                <FileCheck2 size={20} className="text-emerald-400" />
              </div>
              <div>
                <p className="text-white font-bold">Marcar NF como Emitida?</p>
                <p className="text-slate-500 text-xs mt-0.5">Esta ação pode ser desfeita reabrindo o pedido.</p>
              </div>
            </div>
            <div className="p-3 bg-amber-950/30 border border-amber-800/40 rounded-xl flex items-start gap-2 mb-5">
              <AlertCircle size={15} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-amber-300 text-xs">Após marcar como emitida, o pedido poderá ser arquivado para não aparecer na lista principal.</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmEmitir(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-sm font-medium hover:text-white transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={() => { atualizarStatusNF(confirmEmitir, 'emitida'); setConfirmEmitir(null); }}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold transition-all"
              >
                Confirmar Emissão
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

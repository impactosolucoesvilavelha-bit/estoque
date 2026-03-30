export type UserRole = 'admin' | 'empresa';

export interface User {
  id: string;
  nome: string;
  role: UserRole;
  empresaId?: string; // apenas para usuários empresa
}

export interface Produto {
  id: string;
  nome: string;
  unidade: string;
  estoqueTotal: number;
  criadoEm: string;
}

export interface Empresa {
  id: string;
  nome: string;
  cnpj: string;
  contato: string;
  criadoEm: string;
}

export interface Distribuicao {
  id: string;
  empresaId: string;
  empresaNome: string;
  produtoId: string;
  produtoNome: string;
  quantidade: number;
  data: string;
  observacao?: string;
}

export interface UsoMaterial {
  id: string;
  empresaId: string;
  empresaNome: string;
  igreja: string;
  numeroPedido: string;
  produtoId: string;
  produtoNome: string;
  quantidade: number;
  data: string;
  observacao?: string;
}

export type StatusNF = 'em_aberto' | 'emitida';

export interface PedidoNFStatus {
  status: StatusNF;
  arquivado: boolean;
  emitidaEm?: string;
}

export interface MiniEstoque {
  empresaId: string;
  produtoId: string;
  produtoNome: string;
  unidade: string;
  quantidadeRecebida: number;
  quantidadeUsada: number;
  quantidadeDisponivel: number;
}

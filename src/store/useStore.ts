import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  updatePassword,
} from 'firebase/auth';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  ref as dbRef,
  onValue,
  set as dbSet,
  update as dbUpdate,
  remove as dbRemove,
  get as dbGet,
  type Unsubscribe,
} from 'firebase/database';
import { auth, db, firebaseConfig } from '../lib/firebase';
import type {
  User, Produto, Empresa, Distribuicao, UsoMaterial, PedidoNFStatus, StatusNF,
} from '../types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const generateId = () => Math.random().toString(36).slice(2, 11);

/** Normaliza nome (sem o sufixo de email) */
const normalizarNome = (nome: string) =>
  nome.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');

/** Normaliza nome para email Firebase (usado só para o admin) */
const toEmail = (nome: string) => normalizarNome(nome) + '@gabriel-estoque.com';

/** Objeto Firebase → array com id injetado */
const toArray = <T>(obj: Record<string, Omit<T, 'id'>> | null): T[] =>
  obj ? Object.entries(obj).map(([id, v]) => ({ id, ...(v as object) } as T)) : [];

/** Firebase RTDB não permite . # $ [ ] / nas chaves */
const fbSafeKey = (key: string) => key.replace(/[.#$[\]/]/g, '_');

// ─── Subscriptions ───────────────────────────────────────────────────────────

const unsubs: Unsubscribe[] = [];
/** Listeners admin por empresa (distribuicoes/{id}, usos/{id}) — não pode ler o nó pai por causa das regras RTDB */
const adminChildUnsubs: Unsubscribe[] = [];

function clearAdminChildSubs() {
  while (adminChildUnsubs.length) adminChildUnsubs.pop()?.();
}

function clearSubs() {
  while (unsubs.length) unsubs.pop()?.();
  clearAdminChildSubs();
}

function setupListeners(role: 'admin' | 'empresa', empresaId?: string) {
  clearSubs();

  // Todos os usuários precisam da lista de produtos
  unsubs.push(
    onValue(dbRef(db, 'produtos'), (snap) => {
      useStore.setState({ produtos: toArray<Produto>(snap.val()) });
    }),
  );

  if (role === 'admin') {
    // Empresas + listeners por empresa em distribuicoes/usos (regras RTDB não permitem .read no pai para não-admin)
    unsubs.push(
      onValue(dbRef(db, 'empresas'), (snap) => {
        useStore.setState({ empresas: toArray<Empresa>(snap.val()) });
        clearAdminChildSubs();
        const raw = snap.val() as Record<string, object> | null;
        if (!raw) {
          useStore.setState({ distribuicoes: [], usos: [] });
          return;
        }
        const empresaIds = Object.keys(raw);
        const distPorEmpresa: Record<string, Distribuicao[]> = {};
        const usosPorEmpresa: Record<string, UsoMaterial[]> = {};
        const mergeDist = () => {
          useStore.setState({ distribuicoes: Object.values(distPorEmpresa).flat() });
        };
        const mergeUsos = () => {
          useStore.setState({ usos: Object.values(usosPorEmpresa).flat() });
        };
        empresaIds.forEach((eid) => {
          distPorEmpresa[eid] = [];
          usosPorEmpresa[eid] = [];
          adminChildUnsubs.push(
            onValue(dbRef(db, `distribuicoes/${eid}`), (s) => {
              distPorEmpresa[eid] = toArray<Distribuicao>(s.val());
              mergeDist();
            }),
          );
          adminChildUnsubs.push(
            onValue(dbRef(db, `usos/${eid}`), (s) => {
              usosPorEmpresa[eid] = toArray<UsoMaterial>(s.val());
              mergeUsos();
            }),
          );
        });
        if (empresaIds.length === 0) {
          useStore.setState({ distribuicoes: [], usos: [] });
        }
      }),
    );

    // PedidosNF: campo "_k" guarda a chave original
    unsubs.push(
      onValue(dbRef(db, 'pedidosNF'), (snap) => {
        const data = snap.val() as Record<string, PedidoNFStatus & { _k?: string }> | null;
        const mapped: Record<string, PedidoNFStatus> = {};
        if (data) {
          Object.values(data).forEach((item) => {
            if (item._k) {
              const { _k, ...rest } = item;
              mapped[_k] = rest;
            }
          });
        }
        useStore.setState({ pedidosNF: mapped });
      }),
    );
  } else if (empresaId) {
    // Empresa: lê apenas os próprios dados (economiza downloads)
    unsubs.push(
      onValue(dbRef(db, `empresas/${empresaId}`), (snap) => {
        const data = snap.val();
        if (data) {
          useStore.setState({ empresas: [{ id: empresaId, ...data } as Empresa] });
        }
      }),
    );
    unsubs.push(
      onValue(dbRef(db, `distribuicoes/${empresaId}`), (snap) => {
        useStore.setState({ distribuicoes: toArray<Distribuicao>(snap.val()) });
      }),
    );
    unsubs.push(
      onValue(dbRef(db, `usos/${empresaId}`), (snap) => {
        useStore.setState({ usos: toArray<UsoMaterial>(snap.val()) });
      }),
    );
  }
}

// ─── Interface ───────────────────────────────────────────────────────────────

interface AppState {
  authReady: boolean;
  currentUser: User | null;
  /** UID em cache — usado para invalidar localStorage entre usuários */
  _uid: string | null;
  /** Empresa aguardando definir senha no primeiro login */
  aguardandoSenha: boolean;
  nomeAguardando: string | null;
  produtos: Produto[];
  empresas: Empresa[];
  distribuicoes: Distribuicao[];
  usos: UsoMaterial[];
  pedidosNF: Record<string, PedidoNFStatus>;

  initAuth: () => () => void;
  login: (nome: string, senha: string) => Promise<boolean>;
  logout: () => Promise<void>;
  definirSenha: (novaSenha: string) => Promise<boolean>;

  addProduto: (produto: Omit<Produto, 'id' | 'criadoEm'>) => void;
  updateProduto: (id: string, data: Partial<Produto>) => void;
  deleteProduto: (id: string) => void;

  addEmpresa: (empresa: Omit<Empresa, 'id' | 'criadoEm'>) => Promise<void>;
  updateEmpresa: (id: string, data: Partial<Empresa>) => void;
  deleteEmpresa: (id: string) => void;

  addDistribuicao: (dist: Omit<Distribuicao, 'id'>) => void;
  addDistribuicoes: (dists: Omit<Distribuicao, 'id'>[]) => Promise<void>;
  deleteDistribuicao: (id: string) => void;

  addUso: (uso: Omit<UsoMaterial, 'id'>) => void;
  addUsos: (usos: Omit<UsoMaterial, 'id'>[]) => void;
  deleteUso: (id: string) => void;

  atualizarStatusNF: (chave: string, status: StatusNF) => void;
  arquivarPedidoNF: (chave: string) => void;
  desarquivarPedidoNF: (chave: string) => void;
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({

      // Estado inicial
      authReady: false,
      currentUser: null,
      _uid: null,
      aguardandoSenha: false,
      nomeAguardando: null,
      produtos: [],
      empresas: [],
      distribuicoes: [],
      usos: [],
      pedidosNF: {},

      // ── Auth ────────────────────────────────────────────────────────────────

      initAuth: () => {
        return onAuthStateChanged(auth, async (fbUser) => {
          if (fbUser) {
            try {
              // Invalida cache se for um usuário diferente do anterior
              const cachedUid = get()._uid;
              if (cachedUid && cachedUid !== fbUser.uid) {
                set({ _uid: null, produtos: [], empresas: [], distribuicoes: [], usos: [], pedidosNF: {} });
              }

              // Lê o registro do usuário no RTDB com retry para evitar race condition no primeiro login
              let snap = await dbGet(dbRef(db, `users/${fbUser.uid}`));
              if (!snap.exists()) {
                await new Promise((r) => setTimeout(r, 1500));
                snap = await dbGet(dbRef(db, `users/${fbUser.uid}`));
              }

              if (snap.exists()) {
                const data = snap.val() as { nome: string; role: 'admin' | 'empresa'; empresaId?: string; primeiroLogin?: boolean };

                // Primeiro login: empresa precisa definir senha
                if (data.primeiroLogin) {
                  set({ aguardandoSenha: true, nomeAguardando: data.nome, authReady: true, _uid: fbUser.uid });
                  return;
                }

                const user: User = { id: fbUser.uid, nome: data.nome, role: data.role, empresaId: data.empresaId };

                setupListeners(data.role, data.empresaId);

                // Para empresa: tenta pré-carregar via dbGet antes de renderizar
                if (data.role === 'empresa' && data.empresaId) {
                  // Seta o usuário imediatamente (mostra loading no componente)
                  set({ currentUser: user, authReady: true, _uid: fbUser.uid, aguardandoSenha: false, nomeAguardando: null, empresas: [] });
                  // Busca a empresa diretamente e força atualização
                  try {
                    const eSnap = await dbGet(dbRef(db, `empresas/${data.empresaId}`));
                    if (eSnap.exists()) {
                      useStore.setState({ empresas: [{ id: data.empresaId, ...eSnap.val() } as Empresa] });
                    }
                  } catch { /* listener onValue vai tentar novamente */ }
                } else {
                  set({
                    currentUser: user,
                    authReady: true,
                    _uid: fbUser.uid,
                    aguardandoSenha: false,
                    nomeAguardando: null,
                  });
                }
              } else {
                await fbSignOut(auth);
                set({ currentUser: null, authReady: true });
              }
            } catch {
              set({ currentUser: null, authReady: true });
            }
          } else {
            clearSubs();
            set({ currentUser: null, authReady: true, produtos: [], empresas: [], distribuicoes: [], usos: [], pedidosNF: {} });
          }
        });
      },

      login: async (nome, senha) => {
        // Empresas usam email único por ID, guardado no login_index
        const chave = normalizarNome(nome);
        try {
          const indexSnap = await dbGet(dbRef(db, `login_index/${chave}`));
          if (indexSnap.exists()) {
            await signInWithEmailAndPassword(auth, indexSnap.val() as string, senha);
            return true;
          }
        } catch {
          // Fallback: tenta email direto (admin e retrocompatibilidade)
        }
        try {
          await signInWithEmailAndPassword(auth, toEmail(nome), senha);
          return true;
        } catch {
          return false;
        }
      },

      logout: async () => {
        clearSubs();
        await fbSignOut(auth);
        useStore.persist.clearStorage();
        set({ aguardandoSenha: false, nomeAguardando: null });
      },

      definirSenha: async (novaSenha) => {
        const fbUser = auth.currentUser;
        if (!fbUser) return false;
        try {
          await updatePassword(fbUser, novaSenha);
          await dbUpdate(dbRef(db, `users/${fbUser.uid}`), { primeiroLogin: false });
          const snap = await dbGet(dbRef(db, `users/${fbUser.uid}`));
          if (!snap.exists()) return false;
          const data = snap.val() as { nome: string; role: 'admin' | 'empresa'; empresaId?: string };
          const user: User = { id: fbUser.uid, nome: data.nome, role: data.role, empresaId: data.empresaId };

          setupListeners(data.role, data.empresaId);
          set({ currentUser: user, aguardandoSenha: false, nomeAguardando: null, _uid: fbUser.uid, empresas: [] });

          if (data.role === 'empresa' && data.empresaId) {
            try {
              const eSnap = await dbGet(dbRef(db, `empresas/${data.empresaId}`));
              if (eSnap.exists()) {
                useStore.setState({ empresas: [{ id: data.empresaId, ...eSnap.val() } as Empresa] });
              }
            } catch { /* listener onValue vai tentar novamente */ }
          }
          return true;
        } catch {
          return false;
        }
      },

      // ── Produtos ────────────────────────────────────────────────────────────

      addProduto: (data) => {
        const id = generateId();
        const produto: Produto = { ...data, id, criadoEm: new Date().toISOString() };
        set((s) => ({ produtos: [...s.produtos, produto] }));
        dbSet(dbRef(db, `produtos/${id}`), produto);
      },

      updateProduto: (id, data) => {
        set((s) => ({ produtos: s.produtos.map((p) => (p.id === id ? { ...p, ...data } : p)) }));
        dbUpdate(dbRef(db, `produtos/${id}`), data as Record<string, unknown>);
      },

      deleteProduto: (id) => {
        set((s) => ({ produtos: s.produtos.filter((p) => p.id !== id) }));
        dbRemove(dbRef(db, `produtos/${id}`));
      },

      // ── Empresas ────────────────────────────────────────────────────────────

      addEmpresa: async (data) => {
        const id = generateId();
        const empresa: Empresa = { ...data, id, criadoEm: new Date().toISOString() };
        const cnpjDigits = data.cnpj.replace(/\D/g, '');
        const senha = cnpjDigits.length >= 6 ? cnpjDigits.slice(0, 8) : 'empresa123';
        // Email único por ID de empresa — elimina conflito ao recriar empresa com mesmo nome
        const email = `${id}@gabriel-estoque.com`;
        const loginKey = normalizarNome(data.nome);

        // App secundário para criar usuário sem deslogar o admin
        const secondaryApp = initializeApp(firebaseConfig, `emp-${Date.now()}`);
        const secondaryAuth = getAuth(secondaryApp);
        try {
          const cred = await createUserWithEmailAndPassword(secondaryAuth, email, senha);
          const empresaComUid = { ...empresa, authUid: cred.user.uid };
          // Não faz update otimista — o listener onValue atualiza o estado
          await dbUpdate(dbRef(db), {
            [`empresas/${id}`]: empresaComUid,
            [`users/${cred.user.uid}`]: { nome: data.nome, role: 'empresa', empresaId: id, primeiroLogin: true, email },
            [`login_index/${loginKey}`]: email,
          });
        } finally {
          await fbSignOut(secondaryAuth).catch(() => {});
          await deleteApp(secondaryApp).catch(() => {});
        }
      },

      updateEmpresa: (id, data) => {
        set((s) => ({ empresas: s.empresas.map((e) => (e.id === id ? { ...e, ...data } : e)) }));
        dbUpdate(dbRef(db, `empresas/${id}`), data as Record<string, unknown>);
      },

      deleteEmpresa: (id) => {
        const empresa = get().empresas.find((e) => e.id === id);
        set((s) => ({ empresas: s.empresas.filter((e) => e.id !== id) }));
        const updates: Record<string, null> = { [`empresas/${id}`]: null };
        if (empresa) {
          updates[`login_index/${normalizarNome(empresa.nome)}`] = null;
          // Limpa o registro do usuário no RTDB (Auth user permanece mas fica órfão inativo)
          if ((empresa as Empresa & { authUid?: string }).authUid) {
            updates[`users/${(empresa as Empresa & { authUid?: string }).authUid}`] = null;
          }
        }
        dbUpdate(dbRef(db), updates);
      },

      // ── Distribuições ────────────────────────────────────────────────────────

      addDistribuicao: (data) => {
        const id = generateId();
        const produto = get().produtos.find((p) => p.id === data.produtoId);
        if (!produto) return;
        const novoEstoque = produto.estoqueTotal - data.quantidade;
        const dist: Distribuicao = { ...data, id };
        set((s) => ({
          distribuicoes: [...s.distribuicoes, dist],
          produtos: s.produtos.map((p) => p.id === data.produtoId ? { ...p, estoqueTotal: novoEstoque } : p),
        }));
        dbUpdate(dbRef(db), {
          [`distribuicoes/${data.empresaId}/${id}`]: dist,
          [`produtos/${data.produtoId}/estoqueTotal`]: novoEstoque,
        });
      },

      addDistribuicoes: (dados) => {
        let produtos = [...get().produtos];
        const novas: Distribuicao[] = [];
        const updates: Record<string, unknown> = {};
        for (const item of dados) {
          const idx = produtos.findIndex((p) => p.id === item.produtoId);
          if (idx === -1) continue;
          const id = generateId();
          const novoEstoque = produtos[idx].estoqueTotal - item.quantidade;
          produtos[idx] = { ...produtos[idx], estoqueTotal: novoEstoque };
          const dist: Distribuicao = { ...item, id };
          novas.push(dist);
          updates[`distribuicoes/${item.empresaId}/${id}`] = dist;
          updates[`produtos/${item.produtoId}/estoqueTotal`] = novoEstoque;
        }
        set((s) => ({ distribuicoes: [...s.distribuicoes, ...novas], produtos }));
        return dbUpdate(dbRef(db), updates);
      },

      deleteDistribuicao: (id) => {
        const dist = get().distribuicoes.find((d) => d.id === id);
        if (!dist) return;
        const novoEstoque = (get().produtos.find((p) => p.id === dist.produtoId)?.estoqueTotal ?? 0) + dist.quantidade;
        set((s) => ({
          distribuicoes: s.distribuicoes.filter((d) => d.id !== id),
          produtos: s.produtos.map((p) => p.id === dist.produtoId ? { ...p, estoqueTotal: novoEstoque } : p),
        }));
        dbUpdate(dbRef(db), {
          [`distribuicoes/${dist.empresaId}/${id}`]: null,
          [`produtos/${dist.produtoId}/estoqueTotal`]: novoEstoque,
        });
      },

      // ── Usos ─────────────────────────────────────────────────────────────────

      addUso: (data) => {
        const id = generateId();
        const uso: UsoMaterial = { ...data, id };
        set((s) => ({ usos: [...s.usos, uso] }));
        dbSet(dbRef(db, `usos/${data.empresaId}/${id}`), uso);
      },

      addUsos: (dados) => {
        const novas = dados.map((d) => ({ ...d, id: generateId() }));
        set((s) => ({ usos: [...s.usos, ...novas] }));
        const updates: Record<string, unknown> = {};
        novas.forEach((u) => { updates[`usos/${u.empresaId}/${u.id}`] = u; });
        dbUpdate(dbRef(db), updates);
      },

      deleteUso: (id) => {
        const uso = get().usos.find((u) => u.id === id);
        if (!uso) return;
        set((s) => ({ usos: s.usos.filter((u) => u.id !== id) }));
        dbRemove(dbRef(db, `usos/${uso.empresaId}/${id}`));
      },

      // ── Pedidos NF ───────────────────────────────────────────────────────────

      atualizarStatusNF: (chave, status) => {
        const current = get().pedidosNF[chave];
        const updated: PedidoNFStatus = {
          ...current,
          status,
          arquivado: current?.arquivado ?? false,
          emitidaEm: status === 'emitida' ? new Date().toISOString() : undefined,
        };
        set((s) => ({ pedidosNF: { ...s.pedidosNF, [chave]: updated } }));
        dbSet(dbRef(db, `pedidosNF/${fbSafeKey(chave)}`), { ...updated, _k: chave });
      },

      arquivarPedidoNF: (chave) => {
        set((s) => ({ pedidosNF: { ...s.pedidosNF, [chave]: { ...s.pedidosNF[chave], arquivado: true } } }));
        dbUpdate(dbRef(db, `pedidosNF/${fbSafeKey(chave)}`), { arquivado: true });
      },

      desarquivarPedidoNF: (chave) => {
        set((s) => ({ pedidosNF: { ...s.pedidosNF, [chave]: { ...s.pedidosNF[chave], arquivado: false } } }));
        dbUpdate(dbRef(db, `pedidosNF/${fbSafeKey(chave)}`), { arquivado: false });
      },

    }),
    {
      name: 'estoque-pwa-cache',
      storage: createJSONStorage(() => localStorage),
      // Persiste apenas os dados — nunca estado de auth (segurança)
      partialize: (state) => ({
        _uid: state._uid,
        produtos: state.produtos,
        empresas: state.empresas,
        distribuicoes: state.distribuicoes,
        usos: state.usos,
        pedidosNF: state.pedidosNF,
      }),
    },
  ),
);

import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, combineLatest, filter, map, Observable, Subscription, take } from 'rxjs';
import { AuthService } from './auth.service'; // Usamos o AuthService para obter o UID
import {
  getFirestore,
  collection,
  query,
  where,
  onSnapshot,
  Firestore,
  addDoc,
  deleteDoc,
  doc,
  setDoc,
  updateDoc
} from 'firebase/firestore';
import { initializeApp } from 'firebase/app';

// Variáveis globais MANDATÓRIAS
declare const __app_id: string;
declare const __firebase_config: string;

/**
 * Interface para um Gasto
 */
export interface Gasto {
  id?: string;
  uid: string; // ID do usuário que registrou o gasto
  descricao: string;
  valor: number;
  categoria: string;
  criadoEm: Date;
  mesAno: string; // Formato YYYY-MM para facilitar queries
}

interface CategoriaColor {
    nome: string;
    cor: string;
}

// CORREÇÃO: Definimos o tipo Unsubscribe para ser uma função
type Unsubscribe = () => void;

@Injectable({
  providedIn: 'root'
})
export class GastosService {
  private db: Firestore;
  private authService = inject(AuthService);
  private appId: string;
  private currentUserId: string | null = null;
  private gastosCollectionName = 'gastos';

  // BehaviorSubject para o estado dos gastos
  private gastos$$ = new BehaviorSubject<Gasto[] | null>(null);
  public gastos$ = this.gastos$$.asObservable().pipe(filter((gastos): gastos is Gasto[] => gastos !== null));

  // CORREÇÃO: A tipagem deve ser a função de Unsubscribe do Firestore
  private unsubscribeListener?: Unsubscribe; 

  // Cores fixas para as categorias
  private categorias: CategoriaColor[] = [
    { nome: 'Alimentação', cor: '#FF6384' },
    { nome: 'Transporte', cor: '#36A2EB' },
    { nome: 'Lazer', cor: '#FFCE56' },
    { nome: 'Moradia', cor: '#4BC0C0' },
    { nome: 'Saúde', cor: '#9966FF' },
    { nome: 'Educação', cor: '#FF9F40' },
    { nome: 'Outros', cor: '#C9CBCF' },
  ];

  constructor() {
    const firebaseConfig = JSON.parse(__firebase_config);
    const app = initializeApp(firebaseConfig);
    this.db = getFirestore(app);
    this.appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

    // Monitora o UID do usuário e inicia/para a escuta do Firestore
    this.authService.user$.subscribe(user => {
      const newUid = user && !user.isAnonymous ? user.uid : null;

      if (this.currentUserId !== newUid) {
        this.currentUserId = newUid;
        this.unsubscribe(); // Para a escuta do usuário antigo
        if (newUid) {
          this.subscribeToGastos(newUid); // Inicia a escuta para o novo usuário
        } else {
          this.gastos$$.next([]); // Limpa os gastos se não houver usuário logado
        }
      }
    });
  }

  // --- Métodos de Escuta e Firestore ---

  private unsubscribe() {
    // CORREÇÃO: Chama a função de unsubscribe diretamente, se ela existir
    if (this.unsubscribeListener) { 
      this.unsubscribeListener();
      this.unsubscribeListener = undefined;
      console.log('Firestore: Escuta de gastos interrompida.');
    }
  }

  private subscribeToGastos(uid: string) {
    const gastosRef = collection(this.db, `artifacts/${this.appId}/users/${uid}/${this.gastosCollectionName}`);
    const q = query(gastosRef);

    // CORREÇÃO: Armazena o retorno (a função Unsubscribe) na variável correta
    this.unsubscribeListener = onSnapshot(q, (snapshot) => { 
      const gastos: Gasto[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          uid: data['uid'],
          descricao: data['descricao'],
          valor: data['valor'],
          categoria: data['categoria'],
          criadoEm: data['criadoEm'] ? (data['criadoEm'] as any).toDate() : new Date(), 
          mesAno: data['mesAno']
        } as Gasto;
      });
      this.gastos$$.next(gastos);
      console.log(`Firestore: ${gastos.length} gastos carregados para o usuário ${uid}.`);
    }, (error) => {
      console.error('Erro ao escutar gastos do Firestore:', error);
      this.gastos$$.next([]); 
    });
  }

  // --- Métodos CRUD (Criação, Leitura, Atualização, Deleção) ---

  async addGasto(gasto: Omit<Gasto, 'uid' | 'id' | 'mesAno'>): Promise<void> {
    const uid = this.currentUserId;
    if (!uid) {
      console.error('Nenhum usuário logado para adicionar gasto.');
      return;
    }

    const data: Omit<Gasto, 'id'> = {
        ...gasto,
        uid: uid,
        criadoEm: gasto.criadoEm || new Date(), // Garante que a data exista
        mesAno: new Date(gasto.criadoEm || new Date()).toISOString().substring(0, 7) // YYYY-MM
    };
    
    const gastosRef = collection(this.db, `artifacts/${this.appId}/users/${uid}/${this.gastosCollectionName}`);
    await addDoc(gastosRef, data);
  }

  async deleteGasto(gastoId: string): Promise<void> {
    const uid = this.currentUserId;
    if (!uid) return;
    const docRef = doc(this.db, `artifacts/${this.appId}/users/${uid}/${this.gastosCollectionName}`, gastoId);
    await deleteDoc(docRef);
  }
  
  // --- Métodos de Leitura e Agregação (Chamados pela HomePage) ---

  private filterGastosByMonth(gastos: Gasto[]): Gasto[] {
    const mesAnoAtual = new Date().toISOString().substring(0, 7);
    return gastos.filter(g => g.mesAno === mesAnoAtual);
  }

  /** Retorna todos os gastos (usado pela página para obter o array do BehaviorSubject) */
  getAll(): Gasto[] {
    return this.gastos$$.getValue() || [];
  }
  
  /** Retorna o total de gastos para o mês atual */
  totalForMonth(): number {
    const gastosMes = this.filterGastosByMonth(this.getAll());
    return gastosMes.reduce((sum, gasto) => sum + Number(gasto.valor || 0), 0);
  }

  /** Retorna o total de gastos agrupados por categoria para o mês atual */
  totalsByCategoryForMonth(): Record<string, number> {
    const gastosMes = this.filterGastosByMonth(this.getAll());
    const totals: Record<string, number> = {};
    gastosMes.forEach(gasto => {
      const categoria = gasto.categoria || 'Outros';
      totals[categoria] = (totals[categoria] || 0) + Number(gasto.valor || 0);
    });
    return totals;
  }

  // --- Métodos de Utilidade ---

  getCategoriaColor(categoriaNome: string): string | undefined {
    return this.categorias.find(c => c.nome === categoriaNome)?.cor;
  }
  
  // Método que retorna a lista de categorias
  getCategoriasList(): string[] {
      return this.categorias.map(c => c.nome);
  }
}
import { Injectable, inject } from '@angular/core';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  Auth,
  signInWithCustomToken,
  signInAnonymously,
  onAuthStateChanged,
  signOut,
  User 
} from 'firebase/auth';
import {
  getFirestore,
  setDoc,
  doc,
  Firestore,
  query,
  collection,
  where,
  getDocs,
  getDoc,
  updateDoc
} from 'firebase/firestore';
import { BehaviorSubject, Observable } from 'rxjs'; 

declare const __app_id: string;
declare const __firebase_config: string;
declare const __initial_auth_token: string;

export interface UserProfile {
  uid: string;
  nome: string;
  idade: number;
  email: string;
  nascimento: string;
  username: string;
  metaMensal?: number;
  metaPoupanca?: number;
}


@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private auth: Auth;
  private db: Firestore;
  private appId: string;
  private user$$ = new BehaviorSubject<User | null>(null);
  public user$ = this.user$$.asObservable();

  constructor() {
    const firebaseConfig = JSON.parse(__firebase_config);
    const app = initializeApp(firebaseConfig);

    this.auth = getAuth(app);
    this.db = getFirestore(app);
    this.appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

    onAuthStateChanged(this.auth, (user) => {
      this.user$$.next(user);
    });

    this.initializeAuth();
  }

  private async initializeAuth() {
    try {
      const token = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : '';
      
      if (token && token.length > 5) {
        await signInWithCustomToken(this.auth, token);
        console.log('Firebase: Autenticação com token customizado efetuada.');
      } else {
        await signInAnonymously(this.auth);
        console.log('Firebase: Autenticação anônima efetuada (Token inicial inválido/ausente).');
      }
    } catch (error) {
      console.error('Erro na autenticação inicial do Firebase (tentando fallback):', error);
      try {
        await signInAnonymously(this.auth);
        console.log('Firebase: Autenticação anônima efetuada via fallback.');
      } catch (e) {
        console.error('Erro no fallback de autenticação anônima:', e);
      }
    }
  }

  private async findUserByUsername(username: string): Promise<{ uid: string, email: string } | null> {
    const q = query(
      collection(this.db, `artifacts/${this.appId}/public/data/users`),
      where('username', '==', username)
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      return null;
    }
    const userData = snapshot.docs[0].data();
    return { uid: userData['uid'], email: userData['email'] };
  }

  async getUserProfile(uid: string): Promise<UserProfile | null> {
    try {
      const userDocRef = doc(this.db, `artifacts/${this.appId}/public/data/users`, uid);
      const docSnap = await getDoc(userDocRef);

      if (docSnap.exists()) {
        return docSnap.data() as UserProfile;
      }
      return null;

    } catch (error) {
      console.error('Erro ao buscar o perfil do usuário:', error);
      return null;
    }
  }
  
  async updateProfileMeta(metaData: { metaMensal?: number, metaPoupanca?: number }): Promise<boolean> {
      const uid = this.getLoggedUser();
      if (!uid) return false;

      try {
          const userDocRef = doc(this.db, `artifacts/${this.appId}/public/data/users`, uid);
          await updateDoc(userDocRef, metaData);
          console.log('Metas atualizadas no perfil do usuário:', uid);
          return true;
      } catch (error) {
          console.error('Erro ao atualizar metas do perfil:', error);
          return false;
      }
  }


  async login(username: string, senha: string): Promise<boolean> {
    try {
      const userCredentials = await this.findUserByUsername(username);
      if (!userCredentials) {
        return false;
      }
      await signInWithEmailAndPassword(this.auth, userCredentials.email, senha);
      console.log('Login efetuado com sucesso!');
      return true;
    } catch (error: any) {
      console.error('Erro de Login:', error.code, error.message);
      return false;
    }
  }

  async register(data: any): Promise<boolean> {
    try {
      if (await this.findUserByUsername(data.username)) {
        return false;
      }

      const result = await createUserWithEmailAndPassword(this.auth, data.email, data.password);
      const uid = result.user.uid;

      const userProfile: UserProfile = { 
        uid: uid,
        nome: data.nome,
        idade: data.idade,
        email: data.email,
        nascimento: data.nascimento,
        username: data.username,
        metaMensal: 0,
        metaPoupanca: 0,
      };
      
      const userDocRef = doc(this.db, `artifacts/${this.appId}/public/data/users`, uid);
      await setDoc(userDocRef, userProfile);

      console.log('Registro e Perfil salvo com sucesso!');
      return true;

    } catch (error: any) {
      console.error('Erro de Registro:', error.code, error.message);
      return false;
    }
  }

  async resetPassword(email: string): Promise<boolean> {
    try {
      await sendPasswordResetEmail(this.auth, email);
      console.log('E-mail de recuperação enviado para:', email);
      return true;
    } catch (error: any) {
      console.error('Erro ao enviar e-mail de recuperação:', error.code, error.message);
      return true;
    }
  }

  getLoggedUser(): string | null {
    const user = this.auth.currentUser;
    if (user && !user.isAnonymous) {
        return user.uid;
    }
    return null;
  }

  async logout(): Promise<void> {
    try {
      await signOut(this.auth);
      await signInAnonymously(this.auth);
      console.log('Logout efetuado com sucesso.');
    } catch (error) {
      console.error('Erro durante o logout:', error);
    }
  }
}
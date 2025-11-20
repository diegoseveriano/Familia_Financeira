import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterModule } from '@angular/router';
import { IonApp, IonRouterOutlet, IonMenu, IonHeader, IonToolbar, IonContent, IonTitle, IonList, IonItem, IonLabel, IonIcon, IonMenuToggle, IonButton } from '@ionic/angular/standalone';
import { AuthService, UserProfile } from './services/auth.service';
import { Observable } from 'rxjs';
import { map, filter, take } from 'rxjs/operators';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, RouterModule, RouterLink, RouterLinkActive],

})
export class AppComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  
  public nomeUsuarioDisplay = 'Visitante';
  public isLoggedIn$: Observable<boolean>;
  public appPages = [
    { title: 'Home', url: '/home', icon: 'home' },
    { title: 'Gastos', url: '/gastos', icon: 'wallet' },
    { title: 'Opções', url: '/opcoes', icon: 'settings' },
  ];

  constructor() {
    this.isLoggedIn$ = this.authService.user$.pipe(
      map(user => !!(user && !user.isAnonymous))
    );
  }

  ngOnInit() {
 
  }

  async doLogout() {
    await this.authService.logout();
    this.router.navigateByUrl('/login');
  }

}
import { bootstrapApplication } from '@angular/platform-browser';
import { RouteReuseStrategy, provideRouter, withPreloading, PreloadAllModules, withComponentInputBinding } from '@angular/router';
import { LocationStrategy, HashLocationStrategy } from '@angular/common';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';

if (typeof (window as any).__firebase_config === 'undefined') {
  
  (window as any).__firebase_config = JSON.stringify({
    apiKey: "AIzaSyAF-zGevkqEVJNdMSwrXXsYYMD_gmSmWMw",
    authDomain: "familia-financeira-36719.firebaseapp.com",
    projectId: "familia-financeira-36719",
    storageBucket: "familia-financeira-36719.firebasestorage.app",
    messagingSenderId: "148354887314",
    appId: "1:148354887314:web:3869261c9bb8a6f186c04b",
    measurementId: "G-Z1LWM2082P" 
  });
  
  (window as any).__app_id = "familia-financeira-36719"; 
  (window as any).__initial_auth_token = ""; 
}

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    { provide: LocationStrategy, useClass: HashLocationStrategy },
    provideIonicAngular(),
    provideRouter(routes, withPreloading(PreloadAllModules), withComponentInputBinding()),
  ],
});
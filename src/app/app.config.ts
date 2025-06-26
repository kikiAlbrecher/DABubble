import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';

import { routes } from './app.routes';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideAnimations(), provideFirebaseApp(() => initializeApp({"projectId":"dabubble-5f04f","appId":"1:1010282239800:web:67a99f8fb351a7f8c9d3cd","storageBucket":"dabubble-5f04f.appspot.com","apiKey":"AIzaSyDwA0aCO_eaCFvx4KDekcZT4C0RMEjBr8k","authDomain":"dabubble-5f04f.firebaseapp.com","messagingSenderId":"1010282239800"})), provideAuth(() => getAuth()), provideFirestore(() => getFirestore())
  ]
};

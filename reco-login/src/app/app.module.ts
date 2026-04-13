import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

/**
 * Root module for Bsharp Reco login app.
 *
 * Deliberately minimal — NO Firebase, NO MSAL, NO Material for MVP.
 * Only what is needed for email + password login:
 *   - BrowserModule + BrowserAnimationsModule
 *   - HttpClient (with DI-based interceptors for withCredentials)
 *   - FormsModule + ReactiveFormsModule (for login form)
 *   - AppRoutingModule (loads AuthModule lazily)
 *
 * ngx-cookie-service is providedIn: 'root' so no import needed here.
 * AuthService and RecoAuthService are also providedIn: 'root'.
 */
@NgModule({
  declarations: [
    AppComponent,
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    FormsModule,
    ReactiveFormsModule,
  ],
  providers: [
    provideHttpClient(withInterceptorsFromDi()),
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}

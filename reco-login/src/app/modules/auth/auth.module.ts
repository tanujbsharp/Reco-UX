import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { AuthRoutingModule } from './auth-routing.module';
import { LoginSigninComponent } from './login-signin/login-signin.component';

/**
 * AuthModule — lazy-loaded module containing the login UI.
 *
 * Deliberately stripped down from Converse's AuthModule:
 *   - NO Angular Material (uses plain HTML/CSS for MVP)
 *   - NO NgxIntlTelInput (no OTP/mobile login in MVP)
 *   - NO NgxSpinner (uses simple CSS spinner)
 *   - NO NgOtpInput (no OTP in MVP)
 *   - NO Swiper (no login carousel in MVP)
 *   - NO MSAL/Google/Firebase SSO components
 *
 * Only LoginSigninComponent for email + password login.
 */
@NgModule({
  declarations: [
    LoginSigninComponent,
  ],
  imports: [
    CommonModule,
    AuthRoutingModule,
    FormsModule,
    ReactiveFormsModule,
  ],
})
export class AuthModule {}

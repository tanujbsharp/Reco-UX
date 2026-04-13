import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginSigninComponent } from './login-signin/login-signin.component';
import { SigninGuard } from 'src/app/guards/signin.guard';

/**
 * Auth routing — maps the /signin path to LoginSigninComponent.
 *
 * Pattern replicated from Converse (auth-routing.module.ts):
 *   - '' redirects to 'signin'
 *   - 'signin' renders LoginSigninComponent with SigninGuard
 *
 * SigninGuard checks if user is already authenticated:
 *   - If yes: redirects to React app (full-page navigation)
 *   - If no: allows the login form to render
 */
const routes: Routes = [
  { path: '', redirectTo: 'signin', pathMatch: 'full' },
  { path: 'signin', component: LoginSigninComponent, canActivate: [SigninGuard] },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AuthRoutingModule {}

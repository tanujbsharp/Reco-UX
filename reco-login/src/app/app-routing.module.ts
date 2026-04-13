import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

/**
 * Root routing module for Bsharp Reco login app.
 *
 * Routes:
 *   ''       → redirect to /signin
 *   'signin' → lazy-loaded AuthModule (contains login form)
 *   '**'     → fallback redirect to /signin
 *
 * The AuthModule's own routing applies the SigninGuard to the login page
 * so already-authenticated users are redirected to the React app.
 */
const routes: Routes = [
  {
    path: '',
    loadChildren: () => import('./modules/auth/auth.module').then(m => m.AuthModule),
  },
  {
    path: '**',
    redirectTo: 'signin',
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}

import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, RouterStateSnapshot } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AuthService } from 'src/app/services/auth.service';
import { reactAppUrl } from 'src/app/config/api';

/**
 * SigninGuard — prevents the login page from showing if user is already logged in.
 *
 * Pattern replicated from Converse (signin.guard.ts):
 *   - If logged in: redirect to the React app (NOT Angular dashboard — Reco difference)
 *   - If not logged in: allow access to the signin route
 *
 * In Converse, this guard redirected to /celebrate/dashboard.
 * In Reco, it redirects to the React frontend via full-page navigation.
 */
@Injectable({
  providedIn: 'root'
})
export class SigninGuard implements CanActivate {

  constructor(
    private auth: AuthService,
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    return this.auth.isLoggedIn().pipe(
      map(isLoggedIn => {
        if (isLoggedIn) {
          // User already has a valid session — send them to the React app
          window.location.href = reactAppUrl;
          return false;
        }
        // Not logged in — allow access to the login page
        return true;
      }),
      catchError(() => {
        // On error, allow access to login page
        return of(true);
      })
    );
  }
}

import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, RouterStateSnapshot } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth.service';

/**
 * AuthGuard — protects routes that require authentication.
 *
 * Pattern replicated from Converse (celebrate-guard.guard.ts):
 *   - If logged in: allow access
 *   - If NOT logged in: redirect to /signin
 *
 * Note: In the MVP, Reco's Angular app only has the login route.
 * This guard exists for future routes that may be added to the Angular side
 * (e.g., password reset, account setup). The React app handles its own
 * auth checking via GET /users/loginUserDetails.
 */
@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(
    private auth: AuthService,
    private router: Router,
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    return this.auth.isLoggedIn().pipe(
      map(isLoggedIn => {
        if (isLoggedIn) {
          return true;
        }
        // Not authenticated — redirect to login with return URL
        this.router.navigate(['/signin'], {
          queryParams: { redirectURL: state.url }
        });
        return false;
      }),
      catchError(() => {
        this.router.navigate(['/signin']);
        return of(false);
      })
    );
  }
}

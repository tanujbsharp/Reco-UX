import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { CookieService } from 'ngx-cookie-service';
import { baseUrl } from 'src/app/config/api';

/**
 * AuthService — checks whether the current browser session is authenticated.
 *
 * Pattern replicated from Converse (auth.service.ts):
 *   - httpOptions include X-CSRFToken from cookie + withCredentials
 *   - loginUserCanActive() calls GET /users/loginUserDetails
 *   - isLoggedIn() returns Observable<boolean>
 */
@Injectable({
  providedIn: 'root'
})
export class AuthService {

  constructor(
    private http: HttpClient,
    private cookieService: CookieService,
    private router: Router,
  ) {}

  httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
      'X-CSRFToken': this.cookieService.get('csrftoken'),
    }),
    withCredentials: true
  };

  /**
   * Probe the Django backend to check if a valid session exists.
   * Returns the user details object on success, errors on 401/403.
   */
  loginUserCanActive(): Observable<any> {
    return this.http.get(baseUrl + '/users/loginUserDetails', this.httpOptions);
  }

  /**
   * Returns an Observable<boolean> indicating whether the user is logged in.
   * On any error (network, 401, 403) returns false.
   */
  isLoggedIn(): Observable<boolean> {
    return this.loginUserCanActive().pipe(
      map(response => {
        return !!response;
      }),
      catchError(() => {
        return of(false);
      })
    );
  }
}

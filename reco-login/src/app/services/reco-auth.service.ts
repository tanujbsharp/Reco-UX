import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CookieService } from 'ngx-cookie-service';
import { baseUrl } from 'src/app/config/api';

/**
 * RecoAuthService — HTTP calls for the Converse login/logout flow.
 *
 * Pattern replicated from Converse (celebrate-management.service.ts):
 *   - All requests use withCredentials: true (for sessionid cookie)
 *   - All requests send X-CSRFToken header (read from csrftoken cookie)
 *
 * Endpoints used (from Converse login/views.py):
 *   POST /login/login_user           — authenticate email + password
 *   POST /login/getLoggedInUserStatus — check user status before login
 *   GET  /users/loginUserDetails      — get logged-in user details (auth probe)
 *   GET  /login/user_logout           — clear session
 */
@Injectable({
  providedIn: 'root'
})
export class RecoAuthService {

  constructor(
    private http: HttpClient,
    private cookieService: CookieService,
  ) {}

  httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
      'X-CSRFToken': this.cookieService.get('csrftoken'),
    }),
    withCredentials: true
  };

  /**
   * Authenticate user with email + password.
   * Returns 'success' or 'Unauthorized'.
   */
  loginUser(data: { mail: string; password: string; remember_me: number }): Observable<any> {
    return this.http.post(baseUrl + '/login/login_user', data, this.httpOptions);
  }

  /**
   * Check user status before showing password field.
   * Returns numeric status:
   *   1 = active (can log in)
   *   2 = invited (needs setup)
   *   5 = generic domain (gmail, yahoo, etc.)
   *   6 = new user (domain not registered)
   *   7 = blocked
   *   8 = admin approval required
   */
  getLoggedInUserStatus(data: { mail: string }): Observable<any> {
    return this.http.post(baseUrl + '/login/getLoggedInUserStatus', data, this.httpOptions);
  }

  /**
   * Get logged-in user details (auth probe).
   * Requires valid sessionid cookie.
   * Returns user object with uid, cmid, email_id, first_name, last_name, role, etc.
   */
  loginUserDetails(): Observable<any> {
    return this.http.get(baseUrl + '/users/loginUserDetails', this.httpOptions);
  }

  /**
   * Logout — clears Django session.
   */
  logout(): Observable<any> {
    return this.http.get(baseUrl + '/login/user_logout', this.httpOptions);
  }
}

import { Component, OnInit, OnDestroy } from '@angular/core';
import { UntypedFormControl, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { RecoAuthService } from 'src/app/services/reco-auth.service';
import { AuthService } from 'src/app/services/auth.service';
import { reactAppUrl } from 'src/app/config/api';

/**
 * LoginSigninComponent — Bsharp Reco email + password login form.
 *
 * Flow (replicated from Converse LoginSigninComponent, simplified for MVP):
 *   1. User enters email
 *   2. Call getLoggedInUserStatus({mail}) to check status
 *   3. Status 1 (active) → show password field
 *   4. User enters password
 *   5. Call loginUser({mail, password, remember_me: 0})
 *   6. On success → redirect to React app (window.location.href)
 *
 * Status codes handled:
 *   1 = active user → proceed to password
 *   2 = invited → show "complete your setup" message
 *   5 = generic domain (gmail, yahoo) → show "use company email" message
 *   6 = new user, domain not registered → show "domain not registered" message
 *   7 = blocked → show "account blocked" message
 *   8 = pending admin approval → show "pending approval" message
 *
 * What is NOT included (MVP exclusions):
 *   - Google/Microsoft SSO
 *   - OTP/mobile login
 *   - Firebase auth
 *   - Mixpanel tracking
 *   - Teams integration
 */
@Component({
  selector: 'app-login-signin',
  templateUrl: './login-signin.component.html',
  styleUrls: ['./login-signin.component.scss'],
  standalone: false,
})
export class LoginSigninComponent implements OnInit, OnDestroy {

  /** Form controls with validators */
  emailFormControl = new UntypedFormControl('', [
    Validators.required,
    Validators.email,
  ]);
  passwordFormControl = new UntypedFormControl('', [
    Validators.required,
    Validators.minLength(1),
  ]);

  /** Component state */
  userMailId: string = '';
  userPassword: string = '';
  redirectURL: string = '';

  /** UI state flags */
  isLoading: boolean = false;
  showPasswordField: boolean = false;
  errorMessage: string = '';
  userStatus: number | null = null;

  /** Login attempt counter — max 5 attempts */
  loginAttemptCount: number = 0;
  maxLoginAttempts: number = 5;

  /** Current year for footer copyright */
  currentYear: number = new Date().getFullYear();

  /** Subscriptions for cleanup */
  private subscriptions: Subscription[] = [];

  constructor(
    private recoAuthService: RecoAuthService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    // Capture redirect URL from query params (set by AuthGuard)
    const params = this.route.snapshot.queryParams;
    if (params['redirectURL']) {
      this.redirectURL = params['redirectURL'];
    }

    // Check if already logged in — if yes, redirect to React app
    const sub = this.authService.isLoggedIn().subscribe((loggedIn) => {
      if (loggedIn) {
        this.redirectToApp();
      }
    });
    this.subscriptions.push(sub);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  /**
   * Step 1: Check user status by email.
   * Called when user clicks "Continue" or presses Enter on the email field.
   */
  checkUserStatus(): void {
    this.errorMessage = '';

    if (!this.userMailId) {
      this.errorMessage = 'Please enter your email address.';
      return;
    }

    if (this.emailFormControl.hasError('email')) {
      this.errorMessage = 'Please enter a valid email address.';
      return;
    }

    this.isLoading = true;
    const data = { mail: this.userMailId.trim().toLowerCase() };

    const sub = this.recoAuthService.getLoggedInUserStatus(data).subscribe({
      next: (status: number) => {
        this.isLoading = false;
        this.userStatus = status;
        this.handleUserStatus(status);
      },
      error: () => {
        this.isLoading = false;
        this.errorMessage = 'Unable to verify your account. Please try again.';
      },
    });
    this.subscriptions.push(sub);
  }

  /**
   * Handle the numeric status returned by getLoggedInUserStatus.
   */
  private handleUserStatus(status: number): void {
    switch (status) {
      case 1:
        // Active user — show password field
        this.showPasswordField = true;
        this.errorMessage = '';
        break;
      case 2:
        // Invited user
        this.showPasswordField = false;
        this.errorMessage = 'Your account setup is incomplete. Please check your email for the invitation link to complete registration.';
        break;
      case 5:
        // Generic domain (gmail, yahoo, etc.)
        this.showPasswordField = false;
        this.errorMessage = 'Please use your company email address to sign in. Generic email domains (Gmail, Yahoo, etc.) are not supported.';
        break;
      case 6:
        // New user, domain not registered
        this.showPasswordField = false;
        this.errorMessage = 'Your email domain is not registered with Bsharp Reco. Please contact your administrator.';
        break;
      case 7:
        // Blocked user
        this.showPasswordField = false;
        this.errorMessage = 'Your account has been blocked. Please contact your administrator for assistance.';
        break;
      case 8:
        // Pending admin approval
        this.showPasswordField = false;
        this.errorMessage = 'Your account is pending administrator approval. You will receive an email once approved.';
        break;
      default:
        this.showPasswordField = false;
        this.errorMessage = 'Unable to verify your account. Please try again or contact support.';
        break;
    }
  }

  /**
   * Step 2: Login with email + password.
   * Called when user clicks "Sign In" or presses Enter on the password field.
   */
  loginUser(): void {
    this.errorMessage = '';

    if (!this.userPassword) {
      this.errorMessage = 'Please enter your password.';
      return;
    }

    // Check max attempts
    if (this.loginAttemptCount >= this.maxLoginAttempts) {
      this.errorMessage = 'Too many failed attempts. Please try again later.';
      return;
    }

    this.isLoading = true;
    const data = {
      mail: this.userMailId.trim().toLowerCase(),
      password: this.userPassword,
      remember_me: 0,
    };

    const sub = this.recoAuthService.loginUser(data).subscribe({
      next: (response: any) => {
        this.isLoading = false;
        if (response === 'success') {
          // Login successful — redirect to React app
          this.redirectToApp();
        } else {
          this.loginAttemptCount++;
          if (this.loginAttemptCount >= this.maxLoginAttempts) {
            this.errorMessage = 'Too many failed attempts. Please try again later.';
          } else {
            this.errorMessage = 'Invalid password. Please try again.';
          }
        }
      },
      error: () => {
        this.isLoading = false;
        this.loginAttemptCount++;
        if (this.loginAttemptCount >= this.maxLoginAttempts) {
          this.errorMessage = 'Too many failed attempts. Please try again later.';
        } else {
          this.errorMessage = 'Login failed. Please check your credentials and try again.';
        }
      },
    });
    this.subscriptions.push(sub);
  }

  /**
   * Redirect to the React app after successful login.
   * Uses full-page navigation (window.location.href), NOT Angular router,
   * because the React app is a separate application on a different port/subdomain.
   */
  private redirectToApp(): void {
    if (this.redirectURL) {
      window.location.href = this.redirectURL;
    } else {
      window.location.href = reactAppUrl;
    }
  }

  /**
   * Go back to email entry (change email).
   */
  resetToEmail(): void {
    this.showPasswordField = false;
    this.userPassword = '';
    this.errorMessage = '';
    this.userStatus = null;
    this.passwordFormControl.reset();
  }

  /**
   * Handle Enter key on email field.
   */
  onEmailKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.checkUserStatus();
    }
  }

  /**
   * Handle Enter key on password field.
   */
  onPasswordKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.loginUser();
    }
  }
}

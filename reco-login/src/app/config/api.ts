/**
 * Bsharp Reco — Runtime hostname-based URL resolution.
 *
 * Pattern replicated from Converse (config/api.ts):
 *   - Reads window.location.hostname at module load time
 *   - Maps hostname to the correct API backend and React app URLs
 *   - Exports: baseUrl, appUrl, reactAppUrl
 *
 * Add new hostname entries here when deploying to additional environments.
 */

const host = window.location.hostname;

let resolvedBaseUrl = 'https://api.reco.bsharpcorp.com';
let resolvedAppUrl = 'https://login.reco.bsharpcorp.com';
let resolvedReactAppUrl = 'https://app.reco.bsharpcorp.com';

if (host.includes('localhost')) {
  // Local development
  resolvedBaseUrl = 'http://localhost:8000';
  resolvedAppUrl = 'http://localhost:4200';
  resolvedReactAppUrl = 'http://localhost:5173';

} else if (host.includes('login.reco.bsharpcorp.com')) {
  // Production login subdomain
  resolvedBaseUrl = 'https://api.reco.bsharpcorp.com';
  resolvedAppUrl = 'https://login.reco.bsharpcorp.com';
  resolvedReactAppUrl = 'https://app.reco.bsharpcorp.com';

} else if (host.includes('login.reco-dev.bsharpcorp.com')) {
  // Dev/staging environment
  resolvedBaseUrl = 'https://api.reco-dev.bsharpcorp.com';
  resolvedAppUrl = 'https://login.reco-dev.bsharpcorp.com';
  resolvedReactAppUrl = 'https://app.reco-dev.bsharpcorp.com';
}

/** Django backend base URL (no trailing slash). */
export const baseUrl: string = resolvedBaseUrl;

/** This Angular login app's own URL. */
export const appUrl: string = resolvedAppUrl;

/** React main application URL — login redirects here on success. */
export const reactAppUrl: string = resolvedReactAppUrl;

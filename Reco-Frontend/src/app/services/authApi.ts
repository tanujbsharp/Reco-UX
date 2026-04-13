import { apiFetch, LOGIN_URL } from './api';

export interface UserDetails {
  uid: number;
  cmid: number;
  email_id: string;
  first_name: string;
  last_name: string;
  role: number;
  cm_color: string;
  logo_image_url: string;
  cm_name: string;
  profile_file_name: string;
}

export async function getLoginUserDetails(): Promise<UserDetails | null> {
  try {
    const res = await apiFetch('/users/loginUserDetails');
    if (res.ok) return res.json();
    return null;
  } catch {
    return null;
  }
}

export async function logout(): Promise<void> {
  await apiFetch('/login/user_logout');
  window.location.href = LOGIN_URL;
}

export function redirectToLogin(): void {
  window.location.href = LOGIN_URL;
}

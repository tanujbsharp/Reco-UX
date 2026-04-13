import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getLoginUserDetails, logout as performLogout, redirectToLogin, UserDetails } from '../services/authApi';

interface AuthState {
  user: UserDetails | null;
  loading: boolean;
  isAuthenticated: boolean;
  /** Brand name from Converse CM record */
  cmName: string;
  /** Brand hex colour for theming */
  cmColor: string;
  /** Brand logo URL */
  logoImageUrl: string;
  /** End the session and redirect to the Converse login page */
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  isAuthenticated: false,
  cmName: '',
  cmColor: '',
  logoImageUrl: '',
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLoginUserDetails().then((details) => {
      if (details) {
        setUser(details);
        // Apply brand theming via CSS custom properties
        if (details.cm_color) {
          document.documentElement.style.setProperty('--brand-color', details.cm_color);
        }
        if (details.logo_image_url) {
          document.documentElement.style.setProperty('--brand-logo-url', `url(${details.logo_image_url})`);
        }
      } else {
        redirectToLogin();
      }
      setLoading(false);
    });
  }, []);

  const logout = async () => {
    await performLogout();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        cmName: user?.cm_name ?? '',
        cmColor: user?.cm_color ?? '',
        logoImageUrl: user?.logo_image_url ?? '',
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

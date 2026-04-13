import { useEffect } from "react";
import { RouterProvider } from "react-router";
import { router } from "./routes";
import { AuthProvider, useAuth } from "./context/AuthContext";
// JourneyProvider is now inside RootLayout in routes.tsx (must be inside router tree)
import { ensureGlowStyles } from "./components/GlowCard";

/** Injects glow CSS once and sets --x/--y/--xp/--yp on :root so every [data-glow] element responds to the same cursor. */
function GlobalSetup() {
  useEffect(() => {
    ensureGlowStyles();

    const sync = (e: PointerEvent) => {
      const root = document.documentElement;
      root.style.setProperty("--xp", (e.clientX / window.innerWidth).toFixed(2));
      root.style.setProperty("--yp", (e.clientY / window.innerHeight).toFixed(2));

      const elements = document.querySelectorAll<HTMLElement>("[data-glow], .mouse-tracker");
      for (let i = 0; i < elements.length; i++) {
        const rect = elements[i].getBoundingClientRect();
        elements[i].style.setProperty("--local-x", (e.clientX - rect.left).toFixed(2));
        elements[i].style.setProperty("--local-y", (e.clientY - rect.top).toFixed(2));
      }
    };

    document.addEventListener("pointermove", sync, { passive: true });
    return () => document.removeEventListener("pointermove", sync);
  }, []);

  return null;
}

/** Shows a full-screen loading spinner while the auth check is in flight. */
function AuthGate({ children }: { children: React.ReactNode }) {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[#2563eb]" />
          <p className="text-sm font-medium text-slate-500">Checking session...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <AuthGate>
          <GlobalSetup />
          <RouterProvider router={router} />
      </AuthGate>
    </AuthProvider>
  );
}

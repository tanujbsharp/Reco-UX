import { useEffect } from "react";
import { RouterProvider } from "react-router";
import { router } from "./routes";
import { JourneyProvider } from "./context/JourneyContext";
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

export default function App() {
  return (
    <JourneyProvider>
      <GlobalSetup />
      <RouterProvider router={router} />
    </JourneyProvider>
  );
}

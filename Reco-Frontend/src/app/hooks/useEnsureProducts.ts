import { useEffect, useState } from "react";
import { useJourney } from "../context/JourneyContext";
import { getRecommendations } from "../services/recommendationApi";
import { mapRecommendationRecord } from "../screens/RecommendationsScreen";

/**
 * Terminal screens (share summary, confirmation) can be reached by a page
 * refresh that wiped in-memory journey state. The session id persists, and the
 * backend is the source of truth for the recommendations — so when products
 * are missing we re-fetch them rather than rendering a blank/imageless page.
 *
 * Returns `true` while a re-fetch is in flight so callers can show a loader
 * instead of an empty state.
 */
export function useEnsureProducts(): boolean {
  const { sessionId, availableProducts, setAvailableProducts } = useJourney();
  const [rehydrating, setRehydrating] = useState(false);

  useEffect(() => {
    if (availableProducts.length > 0 || !sessionId) {
      return;
    }

    let cancelled = false;
    setRehydrating(true);
    getRecommendations(sessionId)
      .then((data) => {
        if (cancelled) return;
        const recs = Array.isArray(data) ? data : (data as { recommendations?: unknown[] })?.recommendations;
        if (Array.isArray(recs) && recs.length > 0) {
          setAvailableProducts(recs.map((r) => mapRecommendationRecord(r as Record<string, unknown>)));
        }
      })
      .catch(() => {
        // Backend unreachable — caller falls back to its empty-state handling.
      })
      .finally(() => {
        if (!cancelled) setRehydrating(false);
      });

    return () => {
      cancelled = true;
    };
  }, [sessionId, availableProducts.length, setAvailableProducts]);

  return rehydrating;
}

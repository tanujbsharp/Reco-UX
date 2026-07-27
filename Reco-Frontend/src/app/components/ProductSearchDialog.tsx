import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Loader2, Plus, Search, Sparkles, X } from "lucide-react";
import { Input } from "./ui/input";
import { searchProducts, getProductFit } from "../services/productApi";

interface SearchResult {
  product_id: number;
  id: string;
  model: string;
  family: string;
  price: number;
  image: string;
}

interface ProductSearchDialogProps {
  open: boolean;
  sessionId: number | null;
  /** Product ids already in the comparison (hidden from results). */
  excludeIds: string[];
  onClose: () => void;
  /** Receives the fully personalized record from the product-fit endpoint. */
  onAdd: (record: Record<string, unknown>) => void;
}

/**
 * Search the full store catalog and add any PC to the comparison — including
 * ones outside the recommendation list. The picked product is scored against
 * the shopper's session answers so its implications are personalized too.
 */
export function ProductSearchDialog({ open, sessionId, excludeIds, onClose, onAdd }: ProductSearchDialogProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingId, setAddingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<number | null>(null);

  // Fetch matches (debounced); empty query lists the catalog A-Z.
  useEffect(() => {
    if (!open) {
      return;
    }
    setSearching(true);
    setError(null);
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }
    debounceRef.current = window.setTimeout(() => {
      searchProducts(query.trim())
        .then((data) => setResults(Array.isArray(data) ? (data as SearchResult[]) : []))
        .catch(() => setError("Could not search the catalog. Please try again."))
        .finally(() => setSearching(false));
    }, 280);
    return () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
      }
    };
  }, [query, open]);

  // Reset state each time the dialog opens; Escape closes.
  useEffect(() => {
    if (!open) {
      return;
    }
    setQuery("");
    setAddingId(null);
    setError(null);
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  const handleAdd = async (result: SearchResult) => {
    if (!sessionId || addingId !== null) {
      return;
    }
    setAddingId(result.product_id);
    setError(null);
    try {
      const record = await getProductFit(sessionId, result.product_id);
      onAdd(record as Record<string, unknown>);
      onClose();
    } catch {
      setError("Could not compute the fit for that PC. Please try again.");
    } finally {
      setAddingId(null);
    }
  };

  const visibleResults = results.filter((result) => !excludeIds.includes(result.id));

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={() => addingId === null && onClose()}
          className="fixed inset-0 z-[80] flex items-start justify-center bg-slate-950/45 p-4 backdrop-blur-sm md:items-center"
          role="dialog"
          aria-modal="true"
          aria-label="Search the catalog"
        >
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.24, ease: [0.25, 0.4, 0.25, 1] }}
            onClick={(event) => event.stopPropagation()}
            className="mt-10 flex max-h-[78vh] w-full max-w-xl flex-col overflow-hidden rounded-[28px] border border-white/70 bg-white shadow-[0_40px_120px_rgba(2,6,23,0.35)] md:mt-0"
          >
            <div className="border-b border-slate-100 p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold tracking-tight text-slate-950">Add a PC to the comparison</h2>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close search"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Search the full store catalog — we&apos;ll score it against your answers before adding it.
              </p>
              <div className="relative mt-4">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  autoFocus
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by name or family, e.g. Yoga Pro, ThinkPad…"
                  className="h-12 rounded-2xl border-slate-200 bg-slate-50 pl-11"
                  disabled={addingId !== null}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              {addingId !== null ? (
                <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
                  <Loader2 className="h-7 w-7 animate-spin text-[#2563eb]" />
                  <p className="text-sm font-medium text-slate-700">Scoring this PC against your answers…</p>
                  <p className="text-xs text-slate-500">We personalize its trade-offs the same way we did for your recommendations.</p>
                </div>
              ) : visibleResults.length === 0 ? (
                <div className="px-6 py-12 text-center text-sm text-slate-500">
                  {searching ? "Searching…" : "No matching PCs in the catalog."}
                </div>
              ) : (
                <ul className="space-y-1.5">
                  {visibleResults.map((result) => (
                    <li key={result.product_id}>
                      <button
                        type="button"
                        onClick={() => void handleAdd(result)}
                        className="group flex w-full items-center gap-4 rounded-[20px] border border-transparent p-3 text-left transition hover:border-[#3b82f6]/30 hover:bg-blue-50/50"
                      >
                        <div className="flex h-14 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#f8fbff]">
                          {result.image ? (
                            <img src={result.image} alt={result.model} className="h-full w-full object-contain" />
                          ) : (
                            <Sparkles className="h-5 w-5 text-slate-300" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold text-slate-900">{result.model}</div>
                          <div className="mt-0.5 text-xs text-slate-500">{result.family}</div>
                        </div>
                        <span className="flex h-9 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 text-xs font-semibold text-[#2563eb] transition group-hover:border-[#2563eb] group-hover:bg-[#2563eb] group-hover:text-white">
                          <Plus className="h-3.5 w-3.5" />
                          Add
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {error && (
                <div className="m-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">{error}</div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

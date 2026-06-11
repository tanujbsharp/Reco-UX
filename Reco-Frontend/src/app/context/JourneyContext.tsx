import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import type { Product } from "../data/mockData";

// Journey state lives in memory, which means a browser refresh used to wipe
// everything except the session id — leaving the confirmation/share screens
// with no product to render (missing image, blank screen). Persisting the
// relevant fields to sessionStorage keeps the journey intact across reloads
// while still clearing automatically when the tab closes.
const STORAGE_PREFIX = "reco_journey_";
const PERSISTED_KEYS = [
  "voiceTags",
  "detectedArchetype",
  "discoveryText",
  "detectedLanguage",
  "discoveryMode",
  "journeyEntryMode",
  "answers",
  "selectedProducts",
  "selectedProductId",
  "customerInfo",
  "storeNote",
  "recommendationFeedbackStars",
  "availableProducts",
] as const;

function loadPersisted<T>(key: string, fallback: T): T {
  try {
    const raw = sessionStorage.getItem(STORAGE_PREFIX + key);
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function usePersistentState<T>(key: string, initial: T) {
  const [state, setState] = useState<T>(() => loadPersisted(key, initial));
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(state));
    } catch {
      // sessionStorage may be unavailable (private mode / quota); ignore.
    }
  }, [key, state]);
  return [state, setState] as const;
}

function clearPersistedJourney() {
  for (const key of PERSISTED_KEYS) {
    sessionStorage.removeItem(STORAGE_PREFIX + key);
  }
}

export interface VoiceTag {
  id: string;
  text: string;
  category: string;
}

export interface Answer {
  questionId: string;
  questionText?: string;
  value: string | string[];
  fromVoice: boolean;
}

interface CustomerInfo {
  name: string;
  phone: string;
  email: string;
}

interface JourneyContextType {
  sessionId: number | null;
  setSessionId: (id: number | null) => void;
  voiceTags: VoiceTag[];
  setVoiceTags: (tags: VoiceTag[]) => void;
  detectedArchetype: string;
  setDetectedArchetype: (value: string) => void;
  discoveryText: string;
  setDiscoveryText: (value: string) => void;
  detectedLanguage: string;
  setDetectedLanguage: (value: string) => void;
  discoveryMode: "voice" | "text";
  setDiscoveryMode: (value: "voice" | "text") => void;
  journeyEntryMode: "discovery" | "guided";
  setJourneyEntryMode: (value: "discovery" | "guided") => void;
  answers: Answer[];
  addAnswer: (answer: Answer) => void;
  updateAnswer: (questionId: string, value: string | string[]) => void;
  resetAnswers: () => void;
  selectedProducts: string[];
  toggleProductSelection: (id: string) => void;
  clearSelectedProducts: () => void;
  selectedProductId: string | null;
  setSelectedProductId: (id: string | null) => void;
  customerInfo: CustomerInfo;
  setCustomerInfo: (info: CustomerInfo) => void;
  storeNote: string;
  setStoreNote: (value: string) => void;
  /** 1–5 stars: shopper rating of how helpful the recommendation set was (for learning / analytics). */
  recommendationFeedbackStars: number | null;
  setRecommendationFeedbackStars: (value: number | null) => void;
  availableProducts: Product[];
  setAvailableProducts: (products: Product[]) => void;
  resetJourneyProgress: () => void;
  resetJourney: () => void;
}

const JourneyContext = createContext<JourneyContextType | undefined>(undefined);

export function JourneyProvider({ children }: { children: ReactNode }) {
  const [sessionId, setSessionIdState] = useState<number | null>(() => {
    const stored = sessionStorage.getItem("reco_session_id");
    return stored ? Number(stored) : null;
  });

  const setSessionId = (id: number | null) => {
    setSessionIdState(id);
    if (id != null) {
      sessionStorage.setItem("reco_session_id", String(id));
    } else {
      sessionStorage.removeItem("reco_session_id");
    }
  };
  const [voiceTags, setVoiceTags] = usePersistentState<VoiceTag[]>("voiceTags", []);
  const [detectedArchetype, setDetectedArchetype] = usePersistentState("detectedArchetype", "");
  const [discoveryText, setDiscoveryText] = usePersistentState("discoveryText", "");
  const [detectedLanguage, setDetectedLanguage] = usePersistentState("detectedLanguage", "");
  const [discoveryMode, setDiscoveryMode] = usePersistentState<"voice" | "text">("discoveryMode", "voice");
  const [journeyEntryMode, setJourneyEntryMode] = usePersistentState<"discovery" | "guided">("journeyEntryMode", "discovery");
  const [answers, setAnswers] = usePersistentState<Answer[]>("answers", []);
  const [selectedProducts, setSelectedProducts] = usePersistentState<string[]>("selectedProducts", []);
  const [selectedProductId, setSelectedProductId] = usePersistentState<string | null>("selectedProductId", null);
  const [customerInfo, setCustomerInfo] = usePersistentState<CustomerInfo>("customerInfo", {
    name: "",
    phone: "",
    email: "",
  });
  const [storeNote, setStoreNote] = usePersistentState("storeNote", "");
  const [recommendationFeedbackStars, setRecommendationFeedbackStars] = usePersistentState<number | null>("recommendationFeedbackStars", null);
  const [availableProducts, setAvailableProducts] = usePersistentState<Product[]>("availableProducts", []);

  const addAnswer = (answer: Answer) => {
    setAnswers((prev) => {
      const existing = prev.findIndex((a) => a.questionId === answer.questionId);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = answer;
        return updated;
      }
      return [...prev, answer];
    });
  };

  const updateAnswer = (questionId: string, value: string | string[]) => {
    setAnswers((prev) => {
      const existing = prev.findIndex((a) => a.questionId === questionId);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = { ...updated[existing], value, fromVoice: false };
        return updated;
      }
      return [...prev, { questionId, value, fromVoice: false }];
    });
  };

  const resetAnswers = () => {
    setAnswers([]);
  };

  const toggleProductSelection = (id: string) => {
    setSelectedProducts((prev) => {
      if (prev.includes(id)) {
        return prev.filter((pid) => pid !== id);
      }

      if (prev.length >= 2) {
        return prev;
      }

      return [...prev, id];
    });
  };

  const clearSelectedProducts = () => {
    setSelectedProducts([]);
  };

  const resetJourneyProgress = () => {
    setVoiceTags([]);
    setDetectedArchetype("");
    setDiscoveryText("");
    setDetectedLanguage("");
    setAnswers([]);
    setSelectedProducts([]);
    setSelectedProductId(null);
    setStoreNote("");
    setRecommendationFeedbackStars(null);
    setAvailableProducts([]);
  };

  const resetJourney = () => {
    setSessionId(null);
    sessionStorage.removeItem("reco_session_id");
    resetJourneyProgress();
    setDiscoveryMode("voice");
    setJourneyEntryMode("discovery");
    setCustomerInfo({ name: "", phone: "", email: "" });
    clearPersistedJourney();
  };

  return (
    <JourneyContext.Provider
      value={{
        sessionId,
        setSessionId,
        voiceTags,
        setVoiceTags,
        detectedArchetype,
        setDetectedArchetype,
        discoveryText,
        setDiscoveryText,
        detectedLanguage,
        setDetectedLanguage,
        discoveryMode,
        setDiscoveryMode,
        journeyEntryMode,
        setJourneyEntryMode,
        answers,
        addAnswer,
        updateAnswer,
        resetAnswers,
        selectedProducts,
        toggleProductSelection,
        clearSelectedProducts,
        selectedProductId,
        setSelectedProductId,
        customerInfo,
        setCustomerInfo,
        storeNote,
        setStoreNote,
        recommendationFeedbackStars,
        setRecommendationFeedbackStars,
        availableProducts,
        setAvailableProducts,
        resetJourneyProgress,
        resetJourney,
      }}
    >
      {children}
    </JourneyContext.Provider>
  );
}

export function useJourney() {
  const context = useContext(JourneyContext);
  if (!context) {
    throw new Error("useJourney must be used within JourneyProvider");
  }
  return context;
}

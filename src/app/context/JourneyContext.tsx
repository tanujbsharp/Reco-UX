import React, { createContext, useContext, useState, ReactNode } from "react";

export interface VoiceTag {
  id: string;
  text: string;
  category: string;
}

export interface Answer {
  questionId: string;
  value: string | string[];
  fromVoice: boolean;
}

interface CustomerInfo {
  name: string;
  phone: string;
  email: string;
}

interface JourneyContextType {
  voiceTags: VoiceTag[];
  setVoiceTags: (tags: VoiceTag[]) => void;
  discoveryText: string;
  setDiscoveryText: (value: string) => void;
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
  resetJourney: () => void;
}

const JourneyContext = createContext<JourneyContextType | undefined>(undefined);

export function JourneyProvider({ children }: { children: ReactNode }) {
  const [voiceTags, setVoiceTags] = useState<VoiceTag[]>([]);
  const [discoveryText, setDiscoveryText] = useState("");
  const [discoveryMode, setDiscoveryMode] = useState<"voice" | "text">("voice");
  const [journeyEntryMode, setJourneyEntryMode] = useState<"discovery" | "guided">("discovery");
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    name: "",
    phone: "",
    email: "",
  });
  const [storeNote, setStoreNote] = useState("");
  const [recommendationFeedbackStars, setRecommendationFeedbackStars] = useState<number | null>(null);

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

  const resetJourney = () => {
    setVoiceTags([]);
    setDiscoveryText("");
    setDiscoveryMode("voice");
    setJourneyEntryMode("discovery");
    setAnswers([]);
    setSelectedProducts([]);
    setSelectedProductId(null);
    setCustomerInfo({ name: "", phone: "", email: "" });
    setStoreNote("");
    setRecommendationFeedbackStars(null);
  };

  return (
    <JourneyContext.Provider
      value={{
        voiceTags,
        setVoiceTags,
        discoveryText,
        setDiscoveryText,
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

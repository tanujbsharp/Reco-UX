import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MessageSquareText, X, Send, ChevronLeft, Sparkles } from "lucide-react";
import { Product } from "../data/mockData";
import { cn } from "./ui/utils";
import { askQuestion } from "../services/chatApi";
import { useJourney } from "../context/JourneyContext";

interface Message {
  id: string;
  sender: "bot" | "user";
  text: string;
  time: string;
}

function timestamp() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function ProductChatWidget({ contextProducts }: { contextProducts: Product[] }) {
  const { sessionId } = useJourney();
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);

  const productIds = contextProducts
    .map((product) => Number(product.id))
    .filter((productId) => Number.isFinite(productId) && productId > 0);

  const botGreeting = contextProducts.length > 1
    ? `Need help comparing the ${contextProducts[0].model} and ${contextProducts[1].model}? Ask me anything.`
    : `Have questions about the ${contextProducts[0]?.model}? Ask me anything.`;

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      sender: "bot",
      text: botGreeting,
      time: timestamp(),
    },
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const appendBotMessage = (text: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `${Date.now()}-bot`,
        sender: "bot",
        text,
        time: timestamp(),
      },
    ]);
  };

  const handleSend = () => {
    if (!inputValue.trim() || isSending) return;

    const textToSend = inputValue.trim();
    setMessages((prev) => [
      ...prev,
      {
        id: `${Date.now()}-user`,
        sender: "user",
        text: textToSend,
        time: timestamp(),
      },
    ]);
    setInputValue("");

    if (!sessionId || productIds.length === 0) {
      appendBotMessage("Chat is unavailable until the recommendation session and product context are ready.");
      return;
    }

    setIsSending(true);
    askQuestion(textToSend, productIds, sessionId)
      .then((data) => {
        const answer = typeof data?.answer === "string" && data.answer.trim()
          ? data.answer.trim()
          : "I could not generate a useful answer right now.";
        appendBotMessage(answer);
      })
      .catch((error) => {
        console.error("Product chat request failed:", error);
        appendBotMessage("The product expert chat is unavailable right now. Please try again.");
      })
      .finally(() => {
        setIsSending(false);
      });
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95, transformOrigin: "bottom right" }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="fixed bottom-24 right-6 z-50 flex w-[360px] flex-col overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-[0_24px_48px_-12px_rgba(15,23,42,0.18)]"
          >
            <div className="flex items-center justify-between bg-[#2563eb] px-4 py-3 text-white">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsOpen(false)}
                  className="rounded-full p-1 transition-colors hover:bg-white/20"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div className="font-semibold tracking-wide">Ask Bsharp Reco</div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 transition-colors hover:bg-white/30"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="flex h-[380px] flex-col overflow-y-auto bg-slate-50 p-4">
              <div className="mb-4 text-center text-xs font-medium uppercase tracking-widest text-slate-400">Today</div>

              <div className="flex flex-col gap-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex w-full",
                      msg.sender === "user" ? "justify-end" : "justify-start gap-2",
                    )}
                  >
                    {msg.sender === "bot" && (
                      <div className="mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[#2563eb]/10 text-[#2563eb]">
                        <Sparkles className="h-3.5 w-3.5" />
                      </div>
                    )}
                    <div className="flex max-w-[80%] flex-col gap-1">
                      {msg.sender === "bot" && (
                        <span className="ml-1 text-[10px] font-semibold text-slate-400">Bsharp Reco</span>
                      )}
                      <div
                        className={cn(
                          "px-4 py-2.5 text-[13px] leading-relaxed shadow-sm",
                          msg.sender === "user"
                            ? "rounded-[20px] rounded-br-[4px] bg-[#2563eb] text-white"
                            : "rounded-[20px] rounded-bl-[4px] border border-slate-200 bg-white text-slate-700",
                        )}
                      >
                        {msg.text}
                      </div>
                      <span
                        className={cn(
                          "mt-0.5 text-[10px] font-medium text-slate-400",
                          msg.sender === "user" ? "mr-1 text-right" : "ml-1",
                        )}
                      >
                        {msg.time}
                      </span>
                    </div>
                  </div>
                ))}
                {isSending && (
                  <div className="flex w-full justify-start gap-2">
                    <div className="mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[#2563eb]/10 text-[#2563eb]">
                      <Sparkles className="h-3.5 w-3.5" />
                    </div>
                    <div className="max-w-[80%] rounded-[20px] rounded-bl-[4px] border border-slate-200 bg-white px-4 py-2.5 text-[13px] text-slate-500 shadow-sm">
                      Thinking...
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            <div className="border-t border-slate-100 bg-white p-3">
              <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 py-1.5 pl-4 pr-1.5 transition-all focus-within:border-[#2563eb]/30 focus-within:bg-white focus-within:ring-2 focus-within:ring-[#2563eb]/10">
                <input
                  type="text"
                  placeholder="Ask a question..."
                  className="flex-1 bg-transparent py-1 text-sm outline-none placeholder:text-slate-400"
                  value={inputValue}
                  disabled={isSending}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                />
                <button
                  onClick={handleSend}
                  disabled={isSending || !inputValue.trim()}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-[#2563eb] text-white transition-colors hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={() => setIsOpen(true)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label={contextProducts.length > 1 ? "Open comparison chat" : "Open product chat"}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#2563eb] text-white shadow-[0_18px_40px_-12px_rgba(37,99,235,0.55)]"
      >
        <MessageSquareText className="h-6 w-6" />
      </motion.button>
    </>
  );
}

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MessageSquareText, X, Send, ChevronLeft, Sparkles } from "lucide-react";
import { Product } from "../data/mockData";
import { cn } from "./ui/utils";

interface Message {
  id: string;
  sender: "bot" | "user";
  text: string;
  time: string;
}

const chipScoreMap: Record<string, number> = {
  "Intel Core Ultra 7": 1,
  "Intel Core Ultra 9": 2,
  "Intel Core Ultra 9 Pro": 3,
};

function parseMetric(value: string) {
  const parsed = Number.parseFloat(value.replace(/[^0-9.]/g, ""));
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function ProductChatWidget({ contextProducts }: { contextProducts: Product[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  
  const botGreeting = contextProducts.length > 1
    ? `Need help comparing the ${contextProducts[0].model} and ${contextProducts[1].model}? Ask me anything!`
    : `Have questions about the ${contextProducts[0]?.model}? Ask me anything!`;

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      sender: "bot",
      text: botGreeting,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = () => {
    if (!inputValue.trim()) return;
    
    const textToSend = inputValue;
    const newUserMsg: Message = {
      id: Date.now().toString(),
      sender: "user",
      text: textToSend,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    
    setMessages(prev => [...prev, newUserMsg]);
    setInputValue("");
    
    // Mock bot reply based on page context (KB mock)
    setTimeout(() => {
      const lowerInput = textToSend.toLowerCase();
      const hasWord = (words: string[]) => words.some(w => lowerInput.includes(w));
      const isComparison = contextProducts.length > 1;

      let replyText = "I can help with that! A store associate will be with you shortly to provide more details.";
      
      // Extended mock KB matching
      if (hasWord(["better", "stronger", "faster", "more", "win"])) {
        if (isComparison) {
          if (hasWord(["battery", "charge"])) {
            replyText = `The ${contextProducts[0].model} gets ${contextProducts[0].batteryLife.toLowerCase()}, and the ${contextProducts[1].model} gets ${contextProducts[1].batteryLife.toLowerCase()}.`;
          } else if (hasWord(["weight", "heavy", "light", "carry", "portable"])) {
             const leftWeight = parseMetric(contextProducts[0].weight);
             const rightWeight = parseMetric(contextProducts[1].weight);
             const winner = leftWeight <= rightWeight ? contextProducts[0] : contextProducts[1];
             replyText = `${winner.model} is easier to carry daily as it's lighter at ${winner.weight}.`;
          } else if (hasWord(["screen", "display", "size", "big"])) {
             const leftScreen = parseMetric(contextProducts[0].screenSize);
             const rightScreen = parseMetric(contextProducts[1].screenSize);
             const winner = leftScreen >= rightScreen ? contextProducts[0] : contextProducts[1];
             replyText = `${winner.model} has a larger display at ${winner.screenSize}.`;
          } else if (hasWord(["price", "cheap", "value"])) {
             const winner = contextProducts[0].price <= contextProducts[1].price ? contextProducts[0] : contextProducts[1];
             replyText = `${winner.model} is the more affordable option at ₹${winner.price.toLocaleString()}.`;
          } else {
             // General "which is better" performance answer
             const leftChip = chipScoreMap[contextProducts[0].chip] ?? 0;
             const rightChip = chipScoreMap[contextProducts[1].chip] ?? 0;
             const winner = leftChip >= rightChip ? contextProducts[0] : contextProducts[1];
             replyText = `${winner.model} gives more long-term headroom with its ${winner.chip}. It's the stronger pick for heavy tasks.`;
          }
        } else {
          replyText = `This is a premium model! It is ${contextProducts[0].bestFor.toLowerCase()}.`;
        }
      } else if (hasWord(["battery", "charge", "last"])) {
        replyText = isComparison 
          ? `The ${contextProducts[0].model} gets ${contextProducts[0].batteryLife.toLowerCase()}, while the ${contextProducts[1].model} gets ${contextProducts[1].batteryLife.toLowerCase()}.`
          : `The ${contextProducts[0].model} has ${contextProducts[0].batteryLife.toLowerCase()}.`;
      } else if (hasWord(["weight", "heavy", "light"])) {
        replyText = isComparison 
          ? `The ${contextProducts[0].model} is ${contextProducts[0].weight}, and the ${contextProducts[1].model} is ${contextProducts[1].weight}.`
          : `The ${contextProducts[0].model} weighs ${contextProducts[0].weight}.`;
      } else if (hasWord(["screen", "display", "size", "monitor", "inch"])) {
        replyText = isComparison 
          ? `The ${contextProducts[0].model} has a ${contextProducts[0].display}, whereas the ${contextProducts[1].model} features a ${contextProducts[1].display}.`
          : `It features a ${contextProducts[0].display}.`;
      } else if (hasWord(["chip", "processor", "cpu", "speed", "fast", "intel"])) {
        replyText = isComparison 
          ? `You're looking at the ${contextProducts[0].chip} vs the ${contextProducts[1].chip}.`
          : `It is powered by the ${contextProducts[0].chip}.`;
      } else if (hasWord(["port", "usb", "hdmi", "plug", "connect", "magsafe", "thunderbolt"])) {
        replyText = isComparison 
          ? `The ${contextProducts[0].model} has: ${contextProducts[0].ports}. The ${contextProducts[1].model} has: ${contextProducts[1].ports}.`
          : `It has the following ports: ${contextProducts[0].ports}.`;
      } else if (hasWord(["price", "cost", "much", "rupees", "expensive", "cheap"])) {
        replyText = isComparison 
          ? `The ${contextProducts[0].model} is ₹${contextProducts[0].price.toLocaleString()}, and the ${contextProducts[1].model} is ₹${contextProducts[1].price.toLocaleString()}.`
          : `The ${contextProducts[0].model} is priced at ₹${contextProducts[0].price.toLocaleString()}.`;
      } else if (hasWord(["ram", "memory", "gb"])) {
        replyText = isComparison 
          ? `The ${contextProducts[0].model} comes with ${contextProducts[0].memory}, and the ${contextProducts[1].model} comes with ${contextProducts[1].memory}.`
          : `It comes with ${contextProducts[0].memory}.`;
      } else if (hasWord(["storage", "ssd", "space", "drive"])) {
        replyText = isComparison 
          ? `The ${contextProducts[0].model} has ${contextProducts[0].storage}, and the ${contextProducts[1].model} has ${contextProducts[1].storage}.`
          : `It has ${contextProducts[0].storage}.`;
      } else if (hasWord(["color", "finish", "look", "black", "silver"])) {
        replyText = isComparison 
          ? `The ${contextProducts[0].model} comes in ${contextProducts[0].finish}, and the ${contextProducts[1].model} comes in ${contextProducts[1].finish}.`
          : `It comes in a beautiful ${contextProducts[0].finish} finish.`;
      } else if (hasWord(["noise", "loud", "quiet", "fan", "silent"])) {
        replyText = isComparison 
          ? `The ${contextProducts[0].model} is ${contextProducts[0].noiseLevel.toLowerCase()}, while the ${contextProducts[1].model} is ${contextProducts[1].noiseLevel.toLowerCase()}.`
          : `This model's noise profile is: ${contextProducts[0].noiseLevel.toLowerCase()}.`;
      } else if (hasWord(["why", "recommend", "best", "good", "reason"])) {
        replyText = isComparison 
          ? `The ${contextProducts[0].model} is ${contextProducts[0].bestFor.toLowerCase()}, while the ${contextProducts[1].model} is ${contextProducts[1].bestFor.toLowerCase()}.`
          : `${contextProducts[0].whyRecommended}`;
      } else {
        // Fallback uses the context to say something smart anyway
        replyText = isComparison
          ? `Both are great options! The ${contextProducts[0].model} is ${contextProducts[0].bestFor.toLowerCase()}, while the ${contextProducts[1].model} is ${contextProducts[1].bestFor.toLowerCase()}. I can also check specific specs like battery or RAM.`
          : `I'm here to help! Did you know this PC is ${contextProducts[0].bestFor.toLowerCase()}? Let me know if you want to check specific specs like ports, battery, or price.`;
      }

      const botReply: Message = {
        id: (Date.now() + 1).toString(),
        sender: "bot",
        text: replyText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, botReply]);
    }, 800);
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
            {/* Header */}
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
            
            {/* Messages Area */}
            <div className="flex h-[380px] flex-col overflow-y-auto bg-slate-50 p-4">
              <div className="mb-4 text-center text-xs font-medium text-slate-400 uppercase tracking-widest">Today</div>
              
              <div className="flex flex-col gap-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex w-full",
                      msg.sender === "user" ? "justify-end" : "justify-start gap-2"
                    )}
                  >
                    {msg.sender === "bot" && (
                      <div className="mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[#2563eb]/10 text-[#2563eb]">
                        <Sparkles className="h-3.5 w-3.5" />
                      </div>
                    )}
                    <div className="flex flex-col gap-1 max-w-[80%]">
                      {msg.sender === "bot" && (
                        <span className="text-[10px] font-semibold text-slate-400 ml-1">Bsharp Reco</span>
                      )}
                      <div
                        className={cn(
                          "px-4 py-2.5 text-[13px] leading-relaxed shadow-sm",
                          msg.sender === "user"
                            ? "bg-[#2563eb] text-white rounded-[20px] rounded-br-[4px]"
                            : "bg-white border border-slate-200 text-slate-700 rounded-[20px] rounded-bl-[4px]"
                        )}
                      >
                        {msg.text}
                      </div>
                      <span className={cn("text-[10px] font-medium text-slate-400 mt-0.5", msg.sender === "user" ? "text-right mr-1" : "ml-1")}>
                        {msg.time}
                      </span>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input Area */}
            <div className="border-t border-slate-100 bg-white p-3">
              <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 pl-4 pr-1.5 py-1.5 focus-within:border-[#2563eb]/30 focus-within:bg-white focus-within:ring-2 focus-within:ring-[#2563eb]/10 transition-all">
                <input
                  type="text"
                  placeholder="Ask a question..."
                  className="flex-1 bg-transparent py-1 text-sm outline-none placeholder:text-slate-400"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                />
                <button
                  onClick={handleSend}
                  disabled={!inputValue.trim()}
                  className="ml-1 flex h-8 w-8 items-center justify-center rounded-full bg-[#2563eb] text-white transition-all hover:bg-[#1d4ed8] disabled:bg-slate-200 disabled:text-slate-400 shadow-sm"
                >
                  <Send className="h-3.5 w-3.5 -ml-0.5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#2563eb] text-white shadow-[0_12px_24px_-6px_rgba(37,99,235,0.4)] transition-colors hover:bg-[#1d4ed8]"
          >
            <MessageSquareText className="h-6 w-6" />
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
}
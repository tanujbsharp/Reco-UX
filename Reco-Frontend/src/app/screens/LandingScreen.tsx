import React, { useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { ArrowRight, LockKeyhole, Store } from "lucide-react";
import { TwoZoneLayout } from "../components/TwoZoneLayout";
import { BrandMark } from "../components/BrandMark";
import { GlowCard } from "../components/GlowCard";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

export function LandingScreen() {
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState({
    retailId: "",
    password: "",
  });

  const canContinue = credentials.retailId.trim() && credentials.password.trim();

  return (
    <TwoZoneLayout showCommentary={false} showTopBar={false} showStartOver={false}>
      <div className="flex min-h-full items-center justify-center px-2 py-1 md:px-5 md:py-2">
        <div className="grid h-full max-h-[calc(100dvh-3.25rem)] w-full max-w-[1120px] gap-3 lg:grid-cols-[1fr_0.92fr]">
          <GlowCard glowColor="blue" customSize className="min-h-0 overflow-hidden rounded-[34px]">
            <div className="flex h-full flex-col gap-4 overflow-auto p-4 md:p-4.5">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-3 rounded-full border border-white/80 bg-white/85 px-4 py-2 shadow-sm">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center">
                    <BrandMark className="h-full w-full max-h-9 max-w-9 object-contain drop-shadow-[0_1px_3px_rgba(15,23,42,0.12)]" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-800">Bsharp Reco</div>
                    <div className="text-sm font-medium text-slate-700">Retail recommendation suite</div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="inline-flex items-center rounded-full bg-[#2563eb]/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-[#2563eb]">
                    Store login
                  </div>
                  <h1 className="max-w-2xl text-[1.6rem] font-semibold tracking-tight text-slate-950 md:text-[2rem]">
                    Premium in-store PC recommendations, built for guided selling.
                  </h1>
                  <p className="max-w-2xl text-sm leading-6 text-slate-600 md:text-[15px]">
                    This experience walks you from open discovery to confident PC selection through voice or typed input, adaptive questions, side-by-side comparison, and an assisted handoff.
                  </p>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-[28px] border border-slate-200 bg-white/90 p-3.5">
                    <div className="mb-2.5 flex h-9 w-9 items-center justify-center rounded-2xl bg-[#2563eb]/10">
                      <Store className="h-5 w-5 text-[#2563eb]" />
                    </div>
                    <h2 className="text-[15px] font-semibold text-slate-900">Retail-ready UX</h2>
                    <p className="mt-1 text-sm leading-5 text-slate-600">
                      Optimized for landscape tablets, desktop kiosks, and guided store conversations.
                    </p>
                  </div>

                  <div className="rounded-[28px] border border-slate-200 bg-white/90 p-3.5">
                    <div className="mb-2.5 flex h-9 w-9 items-center justify-center rounded-2xl bg-[#2563eb]/10">
                      <LockKeyhole className="h-5 w-5 text-[#2563eb]" />
                    </div>
                    <h2 className="text-[15px] font-semibold text-slate-900">Secure session</h2>
                    <p className="mt-1 text-sm leading-5 text-slate-600">
                      All recommendations and customer data are securely processed and cleared between sessions.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-white/85 p-3.5 text-sm leading-5 text-slate-600">
                Default outlet: <span className="font-semibold text-slate-900">Indiranagar Experience Centre, Bengaluru</span>
              </div>
            </div>
          </GlowCard>

          <GlowCard glowColor="purple" customSize className="min-h-0 overflow-hidden rounded-[34px]">
            <motion.div 
              animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
              transition={{ duration: 15, ease: "linear", repeat: Infinity }}
              className="flex h-full flex-col justify-center overflow-auto bg-[length:200%_200%] bg-gradient-to-br from-indigo-50/50 via-purple-50/30 to-pink-50/50 p-4 md:p-4.5"
            >
              <div className="mb-4 space-y-2">
                <div className="inline-flex items-center rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white">
                  Staff access
                </div>
                <h2 className="text-[1.45rem] font-semibold tracking-tight text-slate-950 md:text-[1.75rem]">Log in to begin a new session</h2>
                <p className="text-sm leading-6 text-slate-600">
                  Enter your store credentials to begin assisting a new customer.
                </p>
              </div>

              <div className="space-y-3">
                <div className="grid gap-2">
                  <Label htmlFor="retail-id" className="text-sm font-semibold text-slate-900">Retail ID</Label>
                  <Input
                    id="retail-id"
                    value={credentials.retailId}
                    onChange={(event) =>
                      setCredentials((current) => ({ ...current, retailId: event.target.value }))
                    }
                    placeholder="BSHARP-IND-104"
                    className="h-11 rounded-2xl border-slate-200 bg-black/5"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password" className="text-sm font-semibold text-slate-900">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={credentials.password}
                    onChange={(event) =>
                      setCredentials((current) => ({ ...current, password: event.target.value }))
                    }
                    placeholder="Enter password"
                    className="h-11 rounded-2xl border-slate-200 bg-black/5"
                  />
                </div>
              </div>

              <Button
                size="lg"
                disabled={!canContinue}
                onClick={() => navigate("/consent")}
                className="mt-4 h-11 rounded-full bg-[#2563eb] text-white hover:bg-[#1d4ed8]"
              >
                Login
                <ArrowRight className="h-4 w-4" />
              </Button>
            </motion.div>
          </GlowCard>
        </div>
      </div>
    </TwoZoneLayout>
  );
}

"use client";

import React, { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";
import DarkVeil from "@/components/ui-block/DarkVeil";

/**
 * Root Error Boundary for Learnova
 * Catches any unhandled client-side runtime errors globally.
 * Designed with a stunning premium dark glassmorphic interface and error diagnostics.
 */
export default function GlobalError({ error, reset }) {
  useEffect(() => {
    console.error("Captured Runtime Layout Error:", error);
  }, [error]);

  return (
    <>
      <div className="fixed inset-0 -z-10 bg-black">
        <DarkVeil />
        <div className="absolute h-96 w-96 rounded-full bg-gradient-to-r from-red-600/10 to-purple-600/10 blur-3xl pointer-events-none top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
      </div>

      <main className="relative z-10 flex min-h-screen items-center justify-center px-6 py-24 text-center text-white">
        <div className="w-full max-w-xl space-y-8 p-8 rounded-3xl border border-white/10 bg-zinc-950/40 backdrop-blur-md shadow-2xl">
          <div className="inline-flex rounded-full border border-red-500/20 bg-red-500/10 p-4 text-red-400 mx-auto">
            <AlertTriangle className="h-10 w-10 animate-bounce" />
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Something went wrong
            </h1>
            <p className="text-base text-slate-300">
              The application encountered an unexpected runtime error while displaying this view.
            </p>
          </div>

          {error?.message && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-left backdrop-blur-sm">
              <span className="block text-xs font-bold uppercase tracking-wider text-red-400 mb-1">
                Diagnostic Information
              </span>
              <p className="font-mono text-xs text-red-300 break-all bg-black/30 p-2.5 rounded border border-red-950/20 max-h-24 overflow-y-auto">
                {error.message}
              </p>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <button
              onClick={() => reset()}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-500 px-6 py-3 text-sm font-semibold text-white shadow-xl shadow-red-600/20 transition-all duration-300 hover:scale-[1.03] active:scale-[0.97]"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </button>

            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition-all duration-300 hover:bg-white/10 hover:scale-[1.03] active:scale-[0.97]"
            >
              <Home className="h-4 w-4 text-slate-300" />
              Go Home
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Loader2,
  Terminal,
  Cpu,
  Layers,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  RefreshCw
} from "lucide-react";
import { callAzureFoundry, type AzureChatResponse } from "@/lib/azure-api";

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<AzureChatResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTest = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await callAzureFoundry(prompt);
      setResponse(data);
      setPrompt(""); // Clear input after success
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#040911] text-white p-4 md:p-8 selection:bg-azure-500/30">
      {/* Background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-azure-900/20 blur-[120px] rounded-full animate-pulse-slow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-azure-600/10 blur-[120px] rounded-full animate-pulse-slow" />
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Header */}
        <header className="mb-12">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 mb-2"
          >
            <div className="p-2 bg-azure-500/10 rounded-lg border border-azure-500/20">
              <Cpu className="w-5 h-5 text-azure-400" />
            </div>
            <span className="text-azure-400 font-medium tracking-wider text-xs uppercase">Azure AI Foundry</span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-bold tracking-tight mb-4"
          >
            API Connectivity <span className="text-transparent bg-clip-text bg-gradient-to-r from-azure-400 to-azure-600">Tester</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-slate-400 text-lg max-w-2xl"
          >
            A premium exploration environment to validate your Azure AI Foundry deployment within a Next.js ecosystem.
          </motion.p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Input */}
          <div className="lg:col-span-12">
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="glass p-6 rounded-2xl border border-white/5"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
                  <Terminal className="w-4 h-4 text-azure-400" />
                  <span>Request Payload</span>
                </div>
                <div className="flex items-center gap-4 text-[10px] uppercase tracking-widest text-slate-500 font-bold">
                  <span>Next.js 15</span>
                  <span>TypeScript</span>
                </div>
              </div>

              <div className="relative mb-4">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleTest();
                    }
                  }}
                  placeholder="Ask something to your Azure AI Model..."
                  className="w-full h-32 bg-black/40 border border-white/10 rounded-xl p-4 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-azure-500/40 focus:border-azure-500/40 transition-all resize-none font-mono text-sm shadow-inner"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex gap-4">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Secure
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                    <Layers className="w-3.5 h-3.5" />
                    Direct API
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleTest}
                  disabled={loading || !prompt.trim()}
                  className={`
                    flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all
                    ${loading || !prompt.trim()
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5'
                      : 'bg-gradient-to-r from-azure-600 to-azure-500 text-white shadow-lg shadow-azure-900/40 hover:shadow-azure-500/20 active:from-azure-700 active:to-azure-600 border border-azure-400/20'}
                  `}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Execute Test
                    </>
                  )}
                </motion.button>
              </div>
            </motion.div>
          </div>

          {/* Response Area */}
          <div className="lg:col-span-12">
            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-start gap-3 mb-6"
                >
                  <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                  <div>
                    <h3 className="text-red-500 font-semibold text-sm">Deployment Connection Failure</h3>
                    <p className="text-red-400/80 text-xs mt-1 leading-relaxed">
                      {error}
                    </p>
                    <button
                      onClick={handleTest}
                      className="mt-3 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-white hover:text-red-200 transition-colors"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Retry Connection
                    </button>
                  </div>
                </motion.div>
              )}

              {response ? (
                <motion.div
                  key="response"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass rounded-2xl border border-white/5 overflow-hidden"
                >
                  <div className="bg-white/5 px-6 py-4 flex items-center justify-between border-b border-white/5">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-sm font-semibold tracking-wide">Output Received</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">Payload: {JSON.stringify(response).length} bytes</span>
                  </div>
                  <div className="p-6">
                    <p className="text-slate-300 leading-relaxed font-serif text-lg whitespace-pre-wrap">
                      {response.choices?.[0]?.message?.content || "No content returned from the API."}
                    </p>
                  </div>
                  <div className="bg-black/20 p-4 border-t border-white/5">
                    <details className="cursor-pointer group">
                      <summary className="text-[10px] font-bold uppercase tracking-widest text-azure-400 group-hover:text-azure-300 transition-colors flex items-center gap-1 list-none">
                        <ChevronRight className="w-3 h-3 transition-transform group-open:rotate-90" />
                        View Raw JSON Response
                      </summary>
                      <pre className="mt-4 p-4 bg-black/40 rounded-xl overflow-x-auto text-[11px] font-mono text-azure-300/80 border border-azure-900/20">
                        {JSON.stringify(response, null, 2)}
                      </pre>
                    </details>
                  </div>
                </motion.div>
              ) : !loading && !error && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.5 }}
                  className="border-2 border-dashed border-white/5 rounded-2xl p-20 flex flex-col items-center justify-center text-center"
                >
                  <div className="mb-4 p-4 rounded-full bg-white/5 border border-white/5">
                    <Send className="w-8 h-8 text-slate-600" />
                  </div>
                  <h3 className="text-slate-500 font-medium mb-1">Awaiting Test Execution</h3>
                  <p className="text-slate-600 text-sm max-w-[250px]">
                    Configure your endpoint in .env.local and run a test to see results here.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Footer info */}
        <footer className="mt-16 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-slate-600 text-[11px] uppercase tracking-[0.2em] font-medium">
          <div>Next.js Infrastructure Tester</div>
          <div className="flex gap-6">
            <span className="hover:text-azure-400 cursor-pointer transition-colors">Documentation</span>
            <span className="hover:text-azure-400 cursor-pointer transition-colors">Privacy</span>
            <span className="hover:text-azure-400 cursor-pointer transition-colors">Status</span>
          </div>
        </footer>
      </div>
    </main>
  );
}

import { useEffect, useMemo, useState } from "react";
import Dashboard from "./components/Dashboard";
import Reports from "./components/Reports";
import { api } from "./api";

import type {
  Credit,
  Commitment,
  Refund,
  Cancellation,
} from "./types";

export default function App() {
  // -------------------------
  // ESTADOS PRINCIPAIS
  // -------------------------
  const [credits, setCredits] = useState<Credit[]>([]);
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [cancellations, setCancellations] = useState<Cancellation[]>([]);

  const [activeTab, setActiveTab] = useState<"dashboard" | "reports">(
    "dashboard"
  );

  const [isLoading, setIsLoading] = useState(true);

  // -------------------------
  // SINCRONIZAÇÃO INICIAL
  // -------------------------
  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        const state = await api.getFullState();

        if (!mounted || !state) return;

        setCredits(Array.isArray(state.credits) ? state.credits : []);
        setCommitments(
          Array.isArray(state.commitments) ? state.commitments : []
        );
        setRefunds(Array.isArray(state.refunds) ? state.refunds : []);
        setCancellations(
          Array.isArray(state.cancellations) ? state.cancellations : []
        );
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    loadData();

    return () => {
      mounted = false;
    };
  }, []);

  // -------------------------
  // BLINDAGEM ABSOLUTA
  // -------------------------
  const safeCredits = useMemo(
    () => (Array.isArray(credits) ? credits : []),
    [credits]
  );

  const safeCommitments = useMemo(
    () => (Array.isArray(commitments) ? commitments : []),
    [commitments]
  );

  const safeRefunds = useMemo(
    () => (Array.isArray(refunds) ? refunds : []),
    [refunds]
  );

  const safeCancellations = useMemo(
    () => (Array.isArray(cancellations) ? cancellations : []),
    [cancellations]
  );

  // -------------------------
  // LOADING SCREEN
  // -------------------------
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="text-center space-y-4">
          <div className="text-emerald-600 text-sm font-black uppercase tracking-widest">
            Carregando dados…
          </div>
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            Sincronizando com Supabase
          </div>
        </div>
      </div>
    );
  }

  // -------------------------
  // RENDER PRINCIPAL
  // -------------------------
  return (
    <div className="min-h-screen bg-slate-100">
      {/* HEADER */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center">
        <h1 className="text-lg font-bold text-slate-800">
          Sistema de Créditos
        </h1>

        <nav className="flex gap-2">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`px-4 py-2 rounded text-sm font-semibold ${
              activeTab === "dashboard"
                ? "bg-emerald-600 text-white"
                : "bg-slate-200 text-slate-700"
            }`}
          >
            Dashboard
          </button>

          <button
            onClick={() => setActiveTab("reports")}
            className={`px-4 py-2 rounded text-sm font-semibold ${
              activeTab === "reports"
                ? "bg-emerald-600 text-white"
                : "bg-slate-200 text-slate-700"
            }`}
          >
            Relatórios
          </button>
        </nav>
      </header>

      {/* CONTEÚDO */}
      <main className="p-6">
        {activeTab === "dashboard" && (
          <Dashboard
            credits={safeCredits}
            commitments={safeCommitments}
            refunds={safeRefunds}
            cancellations={safeCancellations}
            onAddCredit={async (credit) => {
              const saved = await api.addCredit(credit);
              if (saved) {
                setCredits((prev) => [...prev, saved]);
              }
            }}
          />
        )}

        {activeTab === "reports" && (
          <Reports
            credits={safeCredits}
            commitments={safeCommitments}
            refunds={safeRefunds}
            cancellations={safeCancellations}
          />
        )}
      </main>
    </div>
  );
}

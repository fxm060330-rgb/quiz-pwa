"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { getQuestionCount, importQuestions } from "@/lib/db";
import { questions as embeddedQuestions } from "@/data/questions";

interface AppState {
  questionCount: number;
  dbReady: boolean;
  importing: boolean;
  importError: string | null;
  refreshCount: () => Promise<void>;
}

const AppContext = createContext<AppState>({
  questionCount: 0,
  dbReady: false,
  importing: false,
  importError: null,
  refreshCount: async () => {},
});

export function AppProvider({ children }: { children: ReactNode }) {
  const [questionCount, setQuestionCount] = useState(0);
  const [dbReady, setDbReady] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const refreshCount = useCallback(async () => {
    const count = await getQuestionCount();
    setQuestionCount(count);
  }, []);

  useEffect(() => {
    async function init() {
      const count = await getQuestionCount();
      if (count === 0) {
        setImporting(true);
        try {
          if (embeddedQuestions.length > 0) {
            await importQuestions(embeddedQuestions);
            await refreshCount();
          }
        } catch (e) {
          setImportError((e as Error).message);
        } finally {
          setImporting(false);
        }
      } else {
        setQuestionCount(count);
      }
      setDbReady(true);
    }
    init();
  }, [refreshCount]);

  return (
    <AppContext.Provider value={{ questionCount, dbReady, importing, importError, refreshCount }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}

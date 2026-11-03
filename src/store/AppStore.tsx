// Single application store.
//
// One context holds all persisted state. Every mutation goes through this provider, which
// writes to localStorage on change and reports storage failures to the UI instead of
// crashing. React state handles real-time interface updates; localStorage handles
// persistence. There is no other storage layer.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  clearAppData,
  defaultAppData,
  isStorageAvailable,
  loadAppData,
  saveAppData,
  storageStatus,
} from '../lib/storage';
import type { StorageStatus } from '../lib/storage';
import { evaluateAchievements, updateLessonProgress, updateRecords } from '../lib/results';
import type { AppData, LessonProgress, Settings, TestResult } from '../lib/types';

interface StoreValue {
  data: AppData;
  settings: Settings;
  storage: StorageStatus;
  /** Achievement ids unlocked by the most recent recordResult call. */
  justUnlocked: string[];
  clearJustUnlocked: () => void;
  updateSettings: (patch: Partial<Settings>) => void;
  recordResult: (result: TestResult, lessonTargets?: { wpm: number; accuracy: number }) => void;
  replaceData: (data: AppData) => void;
  resetAll: () => void;
  deleteResult: (id: string) => void;
  lessonProgress: (lessonId: string) => LessonProgress | undefined;
}

const StoreContext = createContext<StoreValue | null>(null);

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(() => (isStorageAvailable() ? loadAppData() : defaultAppData()));
  const [storage, setStorage] = useState<StorageStatus>(() => (isStorageAvailable() ? 'ok' : 'unavailable'));
  const [justUnlocked, setJustUnlocked] = useState<string[]>([]);
  const firstRender = useRef(true);

  // Persist on every change except the initial hydration.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const ok = saveAppData(data);
    if (!ok) setStorage(storageStatus());
    else setStorage('ok');
  }, [data]);

  // Theme is applied to <html data-theme> so CSS variables switch instantly.
  useEffect(() => {
    document.documentElement.dataset.theme = data.settings.theme;
  }, [data.settings.theme]);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setData((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }));
  }, []);

  const recordResult = useCallback<StoreValue['recordResult']>((result, lessonTargets) => {
    setData((prev) => {
      const results = [...prev.results, result];
      const records = updateRecords(prev.records, result);
      const lessons = { ...prev.lessons };
      if (result.lessonId && lessonTargets) {
        lessons[result.lessonId] = updateLessonProgress(
          prev.lessons[result.lessonId],
          result.lessonId,
          result,
          lessonTargets.wpm,
          lessonTargets.accuracy,
        );
      }
      const next: AppData = { ...prev, results, records, lessons };
      const unlocked = evaluateAchievements(next);
      if (unlocked.length) {
        const at = new Date().toISOString();
        next.achievements = { ...next.achievements };
        for (const id of unlocked) next.achievements[id] = at;
        // Defer the notification so it does not run during the state updater.
        queueMicrotask(() => setJustUnlocked(unlocked));
      }
      return next;
    });
  }, []);

  const replaceData = useCallback((next: AppData) => setData(next), []);

  const resetAll = useCallback(() => {
    clearAppData();
    setData(defaultAppData());
  }, []);

  const deleteResult = useCallback((id: string) => {
    setData((prev) => ({ ...prev, results: prev.results.filter((r) => r.id !== id) }));
  }, []);

  const lessonProgress = useCallback((lessonId: string) => data.lessons[lessonId], [data.lessons]);

  const value = useMemo<StoreValue>(
    () => ({
      data,
      settings: data.settings,
      storage,
      justUnlocked,
      clearJustUnlocked: () => setJustUnlocked([]),
      updateSettings,
      recordResult,
      replaceData,
      resetAll,
      deleteResult,
      lessonProgress,
    }),
    [data, storage, justUnlocked, updateSettings, recordResult, replaceData, resetAll, deleteResult, lessonProgress],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside AppStoreProvider');
  return ctx;
}

export function useSettings(): Settings {
  return useStore().settings;
}

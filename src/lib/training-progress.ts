// Progresso das trilhas do Tutorial, salvo no projeto (preferência da clínica).
import { useEffect, useState } from "react";
import {
  readPreference,
  refreshPreferences,
  savePreference,
  subscribePreferences,
} from "./preferences";
import { trainingSteps, type Training } from "./training";

type Progress = Record<string, string[]>;

export function useTrainingProgress() {
  const [progress, setProgress] = useState<Progress>(
    () => readPreference("trainingProgress") ?? {},
  );
  useEffect(() => {
    const refresh = () => setProgress(readPreference("trainingProgress") ?? {});
    const unsubscribe = subscribePreferences(refresh);
    void refreshPreferences().then(refresh);
    return unsubscribe;
  }, []);
  function update(next: Progress) {
    setProgress(next);
    void savePreference({ key: "trainingProgress", value: next });
  }
  return [progress, update] as const;
}

export function trainingPercent(t: Training, progress: Progress) {
  const all = trainingSteps(t);
  const done = new Set(progress[t.id] ?? []);
  return all.length ? Math.round((all.filter((s) => done.has(s)).length / all.length) * 100) : 0;
}

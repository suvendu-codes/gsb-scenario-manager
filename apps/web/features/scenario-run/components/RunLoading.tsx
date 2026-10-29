"use client";

import { useEffect, useState } from "react";

import { runLoadingStyles as styles } from "./RunLoading.styles";

/** The steps the loading screen walks through, as the design names them. */
export const LOADING_STEPS = [
  "Reading the scenario",
  "Loading datasets",
  "Placing stations and bots",
  "Warming up",
];
const STEP_MS = 320;
const TOTAL_MS = 1400;

type RunLoadingProps = {
  scenarioName: string;
  stations: number;
  bots: number;
  /** Called when loading is done and the run should start. */
  onDone: () => void;
};

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** "Starting the emulation": a short full-page progress through the start-up steps. */
export function RunLoading({
  scenarioName,
  stations,
  bots,
  onDone,
}: RunLoadingProps): React.JSX.Element {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const steps = window.setInterval(
      () => setStep((s) => Math.min(LOADING_STEPS.length - 1, s + 1)),
      STEP_MS,
    );
    const done = window.setTimeout(onDone, TOTAL_MS);
    return () => {
      window.clearInterval(steps);
      window.clearTimeout(done);
    };
  }, [onDone]);

  return (
    <div className={styles.root} role="status" aria-live="polite">
      <p className={styles.title}>Starting the emulation</p>
      <p className={styles.detail}>
        {scenarioName} · {plural(stations, "station")} · {plural(bots, "bot")}
      </p>
      <div
        className={styles.track}
        role="progressbar"
        aria-label="Starting"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(((step + 1) / LOADING_STEPS.length) * 100)}
      >
        <div
          className={styles.bar}
          style={{ width: `${((step + 1) / LOADING_STEPS.length) * 100}%` }}
        />
      </div>
      <p key={step} className={styles.step}>
        {LOADING_STEPS[step]}
      </p>
    </div>
  );
}

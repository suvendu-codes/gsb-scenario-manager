import { Minus, Plus } from "lucide-react";

import { SIM_DURATION } from "../constants";
import { simulationDurationStyles as styles } from "./SimulationDuration.styles";

/**
 * Card with a − / + stepper for the simulation length, from 1 to 24 hours.
 *
 * @param hours - The current duration in hours.
 * @param onChange - Called with the new duration when a button is clicked.
 */
export function SimulationDuration({
  hours,
  onChange,
}: {
  hours: number;
  onChange: (hours: number) => void;
}): React.JSX.Element {
  return (
    <section className={styles.root} aria-labelledby="sim-duration-title">
      <h2 id="sim-duration-title" className={styles.title}>
        Simulation duration
        <span className={styles.sub}>set the overall run length for this scenario</span>
      </h2>
      <div className={styles.stepper}>
        <button
          type="button"
          className={styles.button}
          aria-label="Decrease simulation duration"
          disabled={hours <= SIM_DURATION.min}
          onClick={() => onChange(hours - 1)}
        >
          <Minus className={styles.icon} aria-hidden="true" />
        </button>
        <output className={styles.value} aria-live="polite">
          {hours}h
        </output>
        <button
          type="button"
          className={styles.button}
          aria-label="Increase simulation duration"
          disabled={hours >= SIM_DURATION.max}
          onClick={() => onChange(hours + 1)}
        >
          <Plus className={styles.icon} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}

"use client";

import { Dialog as DialogPrimitive } from "radix-ui";
import { X } from "lucide-react";
import { useState } from "react";

import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

import { formatHM } from "../live/engine";
import type { RunEvent } from "../live/types";
import { eventLogStyles as styles } from "./EventLog.styles";

const TYPE_LABELS: Record<RunEvent["type"], string> = {
  run: "Run",
  schedule: "Schedule",
  warehouse: "Warehouse",
  change: "Live change",
};

type EventLogProps = {
  events: RunEvent[];
  nowH: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/** The event log, in a side drawer: every event so far, newest first, with search and filters. */
export function EventLog({ events, nowH, open, onOpenChange }: EventLogProps): React.JSX.Element {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<RunEvent["type"] | "all">("all");
  const [severity, setSeverity] = useState<RunEvent["severity"] | "all">("all");
  const shown = events
    .filter(
      (e) =>
        (type === "all" || e.type === type) &&
        (severity === "all" || e.severity === severity) &&
        `${e.title} ${e.source}`.toLowerCase().includes(query.trim().toLowerCase()),
    )
    .reverse();

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className={styles.overlay} />
        <DialogPrimitive.Content className={styles.drawer}>
          <div className={styles.head}>
            <div>
              <DialogPrimitive.Title className={styles.title}>Event log</DialogPrimitive.Title>
              <DialogPrimitive.Description className={styles.subtitle}>
                {events.length} {events.length === 1 ? "event" : "events"} up to {formatHM(nowH)}
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close className={styles.close} aria-label="Close">
              <X className="size-4" />
            </DialogPrimitive.Close>
          </div>
          <Input
            type="search"
            aria-label="Search events"
            placeholder="Search events"
            className={styles.search}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <div className={styles.filters}>
            <Select
              aria-label="Event type"
              className={styles.select}
              value={type}
              onChange={(e) => setType(e.target.value as RunEvent["type"] | "all")}
            >
              <option value="all">All types</option>
              {Object.entries(TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
            <Select
              aria-label="Severity"
              className={styles.select}
              value={severity}
              onChange={(e) => setSeverity(e.target.value as RunEvent["severity"] | "all")}
            >
              <option value="all">Any severity</option>
              <option value="warning">Warnings</option>
              <option value="info">Info</option>
            </Select>
          </div>
          <ol className={styles.list}>
            {shown.map((event) => (
              <li key={event.id} className={styles.item}>
                <span className={styles.time}>{formatHM(event.atH)}</span>
                <span className={styles.body}>
                  <span
                    className={cn(
                      styles.eventTitle,
                      event.severity === "warning" && styles.warning,
                    )}
                  >
                    {event.title}
                  </span>
                  <span className={styles.source}>
                    {event.source} · {TYPE_LABELS[event.type]}
                  </span>
                </span>
              </li>
            ))}
            {shown.length === 0 && <li className={styles.empty}>No event matches.</li>}
          </ol>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

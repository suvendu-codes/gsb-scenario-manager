"use client";

import { useId, useState } from "react";

import type { StationSectionRenderer, StationView } from "../station/station-view";
import { bindingFor, operationsContextFor } from "./bindings";
import { OperationField } from "./OperationField";
import { operationsEditorStyles as styles } from "./OperationsEditor.styles";
import { PickFields } from "./PickFields";
import { PutFields } from "./PutFields";

const TABS = [
  { id: "pick", label: "Pick" },
  { id: "put", label: "Put" },
  { id: "audit", label: "Audit" },
] as const;

type TabId = (typeof TABS)[number]["id"];

/**
 * How Pick, Put and Audit behave, in three tabs. In a station's panel the edits change that
 * station; in a type's panel they change every station of the type (operations have no "keeps
 * its own value", so an edit there sets that setting on all of them).
 *
 * @param view - The station panel's view.
 */
export function OperationsEditor({ view }: { view: StationView }): React.JSX.Element {
  const [tab, setTab] = useState<TabId>("pick");
  const id = useId();
  const context = operationsContextFor(view);
  const { audit } = view.editor.catalog.operations;

  function moveTab(from: number, step: number): void {
    setTab(TABS[(from + step + TABS.length) % TABS.length].id);
    document
      .getElementById(`${id}-tab-${TABS[(from + step + TABS.length) % TABS.length].id}`)
      ?.focus();
  }

  return (
    <div className={styles.root}>
      {view.isGroup && (
        <p className={styles.note}>
          Editing every {view.type?.label} station. A change here sets that setting on all of them.
        </p>
      )}
      <div className={styles.tabs} role="tablist" aria-label="Operations">
        {TABS.map((item, index) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`${id}-tab-${item.id}`}
            aria-selected={tab === item.id}
            aria-controls={`${id}-panel`}
            tabIndex={tab === item.id ? 0 : -1}
            className={styles.tab}
            onClick={() => setTab(item.id)}
            onKeyDown={(event) => {
              if (event.key === "ArrowRight") moveTab(index, 1);
              else if (event.key === "ArrowLeft") moveTab(index, -1);
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div
        className={styles.panel}
        role="tabpanel"
        id={`${id}-panel`}
        aria-labelledby={`${id}-tab-${tab}`}
      >
        {tab === "pick" && <PickFields context={context} />}
        {tab === "put" && <PutFields context={context} />}
        {tab === "audit" && (
          <div className={styles.audit}>
            {audit.fields.map((field) => {
              const { value, changed, write, reset } = bindingFor(context, "audit", field.key);
              return (
                <OperationField
                  key={field.key}
                  field={field}
                  value={value as boolean}
                  changed={changed}
                  onChange={write}
                  onReset={reset}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/** Plugs the operations editor into the station panel's `sectionRenderers` as `operations`. */
export const renderOperationsSection: StationSectionRenderer = (_section, view) => (
  <OperationsEditor view={view} />
);

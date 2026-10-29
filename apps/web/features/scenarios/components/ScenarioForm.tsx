"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { DialogBody, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { ApiError } from "@/lib/api/errors";

import { useCreateScenario, useProjectMaps, useProjects, useUpdateScenario } from "../hooks";
import { createScenarioSchema, SCENARIO_NAME_MAX_LENGTH } from "../schema";
import type { CreateScenarioInput, Scenario } from "../types";
import { scenarioFormStyles as styles } from "./ScenarioForm.styles";

const EMPTY_VALUES: CreateScenarioInput = { projectId: "", mapId: "", name: "" };

/** Returns the hint shown in the footer, telling the user what to do next. */
function getFooterNote(
  values: CreateScenarioInput,
  hasNameError: boolean,
  isEditing: boolean,
): string {
  if (hasNameError) return "Choose a different name";
  if (!values.projectId) return "Step 1 of 3 — select a project";
  if (!values.mapId) return "Step 2 of 3 — select a map";
  if (!values.name.trim()) return "Step 3 of 3 — name your scenario";
  return isEditing ? "Ready to save" : "Ready to create";
}

type ScenarioFormProps = {
  /** The scenario to edit. Leave out to create a new one. */
  scenario?: Scenario;
  /** Called with the saved scenario after it is created or updated. */
  onSaved: (scenario: Scenario) => void;
};

/**
 * Scenario form: Project, then Map (enabled once a project is chosen), then Name.
 * Without `scenario` it creates one (`POST /scenarios`); with `scenario` it edits that draft
 * (`PATCH /scenarios/{id}`). A duplicate name is shown as an inline error.
 *
 * Render it inside a DialogContent; it supplies the dialog body and footer.
 *
 * @param scenario - The scenario to edit, or nothing to create.
 * @param onSaved - Called with the saved scenario.
 */
export function ScenarioForm({ scenario, onSaved }: ScenarioFormProps): React.JSX.Element {
  const isEditing = scenario !== undefined;
  const {
    register,
    handleSubmit,
    control,
    setValue,
    setError,
    clearErrors,
    formState: { errors, isValid },
  } = useForm<CreateScenarioInput>({
    resolver: zodResolver(createScenarioSchema),
    mode: "onChange",
    defaultValues: scenario
      ? { projectId: scenario.projectId, mapId: scenario.mapId, name: scenario.name }
      : EMPTY_VALUES,
  });

  const values = useWatch({ control });
  const projectId = values.projectId ?? "";
  const mapId = values.mapId ?? "";
  const name = values.name ?? "";

  const [formError, setFormError] = useState<string | null>(null);

  const projects = useProjects();
  const maps = useProjectMaps(projectId);
  const createScenario = useCreateScenario();
  const updateScenario = useUpdateScenario(scenario?.id ?? "");
  const save = isEditing ? updateScenario : createScenario;

  function clearServerErrors(): void {
    clearErrors("name");
    setFormError(null);
  }

  function onSubmit(input: CreateScenarioInput): void {
    setFormError(null);
    save.mutate(input, {
      onSuccess: onSaved,
      onError: (error) => {
        if (error instanceof ApiError && error.status === 409) {
          setError("name", { type: "server", message: error.message });
        } else {
          setFormError(error.message);
        }
      },
    });
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit(onSubmit)} noValidate>
      <DialogBody>
        <div>
          <Label htmlFor="scenario-project">Project</Label>
          {/* The key re-applies the form's value once the options exist (matters when editing). */}
          <Select
            key={projects.isSuccess ? "loaded" : "loading"}
            id="scenario-project"
            disabled={projects.isPending}
            {...register("projectId", {
              onChange: () => {
                setValue("mapId", "");
                clearServerErrors();
              },
            })}
          >
            <option value="" disabled>
              {projects.isPending ? "Loading projects…" : "Select a project"}
            </option>
            {projects.data?.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </Select>
          {projects.isError && (
            <p className={styles.fieldError} role="alert">
              Couldn’t load projects. {projects.error.message}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="scenario-map">Map</Label>
          <Select
            key={`${projectId}-${maps.isSuccess ? "loaded" : "loading"}`}
            id="scenario-map"
            disabled={!projectId || maps.isPending}
            {...register("mapId", { onChange: clearServerErrors })}
          >
            <option value="" disabled>
              {!projectId
                ? "Select a project first"
                : maps.isPending
                  ? "Loading maps…"
                  : "Select a map"}
            </option>
            {maps.data?.map((map) => (
              <option key={map.id} value={map.id}>
                {map.name}
              </option>
            ))}
          </Select>
          {maps.isError && (
            <p className={styles.fieldError} role="alert">
              Couldn’t load maps. {maps.error.message}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="scenario-name">Scenario name</Label>
          <Input
            id="scenario-name"
            maxLength={SCENARIO_NAME_MAX_LENGTH}
            autoComplete="off"
            placeholder="e.g. Peak Day — 20% volume uplift"
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={errors.name ? "scenario-name-error" : undefined}
            {...register("name")}
          />
          {errors.name?.type === "server" && (
            <p id="scenario-name-error" className={styles.fieldError} role="alert">
              {errors.name.message}
            </p>
          )}
        </div>
      </DialogBody>

      {formError && (
        <p className={styles.formError} role="alert">
          {formError}
        </p>
      )}

      <DialogFooter>
        <span className={styles.footerNote}>
          {getFooterNote({ projectId, mapId, name }, errors.name?.type === "server", isEditing)}
        </span>
        <div className={styles.footerActions}>
          <Button type="submit" size="lg" disabled={!isValid || save.isPending}>
            {save.isPending
              ? isEditing
                ? "Saving…"
                : "Creating…"
              : isEditing
                ? "Save changes"
                : "Create scenario"}
          </Button>
        </div>
      </DialogFooter>
    </form>
  );
}

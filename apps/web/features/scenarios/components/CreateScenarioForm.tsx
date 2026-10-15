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

import { useCreateScenario, useProjectMaps, useProjects } from "../hooks";
import { createScenarioSchema, SCENARIO_NAME_MAX_LENGTH } from "../schema";
import type { CreateScenarioInput } from "../types";
import { createScenarioFormStyles as styles } from "./CreateScenarioForm.styles";

const DEFAULT_VALUES: CreateScenarioInput = { projectId: "", mapId: "", name: "" };

/** Returns the hint shown in the footer, telling the user what to do next. */
function getFooterNote(values: CreateScenarioInput, hasNameError: boolean): string {
  if (hasNameError) return "Choose a different name";
  if (!values.projectId) return "Step 1 of 3 — select a project";
  if (!values.mapId) return "Step 2 of 3 — select a map";
  if (!values.name.trim()) return "Step 3 of 3 — name your scenario";
  return "Ready to create";
}

/**
 * Create-scenario form: Project, then Map (enabled once a project is chosen),
 * then Name. Submits `POST /scenarios`, shows a duplicate name as an inline
 * error, and calls `onCreated` on success.
 *
 * Render it inside a DialogContent; it supplies the dialog body and footer.
 *
 * @param onCreated - Called after the scenario is created.
 */
export function CreateScenarioForm({ onCreated }: { onCreated: () => void }): React.JSX.Element {
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
    defaultValues: DEFAULT_VALUES,
  });

  const values = useWatch({ control });
  const projectId = values.projectId ?? "";
  const mapId = values.mapId ?? "";
  const name = values.name ?? "";

  const [formError, setFormError] = useState<string | null>(null);

  const projects = useProjects();
  const maps = useProjectMaps(projectId);
  const createScenario = useCreateScenario();

  function clearServerErrors(): void {
    clearErrors("name");
    setFormError(null);
  }

  function onSubmit(input: CreateScenarioInput): void {
    setFormError(null);
    createScenario.mutate(input, {
      onSuccess: onCreated,
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
          <Select
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
          {getFooterNote({ projectId, mapId, name }, errors.name?.type === "server")}
        </span>
        <div className={styles.footerActions}>
          <Button type="submit" size="lg" disabled={!isValid || createScenario.isPending}>
            {createScenario.isPending ? "Creating…" : "Create scenario"}
          </Button>
        </div>
      </DialogFooter>
    </form>
  );
}

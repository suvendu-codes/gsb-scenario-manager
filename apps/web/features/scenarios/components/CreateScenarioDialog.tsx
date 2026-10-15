"use client";

import { useRouter, useSearchParams } from "next/navigation";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { CreateScenarioForm } from "./CreateScenarioForm";

const SCENARIOS_PATH = "/scenarios";

/**
 * "Create New Scenario" modal. It is open whenever the URL has `?create=1`,
 * so the open state can be shared, survives a refresh, and closes with Back.
 * Closing (X, Esc, outside click or a successful create) removes the param.
 *
 * Render it inside a `<Suspense>` boundary, because it reads the search params.
 */
export function CreateScenarioDialog(): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isOpen = searchParams.get("create") === "1";

  function close(): void {
    router.replace(SCENARIOS_PATH);
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Scenario</DialogTitle>
          <DialogDescription>
            Choose a project and map, then give your scenario a name.
          </DialogDescription>
        </DialogHeader>
        <CreateScenarioForm onCreated={close} />
      </DialogContent>
    </Dialog>
  );
}

"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import type { Scenario } from "../types";
import { ScenarioForm } from "./ScenarioForm";

type EditScenarioDialogProps = {
  scenario: Scenario;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * "Edit Scenario" modal: change a draft's project, map or name. The form starts from the
 * scenario's current values each time the modal opens, and the modal closes after saving.
 *
 * @param scenario - The draft scenario to edit.
 * @param open - Whether the modal is open.
 * @param onOpenChange - Called when the modal asks to open or close.
 */
export function EditScenarioDialog({
  scenario,
  open,
  onOpenChange,
}: EditScenarioDialogProps): React.JSX.Element {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Scenario</DialogTitle>
          <DialogDescription>Change the project, map or name of this scenario.</DialogDescription>
        </DialogHeader>
        <ScenarioForm scenario={scenario} onSaved={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

import { setValueAtPath } from "../../field-path";
import type { CompositeRenderers, ModulePanelProps } from "../../panel";
import { isCustomized } from "../../state/customized";
import { ConfigSections } from "../ConfigSections";
import { PanelHeader } from "../PanelHeader";
import { DataWindowField } from "./DataWindowField";
import { wmsPanelStyles as styles } from "./WmsPanel.styles";

/**
 * The WMS (Order) panel: volume and distribution, demand and release, drawn from the catalog,
 * with the data window as its own control.
 *
 * @param module - The WMS module's catalog entry.
 * @param editor - The loaded config editor.
 * @param onSelect - Called with `{ area: "overview" }` when the back arrow is clicked.
 */
export function WmsPanel({ module: wms, editor, onSelect }: ModulePanelProps): React.JSX.Element {
  const renderers: CompositeRenderers = {
    dataWindow: (context) => (
      <DataWindowField
        context={context}
        onChange={(startHour, endHour) =>
          editor.edit((config) =>
            setValueAtPath(
              setValueAtPath(config, "wms.dataWindow.startHour", startHour),
              "wms.dataWindow.endHour",
              endHour,
            ),
          )
        }
      />
    ),
  };

  return (
    <>
      <PanelHeader
        title={wms.label}
        description={wms.description}
        customized={isCustomized(editor.overrides, wms.id)}
        onBack={() => onSelect({ area: "overview" })}
        onReset={() => editor.reset([wms.id])}
        resetLabel={`Reset ${wms.label} to default`}
      />
      <div className={styles.body}>
        <ConfigSections sections={wms.sections} editor={editor} renderers={renderers} />
      </div>
    </>
  );
}

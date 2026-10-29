import Image from "next/image";

import { setValueAtPath } from "../../field-path";
import type { ReadyConfigEditor } from "../../panel";
import { isCustomized } from "../../state/customized";
import { FieldShell } from "../fields/FieldShell";
import { Stepper } from "../fields/Stepper";
import { BOT_IMAGES } from "./bot-images";
import { fleetCardsStyles as styles } from "./FleetCards.styles";

/**
 * One card per bot type with its picture and a count stepper, and the total number of bots.
 * Only how many of each is set here; the bot types are fixed by the site's flow.
 *
 * @param editor - The loaded config editor.
 */
export function FleetCards({ editor }: { editor: ReadyConfigEditor }): React.JSX.Element {
  const { fleet } = editor.config.agent;
  const total = fleet.htm + fleet.vtm;

  return (
    <>
      <div className={styles.grid}>
        {editor.catalog.botTypes.map((bot) => {
          const path = `agent.fleet.${bot.id}`;
          const image = bot.imageUrl ?? BOT_IMAGES[bot.id];
          return (
            <div key={bot.id} className={styles.card}>
              <div className={styles.imageWrap}>
                {image && (
                  <Image src={image} alt="" width={320} height={180} className={styles.image} />
                )}
              </div>
              <div className={styles.body}>
                <FieldShell
                  label={bot.label}
                  layout="stacked"
                  changed={isCustomized(editor.overrides, path)}
                  onReset={() => editor.reset([path])}
                >
                  <div className={styles.stepperWrap}>
                    <Stepper
                      label={bot.label}
                      value={fleet[bot.id]}
                      min={0}
                      max={200}
                      onChange={(count) =>
                        editor.edit((config) => setValueAtPath(config, path, count))
                      }
                    />
                  </div>
                </FieldShell>
              </div>
            </div>
          );
        })}
      </div>
      <p className={styles.total}>
        {total} {total === 1 ? "bot" : "bots"} in total.
      </p>
    </>
  );
}

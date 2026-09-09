import { accentColor, accentFill } from "@/components/shared/accent";
import { GROUP_GAP, GROUP_HEADER_HEIGHT, LANE_ROW_HEIGHT } from "@/components/shared/constants";
import { groupTotal, laneGroups } from "@/components/shared/data";

export function Sidebar() {
    return (
        <aside className="flex w-64 shrink-0 flex-col min-h-screen border-r border-white/10 bg-[#161A20] text-[#fff] px-3 pt-3 overflow-y-auto">
            <h2
                className="flex items-center px-1 text-[11px] font-semibold tracking-widest text-[#fff]"
                style={{ height: GROUP_HEADER_HEIGHT }}
            >
                LANES
            </h2>

            <div className="flex flex-col" style={{ gap: GROUP_GAP }}>
                {laneGroups.map((group) => (
                    <section key={group.id}>
                        <div
                            className="flex items-center gap-2 px-1"
                            style={{ height: GROUP_HEADER_HEIGHT }}
                        >
                            <h3 className="whitespace-nowrap text-[11px] font-semibold tracking-widest text-[#fff]">
                                {group.label.toUpperCase()}
                            </h3>
                            <span className="h-px flex-1 bg-white/20" />
                            <span className="font-mono text-[11px] text-[#fff]">
                                {groupTotal(group)}
                            </span>
                        </div>

                        <ul className="flex flex-col">
                            {group.lanes.map((lane) => (
                                <li
                                    key={lane.id}
                                    className="group flex items-center gap-2.5 rounded-md px-1.5 hover:bg-white/10"
                                    style={{ height: LANE_ROW_HEIGHT }}
                                >
                                    <span
                                        className="h-4 w-[3px] shrink-0 rounded-full"
                                        style={{ backgroundColor: accentColor[group.accent] }}
                                    />
                                    <span className="flex-1 truncate text-[13px] text-[#fff]">
                                        {lane.label}
                                    </span>
                                    <span className="font-mono text-[12px] text-[#fff]">
                                        {lane.count}
                                    </span>
                                    <span
                                        className="h-6 w-6 shrink-0 rounded-md border"
                                        style={{
                                            borderColor: accentColor[group.accent],
                                            backgroundColor: accentFill[group.accent],
                                        }}
                                    />
                                </li>
                            ))}
                        </ul>
                    </section>
                ))}
            </div>
        </aside>
    );
}

export default Sidebar;

"use client"
import { Checkbox } from "@/components/ui/checkbox";
import { accentColor, accentFill } from "@/components/shared/accent";
import { GROUP_GAP, GROUP_HEADER_HEIGHT, LANE_ROW_HEIGHT } from "@/components/shared/constants";
import { groupTotal, laneGroups } from "@/lib/data";
import { GiHamburgerMenu } from "react-icons/gi";
import { useState } from "react";
export function Sidebar() {
    const [show, setShow] = useState(false);

    return (
        <>

            <div
                onClick={() => setShow(!show)}
                className="fixed right-5 top-5 z-50 bg-[#161A20] text-white text-3xl p-2 rounded-md hover:bg-[#b8381e] cursor-pointer lg:hidden shadow-lg transition-transform active:scale-95"
                role="button"
                aria-label="Toggle sidebar"
            >
                <GiHamburgerMenu />
            </div>

            {/* Mobile backdrop overlay */}
            {show && (
                <div
                    onClick={() => setShow(false)}

                    className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 lg:hidden "
                    aria-hidden="true"
                />
            )}

            <aside
                className={`w-[100%] sm:w-[300px] lg:w-[300px] bg-[#161A20] min-h-screen fixed top-0 ${show ? "left-0" : "left-[-100%]"
                    } transition-all duration-100 p-4 flex flex-col justify-between lg:static lg:left-0 border-r-[1px] border-r-stone-500 z-50 overflow-y-auto shrink-0`}
            >
                <div className="relative flex flex-col">
                    <div className="flex items-center justify-between mb-2">
                        <h2
                            className="flex items-center px-1 text-[11px] font-semibold tracking-widest text-[#fff]"
                            style={{ height: GROUP_HEADER_HEIGHT }}
                        >
                            LANES
                        </h2>
                        <button
                            type="button"
                            onClick={() => setShow(false)}
                            className="text-stone-400 hover:text-white p-1 rounded-md text-lg lg:hidden cursor-pointer"
                            aria-label="Close sidebar"
                        >
                            ✕
                        </button>
                    </div>

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
                                            <Checkbox
                                                id={`lane-${lane.id}`}

                                                className="h-5 w-5 shrink-0 rounded border cursor-pointer"
                                                style={{
                                                    borderColor: accentColor[group.accent],
                                                    backgroundColor: accentFill[group.accent],
                                                    color: accentColor[group.accent],
                                                }}
                                            />
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        ))}
                    </div>
                </div>
            </aside>
        </>
    );
}

export default Sidebar;

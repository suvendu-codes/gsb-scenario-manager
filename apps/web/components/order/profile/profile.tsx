"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { BootstrapState, ProfileProps } from "@/lib/types";
import { ProfileSchema } from "@/lib/schemas/buttler.schema";
import { PROFILE_PRESETS } from "../steps";

export function Profile({
    bootstrap: controlledBootstrap,
    onChange,
    setBootstrap,
}: ProfileProps = {}) {
    const [internalBootstrap, setInternalBootstrap] = useState<BootstrapState>({
        profileName: "hnm",
        butlerCoreIp: "172.29.14.21",
        platformCoreIp: "172.29.14.22",
        putMode: false,
    });

    const bootstrap = controlledBootstrap ?? internalBootstrap;

    // Real-time Zod validation
    const validationResult = ProfileSchema.safeParse(bootstrap);
    const errors = !validationResult.success
        ? validationResult.error.flatten().fieldErrors
        : {};

    function updateBootstrap(updater: (prev: BootstrapState) => BootstrapState) {
        if (setBootstrap) {
            setBootstrap(updater);
        } else if (onChange) {
            onChange(updater(bootstrap));
        } else {
            setInternalBootstrap(updater);
        }
    }

    return (
        <div className="flex flex-col gap-6">
            <div>
                <label className="text-[11px] font-semibold tracking-widest text-white/40">
                    PROFILE NAME
                </label>
                <Input
                    value={bootstrap.profileName}
                    onChange={(e) =>
                        updateBootstrap((b) => ({ ...b, profileName: e.target.value }))
                    }
                    className={`mt-2 h-11 w-full sm:max-w-md bg-white/[0.02] text-[15px] text-white transition-colors ${errors.profileName
                        ? "border-rose-500/50 focus-visible:border-rose-500 focus-visible:ring-rose-500/20"
                        : "border-white/10"
                        }`}
                />
                {errors.profileName?.[0] && (
                    <p className="mt-1.5 text-xs text-rose-400">{errors.profileName[0]}</p>
                )}
                <div className="mt-2 flex flex-wrap gap-2">
                    {PROFILE_PRESETS.map((preset) => (
                        <button
                            key={preset}
                            type="button"
                            onClick={() =>
                                updateBootstrap((b) => ({ ...b, profileName: preset }))
                            }
                            className={`rounded-md border px-3 py-1.5 font-mono text-[12px] transition-colors ${bootstrap.profileName === preset
                                ? "border-white/20 bg-white/10 text-white"
                                : "border-white/10 bg-white/[0.03] text-white/40 hover:text-white/70"
                                }`}
                        >
                            {preset}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div>
                    <label className="text-[11px] font-semibold tracking-widest text-white/40">
                        BUTLER CORE IP
                    </label>
                    <Input
                        value={bootstrap.butlerCoreIp}
                        onChange={(e) =>
                            updateBootstrap((b) => ({ ...b, butlerCoreIp: e.target.value }))
                        }
                        className={`mt-2 h-11 w-full bg-white/[0.02] font-mono text-[15px] text-white transition-colors ${errors.butlerCoreIp
                            ? "border-rose-500/50 focus-visible:border-rose-500 focus-visible:ring-rose-500/20"
                            : "border-white/10"
                            }`}
                    />
                    {errors.butlerCoreIp?.[0] && (
                        <p className="mt-1.5 text-xs text-rose-400">{errors.butlerCoreIp[0]}</p>
                    )}
                </div>
                <div>
                    <label className="text-[11px] font-semibold tracking-widest text-white/40">
                        PLATFORM CORE IP
                    </label>
                    <Input
                        value={bootstrap.platformCoreIp}
                        onChange={(e) =>
                            updateBootstrap((b) => ({ ...b, platformCoreIp: e.target.value }))
                        }
                        className={`mt-2 h-11 w-full bg-white/[0.02] font-mono text-[15px] text-white transition-colors ${errors.platformCoreIp
                            ? "border-rose-500/50 focus-visible:border-rose-500 focus-visible:ring-rose-500/20"
                            : "border-white/10"
                            }`}
                    />
                    {errors.platformCoreIp?.[0] && (
                        <p className="mt-1.5 text-xs text-rose-400">{errors.platformCoreIp[0]}</p>
                    )}
                </div>
            </div>

            <div className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.03] px-5 py-4">
                <div>
                    <div className="text-[15px] font-semibold text-white">Put mode</div>
                    <div className="mt-0.5 text-[13px] text-white/40">
                        Simulates putaway flow instead of pick flow
                    </div>
                </div>
                <Switch
                    checked={bootstrap.putMode}
                    onCheckedChange={(checked) =>
                        updateBootstrap((b) => ({ ...b, putMode: checked === true }))
                    }
                />
            </div>
        </div>
    );
}

export default Profile;

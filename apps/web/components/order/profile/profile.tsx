"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { BootstrapState } from "@/lib/types";
import { ProfileSchema } from "@/lib/schemas/buttler.schema";
import { PROFILE_PRESETS } from "../steps";

interface ProfileFormProps {
    bootstrap: BootstrapState;
    onChange: (bootstrap: BootstrapState) => void;
}

export function Profile({ bootstrap, onChange }: ProfileFormProps) {

    // Real-time Zod validation
    const validationResult = ProfileSchema.safeParse(bootstrap);
    const errors = !validationResult.success
        ? validationResult.error.flatten().fieldErrors
        : {};

    return (
        <div className="flex flex-col gap-6">
            <div>
                <label className="text-[11px] font-semibold tracking-widest text-white/40">
                    PROFILE NAME
                </label>
                <Input
                    value={bootstrap.profileName}
                    onChange={(e) =>
                        onChange({ ...bootstrap, profileName: e.target.value })
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
                                onChange({ ...bootstrap, profileName: preset })
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

          
        </div>
    );
}

export default Profile;

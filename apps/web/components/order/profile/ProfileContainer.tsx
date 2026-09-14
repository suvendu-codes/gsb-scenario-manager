"use client";

import { useEffect, useState } from "react";
import { BootstrapState, ProfileProps } from "@/lib/types";

import Profile from "./profile";
import { useApi } from "@/lib/hooks/useApi";

interface BootstrapResponse {
    bootstrap: BootstrapState;
}

const DEFAULT_BOOTSTRAP: BootstrapState = {
    profileName: "hnm",
    butlerCoreIp: "172.29.14.21",
    platformCoreIp: "172.29.14.22",
    putMode: false,
};

export default function ProfileContainer({
    bootstrap: controlledBootstrap,
    onChange,
    setBootstrap,
}: ProfileProps = {}) {
    const [internalBootstrap, setInternalBootstrap] = useState(DEFAULT_BOOTSTRAP);
    const bootstrap = controlledBootstrap ?? internalBootstrap;
    const { request } = useApi<BootstrapResponse>();

    useEffect(() => {
        let active = true;

        void request({
            method: "GET",
            url: "/api/bootstrap",
            params: { profile: bootstrap.profileName },
        }).then((response) => {
            if (!active) return;

            const apiBootstrap = response.bootstrap;
            if (setBootstrap) {
                setBootstrap(apiBootstrap);
            } else if (onChange) {
                onChange(apiBootstrap);
            } else {
                setInternalBootstrap(apiBootstrap);
            }
        }).catch(() => undefined);

        return () => {
            active = false;
        };
        // bootstrap.profileName, onChange, request, setBootstrap
    }, [bootstrap.profileName]);

    return (
        <Profile
            bootstrap={bootstrap}
            onChange={(nextBootstrap) => {
                if (setBootstrap) {
                    setBootstrap(nextBootstrap);
                } else if (onChange) {
                    onChange(nextBootstrap);
                } else {
                    setInternalBootstrap(nextBootstrap);
                }
            }}
        />
    );
}
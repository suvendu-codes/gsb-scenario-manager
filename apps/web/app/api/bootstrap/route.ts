import { NextResponse } from "next/server";

const MOCK_BOOTSTRAPS = {
    hnm: {
        profileName: "hnm",
        butlerCoreIp: "172.29.14.21",
        platformCoreIp: "172.29.14.22",
        putMode: false,
    },
    peak: {
        profileName: "peak",
        butlerCoreIp: "172.29.14.31",
        platformCoreIp: "172.29.14.32",
        putMode: false,
    },
    default: {
        profileName: "default",
        butlerCoreIp: "127.0.0.1",
        platformCoreIp: "127.0.0.1",
        putMode: false,
    },
} as const;

export async function GET(request: Request) {
    const profile = new URL(request.url).searchParams.get("profile") ?? "hnm";
    const bootstrap = MOCK_BOOTSTRAPS[profile as keyof typeof MOCK_BOOTSTRAPS] ?? MOCK_BOOTSTRAPS.hnm;

    return NextResponse.json({ bootstrap });
}
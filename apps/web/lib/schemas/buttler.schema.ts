import { z } from "zod";

export const ButlerSchema = z.object({
    platformId: z.string().min(1, {
        message: "Platform ID is required.",
    }),
    butlerIp: z.string().min(1, {
        message: "Butler IP is required.",
    }),
});

export const ProfileSchema = z.object({
    profileName: z.string().min(1, {
        message: "Profile Name is required.",
    }),
    butlerCoreIp: z.string().min(1, {
        message: "Butler Core IP is required.",
    }),
    platformCoreIp: z.string().min(1, {
        message: "Platform Core IP is required.",
    }),
    putMode: z.boolean().default(false),
});

export const ButlerProfileSchema = ProfileSchema;
export const BootstrapSchema = ProfileSchema;

export type ProfileValues = z.infer<typeof ProfileSchema>;
export type ButlerProfileValues = ProfileValues;
export type ButlerValues = z.infer<typeof ButlerSchema>;
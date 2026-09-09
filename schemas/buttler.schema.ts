import { z } from "zod";
export const ButlerSchema = z.object({
    platformId: z.string().min(1, {
        message: "Platform ID is required.",
    }),
    butlerIp: z.string().min(1, {
        message: "Butler IP is required.",
    }),
});
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { ButlerSchema } from "@/lib/schemas/buttler.schema";
type butlerValues = z.infer<typeof ButlerSchema>;

export function ButlerConfigForm() {
  const [submittedData, setSubmittedData] = useState<butlerValues | null>(null);


  const form = useForm<butlerValues>({
    resolver: zodResolver(ButlerSchema),
    defaultValues: {
      platformId: "",
      butlerIp: "",
    },
  });

  function onSubmit(values: butlerValues) {
    setSubmittedData(values);
    console.log("Submitted Configuration:", values);
  }

  return (
    <div className="w-full max-w-md">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="platformId"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-medium uppercase tracking-wider text-[var(--st-text-dim)]">
                  Platform ID
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g. PL-9042"
                    className="border-[var(--st-border)] bg-[var(--st-panel-2)] text-sm text-[var(--st-text)] placeholder:text-[var(--st-text-mute)] focus-visible:border-[var(--st-amber)] focus-visible:ring-1 focus-visible:ring-[var(--st-amber)]"
                    {...field}
                  />
                </FormControl>
                <FormDescription className="text-[11px] text-[var(--st-text-mute)]">
                  The identifier assigned to this sorting platform.
                </FormDescription>
                <FormMessage className="text-xs text-[var(--st-coral)]" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="butlerIp"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-medium uppercase tracking-wider text-[var(--st-text-dim)]">
                  Butler IP
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g. 192.168.1.100"
                    className="border-[var(--st-border)] bg-[var(--st-panel-2)] text-sm text-[var(--st-text)] placeholder:text-[var(--st-text-mute)] focus-visible:border-[var(--st-amber)] focus-visible:ring-1 focus-visible:ring-[var(--st-amber)]"
                    {...field}
                  />
                </FormControl>
                <FormDescription className="text-[11px] text-[var(--st-text-mute)]">
                  Local network IPv4 address of the target Butler bot.
                </FormDescription>
                <FormMessage className="text-xs text-[var(--st-coral)]" />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            className="w-full bg-[var(--st-amber)] font-medium text-black hover:opacity-90 active:opacity-100"
          >
            Submit Configuration
          </Button>
        </form>
      </Form>
    </div>
  );
}

export default ButlerConfigForm;

import Link from "next/link";
import { Plus } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function TopBar(): React.JSX.Element {
  return (
    <header className="flex h-[52px] flex-none items-center justify-between border-b border-line bg-panel px-[18px]">
      <div className="flex items-center gap-2.5">
        <span className="size-2.5 rounded-[3px] bg-accent" aria-hidden="true" />
        <span className="text-[14.5px] font-bold tracking-tight">GreyOrange</span>
        <span className="text-line-strong" aria-hidden="true">
          ›
        </span>
        <h1 className="text-[14.5px] font-semibold">Scenario Manager</h1>
      </div>
      <Link
        href="/scenarios?create=1"
        className={cn(buttonVariants({ size: "sm" }))}
      >
        <Plus className="size-3.5" aria-hidden="true" />
        Create new scenario
      </Link>
    </header>
  );
}

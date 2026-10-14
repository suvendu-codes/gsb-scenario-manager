import Link from "next/link";
import { Plus } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";

import { topBarStyles } from "./TopBar.styles";

/**
 * App header shown on every page: brand, page title and the
 * "Create new scenario" link, which opens the create modal via `?create=1`.
 */
export function TopBar(): React.JSX.Element {
  return (
    <header className={topBarStyles.root}>
      <div className={topBarStyles.brand}>
        <span className={topBarStyles.brandMark} aria-hidden="true" />
        <span className={topBarStyles.brandName}>GreyOrange</span>
        <span className={topBarStyles.separator} aria-hidden="true">
          ›
        </span>
        <h1 className={topBarStyles.pageTitle}>Scenario Manager</h1>
      </div>
      <Link href="/scenarios?create=1" className={buttonVariants({ size: "sm" })}>
        <Plus className={topBarStyles.createIcon} aria-hidden="true" />
        Create new scenario
      </Link>
    </header>
  );
}

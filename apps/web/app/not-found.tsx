import Link from "next/link";

import { PageMessage } from "@/components/layout/PageMessage";
import { buttonVariants } from "@/components/ui/button";

/** Shown when the URL does not match any page. */
export default function NotFound(): React.JSX.Element {
  return (
    <PageMessage
      title="Page not found"
      description="We couldn’t find the page you were looking for. It may have been moved, or the link may be wrong."
    >
      <Link href="/scenarios" className={buttonVariants({ size: "sm" })}>
        Go to scenarios
      </Link>
    </PageMessage>
  );
}

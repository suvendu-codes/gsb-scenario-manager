import { redirect } from "next/navigation";

/** Root route. Sends visitors to the scenario list. */
export default function Home(): never {
  redirect("/scenarios");
}

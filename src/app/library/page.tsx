import { redirect } from "next/navigation";

// The corrective map moved into Training.
export default function Library() {
  redirect("/training?tab=map");
}

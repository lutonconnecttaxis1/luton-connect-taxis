import { notFound } from "next/navigation";

/** Any address that matches no page lands here and shows the 404 page in the visitor's language. */
export default function CatchAll() {
  notFound();
}

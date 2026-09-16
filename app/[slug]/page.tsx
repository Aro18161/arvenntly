import { notFound, redirect } from "next/navigation";
import { resolveLink } from "@/lib/links";

// Always hit Redis: a destination can be edited or deleted at any moment, so
// this route must never be prerendered or cached.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function RedirectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const destination = await resolveLink(slug);
  if (!destination) notFound();

  redirect(destination);
}

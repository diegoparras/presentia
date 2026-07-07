import React from "react";
import PublicView from "./PublicView";

// Public share page. Client-rendered (the slide renderer compiles layouts and
// uses Redux/theme on the client); basic metadata is set here for link previews.
export const metadata = {
  title: "Presentación",
  robots: { index: false, follow: false },
};

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const { token } = await params;
  const sp = await searchParams;
  return <PublicView token={token} initialMode={sp.mode === "deck" ? "deck" : undefined} />;
}

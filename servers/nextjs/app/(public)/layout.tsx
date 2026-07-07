import React from "react";

/**
 * Public share routes: no auth, no ConfigurationInitializer (which gates on an
 * LLM being configured). A viewer opening a share link only needs the renderer.
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

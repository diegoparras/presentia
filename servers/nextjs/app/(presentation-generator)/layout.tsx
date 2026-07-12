import React from "react";

import { requireAppSession } from "@/utils/serverAuth";
import { ConfigurationInitializer } from "../ConfigurationInitializer";
import MobileZoomNotice from "./components/MobileZoomNotice";

export default async function Layout({ children }: { children: React.ReactNode }) {
  await requireAppSession();
  return (
    <div>
      <MobileZoomNotice />
      <ConfigurationInitializer>{children}</ConfigurationInitializer>
    </div>
  );
}

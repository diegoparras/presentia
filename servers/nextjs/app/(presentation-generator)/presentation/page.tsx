'use client'
import React from "react";
import PresentationPage from "./components/PresentationPage";
import { Button } from "@/components/ui/button";
import { useRouter, useSearchParams } from "next/navigation";
import "../utils/prism-languages";
import { useI18n } from "@/lib/i18n";
const page = () => {

  const { t } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const queryId = params.get("id");
  if (!queryId) {
    return (
      <div className="flex flex-col items-center justify-center h-screen font-syne">
        <h1 className="text-2xl font-bold">{t("ed.page.noId")}</h1>
        <p className="text-gray-500 pb-4">{t("ed.page.tryAgain")}</p>
        <Button onClick={() => router.push("/dashboard")}>{t("ed.page.goHome")}</Button>
      </div>
    );
  }
  return (

    <PresentationPage presentation_id={queryId} />

  );
};
export default page;

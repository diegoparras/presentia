"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { LoadingState } from "../types/index";
import { TemplateLayoutsWithSettings } from "@/app/presentation-templates/utils";
import { ChevronRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface GenerateButtonProps {
  loadingState: LoadingState;
  streamState: { isStreaming: boolean; isLoading: boolean };
  selectedTemplate: TemplateLayoutsWithSettings | string | null;
  onSubmit: () => void;
}

const GenerateButton: React.FC<GenerateButtonProps> = ({
  loadingState,
  streamState,
  selectedTemplate,
  onSubmit,
}) => {
  const { t } = useI18n();
  const isDisabled =
    loadingState.isLoading ||
    streamState.isLoading ||
    streamState.isStreaming ||
    !selectedTemplate;

  const getButtonText = () => {
    if (loadingState.isLoading) return loadingState.message;
    if (streamState.isLoading || streamState.isStreaming) return t("up.generate.loading");
    if (!selectedTemplate) return t("up.generate.selectTemplate");
    return t("up.generate.cta");
  };

  return (
    <Button
      disabled={isDisabled}
      onClick={() => {
        onSubmit();
      }}
      className=" w-full flex items-center gap-0.5 rounded-[58px] text-sm py-3 px-5 font-instrument_sans font-semibold  text-[#101323] disabled:opacity-50 disabled:cursor-not-allowed font-syne"
      style={{
        background: "linear-gradient(270deg, #F8D8D1 2.4%, #FAE4DF 27.88%, #F4DCD3 69.23%, #FDE4C2 100%)",
      }}
    >

      {getButtonText()}
      <ChevronRight className="w-4 h-4" />
    </Button>
  );
};

export default GenerateButton;

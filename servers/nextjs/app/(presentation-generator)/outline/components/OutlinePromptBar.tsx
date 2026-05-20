"use client";

import React from "react";
import { Loader2, RefreshCw } from "lucide-react";

import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import { ConfigurationSelects } from "../../upload/components/ConfigurationSelects";
import CurrentConfig from "../../upload/components/CurrentConfig";
import { PresentationConfig } from "../../upload/type";

interface OutlinePromptBarProps {
  config: PresentationConfig;
  disabled?: boolean;
  isBusy: boolean;
  onConfigChange: (key: keyof PresentationConfig, value: unknown) => void;
  onRegenerate: () => void;
}

const OutlinePromptBar: React.FC<OutlinePromptBarProps> = ({
  config,
  disabled = false,
  isBusy,
  onConfigChange,
  onRegenerate,
}) => {
  return (
    <section className="w-full font-syne">
      <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <span className="text-sm font-semibold text-[#191919]">Prompt</span>
          <ConfigurationSelects
            config={config}
            onConfigChange={onConfigChange}
          />
        </div>
        <div className="flex justify-start xl:justify-end">
          <CurrentConfig />
        </div>
      </div>

      <div
        className="relative rounded-[14px] border border-[#E4E5E8] bg-white shadow-[0_4px_14px_rgba(0,0,0,0.04)]"
      >
        <Textarea
          value={config.prompt}
          disabled={disabled}
          rows={2}
          onChange={(event) => onConfigChange("prompt", event.target.value)}
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
              event.preventDefault();
              onRegenerate();
            }
          }}
          placeholder="Describe the presentation you want to generate"
          className="min-h-[88px] resize-none border-0 bg-transparent py-5 pl-6 pr-16 text-base font-medium leading-6 text-[#191919] shadow-none outline-none placeholder:text-[#8C8C8C] focus-visible:ring-0 focus-visible:ring-offset-0 disabled:cursor-not-allowed"
        />
        <button
          type="button"
          onClick={onRegenerate}
          disabled={disabled || isBusy}
          aria-label="Regenerate outline"
          title="Regenerate outline"
          className={cn(
            "absolute right-6 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[#7A00FF] transition hover:bg-[#F4F3FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7A00FF]/25",
            (disabled || isBusy) && "cursor-not-allowed opacity-70"
          )}
        >
          {isBusy ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <RefreshCw className="h-5 w-5" />
          )}
        </button>
      </div>
    </section>
  );
};

export default OutlinePromptBar;

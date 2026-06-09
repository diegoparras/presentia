"use client";

import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import { LLMConfig } from "@/types/llm_config";
import { WEB_SEARCH_PROVIDERS } from "@/utils/providerConstants";

const NATIVE_SEARCH_LLMS = new Set(["openai", "google", "anthropic"]);

const WebSearchProvider = ({
  llmConfig,
  setLlmConfig,
}: {
  llmConfig: LLMConfig;
  setLlmConfig: React.Dispatch<React.SetStateAction<LLMConfig>>;
}) => {
  const [showApiKey, setShowApiKey] = useState(false);
  const selected = llmConfig.WEB_SEARCH_PROVIDER || "auto";
  const provider = WEB_SEARCH_PROVIDERS[selected] || WEB_SEARCH_PROVIDERS.auto;
  const autoUsesNative = NATIVE_SEARCH_LLMS.has(llmConfig.LLM || "");

  const update = (field: keyof LLMConfig, value: string | boolean) => {
    setLlmConfig((current) => ({ ...current, [field]: value }));
  };

  const getValue = (field?: string) =>
    field ? String(llmConfig[field as keyof LLMConfig] || "") : "";

  return (
    <div className="w-full max-w-[920px] space-y-4">
      <div className="rounded-[12px] bg-white p-10">
        <div className="flex items-start justify-between gap-10">
          <div className="max-w-[330px]">
            <h4 className="text-xl font-normal text-[#191919]">Web Search Provider</h4>
            <p className="mt-2.5 text-sm leading-relaxed text-gray-500">
              Search is used only when web search is enabled for a presentation or chat needs current information.
            </p>
          </div>
          <div className="w-[360px] space-y-4">
            <label className="block text-sm font-medium text-gray-700">
              Provider
            </label>
            <select
              className="h-12 w-full rounded-lg border border-gray-300 bg-white px-4 outline-none focus:border-blue-500"
              value={selected}
              onChange={(event) => update("WEB_SEARCH_PROVIDER", event.target.value)}
            >
              {Object.values(WEB_SEARCH_PROVIDERS).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="text-xs leading-relaxed text-gray-500">{provider.description}</p>

            {selected === "auto" && (
              <div className="rounded-lg border border-[#D9D6FE] bg-[#F4F3FF] p-3 text-xs text-[#5146E5]">
                Current text provider will use {autoUsesNative ? "native hosted search" : "external DuckDuckGo fallback unless another API is configured"}.
              </div>
            )}

            {provider.urlField && (
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  {provider.urlLabel}
                </label>
                <input
                  type="url"
                  className="h-12 w-full rounded-lg border border-gray-300 px-4 outline-none focus:border-blue-500"
                  placeholder="https://search.example.com"
                  value={getValue(provider.urlField)}
                  onChange={(event) =>
                    update(provider.urlField as keyof LLMConfig, event.target.value)
                  }
                />
              </div>
            )}

            {provider.apiKeyField && (
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  {provider.apiKeyLabel}
                </label>
                <div className="relative">
                  <input
                    type={showApiKey ? "text" : "password"}
                    className="h-12 w-full rounded-lg border border-gray-300 px-4 pr-12 outline-none focus:border-blue-500"
                    value={getValue(provider.apiKeyField)}
                    onChange={(event) =>
                      update(provider.apiKeyField as keyof LLMConfig, event.target.value)
                    }
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    onClick={() => setShowApiKey((value) => !value)}
                  >
                    {showApiKey ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Maximum results
              </label>
              <input
                type="number"
                min={1}
                max={10}
                className="h-12 w-full rounded-lg border border-gray-300 px-4 outline-none focus:border-blue-500"
                value={llmConfig.WEB_SEARCH_MAX_RESULTS || "5"}
                onChange={(event) => update("WEB_SEARCH_MAX_RESULTS", event.target.value)}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WebSearchProvider;

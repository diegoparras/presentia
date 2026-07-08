"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Search, ChevronRight, Info } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import ToolTip from "@/components/ToolTip";
import { extractIconColor, RemoteSvgIcon } from "@/app/hooks/useRemoteSvgIcon";
import { cn } from "@/lib/utils";
import type { RootState } from "@/store/store";
import { setPresentationData } from "@/store/slices/presentationGeneration";
import { useDispatch, useSelector } from "react-redux";
import { PresentationGenerationApi } from "../services/api/presentation-generation";
import { notify } from "@/components/ui/sonner";

const ICON_WEIGHTS = [
  "thin",
  "light",
  "regular",
  "bold",
  "fill",
  "duotone",
] as const;

type IconWeight = (typeof ICON_WEIGHTS)[number];

const DEFAULT_ICON_WEIGHT: IconWeight = "regular";
const ICON_WEIGHT_PATTERN = ICON_WEIGHTS.join("|");
const ICON_SEARCH_DEBOUNCE_MS = 500;

const ICON_WEIGHT_LABELS: Record<IconWeight, string> = {
  thin: "Thin",
  light: "Light",
  regular: "Regular",
  bold: "Bold",
  fill: "Fill",
  duotone: "Duotone",
};

const normalizeIconWeight = (weight?: string | null): IconWeight => {
  const normalized = (weight || "").trim().toLowerCase().replace(/_/g, "-");

  return ICON_WEIGHTS.includes(normalized as IconWeight)
    ? (normalized as IconWeight)
    : DEFAULT_ICON_WEIGHT;
};

const getIconWeightFromUrl = (url?: string | null) => {
  const match = (url || "").match(/\/static\/icons\/([^/]+)\//);
  return normalizeIconWeight(match?.[1]);
};

const replaceIconWeightInUrl = (
  url: string | null | undefined,
  weight: string
) => {
  if (!url) return "";

  const normalizedWeight = normalizeIconWeight(weight);
  const iconPathPattern = new RegExp(
    `(/static/icons/)([^/]+)/([^/?#]+?)(?:-(${ICON_WEIGHT_PATTERN}))?(\\.(?:svg|png))([?#].*)?$`,
    "i"
  );

  return url.replace(
    iconPathPattern,
    (_match, prefix, _folder, iconName, _suffix, extension, trailing = "") =>
      `${prefix}${normalizedWeight}/${iconName}${
        normalizedWeight === "regular" ? "" : `-${normalizedWeight}`
      }${extension}${trailing}`
  );
};

// Preset swatches offered in the color picker. `null` clears the override and
// falls back to the template/theme color.
const ICON_COLOR_PRESETS: (string | null)[] = [
  null,
  "#191919",
  "#ffffff",
  "#e25a4e",
  "#f59e0b",
  "#16a34a",
  "#2563eb",
  "#7c3aed",
];

const DEFAULT_CUSTOM_COLOR = "#e25a4e";

const normalizeHex = (color: string): string =>
  color.startsWith("#") ? color.toLowerCase() : `#${color.toLowerCase()}`;

const getIconColorFromUrl = (url?: string | null): string | null =>
  extractIconColor(url).iconColor ?? null;

const getIconBgFromUrl = (url?: string | null): string | null =>
  extractIconColor(url).bgColor ?? null;

interface IconColorOverrides {
  color: string | null;
  bgColor: string | null;
}

// Encode (or clear) the per-icon overrides on the icon URL as a
// `#c=<hex>&b=<hex>` fragment consumed by RemoteSvgIcon.
const applyIconColorToUrl = (
  url: string | null | undefined,
  { color, bgColor }: IconColorOverrides
): string => {
  if (!url) return "";

  const base = extractIconColor(url).cleanUrl;
  const parts: string[] = [];
  if (color) parts.push(`c=${normalizeHex(color).slice(1)}`);
  if (bgColor) parts.push(`b=${normalizeHex(bgColor).slice(1)}`);

  return parts.length ? `${base}#${parts.join("&")}` : base;
};

const applyIconColorToValue = (
  value: any,
  overrides: IconColorOverrides
): any => {
  if (typeof value === "string") {
    return value.includes("/static/icons/")
      ? applyIconColorToUrl(value, overrides)
      : value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => applyIconColorToValue(item, overrides));
  }

  if (value && typeof value === "object") {
    Object.keys(value).forEach((key) => {
      value[key] = applyIconColorToValue(value[key], overrides);
    });
  }

  return value;
};

const ColorSwatches = ({
  value,
  onChange,
  labelPrefix,
}: {
  value: string | null;
  onChange: (color: string | null) => void;
  labelPrefix: string;
}) => (
  <div className="flex flex-wrap items-center gap-2">
    {ICON_COLOR_PRESETS.map((preset) => {
      const isSelected = preset
        ? value != null && normalizeHex(value) === normalizeHex(preset)
        : value == null;

      return (
        <button
          key={preset ?? "default"}
          type="button"
          aria-label={
            preset ? `${labelPrefix} ${preset}` : `Default ${labelPrefix.toLowerCase()}`
          }
          aria-pressed={isSelected}
          onClick={(e) => {
            e.stopPropagation();
            onChange(preset);
          }}
          className={cn(
            "relative flex h-8 w-8 items-center justify-center rounded-full border transition-transform hover:scale-105",
            isSelected
              ? "border-[#e25a4e] ring-2 ring-[#F2C4BB]"
              : "border-[#DDDEE3]"
          )}
          style={preset ? { backgroundColor: preset } : undefined}
        >
          {preset ? null : (
            <span className="text-[10px] font-semibold text-[#666666]">
              Auto
            </span>
          )}
        </button>
      );
    })}

    <label
      className="relative flex h-8 w-8 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-dashed border-[#B7B8BE]"
      style={value ? { backgroundColor: value } : undefined}
      onClick={(e) => e.stopPropagation()}
    >
      {value ? null : (
        <span
          className="h-4 w-4 rounded-full"
          style={{
            background:
              "conic-gradient(#ef4444,#f59e0b,#22c55e,#3b82f6,#a855f7,#ef4444)",
          }}
        />
      )}
      <input
        type="color"
        value={value ?? DEFAULT_CUSTOM_COLOR}
        onChange={(e) => onChange(normalizeHex(e.target.value))}
        className="absolute inset-0 cursor-pointer opacity-0"
      />
    </label>
  </div>
);

const clonePresentationData = <T,>(value: T): T => {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value));
};

const applyIconWeightToValue = (value: any, weight: IconWeight): any => {
  if (typeof value === "string") {
    return value.includes("/static/icons/")
      ? replaceIconWeightInUrl(value, weight)
      : value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => applyIconWeightToValue(item, weight));
  }

  if (value && typeof value === "object") {
    Object.keys(value).forEach((key) => {
      value[key] = applyIconWeightToValue(value[key], weight);
    });
  }

  return value;
};

const useDebouncedValue = <T,>(value: T, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => window.clearTimeout(timeoutId);
  }, [delay, value]);

  return debouncedValue;
};

interface IconsEditorProps {
  icon_prompt?: string[] | null;
  currentIconUrl?: string;
  onClose?: () => void;
  onIconChange?: (newIconUrl: string, query?: string) => void;
}

const IconsEditor = ({
  icon_prompt,
  currentIconUrl,
  onClose,
  onIconChange,
}: IconsEditorProps) => {
  const dispatch = useDispatch();
  const presentationData = useSelector(
    (state: RootState) => state.presentationGeneration.presentationData
  );
  const requestIdRef = useRef(0);
  const closeTimeoutRef = useRef<number | null>(null);

  const [icons, setIcons] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>(
    icon_prompt?.[0] || ""
  );
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(true);
  const [selectedWeight, setSelectedWeight] = useState<IconWeight>(
    normalizeIconWeight(getIconWeightFromUrl(currentIconUrl))
  );
  const [selectedIconUrl, setSelectedIconUrl] = useState(currentIconUrl || "");
  const [selectedColor, setSelectedColor] = useState<string | null>(
    getIconColorFromUrl(currentIconUrl)
  );
  const [selectedBgColor, setSelectedBgColor] = useState<string | null>(
    getIconBgFromUrl(currentIconUrl)
  );
  const [applyStylesToPresentation, setApplyStylesToPresentation] =
    useState(false);

  const activeQuery = useMemo(
    () => searchQuery.trim() || icon_prompt?.[0] || "",
    [icon_prompt, searchQuery]
  );
  const debouncedActiveQuery = useDebouncedValue(
    activeQuery,
    ICON_SEARCH_DEBOUNCE_MS
  );

  const previewIconSource = selectedIconUrl || currentIconUrl || icons[0] || "";

  useEffect(() => {
    setSelectedIconUrl(currentIconUrl || "");
    setSelectedWeight(
      normalizeIconWeight(getIconWeightFromUrl(currentIconUrl))
    );
    setSelectedColor(getIconColorFromUrl(currentIconUrl));
    setSelectedBgColor(getIconBgFromUrl(currentIconUrl));
  }, [currentIconUrl]);

  useEffect(() => {
    if (!selectedIconUrl && icons.length > 0) {
      setSelectedIconUrl(icons[0]);
    }
  }, [icons, selectedIconUrl]);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        window.clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);

    if (closeTimeoutRef.current) {
      window.clearTimeout(closeTimeoutRef.current);
    }

    closeTimeoutRef.current = window.setTimeout(() => {
      onClose?.();
    }, 300);
  }, [onClose]);

  const handleIconSearch = useCallback(
    async (weightOverride?: IconWeight, queryOverride?: string) => {
      const query = (queryOverride || "").trim();
      const weight = normalizeIconWeight(weightOverride || selectedWeight);
      const requestId = requestIdRef.current + 1;

      requestIdRef.current = requestId;

      if (!query) {
        setIcons([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const data = await PresentationGenerationApi.searchIcons({
          query,
          limit: 40,
          icon_weight: weight,
        });

        if (requestIdRef.current === requestId) {
          setIcons(Array.isArray(data) ? data : []);
        }
      } catch (error: any) {
        if (requestIdRef.current === requestId) {
          console.error("Error fetching icons:", error);
          notify.error(
            "Could not load icons",
            error.message || "Failed to fetch icons. Please try again."
          );
          setIcons([]);
        }
      } finally {
        if (requestIdRef.current === requestId) {
          setLoading(false);
        }
      }
    },
    [selectedWeight]
  );

  useEffect(() => {
    handleIconSearch(selectedWeight, debouncedActiveQuery);
  }, [debouncedActiveQuery, handleIconSearch, selectedWeight]);

  const handleWeightSelect = (weight: IconWeight) => {
    setSelectedWeight(weight);
    setSelectedIconUrl((previousIcon) => {
      const sourceIcon = previousIcon || currentIconUrl || "";
      return sourceIcon ? replaceIconWeightInUrl(sourceIcon, weight) : "";
    });
  };

  const handleReplaceIcons = () => {
    const overrides: IconColorOverrides = {
      color: selectedColor,
      bgColor: selectedBgColor,
    };
    const replacementIcon = applyIconColorToUrl(
      replaceIconWeightInUrl(selectedIconUrl || currentIconUrl, selectedWeight),
      overrides
    );

    if (!replacementIcon) {
      notify.warning("Icon required", "Select an icon before replacing.");
      return;
    }

    if (applyStylesToPresentation && presentationData) {
      const nextPresentationData = clonePresentationData(presentationData);
      const withWeight = applyIconWeightToValue(
        nextPresentationData,
        selectedWeight
      );
      dispatch(
        setPresentationData(applyIconColorToValue(withWeight, overrides))
      );
    }

    onIconChange?.(replacementIcon, activeQuery);
    handleClose();
  };

  return (
    <div className="icons-editor-container">
      <Sheet
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) handleClose();
        }}
      >
        <SheetContent
          side="right"
          className="flex h-full w-[460px] max-w-[calc(100vw-16px)] flex-col gap-0 border-l border-[#EDEEEF] bg-white p-0 font-syne shadow-xl sm:max-w-[460px] [&>button]:right-5 [&>button]:top-5 [&>button]:scale-125"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onClick={(e) => e.stopPropagation()}
        >
          <SheetHeader className="border-b border-[#EDEEEF] px-6 py-5 text-left">
            <SheetTitle className="text-lg font-semibold text-[#191919]">
              Icon Customizer
            </SheetTitle>
          </SheetHeader>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="space-y-5 px-6 py-6">
              <div className="pb-1">
                <div className="mb-4 flex items-center gap-1.5">
                  <p className="text-sm font-semibold text-[#191919]">
                    Icon Weight
                  </p>
                  <ToolTip content="Choose the visual weight used for icon search and replacement.">
                    <button
                      type="button"
                      className="inline-flex h-4 w-4 items-center justify-center text-[#A1A1AA]"
                    >
                      <Info className="h-3.5 w-3.5" />
                    </button>
                  </ToolTip>
                </div>

                <div className="flex items-center justify-between gap-1.5">
                  {ICON_WEIGHTS.map((weight) => {
                    const isSelected = selectedWeight === weight;
                    const previewIcon = previewIconSource
                      ? replaceIconWeightInUrl(previewIconSource, weight)
                      : "";

                    return (
                      <button
                        key={weight}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleWeightSelect(weight);
                        }}
                        className="group flex min-w-0 flex-1 flex-col items-center gap-1.5"
                      >
                        <span
                          className={cn(
                            "flex h-16 w-full items-center justify-center rounded-[10px] border transition-colors",
                            isSelected
                              ? "border-[#F2C4BB] bg-[#FBEDEA]"
                              : "border-[#EDEEEF] bg-white group-hover:bg-[#F7F7FA]"
                          )}
                        >
                          {previewIcon ? (
                            <img
                              src={previewIcon}
                              alt=""
                              draggable={false}
                              className="h-7 w-7 object-contain"
                            />
                          ) : (
                            <span className="h-5 w-5 rounded-full border border-[#191919]" />
                          )}
                        </span>
                        <span
                          className={cn(
                            "truncate text-[13px] font-medium",
                            isSelected ? "text-[#e25a4e]" : "text-[#666666]"
                          )}
                        >
                          {ICON_WEIGHT_LABELS[weight]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-[#EDEEEF] pt-5">
                <div className="mb-4 flex items-center gap-3">
                  {previewIconSource ? (
                    <span
                      className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-[12px] border border-[#EDEEEF] transition-colors"
                      style={{ backgroundColor: selectedBgColor ?? "#FAFAFB" }}
                    >
                      <RemoteSvgIcon
                        url={applyIconColorToUrl(
                          replaceIconWeightInUrl(
                            previewIconSource,
                            selectedWeight
                          ),
                          { color: selectedColor, bgColor: null }
                        )}
                        strokeColor="currentColor"
                        color={selectedColor ?? "#191919"}
                        className="h-8 w-8"
                      />
                    </span>
                  ) : null}
                  <p className="text-[13px] text-[#73737A]">
                    Live preview of the icon and its shape.
                  </p>
                </div>

                <div className="mb-3 flex items-center gap-1.5">
                  <p className="text-sm font-semibold text-[#191919]">
                    Icon Color
                  </p>
                  <ToolTip content="Recolor the icon glyph. Choose Auto to keep the template color.">
                    <button
                      type="button"
                      className="inline-flex h-4 w-4 items-center justify-center text-[#A1A1AA]"
                    >
                      <Info className="h-3.5 w-3.5" />
                    </button>
                  </ToolTip>
                </div>
                <ColorSwatches
                  value={selectedColor}
                  onChange={setSelectedColor}
                  labelPrefix="Icon color"
                />
              </div>

              <div className="border-t border-[#EDEEEF] pt-5">
                <div className="mb-3 flex items-center gap-1.5">
                  <p className="text-sm font-semibold text-[#191919]">
                    Shape Color
                  </p>
                  <ToolTip content="Recolor the shape behind the icon (background or badge). Choose Auto to keep the template/theme color. Some template shapes are theme-driven and may not be affected.">
                    <button
                      type="button"
                      className="inline-flex h-4 w-4 items-center justify-center text-[#A1A1AA]"
                    >
                      <Info className="h-3.5 w-3.5" />
                    </button>
                  </ToolTip>
                </div>
                <ColorSwatches
                  value={selectedBgColor}
                  onChange={setSelectedBgColor}
                  labelPrefix="Shape color"
                />
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-[#EDEEEF] pt-5">
                <p className="text-sm font-medium text-[#191919]">
                  Apply styles to entire presentation
                </p>
                <Switch
                  checked={applyStylesToPresentation}
                  onCheckedChange={setApplyStylesToPresentation}
                  className="h-5 w-9 data-[state=checked]:bg-[#e25a4e] data-[state=unchecked]:bg-[#DDDEE3]"
                />
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleIconSearch(selectedWeight, activeQuery);
                }}
              >
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9B9CA3]" />
                  <Input
                    placeholder="Find an Icon"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="h-11 rounded-[10px] border-[#E4E5E8] bg-white pl-9 text-[13px] text-[#191919] shadow-none placeholder:text-[#A3A3AA] focus-visible:ring-1 focus-visible:ring-[#D8C8FF]"
                  />
                </div>
              </form>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-4">
              {loading ? (
                <div className="grid grid-cols-5 justify-items-center gap-x-3 gap-y-4 py-1">
                  {Array.from({ length: 35 }).map((_, index) => (
                    <Skeleton key={index} className="h-12 w-12 rounded-[10px]" />
                  ))}
                </div>
              ) : icons.length > 0 ? (
                <div className="grid grid-cols-5 justify-items-center gap-x-3 gap-y-4 py-1">
                  {icons.map((iconSrc, index) => {
                    const isSelected = iconSrc === selectedIconUrl;

                    return (
                      <button
                        key={`${iconSrc}-${index}`}
                        type="button"
                        aria-label={`Select icon ${index + 1}`}
                        aria-pressed={isSelected}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedIconUrl(iconSrc);
                        }}
                        className={cn(
                          "flex h-12 w-12 p-2 items-center justify-center rounded-[10px] border border-transparent transition-colors hover:bg-[#F6F6F9]",
                          isSelected && "border-[#becff5] bg-[#e4ecfd]"
                        )}
                      >
                        <img
                          src={iconSrc}
                          alt=""
                          draggable={false}
                          className="h-full w-full object-contain"
                        />
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex h-44 flex-col items-center justify-center text-center text-[#73737A]">
                  <Search className="mb-3 h-8 w-8 text-[#B7B8BE]" />
                  <p className="text-[13px] font-medium">No icons found</p>
                  <p className="mt-1 text-[12px]">
                    Try a different search term.
                  </p>
                </div>
              )}
            </div>

            <div className="border-t border-[#EDEEEF] px-6 pb-5 pt-4">
              <Button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleReplaceIcons();
                }}
                style={{
                  background:
                    "linear-gradient(270deg, #F8D8D1 2.4%, #FAE4DF 27.88%, #F4DCD3 69.23%, #FDE4C2 100%)",
                }}
                disabled={!selectedIconUrl && !currentIconUrl}
                className="h-12 w-full rounded-full px-4 text-[15px] font-semibold text-[#101323] shadow-none hover:bg-[#F2DDAA] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Replace Icons
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default IconsEditor;

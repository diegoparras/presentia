"use client";
import { Button } from "@/components/ui/button";
import {
  Play,
  Loader2,
  Redo2,
  Undo2,
  RotateCcw,
  ArrowRightFromLine,
  ArrowUpRight,
  Pencil,
  Check,
  X,
  AlertTriangle,
  Music,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { PresentationGenerationApi } from "../../services/api/presentation-generation";
import { getApiUrl, resolveBackendAssetSource } from "@/utils/api";
import { getHeader } from "../../services/api/header";
import { useDispatch, useSelector } from "react-redux";

import { RootState } from "@/store/store";
import { notify } from "@/components/ui/sonner";
import { trackEvent, MixpanelEvent } from "@/utils/mixpanel";
import { usePresentationUndoRedo } from "../hooks/PresentationUndoRedo";
import ToolTip from "@/components/ToolTip";
import {
  clearPresentationData,
  updateTitle,
} from "@/store/slices/presentationGeneration";
import { clearHistory } from "@/store/slices/undoRedoSlice";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ThemeSelector from "./ThemeSelector";
import PublishButton from "./PublishButton";
import CollabPanel from "./CollabPanel";
import { DEFAULT_THEMES } from "../../(dashboard)/theme/components/ThemePanel/constants";
import ThemeApi from "../../services/api/theme";
import { Theme } from "../../services/api/types";
import MarkdownRenderer from "@/components/MarkDownRender";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

const MAX_EXPORT_TITLE_LENGTH = 40;

const buildSafeExportFileName = (
  rawTitle: string | null | undefined,
  extension: "pdf" | "pptx" | "mp4"
) => {
  const normalizedTitle = (rawTitle || "presentation").trim();
  const titleWithoutExtension = normalizedTitle.replace(/\.(pdf|pptx|mp4)$/i, "");

  let safeBase = titleWithoutExtension
    // Replace all punctuation/special chars (including dots) with dashes
    .replace(/[^a-zA-Z0-9\s_-]+/g, "-")
    // Replace whitespace with single dashes
    .replace(/\s+/g, "-")
    // Collapse repeated separators
    .replace(/[-_]{2,}/g, "-")
    // Trim separators from both ends
    .replace(/^[-_]+|[-_]+$/g, "");

  if (!safeBase) {
    safeBase = "presentation";
  }

  if (safeBase.length > MAX_EXPORT_TITLE_LENGTH) {
    safeBase = safeBase
      .slice(0, MAX_EXPORT_TITLE_LENGTH)
      .replace(/[-_]+$/g, "");
  }

  if (!safeBase) {
    safeBase = "presentation";
  }

  return `${safeBase}.${extension}`;
};

const PresentationHeader = ({
  presentation_id,
  isPresentationSaving,
  currentSlide,
}: {
  presentation_id: string;
  isPresentationSaving: boolean;
  currentSlide?: number;
}) => {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [isExporting, setIsExporting] = useState(false);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isRegenerateConfirmOpen, setIsRegenerateConfirmOpen] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  // Biblioteca persistente de música de fondo para el export a video.
  const [musicList, setMusicList] = useState<string[]>([]);
  const [selectedMusic, setSelectedMusic] = useState<string | null>(null);
  const [musicBusy, setMusicBusy] = useState(false);
  const musicInputRef = useRef<HTMLInputElement>(null);
  // Opciones de edición del video (espejo de VideoOptions del backend).
  const [videoOpts, setVideoOpts] = useState({
    seconds_per_slide: 3,
    transition: "fade" as string,
    width: 1920 as 1280 | 1920,
    music_volume: 100,
    music_fade_in: 0,
    music_fade_out: 1.5,
    fade_video: false,
  });
  const patchVideoOpts = (p: Partial<typeof videoOpts>) =>
    setVideoOpts((prev) => ({ ...prev, ...p }));
  const titleInputRef = useRef<HTMLInputElement>(null);
  /** Avoid committing on blur when Save/Cancel was used (focus/click ordering) */
  const titleBlurIntentRef = useRef<"none" | "save" | "cancel">("none");

  const pathname = usePathname();
  const dispatch = useDispatch();

  const { presentationData, isStreaming } = useSelector(
    (state: RootState) => state.presentationGeneration
  );

  useEffect(() => {
    const load = async () => {
      try {
        const [customThemes] = await Promise.all([ThemeApi.getThemes()]);
        setThemes([...customThemes, ...DEFAULT_THEMES]);
      } catch (e: any) {
        notify.error(t("ed.hdr.themesErr"), e?.message || t("ed.hdr.themesErrDesc"));
      }
    };
    if (themes.length === 0) {
      load();
    }
  }, []);

  const { onUndo, onRedo, canUndo, canRedo } = usePresentationUndoRedo();

  useEffect(() => {
    if (isEditingTitle) {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    }
  }, [isEditingTitle]);

  const beginTitleEdit = () => {
    if (isStreaming || !presentationData) return;
    setDraftTitle(presentationData.title || "");
    setIsEditingTitle(true);
  };

  const commitTitleEdit = () => {
    if (!presentationData) {
      setIsEditingTitle(false);
      return;
    }
    const trimmed = draftTitle.trim();
    const next = trimmed || presentationData.title || "Presentation";
    if (next !== presentationData.title) {
      dispatch(updateTitle(next));
      trackEvent(MixpanelEvent.Presentation_Title_Updated, {
        pathname,
        presentation_id,
        previous_title_length: (presentationData.title || "").length,
        next_title_length: next.length,
      });
    }
    setIsEditingTitle(false);
  };

  const cancelTitleEdit = () => {
    setDraftTitle(presentationData?.title || "");
    setIsEditingTitle(false);
  };

  const handleTitleBlur = () => {
    queueMicrotask(() => {
      const intent = titleBlurIntentRef.current;
      titleBlurIntentRef.current = "none";
      if (intent === "cancel" || intent === "save") return;
      commitTitleEdit();
    });
  };

  const onTitleSaveMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    titleBlurIntentRef.current = "save";
  };

  const onTitleCancelMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    titleBlurIntentRef.current = "cancel";
  };

  const exportViaIpc = async (
    format: "pptx" | "pdf",
    title: string
  ): Promise<void> => {
    if (!window.electron?.exportPresentation) {
      throw new Error("Electron export bridge is unavailable");
    }
    const result = await window.electron.exportPresentation(
      presentation_id,
      title,
      format
    );
    if (!result?.success) {
      throw new Error(result?.message || "Export failed");
    }
  };

  const handleExportPptx = async () => {
    if (isStreaming) return;

    let exportToastId: string | number | undefined;
    try {
      trackEvent(MixpanelEvent.Presentation_Export_Started, {
        pathname,
        presentation_id,
        format: "pptx",
        slide_count: presentationData?.slides?.length || 0,
      });
      exportToastId = notify.loading(
        t("ed.hdr.exportingPptx"),
        t("ed.hdr.exportingDesc")
      );
      setIsExporting(true);
      // Save the presentation data before exporting
      await PresentationGenerationApi.updatePresentationContent(
        presentationData
      );
      const safePptxFileName = buildSafeExportFileName(
        presentationData?.title,
        "pptx"
      );
      const safePptxTitle = safePptxFileName.replace(/\.pptx$/i, "");
      if (window.electron?.exportPresentation) {
        await exportViaIpc("pptx", safePptxTitle);
      } else {
        // Mismo pipeline que el video (export-file): motor bundled + fuentes
        // incrustadas + archivo en S3/R2 si está configurado, con descarga
        // servida por el dominio propio.
        const response = await fetch(
          getApiUrl("/api/v1/ppt/presentation/export-file"),
          {
            method: "POST",
            headers: getHeader(),
            body: JSON.stringify({
              presentation_id,
              export_as: "pptx",
            }),
          }
        );

        if (!response.ok) {
          throw new Error("Failed to export PPTX");
        }

        const { url: pptxUrl } = await response.json();
        if (!pptxUrl) {
          throw new Error("No path returned from export");
        }

        downloadLink(resolveBackendAssetSource(pptxUrl) || pptxUrl, safePptxFileName);
      }
      notify.success(
        t("ed.hdr.exportDone"),
        t("ed.hdr.exportDonePptx"),
        { id: exportToastId }
      );
    } catch (error) {
      console.error("Export failed:", error);
      notify.error(
        t("ed.hdr.exportFail"),
        t("ed.hdr.exportFailDesc"),
        exportToastId !== undefined ? { id: exportToastId } : undefined
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPdf = async () => {
    if (isStreaming) return;

    let exportToastId: string | number | undefined;
    try {
      trackEvent(MixpanelEvent.Presentation_Export_Started, {
        pathname,
        presentation_id,
        format: "pdf",
        slide_count: presentationData?.slides?.length || 0,
      });
      exportToastId = notify.loading(
        t("ed.hdr.exportingPdf"),
        t("ed.hdr.exportingDesc")
      );
      setIsExporting(true);
      // Save the presentation data before exporting
      await PresentationGenerationApi.updatePresentationContent(
        presentationData
      );
      const safePdfFileName = buildSafeExportFileName(
        presentationData?.title,
        "pdf"
      );
      const safePdfTitle = safePdfFileName.replace(/\.pdf$/i, "");
      if (window.electron?.exportPresentation) {
        await exportViaIpc("pdf", safePdfTitle);
      } else {
        // Mismo pipeline que el video (export-file): ver handleExportPptx.
        const response = await fetch(
          getApiUrl("/api/v1/ppt/presentation/export-file"),
          {
            method: "POST",
            headers: getHeader(),
            body: JSON.stringify({
              presentation_id,
              export_as: "pdf",
            }),
          }
        );

        if (response.ok) {
          const { url: pdfUrl } = await response.json();
          if (!pdfUrl) throw new Error("No path returned from export");
          downloadLink(resolveBackendAssetSource(pdfUrl) || pdfUrl, safePdfFileName);
        } else {
          throw new Error("Failed to export PDF");
        }
      }
      notify.success(
        t("ed.hdr.exportDone"),
        t("ed.hdr.exportDonePdf"),
        { id: exportToastId }
      );
    } catch (err) {
      console.error(err);
      notify.error(
        t("ed.hdr.exportFail"),
        t("ed.hdr.exportFailDesc"),
        exportToastId !== undefined ? { id: exportToastId } : undefined
      );
    } finally {
      setIsExporting(false);
    }
  };
  // Video (MP4) export goes through the FastAPI freeze pipeline (frames -> ffmpeg),
  // not the bundled Chromium exporter, so it calls the dedicated backend endpoint
  // and downloads the served /app_data/exports URL it returns.
  const handleExportVideo = async () => {
    if (isStreaming) return;
    let exportToastId: string | number | undefined;
    try {
      trackEvent(MixpanelEvent.Presentation_Export_Started, {
        pathname,
        presentation_id,
        format: "video",
        slide_count: presentationData?.slides?.length || 0,
      });
      exportToastId = notify.loading(
        "Generando video…",
        "Renderizando las slides a MP4 (puede tardar un momento)"
      );
      setIsExporting(true);
      await PresentationGenerationApi.updatePresentationContent(presentationData);
      const response = await fetch(
        getApiUrl("/api/v1/ppt/presentation/export-file"),
        {
          method: "POST",
          headers: getHeader(),
          body: JSON.stringify({
            presentation_id,
            export_as: "video",
            music_name: selectedMusic ?? undefined,
            video_options: {
              seconds_per_slide: videoOpts.seconds_per_slide,
              transition: videoOpts.transition || null,
              width: videoOpts.width,
              music_volume: videoOpts.music_volume / 100,
              music_fade_in: videoOpts.music_fade_in,
              music_fade_out: videoOpts.music_fade_out,
              fade_video: videoOpts.fade_video,
            },
          }),
        }
      );
      if (!response.ok) {
        throw new Error("Failed to export video");
      }
      const { url } = await response.json();
      if (!url) throw new Error("No video URL returned");
      const safeName = buildSafeExportFileName(presentationData?.title, "mp4");
      // El backend puede devolver su host interno (127.0.0.1:8000) para
      // /app_data: normalizar al origin actual. Las URLs externas (S3/R2
      // prefirmadas) pasan intactas.
      downloadLink(resolveBackendAssetSource(url) || url, safeName);
      notify.success("Video listo", "Se descargó el MP4.", { id: exportToastId });
    } catch (err) {
      console.error(err);
      notify.error(
        "No se pudo exportar el video",
        "Verificá que el servidor tenga ffmpeg y el motor de freeze disponible.",
        exportToastId !== undefined ? { id: exportToastId } : undefined
      );
    } finally {
      setIsExporting(false);
    }
  };
  const handleReGenerate = () => {
    setIsRegenerateConfirmOpen(false);
    dispatch(clearPresentationData());
    dispatch(clearHistory());
    trackEvent(MixpanelEvent.Presentation_Regenerated, {
      pathname,
      presentation_id,
      slide_count: presentationData?.slides?.length || 0,
    });
    router.push(`/presentation?id=${presentation_id}&stream=true`);
  };
  // Nombre legible de una pista (los nombres guardados llevan prefijo hex).
  const musicDisplayName = (name: string) => name.replace(/^[0-9a-f]{8}-/, "");

  const refreshMusicLibrary = async () => {
    try {
      const res = await fetch(getApiUrl("/api/v1/ppt/music"), {
        headers: getHeader(),
      });
      if (res.ok) {
        const names: string[] = await res.json();
        setMusicList(names);
        setSelectedMusic((prev) =>
          prev && names.includes(prev) ? prev : null
        );
      }
    } catch {
      /* biblioteca no disponible: el selector queda vacío */
    }
  };

  // Cargar la biblioteca al abrir el menú de exportación.
  useEffect(() => {
    if (open) refreshMusicLibrary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Sube una pista nueva a la biblioteca persistente y la deja seleccionada.
  const onMusicSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setMusicBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(getApiUrl("/api/v1/ppt/music/upload"), {
        method: "POST",
        body: form,
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      setMusicList((prev) => [...prev, data.name].sort());
      setSelectedMusic(data.name);
    } catch {
      notify.error(t("vid.musicErr"), "");
    } finally {
      setMusicBusy(false);
    }
  };

  const deleteSelectedMusic = async () => {
    if (!selectedMusic) return;
    setMusicBusy(true);
    try {
      await fetch(
        getApiUrl(`/api/v1/ppt/music/${encodeURIComponent(selectedMusic)}`),
        { method: "DELETE" }
      );
      setMusicList((prev) => prev.filter((n) => n !== selectedMusic));
      setSelectedMusic(null);
    } catch {
      /* si falla el borrado, la lista se recarga al reabrir */
    } finally {
      setMusicBusy(false);
    }
  };

  const downloadLink = (path: string, fileName: string) => {
    const link = document.createElement("a");
    link.href = path;
    link.download = fileName;
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const ExportOptions = ({ mobile }: { mobile: boolean }) => (
    <div
      className={` rounded-[18px] max-md:mt-4 ${mobile ? "" : "bg-white"}  p-5`}
    >
      <p className="text-sm font-medium text-[#19001F]">{t("ed.hdr.exportAs")}</p>
      <div className="my-[18px] h-[1px] bg-[#E8E8E8]" />
      <div className="space-y-3">
        <Button
          onClick={() => {
            handleExportPdf();
            setOpen(false);
          }}
          variant="ghost"
          className={`  rounded-none px-0 w-full text-xs flex justify-start text-black hover:bg-transparent ${
            mobile ? "bg-white py-6 border-none rounded-lg" : ""
          }`}
        >
          PDF
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Button>
        <Button
          onClick={() => {
            handleExportPptx();
            setOpen(false);
          }}
          variant="ghost"
          className={`w-full flex px-0 justify-start text-xs text-black hover:bg-transparent  ${
            mobile ? "bg-white py-6" : ""
          }`}
        >
          PPTX
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Button>
        <Button
          onClick={() => {
            handleExportVideo();
            setOpen(false);
          }}
          variant="ghost"
          className={`w-full flex px-0 justify-start text-xs text-black hover:bg-transparent  ${
            mobile ? "bg-white py-6" : ""
          }`}
        >
          Video (MP4)
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Button>

        {/* Opciones de edición del video */}
        <div className="rounded-lg border border-dashed border-[#E8E8E8] p-2.5 space-y-2">
          <p className="text-[11px] font-medium text-neutral-500">{t("vid.opts")}</p>
          <div className="flex items-center gap-2">
            <span className="w-24 shrink-0 text-[11px] text-neutral-500">{t("vid.secondsPerSlide")}</span>
            <input
              type="range" min={1} max={10} step={0.5}
              value={videoOpts.seconds_per_slide}
              onChange={(e) => patchVideoOpts({ seconds_per_slide: Number(e.target.value) })}
              className="min-w-0 flex-1 accent-[#5141e5]"
            />
            <span className="w-7 shrink-0 text-right text-[11px] text-neutral-600">{videoOpts.seconds_per_slide}s</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-24 shrink-0 text-[11px] text-neutral-500">{t("vid.transition")}</span>
            <select
              value={videoOpts.transition}
              onChange={(e) => patchVideoOpts({ transition: e.target.value })}
              className="h-7 min-w-0 flex-1 rounded-md border border-neutral-200 bg-white px-1.5 text-xs text-neutral-700 outline-none"
            >
              <option value="">{t("vid.tr.none")}</option>
              <option value="fade">{t("vid.tr.fade")}</option>
              <option value="slideleft">{t("vid.tr.slideleft")}</option>
              <option value="wipeleft">{t("vid.tr.wipeleft")}</option>
              <option value="circleopen">{t("vid.tr.circleopen")}</option>
              <option value="dissolve">{t("vid.tr.dissolve")}</option>
              <option value="pixelize">{t("vid.tr.pixelize")}</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-24 shrink-0 text-[11px] text-neutral-500">{t("vid.quality")}</span>
            <select
              value={videoOpts.width}
              onChange={(e) => patchVideoOpts({ width: Number(e.target.value) as 1280 | 1920 })}
              className="h-7 min-w-0 flex-1 rounded-md border border-neutral-200 bg-white px-1.5 text-xs text-neutral-700 outline-none"
            >
              <option value={1280}>720p</option>
              <option value={1920}>1080p</option>
            </select>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-[11px] text-neutral-600">
            <input
              type="checkbox"
              checked={videoOpts.fade_video}
              onChange={(e) => patchVideoOpts({ fade_video: e.target.checked })}
              className="accent-[#5141e5]"
            />
            {t("vid.fadeVideo")}
          </label>
        </div>

        {/* Biblioteca de música de fondo para el video */}
        <div className="rounded-lg border border-dashed border-[#E8E8E8] p-2.5">
          <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium text-neutral-500">
            <Music className="h-3 w-3 text-[#5141e5]" /> {t("vid.music")}
          </p>
          <input
            ref={musicInputRef}
            type="file"
            accept="audio/*,.mp3,.m4a,.aac,.wav,.ogg,.oga,.flac"
            onChange={onMusicSelected}
            className="hidden"
          />
          <div className="flex items-center gap-1.5">
            <select
              value={selectedMusic ?? ""}
              onChange={(e) => setSelectedMusic(e.target.value || null)}
              disabled={musicBusy}
              className="h-7 min-w-0 flex-1 rounded-md border border-neutral-200 bg-white px-1.5 text-xs text-neutral-700 outline-none disabled:opacity-50"
            >
              <option value="">{t("vid.musicNone")}</option>
              {musicList.map((name) => (
                <option key={name} value={name}>
                  {musicDisplayName(name)}
                </option>
              ))}
            </select>
            {selectedMusic && (
              <button
                onClick={deleteSelectedMusic}
                disabled={musicBusy}
                className="shrink-0 rounded p-1 text-neutral-400 hover:text-red-500 disabled:opacity-50"
                aria-label={t("ep.common.remove")}
                title={t("ep.common.remove")}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <button
            onClick={() => musicInputRef.current?.click()}
            disabled={musicBusy}
            className="mt-1.5 flex w-full items-center gap-1.5 rounded-md bg-neutral-50 px-2 py-1.5 text-left text-xs text-neutral-600 hover:bg-neutral-100 disabled:opacity-50"
          >
            {musicBusy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Music className="h-3.5 w-3.5" />
            )}
            {musicBusy ? t("ep.common.uploading") : t("vid.musicPick")}
          </button>

          {/* Controles de audio: solo con una pista elegida */}
          {selectedMusic && (
            <div className="mt-2 space-y-1.5 border-t border-neutral-100 pt-2">
              <div className="flex items-center gap-2">
                <span className="w-16 shrink-0 text-[11px] text-neutral-500">{t("vid.volume")}</span>
                <input
                  type="range" min={10} max={200} step={5}
                  value={videoOpts.music_volume}
                  onChange={(e) => patchVideoOpts({ music_volume: Number(e.target.value) })}
                  className="min-w-0 flex-1 accent-[#5141e5]"
                />
                <span className="w-9 shrink-0 text-right text-[11px] text-neutral-600">{videoOpts.music_volume}%</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-16 shrink-0 text-[11px] text-neutral-500">{t("vid.fadeIn")}</span>
                <input
                  type="range" min={0} max={5} step={0.5}
                  value={videoOpts.music_fade_in}
                  onChange={(e) => patchVideoOpts({ music_fade_in: Number(e.target.value) })}
                  className="min-w-0 flex-1 accent-[#5141e5]"
                />
                <span className="w-9 shrink-0 text-right text-[11px] text-neutral-600">{videoOpts.music_fade_in}s</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-16 shrink-0 text-[11px] text-neutral-500">{t("vid.fadeOut")}</span>
                <input
                  type="range" min={0} max={5} step={0.5}
                  value={videoOpts.music_fade_out}
                  onChange={(e) => patchVideoOpts({ music_fade_out: Number(e.target.value) })}
                  className="min-w-0 flex-1 accent-[#5141e5]"
                />
                <span className="w-9 shrink-0 text-right text-[11px] text-neutral-600">{videoOpts.music_fade_out}s</span>
              </div>
            </div>
          )}
          <p className="mt-1 text-[10px] text-neutral-400">{t("vid.musicHint")}</p>
        </div>
      </div>
    </div>
  );

  const titleBlock = (
    <div
      className={cn(
        "min-w-0 max-w-[min(640px,calc(100vw-12rem))] flex-1 transition-[box-shadow] duration-200",
        isEditingTitle && "relative z-[60]"
      )}
    >
      {isEditingTitle ? (
        <div className="flex items-stretch w-[450px]  gap-0.5 rounded-[14px] border border-[#E4E2EB] bg-white pl-3.5 pr-1 py-1 shadow-[0_2px_12px_rgba(17,3,31,0.06)] ring-2 ring-[#5141e5]/15">
          <input
            ref={titleInputRef}
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            onBlur={handleTitleBlur}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                titleBlurIntentRef.current = "save";
                commitTitleEdit();
              } else if (e.key === "Escape") {
                e.preventDefault();
                titleBlurIntentRef.current = "cancel";
                cancelTitleEdit();
              }
            }}
            placeholder={t("ed.hdr.titlePh")}
            className="min-w-0 flex-1 bg-transparent py-2 pr-2 font-unbounded text-base leading-tight text-[#101323] placeholder:text-[#101323]/35 outline-none border-0 focus:ring-0"
            aria-label={t("ed.hdr.titlePh")}
          />
          <div className="flex shrink-0 items-center gap-0.5 border-l border-[#EDECEC] pl-1 ml-0.5">
            <ToolTip content={t("ed.hdr.saveEnter")}>
              <button
                type="button"
                onMouseDown={onTitleSaveMouseDown}
                onClick={commitTitleEdit}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#5141e5] hover:bg-[#5141e5]/10 transition-colors"
                aria-label={t("ed.hdr.saveTitle")}
              >
                <Check className="h-4 w-4" strokeWidth={2.25} />
              </button>
            </ToolTip>
            <ToolTip content={t("ed.hdr.cancelEsc")}>
              <button
                type="button"
                onMouseDown={onTitleCancelMouseDown}
                onClick={cancelTitleEdit}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#101323]/55 hover:bg-[#F6F6F9] hover:text-[#101323] transition-colors"
                aria-label={t("ed.hdr.cancelTitle")}
              >
                <X className="h-4 w-4" strokeWidth={2.25} />
              </button>
            </ToolTip>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={beginTitleEdit}
          disabled={isStreaming || !presentationData}
          className={cn(
            "group/title flex w-full min-w-0 items-center gap-2.5 rounded-[14px] px-3 py-2 text-left -mx-3 transition-colors",
            "hover:bg-[#F6F6F9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5141e5] focus-visible:ring-offset-2",
            "disabled:pointer-events-none disabled:opacity-100 disabled:hover:bg-transparent"
          )}
        >
          <h2 className="min-w-0 flex-1 font-unbounded text-lg w-[450px] leading-snug text-[#101323]">
            <MarkdownRenderer
              content={presentationData?.title || "Presentation"}
              className="mb-0 min-w-0 overflow-hidden text-ellipsis line-clamp-1 text-sm text-[#101323] prose-p:my-0 prose-headings:my-0"
            />
          </h2>
          {presentationData && !isStreaming && (
            <Pencil
              className="h-3.5 w-3.5 shrink-0 text-[#101323]/40 transition-all duration-200 group-hover/title:text-[#5141e5] opacity-80 sm:opacity-0 sm:group-hover/title:opacity-100 group-hover/title:opacity-100"
              aria-hidden
            />
          )}
        </button>
      )}
    </div>
  );

  return (
    <>
      <div className="py-[18px] px-4 sticky top-0 bg-white z-50 shadow-sm font-syne flex justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <img
            onClick={() => {
              router.push("/dashboard");
            }}
            src="/presentia-logo.svg"
            alt=""
            className="w-10 h-10 cursor-pointer object-contain"
          />
          {presentationData && !isStreaming && !isEditingTitle ? (
            <ToolTip content={t("ed.hdr.rename")}>{titleBlock}</ToolTip>
          ) : (
            titleBlock
          )}
        </div>

        <div className="flex items-center gap-2.5">
          {isPresentationSaving && (
            <div className="flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            </div>
          )}
          {presentationData &&
            presentationData.slides?.[0]?.layout &&
            !presentationData.slides[0].layout.includes("custom") && (
              <ThemeSelector
                current_theme={presentationData?.theme || {}}
                themes={themes}
              />
            )}

          <div className="flex items-center gap-2 bg-[#F6F6F9] px-3.5 h-[38px] border border-[#EDECEC] rounded-[80px]">
            <ToolTip content={t("ed.hdr.regenerate")}>
              <button
                type="button"
                onClick={() => setIsRegenerateConfirmOpen(true)}
                className="group"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#101323] group-hover:text-[#5141e5] duration-300" />
              </button>
            </ToolTip>
            <Separator orientation="vertical" className="h-4" />
            <ToolTip content={t("ed.hdr.undo")}>
              <button
                disabled={!canUndo}
                className=" disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer group"
                onClick={() => {
                  onUndo();
                }}
              >
                <Undo2 className="w-3.5 h-3.5 text-[#101323] group-hover:text-[#5141e5] duration-300" />
              </button>
            </ToolTip>
            <Separator orientation="vertical" className="h-4" />
            <ToolTip content={t("ed.hdr.redo")}>
              <button
                disabled={!canRedo}
                className=" disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer group"
                onClick={() => {
                  onRedo();
                }}
              >
                <Redo2 className="w-3.5 h-3.5 text-[#101323] group-hover:text-[#5141e5] duration-300" />
              </button>
            </ToolTip>
            <Separator orientation="vertical" className="h-4 w-[2px]" />
            <ToolTip content={t("ed.hdr.present")}>
              <button
                onClick={() => {
                  const to = `?id=${presentation_id}&mode=present&slide=${
                    currentSlide || 0
                  }`;
                  trackEvent(MixpanelEvent.Presentation_Mode_Entered, {
                    pathname,
                    presentation_id,
                    slide_index: currentSlide || 0,
                    slide_count: presentationData?.slides?.length || 0,
                  });
                  trackEvent(MixpanelEvent.Navigation, { from: pathname, to });
                  router.push(to);
                }}
                disabled={
                  isStreaming ||
                  !presentationData?.slides ||
                  presentationData?.slides.length === 0
                }
                className="cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                <Play className="w-3.5 h-3.5 text-[#101323] group-hover:text-[#5141e5] duration-300" />
              </button>
            </ToolTip>
          </div>

          <CollabPanel presentationId={presentation_id} currentSlide={currentSlide} />

          <PublishButton presentation_id={presentation_id} />

          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <button
                className="flex  items-center gap-[7px] px-[18px] py-[11px] rounded-[53px] text-sm font-semibold text-[#101323]"
                style={{
                  background:
                    "linear-gradient(270deg, #F8D8D1 2.4%, #FAE4DF 27.88%, #F4DCD3 69.23%, #FDE4C2 100%)",
                }}
                disabled={isExporting || isStreaming === true}
              >
                {isExporting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  t("ed.hdr.export")
                )}{" "}
                <ArrowRightFromLine className="w-3.5 h-3.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              className="w-[340px] max-h-[80vh] overflow-y-auto rounded-[18px] space-y-2 p-0"
            >
              <ExportOptions mobile={false} />
            </PopoverContent>
          </Popover>
        </div>
      </div>
      <Dialog
        open={isRegenerateConfirmOpen}
        onOpenChange={setIsRegenerateConfirmOpen}
      >
        <DialogContent className="w-[360px] rounded-2xl border-0 p-0 shadow-2xl sm:max-w-[360px]">
          <DialogHeader className="items-center px-6 pb-4 pt-6 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
              <AlertTriangle className="h-6 w-6 text-red-500" />
            </div>
            <DialogTitle className="text-lg font-semibold text-[#191919]">
              {t("ed.hdr.regenTitle")}
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed text-gray-500">
              {t("ed.hdr.regenDesc")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row border-t border-gray-100 p-0 sm:space-x-0">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsRegenerateConfirmOpen(false)}
              className="h-auto flex-1 rounded-none rounded-bl-2xl px-4 py-3.5 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-700"
            >
              {t("ed.common.cancel")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={handleReGenerate}
              className="h-auto flex-1 rounded-none rounded-br-2xl border-l border-gray-100 px-4 py-3.5 text-sm font-medium text-red-500 hover:bg-red-50 hover:text-red-600"
            >
              {t("ed.hdr.regenConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PresentationHeader;

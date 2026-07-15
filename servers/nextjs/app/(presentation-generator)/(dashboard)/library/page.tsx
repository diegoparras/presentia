"use client";

/**
 * Librería personalizada (Suite Escriba): todos los archivos del usuario
 * agrupados por videos / imágenes / audio / documentos, con descarga y
 * borrado. Contrato de diseño de la suite: acento coral, sin glow.
 */

import React, { useCallback, useEffect, useState } from "react";
import {
  Clapperboard,
  Download,
  FileText,
  Image as ImageIcon,
  Music,
  Trash2,
} from "lucide-react";
import { getApiUrl, resolveBackendAssetSource } from "@/utils/api";
import { useI18n } from "@/lib/i18n";
import PageShell from "../Components/PageShell";

const ACCENT = "#e25a4e";

type LibraryItem = {
  id?: string;
  name: string;
  size: number | null;
  modified: string | null;
  url: string;
};

type LibraryData = {
  videos: LibraryItem[];
  documents: LibraryItem[];
  images: LibraryItem[];
  audio: LibraryItem[];
};

type SectionKey = keyof LibraryData;

const SECTIONS: {
  key: SectionKey;
  labelKey: string;
  emptyHintKey: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
}[] = [
  { key: "videos", labelKey: "mlib.videos", emptyHintKey: "mlib.emptyHintVideos", icon: Clapperboard },
  { key: "images", labelKey: "mlib.images", emptyHintKey: "mlib.emptyHintImages", icon: ImageIcon },
  { key: "audio", labelKey: "mlib.audio", emptyHintKey: "mlib.emptyHintAudio", icon: Music },
  { key: "documents", labelKey: "mlib.documents", emptyHintKey: "mlib.emptyHintDocuments", icon: FileText },
];

const formatSize = (bytes: number | null): string => {
  if (bytes === null || bytes === undefined) return "—";
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
};

const deletePathFor = (section: SectionKey, item: LibraryItem): string => {
  if (section === "images") return `/api/v1/ppt/images/${item.id}`;
  if (section === "audio") return `/api/v1/ppt/music/${encodeURIComponent(item.name)}`;
  return `/api/v1/ppt/library/export/${encodeURIComponent(item.name)}`;
};

const LibraryPage = () => {
  const { t, lang } = useI18n();
  const [data, setData] = useState<LibraryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteFailed, setDeleteFailed] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadFailed(false);
    try {
      const response = await fetch(getApiUrl("/api/v1/ppt/library"), {
        credentials: "include",
      });
      if (!response.ok) throw new Error(String(response.status));
      setData((await response.json()) as LibraryData);
    } catch {
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (section: SectionKey, item: LibraryItem) => {
    const itemKey = `${section}:${item.id || item.name}`;
    setDeleting(itemKey);
    setDeleteFailed(null);
    try {
      const response = await fetch(getApiUrl(deletePathFor(section, item)), {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok && response.status !== 404) throw new Error(String(response.status));
      setData((prev) =>
        prev
          ? {
              ...prev,
              [section]: prev[section].filter(
                (entry) => (entry.id || entry.name) !== (item.id || item.name)
              ),
            }
          : prev
      );
    } catch {
      setDeleteFailed(itemKey);
    } finally {
      setDeleting(null);
      setConfirming(null);
    }
  };

  const formatDate = (iso: string | null): string => {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleDateString(lang, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "—";
    }
  };

  return (
    <PageShell title={t("mlib.title")} subtitle={t("mlib.subtitle")}>
      <div className="pb-10 font-inter space-y-8">
        {loading && (
          <p className="text-[13px] text-[#70707b]">{t("mlib.loading")}</p>
        )}
        {!loading && loadFailed && (
          <div className="rounded-xl border border-[#E1E1E5] bg-white px-4 py-6 text-center">
            <p className="text-[13px] text-[#70707b]">{t("mlib.loadError")}</p>
            <button
              onClick={load}
              className="mt-3 rounded-lg px-4 py-1.5 text-[13px] font-medium text-white"
              style={{ backgroundColor: ACCENT }}
            >
              {t("mlib.retry")}
            </button>
          </div>
        )}
        {!loading &&
          data &&
          SECTIONS.map(({ key, labelKey, emptyHintKey, icon: Icon }) => {
            const items = data[key];
            return (
              <section key={key}>
                <div className="mb-3 flex items-center gap-2">
                  <Icon className="h-4 w-4" style={{ color: ACCENT }} />
                  <h2 className="text-[15px] font-semibold text-[#16161a]">
                    {t(labelKey)}
                  </h2>
                  <span className="text-[12px] text-[#70707b]">
                    {items.length === 1
                      ? t("mlib.file")
                      : t("mlib.files", { n: String(items.length) })}
                  </span>
                </div>
                <div className="rounded-xl border border-[#E1E1E5] bg-white overflow-hidden">
                  {items.length === 0 ? (
                    <div className="px-4 py-6">
                      <p className="text-[13px] text-[#16161a]">{t("mlib.empty")}</p>
                      <p className="mt-1 text-[12px] text-[#70707b]">
                        {t(emptyHintKey)}
                      </p>
                    </div>
                  ) : (
                    <ul>
                      {items.map((item) => {
                        const itemKey = `${key}:${item.id || item.name}`;
                        const isConfirming = confirming === itemKey;
                        const isDeleting = deleting === itemKey;
                        return (
                          <li
                            key={itemKey}
                            className="flex items-center gap-3 border-b border-[#EDEEEF] px-4 py-2.5 last:border-b-0 hover:bg-[#FAFAFB]"
                          >
                            {key === "images" ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={resolveBackendAssetSource(item.url)}
                                alt={item.name}
                                className="h-9 w-9 flex-shrink-0 rounded-md border border-[#EDEEEF] object-cover"
                              />
                            ) : (
                              <Icon className="h-4 w-4 flex-shrink-0 text-slate-500" />
                            )}
                            <span
                              className="min-w-0 flex-1 truncate text-[13px] text-[#16161a]"
                              title={item.name}
                            >
                              {item.name}
                            </span>
                            <span className="hidden w-[72px] text-right text-[12px] tabular-nums text-[#70707b] sm:block">
                              {formatSize(item.size)}
                            </span>
                            <span className="hidden w-[110px] text-right text-[12px] text-[#70707b] md:block">
                              {formatDate(item.modified)}
                            </span>
                            {isConfirming ? (
                              <span className="flex items-center gap-2">
                                <span className="text-[12px] text-[#16161a]">
                                  {t("mlib.confirmDelete")}
                                </span>
                                <button
                                  onClick={() => handleDelete(key, item)}
                                  disabled={isDeleting}
                                  className="rounded-md px-2.5 py-1 text-[12px] font-medium text-white disabled:opacity-60"
                                  style={{ backgroundColor: ACCENT }}
                                >
                                  {t("mlib.confirm")}
                                </button>
                                <button
                                  onClick={() => setConfirming(null)}
                                  disabled={isDeleting}
                                  className="rounded-md border border-[#E1E1E5] px-2.5 py-1 text-[12px] text-[#16161a]"
                                >
                                  {t("mlib.cancel")}
                                </button>
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <a
                                  href={resolveBackendAssetSource(item.url)}
                                  download={item.name}
                                  className="rounded-md p-1.5 text-slate-500 hover:bg-[#F1F1F4] hover:text-[#16161a]"
                                  aria-label={t("mlib.download")}
                                  title={t("mlib.download")}
                                >
                                  <Download className="h-4 w-4" />
                                </a>
                                <button
                                  onClick={() => {
                                    setDeleteFailed(null);
                                    setConfirming(itemKey);
                                  }}
                                  className="rounded-md p-1.5 text-slate-500 hover:bg-[#F1F1F4]"
                                  style={{ color: undefined }}
                                  aria-label={t("mlib.delete")}
                                  title={t("mlib.delete")}
                                >
                                  <Trash2 className="h-4 w-4 hover:text-[#e25a4e]" />
                                </button>
                              </span>
                            )}
                            {deleteFailed === itemKey && (
                              <span className="text-[12px]" style={{ color: ACCENT }}>
                                {t("mlib.deleteError")}
                              </span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </section>
            );
          })}
      </div>
    </PageShell>
  );
};

export default LibraryPage;

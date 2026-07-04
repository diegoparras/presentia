"use client";

import React from "react";
import { LANGS, LANG_LABELS, useI18n, type Lang } from "@/lib/i18n";

/** Selector de idioma de la suite (siete idiomas fijos). */
const LanguageSelector = ({ compact = false }: { compact?: boolean }) => {
  const { lang, setLang, t } = useI18n();
  return (
    <select
      aria-label={t("nav.language")}
      title={t("nav.language")}
      value={lang}
      onChange={(event) => setLang(event.target.value as Lang)}
      className={
        compact
          ? "w-full rounded-md border border-[#E1E1E5] bg-white px-1 py-1 text-[11px] text-slate-800 outline-none"
          : "rounded-[9px] border border-[#EDEEEF] bg-white px-2.5 py-1.5 text-sm text-slate-800 outline-none"
      }
    >
      {LANGS.map((code) => (
        <option key={code} value={code}>
          {compact ? code.toUpperCase() : LANG_LABELS[code]}
        </option>
      ))}
    </select>
  );
};

export default LanguageSelector;

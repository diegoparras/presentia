"use client";

import React from "react";
import { BookOpen, ExternalLink, Github, HelpCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PRESENTIA } from "@/lib/presentia";
import { useI18n } from "@/lib/i18n";

/**
 * Modal de Ayuda: guía rápida de uso, la aclaración de que Presentia es un
 * fork de Presenton con links al proyecto madre, y el link a la suite.
 */
const HelpPresentia = () => {
  const { t } = useI18n();
  const linkClass =
    "inline-flex items-center gap-2 text-sm underline underline-offset-2";
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="flex flex-col items-center gap-2 transition-colors"
          aria-label={t("nav.help")}
          title={t("nav.help")}
        >
          <HelpCircle className="h-4 w-4 text-slate-600" />
          <span className="text-[11px] text-slate-800">{t("nav.help")}</span>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-[460px] bg-white sm:rounded-2xl">
        <DialogTitle className="text-lg font-semibold text-[#16161a]">
          {t("nav.help")}
        </DialogTitle>
        <p className="text-sm leading-relaxed text-[#3c3c44]">
          {t("help.intro")}
        </p>
        <div className="rounded-[11px] border border-[#F6C9C0] bg-[#FDF0EE] p-4">
          <p className="text-sm leading-relaxed text-[#3c3c44]">
            {t("help.fork")}
          </p>
          <div className="mt-3 flex flex-col gap-1.5">
            <a
              href={PRESENTIA.upstreamSite}
              target="_blank"
              rel="noreferrer"
              className={linkClass}
              style={{ color: PRESENTIA.accentHover }}
            >
              <ExternalLink className="h-3.5 w-3.5 shrink-0" />
              {t("help.upstreamSite")}
            </a>
            <a
              href={PRESENTIA.upstreamUrl}
              target="_blank"
              rel="noreferrer"
              className={linkClass}
              style={{ color: PRESENTIA.accentHover }}
            >
              <Github className="h-3.5 w-3.5 shrink-0" />
              {t("help.upstreamRepo")}
            </a>
            <a
              href={PRESENTIA.upstreamDocs}
              target="_blank"
              rel="noreferrer"
              className={linkClass}
              style={{ color: PRESENTIA.accentHover }}
            >
              <BookOpen className="h-3.5 w-3.5 shrink-0" />
              {t("help.upstreamDocs")}
            </a>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-[#E1E1E5] pt-3">
          <span className="text-xs text-[#70707b]">{t("help.suiteNote")}</span>
          <a
            href={PRESENTIA.suiteUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium underline underline-offset-2"
            style={{ color: PRESENTIA.accentHover }}
          >
            <img
              src="/escriba-logo.svg"
              alt="Escriba"
              className="h-4 w-4 rounded-[4px]"
            />
            {t("help.suiteLink")}
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HelpPresentia;

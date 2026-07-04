"use client";

import React from "react";
import { Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PRESENTIA } from "@/lib/presentia";
import { useI18n } from "@/lib/i18n";

/**
 * Modal "Acerca de" del contrato de diseño de la Suite Escriba: nombre,
 * tagline, versión real, rol en la suite y la aclaración de que es un fork.
 */
const AboutPresentia = ({ trigger }: { trigger?: React.ReactNode }) => {
  const { t } = useI18n();
  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger ?? (
          <button
            type="button"
            className="flex flex-col items-center gap-2 transition-colors"
            aria-label={`Acerca de ${PRESENTIA.name}`}
            title={`Acerca de ${PRESENTIA.name}`}
          >
            <Info className="h-4 w-4 text-slate-600" />
            <span className="text-[11px] text-slate-800">{t("nav.about")}</span>
          </button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-[430px] bg-white sm:rounded-2xl">
        <div>
          <DialogTitle className="text-lg font-semibold text-[#16161a]">
            {PRESENTIA.name}
          </DialogTitle>
          <p className="mt-0.5 text-sm text-[#70707b]">{t("about.tagline")}</p>
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-2 text-sm">
          <dt className="text-[#70707b]">{t("about.version")}</dt>
          <dd className="font-mono text-[13px]">{PRESENTIA.version}</dd>
          <dt className="text-[#70707b]">{t("about.role")}</dt>
          <dd>{t("about.role.value")}</dd>
          <dt className="text-[#70707b]">{t("about.origin")}</dt>
          <dd>{t("about.origin.value", { version: PRESENTIA.upstreamVersion })}</dd>
          <dt className="text-[#70707b]">{t("about.upstream")}</dt>
          <dd>
            <a
              href={PRESENTIA.upstreamUrl}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2"
              style={{ color: PRESENTIA.accent }}
            >
              presenton/presenton
            </a>
          </dd>
        </dl>
        <div className="border-t border-[#E1E1E5] pt-3 text-xs text-[#70707b]">
          {PRESENTIA.author}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AboutPresentia;

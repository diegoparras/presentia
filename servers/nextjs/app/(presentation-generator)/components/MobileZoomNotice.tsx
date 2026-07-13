"use client";

import React, { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";

// Se muestra una sola vez por dispositivo (localStorage). Versionado por si
// en el futuro cambia el mensaje y conviene re-mostrarlo.
const STORAGE_KEY = "presentia-mobile-zoom-notice-v1";

// Umbral en px CSS: cuando el usuario reduce el zoom del navegador, el ancho
// lógico crece, así que el aviso deja de aparecer solo una vez que la
// interfaz ya entra cómoda.
const NARROW_MAX_PX = 820;

const isMobileViewport = () => {
  if (typeof window === "undefined") return false;
  const narrow = window.innerWidth <= NARROW_MAX_PX;
  // `pointer: coarse` (puntero primario táctil) y no `maxTouchPoints`: las
  // laptops con pantalla táctil reportan maxTouchPoints > 0 y dispararían
  // el aviso al achicar la ventana.
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const mobileUA = /Android|iPhone|iPad|iPod|Mobile/i.test(
    navigator.userAgent
  );
  return narrow && (coarse || mobileUA);
};

/**
 * Aviso para smartphones: la interfaz está pensada para pantallas grandes,
 * así que en móviles sugerimos ajustar el zoom del navegador. Montado en el
 * layout autenticado — aparece recién después del login.
 */
const MobileZoomNotice: React.FC = () => {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(STORAGE_KEY)) return;
    } catch {
      // localStorage bloqueado: mostramos igual, solo que sin persistencia.
    }
    if (isMobileViewport()) setOpen(true);
  }, []);

  const dismiss = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {
      // Sin persistencia disponible; al menos se cierra en esta visita.
    }
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div
      data-mobile-zoom-notice
      role="dialog"
      aria-modal="true"
      aria-labelledby="mobile-zoom-notice-title"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 p-5 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-white text-center shadow-2xl">
        {/* Cabecera de marca: el logo tal cual lo renderiza la app (sidebar),
            sobre un marco translúcido para que asiente en el gradiente. */}
        <div className="relative bg-gradient-to-br from-[#e25a4e] via-[#dd4f42] to-[#c23a2e] px-6 pb-8 pt-8">
          <div className="pointer-events-none absolute -left-10 -top-10 h-36 w-36 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-14 -right-8 h-40 w-40 rounded-full bg-white/10" />
          <div className="relative mx-auto mb-4 w-fit rounded-[14px] bg-white/15 p-1.5 shadow-lg ring-1 ring-white/30">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/presentia-logo.svg"
              alt="Presentia"
              className="h-12 w-12 rounded-[10px]"
            />
          </div>
          <p className="relative text-xs font-semibold uppercase tracking-[0.35em] text-white/80">
            {t("mobile.notice.welcome")}
          </p>
          <p className="relative mt-1 text-2xl font-bold tracking-tight text-white">
            Presentia
          </p>
        </div>

        <div className="px-7 pb-7 pt-5">
          <h2
            id="mobile-zoom-notice-title"
            className="text-xl font-bold text-slate-900"
          >
            {t("mobile.notice.title")}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            {t("mobile.notice.body.pre")}
            <span className="font-semibold text-slate-800">
              {t("mobile.notice.body.zoom")}
            </span>
            {t("mobile.notice.body.mid")}
            <span className="font-semibold text-slate-800">
              {t("mobile.notice.body.pct")}
            </span>
            {t("mobile.notice.body.post")}
          </p>

          <div className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-slate-50 px-4 py-3 text-xs font-medium text-slate-500 ring-1 ring-slate-200/70">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4 shrink-0 text-[#e25a4e]"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
              <line x1="8" y1="11" x2="14" y2="11" />
            </svg>
            {t("mobile.notice.hint")}
          </div>

          <button
            type="button"
            onClick={dismiss}
            className="mt-5 w-full rounded-xl bg-[#e25a4e] py-3 text-sm font-semibold text-white shadow-lg shadow-[#e25a4e]/30 transition-colors hover:bg-[#c94437] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#e25a4e] focus-visible:ring-offset-2"
          >
            {t("mobile.notice.button")}
          </button>
          <p className="mt-3 text-[11px] text-slate-400">
            {t("mobile.notice.footer")}
          </p>
        </div>
      </div>
    </div>
  );
};

export default MobileZoomNotice;

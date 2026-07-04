"use client";

/**
 * Encabezado y contenedor común de las páginas del dashboard (Suite Escriba).
 * Replica el aire del panel de Presentaciones: título grande sticky, subtítulo
 * y padding consistente para que ninguna página quede pegada al sidebar.
 */

import React from "react";

type PageShellProps = {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
};

const PageShell = ({ title, subtitle, actions, children }: PageShellProps) => (
  <div className="min-h-screen w-full px-3 pb-10 sm:px-6 relative">
    <div className="sticky top-0 z-40 py-[28px] backdrop-blur mb-2">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-[28px] tracking-[-0.84px] font-syne font-normal text-[#101828]">
          {title}
        </h1>
        {actions}
      </div>
    </div>
    {subtitle && (
      <p className="mb-7 max-w-[75ch] text-sm text-[#70707b]">{subtitle}</p>
    )}
    {children}
  </div>
);

export default PageShell;

"use client";

import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import React, { } from 'react'
import { defaultNavItems } from './DashboardSidebar';
import { usePathname } from 'next/navigation';
import { useI18n } from "@/lib/i18n";

// Mapeo de la pestaña activa (último segmento de la ruta) a las claves nav.* ya existentes.
const NAV_TITLE_KEYS: Record<string, string> = {
    dashboard: "nav.dashboard",
    templates: "nav.templates",
    theme: "nav.themes",
    markdown: "nav.markdown",
    models: "nav.models",
    costs: "nav.costs",
    settings: "nav.settings",
};

const DashboardNav = () => {
    const { t } = useI18n();
    const pathname = usePathname();
    const activeTab = pathname.split("?")[0].split("/").pop();
    const activeItem = defaultNavItems.find((i: any) => i.key === activeTab);
    const titleKey = activeTab ? NAV_TITLE_KEYS[activeTab] : undefined;

    return (
        <div className="sticky top-0 right-0 z-50 py-[28px]   backdrop-blur ">
            <div className="flex xl:flex-row flex-col gap-6 xl:gap-0 items-center justify-between">
                <h3 className=" text-[28px] tracking-[-0.84px] font-unbounded font-normal text-[#101828] flex items-center gap-2">

                    {titleKey ? t(titleKey) : activeItem?.label ?? (activeTab && activeTab?.charAt(0).toUpperCase() + activeTab?.slice(1))}
                </h3>
                <div className="flex  gap-2.5 max-sm:w-full max-md:justify-center max-sm:flex-wrap">



                    {activeTab !== "playground" && activeTab !== "theme" && <Link
                        href="/generate"
                        className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-black text-sm font-medium shadow-sm hover:shadow-md"
                        aria-label={t("dash.newPresentation")}
                        style={{
                            borderRadius: "48px",
                            background: "linear-gradient(270deg, #F5D9C2 2.4%, #F7E4D3 27.88%, #F4DCD3 69.23%, #FDE4C2 100%)",
                        }}
                    >

                        <span className="hidden md:inline">{t("dash.newPresentation")}</span>
                        <span className="md:hidden">{t("dash.new")}</span>
                        <ChevronRight className="w-4 h-4" />
                    </Link>}
                    {activeTab === "theme" &&
                        <Link
                            href="/theme?tab=new-theme"
                            className="inline-flex items-center font-inter font-normal gap-2 rounded-xl px-4 py-2.5 text-black text-sm  shadow-sm hover:shadow-md"
                            aria-label={t("dash.newThemes")}
                            style={{
                                borderRadius: "48px",
                                background: "linear-gradient(270deg, #F5D9C2 2.4%, #F7E4D3 27.88%, #F4DCD3 69.23%, #FDE4C2 100%)",
                            }}
                        >
                            <span className="hidden md:inline">{t("dash.newThemes")}</span>
                            <span className="md:hidden">{t("dash.new")}</span>
                            <ChevronRight className="w-4 h-4" />
                        </Link>
                    }
                </div>
            </div>
        </div>
    )
}

export default DashboardNav

"use client";

import React from "react";
import { LayoutDashboard, Star, Brain, Settings, Palette, Coins, FileText, Cpu, FolderOpen } from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import AboutPresentia from "@/components/AboutPresentia";
import HelpPresentia from "@/components/HelpPresentia";
import LanguageSelector from "@/components/LanguageSelector";
import { useI18n } from "@/lib/i18n";



export const defaultNavItems = [
    { key: "dashboard" as const, label: "Dashboard", icon: LayoutDashboard },
    { key: "templates" as const, label: "Standard", icon: Star },
    { key: "designs" as const, label: "Smart", icon: Brain },
    { key: "costs" as const, label: "Costos", icon: Coins },
    { key: "markdown" as const, label: "Markdown", icon: FileText },
    { key: "models" as const, label: "Modelos", icon: Cpu },



];
export const BelongingNavItems = [
    { key: "settings" as const, labelKey: "nav.settings", icon: Settings },
]

const DashboardSidebar = () => {
    const { t } = useI18n();


    const pathname = usePathname();
    const activeTab = pathname.split("?")[0].split("/").pop();





    return (
        <aside
            className="sticky top-0 h-screen w-[115px] flex flex-col justify-between bg-[#F6F6F9] backdrop-blur border-r border-[#E1E1E5] px-4  py-8"
            aria-label="Dashboard sidebar"
        >
            <div>

                <Link href={`/dashboard`} className="flex items-center  pb-6 border-b border-[#E1E1E5]   gap-2    ">
                    <div className="cursor-pointer flex justify-center items-center mx-auto">
                        <img src="/presentia-logo.svg" alt="Presentia logo" className="h-[40px] w-[40px] object-contain rounded-[10px]" />
                    </div>
                </Link>
                <nav className="pt-6 font-syne" aria-label="Dashboard sections">
                    <div className="  space-y-6">

                        {/* Dashboard */}
                        <Link
                            prefetch={false}
                            href={`/dashboard`}
                            className={[
                                "flex flex-col tex-center items-center gap-2  transition-colors",
                                pathname === "/dashboard" ? "" : "ring-transparent",
                            ].join(" ")}
                            aria-label="Dashboard"
                            title="Dashboard"
                        >
                            <LayoutDashboard className={["h-4 w-4", pathname === "/dashboard" ? "text-[#e25a4e]" : "text-slate-600"].join(" ")} />
                            <span className="text-[11px] text-slate-800">{t("nav.dashboard")}</span>
                        </Link>
                        <Link
                            prefetch={false}
                            href={`/templates`}
                            className={[
                                "flex flex-col tex-center items-center gap-2  transition-colors",
                                pathname === "/templates" ? "" : "ring-transparent",
                            ].join(" ")}
                            aria-label={t("nav.templates")}
                            title={t("nav.templates")}
                        >
                            <div className="flex flex-col cursor-pointer tex-center items-center gap-2  transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={`${pathname === "/templates" ? "#e25a4e" : "#475569"}`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M4 14h6" /><path d="M4 2h10" /><rect x="4" y="18" width="16" height="4" rx="1" /><rect x="4" y="6" width="16" height="4" rx="1" /></svg>
                                <span className="text-[11px] text-slate-800">{t("nav.templates")}</span>
                            </div>
                        </Link>
                        <Link
                            prefetch={false}
                            href={`/theme`}
                            className={[
                                "flex flex-col tex-center items-center gap-2  transition-colors",
                                pathname === "/theme" ? "" : "ring-transparent",
                            ].join(" ")}
                            aria-label={t("nav.themes")}
                            title={t("nav.themes")}
                        >
                            <div className="flex flex-col cursor-pointer tex-center items-center gap-2  transition-colors">
                                <Palette className={`h-4 w-4 ${pathname === "/theme" ? "text-[#e25a4e]" : "text-slate-600"}`} />
                                <span className="text-[11px] text-slate-800">{t("nav.themes")}</span>
                            </div>
                        </Link>
                        <Link
                            prefetch={false}
                            href={`/markdown`}
                            className={[
                                "flex flex-col tex-center items-center gap-2  transition-colors",
                                pathname === "/markdown" ? "" : "ring-transparent",
                            ].join(" ")}
                            aria-label="Markdown"
                            title="Markdown"
                        >
                            <div className="flex flex-col cursor-pointer tex-center items-center gap-2  transition-colors">
                                <FileText className={`h-4 w-4 ${pathname === "/markdown" ? "text-[#e25a4e]" : "text-slate-600"}`} />
                                <span className="text-[11px] text-slate-800">{t("nav.markdown")}</span>
                            </div>
                        </Link>
                        <Link
                            prefetch={false}
                            href={`/models`}
                            className={[
                                "flex flex-col tex-center items-center gap-2  transition-colors",
                                pathname === "/models" ? "" : "ring-transparent",
                            ].join(" ")}
                            aria-label="Modelos"
                            title="Modelos"
                        >
                            <div className="flex flex-col cursor-pointer tex-center items-center gap-2  transition-colors">
                                <Cpu className={`h-4 w-4 ${pathname === "/models" ? "text-[#e25a4e]" : "text-slate-600"}`} />
                                <span className="text-[11px] text-slate-800">{t("nav.models")}</span>
                            </div>
                        </Link>
                        <Link
                            prefetch={false}
                            href={`/library`}
                            className={[
                                "flex flex-col tex-center items-center gap-2  transition-colors",
                                pathname === "/library" ? "" : "ring-transparent",
                            ].join(" ")}
                            aria-label={t("nav.library")}
                            title={t("nav.library")}
                        >
                            <div className="flex flex-col cursor-pointer tex-center items-center gap-2  transition-colors">
                                <FolderOpen className={`h-4 w-4 ${pathname === "/library" ? "text-[#e25a4e]" : "text-slate-600"}`} />
                                <span className="text-[11px] text-slate-800">{t("nav.library")}</span>
                            </div>
                        </Link>
                        <Link
                            prefetch={false}
                            href={`/costs`}
                            className={[
                                "flex flex-col tex-center items-center gap-2  transition-colors",
                                pathname === "/costs" ? "" : "ring-transparent",
                            ].join(" ")}
                            aria-label="Costos"
                            title="Costos"
                        >
                            <div className="flex flex-col cursor-pointer tex-center items-center gap-2  transition-colors">
                                <Coins className={`h-4 w-4 ${pathname === "/costs" ? "text-[#e25a4e]" : "text-slate-600"}`} />
                                <span className="text-[11px] text-slate-800">{t("nav.costs")}</span>
                            </div>
                        </Link>
                    </div>
                </nav>
            </div>

            <div className=" pt-5 border-t border-[#E1E1E5]  font-syne "
            >
                <div className="mb-4 flex justify-center">
                    <HelpPresentia />
                </div>
                <div className="mb-4 flex justify-center">
                    <AboutPresentia />
                </div>
                <div className="mb-4">

                    <Link href="https://getescriba.com" target="_blank" className="flex flex-col tex-center items-center gap-2  transition-colors" aria-label="Escriba" title="Escriba"><img src="/escriba-logo.svg" alt="Escriba" className="w-5 h-5 rounded-[5px]" /><span className="text-[11px] text-slate-800">Escriba</span></Link>
                </div>
                <div className="mb-4">
                    <LanguageSelector compact />
                </div>


                {BelongingNavItems.map(({ key, labelKey, icon: Icon }) => {
                    const isActive = activeTab === key;
                    const itemLabel = t(labelKey);
                    return (
                        <Link
                            prefetch={false}
                            key={key}
                            href={`/${key}`}
                            className={[
                                "flex flex-col tex-center items-center gap-2  transition-colors ",
                                isActive ? "" : "ring-transparent",
                            ].join(" ")}
                            aria-label={itemLabel}
                            title={itemLabel}
                        >
                            {/* <div className="flex items-center  ">
                                <img src={imageProviderIcon} alt="image provider" className="w-5 h-5 rounded-full object-cover border border-[#EDEEEF]" />
                                <img src={textProviderIcon} alt="text provider" className="w-5 h-5 rounded-full object-cover border border-[#EDEEEF]" />
                            </div> */}
                            <Settings className={`h-4 w-4 ${isActive ? "text-[#e25a4e]" : "text-slate-600"}`} />
                            <span className="text-[11px] text-slate-800">{itemLabel}</span>
                        </Link>
                    );
                })}

            </div>

        </aside>
    );
};

export default DashboardSidebar;



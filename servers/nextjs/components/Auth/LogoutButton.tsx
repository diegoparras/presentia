"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";

import { getApiUrl } from "@/utils/api";
import { useI18n } from "@/lib/i18n";

type LogoutButtonProps = {
  label?: string;
  className?: string;
  iconOnly?: boolean;
};

export default function LogoutButton({
  label,
  className = "",
  iconOnly = false,
}: LogoutButtonProps) {
  const { t } = useI18n();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const resolvedLabel = label ?? t("auth.logout");

  const handleLogout = async () => {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    try {
      await fetch(getApiUrl("/api/v1/auth/logout"), {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // Always route back to auth gate even if backend logout fails.
    } finally {
      window.location.replace("/");
      setIsSubmitting(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isSubmitting}
      className={className}
      aria-label={resolvedLabel}
      title={resolvedLabel}
    >
      <LogOut className="h-4 w-4" />
      {!iconOnly ? (
        <span>{isSubmitting ? t("auth.signingOut") : resolvedLabel}</span>
      ) : null}
    </button>
  );
}

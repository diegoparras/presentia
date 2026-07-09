"use client";

import { useState, useCallback } from "react";
import { useDispatch } from "react-redux";
import { usePathname, useRouter } from "next/navigation";
import { notify } from "@/components/ui/sonner";
import {
  clearPresentationData,
  setGenerationLayout,
  setOutlines,
} from "@/store/slices/presentationGeneration";
import { LoadingState, TABS } from "../types/index";
import { TemplateLayoutsWithSettings } from "@/app/presentation-templates/utils";
import { getCustomTemplateDetails } from "@/app/hooks/useCustomTemplates";
import { MixpanelEvent, trackEvent } from "@/utils/mixpanel";
import { useI18n } from "@/lib/i18n";

const DEFAULT_LOADING_STATE: LoadingState = {
  message: "",
  isLoading: false,
  showProgress: false,
  duration: 0,
};

export const usePresentationGeneration = (
  presentationId: string | null,
  outlines: { content: string }[] | null,
  selectedTemplate: TemplateLayoutsWithSettings | string | null,
  setActiveTab: (tab: string) => void
) => {
  const { t } = useI18n();
  const dispatch = useDispatch();
  const router = useRouter();
  const pathname = usePathname();
  const [loadingState, setLoadingState] = useState<LoadingState>(
    DEFAULT_LOADING_STATE
  );

  const validateInputs = useCallback(() => {
    if (!outlines || outlines.length === 0) {
      notify.warning(
        t("up.gen.outlinesNotReady.title"),
        t("up.gen.outlinesNotReady.desc")
      );
      return false;
    }

    if (!selectedTemplate) {
      notify.warning(
        t("up.gen.layoutNotSelected.title"),
        t("up.gen.layoutNotSelected.desc")
      );
      return false;
    }

    return true;
  }, [outlines, selectedTemplate, t]);

  const clearTheme = () => {
    const element = document.getElementById("presentation-page");
    if (!element) return;
    element.style.removeProperty("--primary-color");
    element.style.removeProperty("--background-color");
    element.style.removeProperty("--card-color");
    element.style.removeProperty("--stroke");
    element.style.removeProperty("--primary-text");
    element.style.removeProperty("--background-text");
    element.style.removeProperty("--graph-0");
    element.style.removeProperty("--graph-1");
    element.style.removeProperty("--graph-2");
    element.style.removeProperty("--graph-3");
    element.style.removeProperty("--graph-4");
    element.style.removeProperty("--graph-5");
    element.style.removeProperty("--graph-6");
    element.style.removeProperty("--graph-7");
    element.style.removeProperty("--graph-8");
    element.style.removeProperty("--graph-9");
  };

  const handleSubmit = useCallback(async () => {
    if (!selectedTemplate) {
      setActiveTab(TABS.LAYOUTS);
      return;
    }
    if (!validateInputs()) return;

    const selectedTemplateId =
      typeof selectedTemplate === "string"
        ? selectedTemplate
        : selectedTemplate?.id || null;
    const selectedTemplateType =
      typeof selectedTemplate === "string" ? "custom" : "built_in";
    const selectedTemplateName =
      typeof selectedTemplate === "string"
        ? null
        : selectedTemplate?.name || null;
    const selectedTemplateLayoutCount =
      typeof selectedTemplate === "string"
        ? null
        : selectedTemplate?.layouts?.length || 0;

    trackEvent(MixpanelEvent.Outline_Presentation_Generation_Started, {
      pathname,
      presentation_id: presentationId,
      outline_count: outlines?.length || 0,
      template_id: selectedTemplateId,
      template_type: selectedTemplateType,
      template_name: selectedTemplateName,
      template_layout_count: selectedTemplateLayoutCount,
    });

    try {
      let layout;

      // Check if it's a custom template (string = presentationId)
      if (typeof selectedTemplate === "string") {
        // Spinner mínimo solo mientras se resuelve el custom template; el
        // `prepare` real corre después en /presentation (flujo en vivo Gamma).
        setLoadingState({
          message: t("up.gen.loadingTemplate"),
          isLoading: true,
          showProgress: false,
          duration: 0,
        });

        // Fetch custom template details using the shared function
        const customTemplateDetail = await getCustomTemplateDetails(
          selectedTemplate
        );

        if (
          !customTemplateDetail ||
          customTemplateDetail.layouts.length === 0
        ) {
          notify.error(t("up.gen.templateError.title"), t("up.gen.templateError.desc"));
          setLoadingState(DEFAULT_LOADING_STATE);
          return;
        }

        layout = {
          name: customTemplateDetail.id,
          ordered: false,
          icon_weight: "bold",
          slides: customTemplateDetail.layouts.map((compiledLayout) => ({
            id: customTemplateDetail.id.startsWith("custom-")
              ? `${customTemplateDetail.id}:${compiledLayout.layoutId}`
              : `custom-${customTemplateDetail.id}:${compiledLayout.layoutId}`,
            name: compiledLayout.layoutName,
            description: compiledLayout.layoutDescription,
            templateID: customTemplateDetail.id,
            templateName: customTemplateDetail.name,
            json_schema: compiledLayout.schemaJSON,
          })),
        };
      } else {
        // Built-in template
        layout = {
          name: selectedTemplate.id,
          ordered: false,
          icon_weight: selectedTemplate.settings?.icon_weight || "bold",
          slides: selectedTemplate.layouts.map((layoutItem: any) => ({
            id: layoutItem.layoutId,
            name: layoutItem.layoutName,
            description: layoutItem.layoutDescription,
            templateID: selectedTemplate.id,
            templateName: selectedTemplate.name,
            json_schema: layoutItem.schemaJSON,
          })),
        };
      }

      // Flujo en vivo tipo Gamma: NO bloqueamos con `prepare` acá. Persistimos
      // outlines + layout y navegamos ya a /presentation, que orquesta el
      // prepare y luego el stream con las slides apareciendo en vivo.
      dispatch(setOutlines(outlines || []));
      dispatch(setGenerationLayout(layout));
      dispatch(clearPresentationData());
      clearTheme();

      router.replace(
        `/presentation?id=${presentationId}&generate=true&type=standard`
      );
    } catch (error: any) {
      console.error("Error preparing presentation generation.", error);
      notify.error(
        t("up.gen.error.title"),
        error.message || t("up.gen.error.desc")
      );
      setLoadingState(DEFAULT_LOADING_STATE);
    }
  }, [
    validateInputs,
    presentationId,
    outlines,
    dispatch,
    router,
    selectedTemplate,
    pathname,
    t,
  ]);

  return { loadingState, handleSubmit };
};

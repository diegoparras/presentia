import { useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import { useRouter } from "next/navigation";
import { notify } from "@/components/ui/sonner";
import { useI18n } from "@/lib/i18n";
import { store } from "@/store/store";
import { setOutlines } from "@/store/slices/presentationGeneration";
import { PresentationGenerationApi } from "../../services/api/presentation-generation";
import { DashboardApi } from "../../services/api/dashboard";

/**
 * Orquesta el flujo de generación en vivo tipo Gamma en /presentation.
 *
 * Cuando la página se abre con `?generate=true`, este hook:
 *  1. lee `outlines` + `generationLayout` (persistidos en Redux desde /outline),
 *  2. ejecuta el `prepare` (que en el backend genera la estructura), y
 *  3. al terminar promueve la URL a `?stream=true` para que el hook de
 *     streaming existente abra el SSE y las slides aparezcan en vivo.
 *
 * No toca la lógica de streaming; su única responsabilidad es preparar y
 * promover. Un `useRef` garantiza que corra una sola vez (StrictMode/re-render).
 */
export const usePresentationPrepare = (
  presentationId: string,
  generate: string | null,
  setError: (error: boolean) => void
) => {
  const dispatch = useDispatch();
  const router = useRouter();
  const { t } = useI18n();
  const startedRef = useRef(false);

  useEffect(() => {
    if (generate !== "true" || !presentationId) return;
    if (startedRef.current) return;
    startedRef.current = true;

    const goToStream = () => {
      router.replace(
        `/presentation?id=${presentationId}&stream=true&type=standard`
      );
    };

    const run = async () => {
      const state = store.getState().presentationGeneration;
      let outlines = state.outlines;
      const layout = state.generationLayout;

      // Fallback (p. ej. recarga con Redux vacío): recuperar outlines del backend.
      if ((!outlines || outlines.length === 0) && presentationId) {
        try {
          const res = await PresentationGenerationApi.getOutlines(
            presentationId
          );
          outlines = Array.isArray(res?.slides)
            ? res.slides.map((slide) => ({
                content:
                  typeof slide?.content === "string" ? slide.content : "",
              }))
            : [];
          if (outlines.length > 0) {
            dispatch(setOutlines(outlines));
          }
        } catch {
          // Ignorado: se maneja abajo si sigue sin outlines/layout.
        }
      }

      // Sin layout no podemos preparar (era estado local de /outline, se pierde
      // al recargar sin redux-persist).
      if (!layout || !outlines || outlines.length === 0) {
        // Si la presentación ya fue generada, mostrarla en vez de re-generar.
        try {
          const existing = await DashboardApi.getPresentation(presentationId);
          if (existing?.slides?.length) {
            router.replace(`/presentation?id=${presentationId}`);
            return;
          }
        } catch {
          // Sigue al fallback de volver al outline.
        }

        notify.warning(
          t("ed.page.prepareFail"),
          t("ed.page.backToOutline")
        );
        router.replace(`/outline?id=${presentationId}`);
        return;
      }

      try {
        await PresentationGenerationApi.presentationPrepare({
          presentation_id: presentationId,
          outlines,
          layout,
        });
        goToStream();
      } catch (error: any) {
        console.error("Error preparing presentation (live flow).", error);
        setError(true);
        notify.error(
          t("ed.page.prepareFail"),
          error?.message || t("ed.page.errDesc")
        );
      }
    };

    run();
    // Solo debe dispararse al montar con generate=true; el resto es estable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generate, presentationId]);
};

"use client";

import React from "react";
import { useEditorPanel } from "./EditorPanelContext";
import ElementControls from "./ElementControls";

/**
 * Panel derecho contextual: muestra los controles de Elemento (cajas/imágenes)
 * o de Texto (el toolbar de formato, porteado desde el TiptapText activo), y en
 * su defecto el Asistente IA. Reemplaza a los menús flotantes sobre la slide.
 */
const PropertiesSidebar: React.FC<{ chat: React.ReactNode }> = ({ chat }) => {
  const { element, editor, setTextPanelEl } = useEditorPanel();
  const showProps = !!element || !!editor;

  return (
    <div
      data-editor-ui=""
      // La extensión de Google Translate reescribe nodos de texto y rompe la
      // reconciliación de React (inputs que no dejan tipear) → excluir el panel.
      translate="no"
      className="notranslate relative h-full"
      // El tema aplica font-family sobre #presentation-slides-wrapper (ancestro
      // de este panel). Reafirmamos la tipografía del chrome para no heredarla.
      style={{ fontFamily: "var(--font-inter), ui-sans-serif, system-ui, sans-serif" }}
    >
      {/* Chat siempre montado (preserva su estado), oculto cuando hay panel. */}
      <div className={showProps ? "pointer-events-none absolute inset-0 opacity-0" : "h-full"}>
        {chat}
      </div>

      {showProps && (
        <div className="h-full overflow-hidden rounded-2xl border border-[#EDEEEF] bg-white p-4 shadow-sm">
          {element ? (
            <ElementControls slideIndex={element.slideIndex} path={element.path} />
          ) : (
            // Destino del portal del toolbar de texto (TiptapText portea acá).
            <div ref={setTextPanelEl} className="h-full overflow-y-auto" />
          )}
        </div>
      )}
    </div>
  );
};

export default PropertiesSidebar;

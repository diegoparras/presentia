"use client";

import React, { createContext, useContext, useMemo, useState } from "react";

// Selección de un elemento (caja/imagen) de una slide para editar sus estilos.
export interface ElementSelection {
  slideIndex: number;
  path: string;
}

interface EditorPanelCtx {
  // Elemento (no-texto) seleccionado.
  element: ElementSelection | null;
  setElement: (v: ElementSelection | null) => void;
  // Editor de texto activo (instancia de Tiptap) — para mostrar sus controles.
  editor: any | null;
  setEditor: (v: any | null) => void;
  // Nodo destino donde el editor de texto activo portalea su toolbar.
  textPanelEl: HTMLElement | null;
  setTextPanelEl: (el: HTMLElement | null) => void;
}

const noop = () => {};
const EditorPanelContext = createContext<EditorPanelCtx>({
  element: null,
  setElement: noop,
  editor: null,
  setEditor: noop,
  textPanelEl: null,
  setTextPanelEl: noop,
});

export const useEditorPanel = () => useContext(EditorPanelContext);

export const EditorPanelProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [element, setElement] = useState<ElementSelection | null>(null);
  const [editor, setEditor] = useState<any | null>(null);
  const [textPanelEl, setTextPanelEl] = useState<HTMLElement | null>(null);

  const value = useMemo(
    () => ({ element, setElement, editor, setEditor, textPanelEl, setTextPanelEl }),
    [element, editor, textPanelEl]
  );

  return (
    <EditorPanelContext.Provider value={value}>
      {children}
    </EditorPanelContext.Provider>
  );
};

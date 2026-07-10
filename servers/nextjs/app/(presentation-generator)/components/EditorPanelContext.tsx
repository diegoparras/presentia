"use client";

import React, { useSyncExternalStore } from "react";

// Selección de un elemento (caja/imagen) de una slide para editar sus estilos.
export interface ElementSelection {
  slideIndex: number;
  path: string;
}

interface EditorPanelState {
  // Elemento (no-texto) seleccionado.
  element: ElementSelection | null;
  // Editor de texto activo (instancia de Tiptap) — para mostrar sus controles.
  editor: any | null;
  // Nodo destino donde el editor de texto activo portalea su toolbar.
  textPanelEl: HTMLElement | null;
}

/**
 * IMPORTANTE: el estado vive en un store a nivel de módulo, NO en un React
 * Context. `TiptapTextReplacer` monta cada `TiptapText` en un React root
 * separado (`ReactDOM.createRoot`), fuera del árbol de `PresentationPage`; un
 * Context no cruza roots, así que el toolbar de texto nunca llegaba al panel
 * derecho. Un store compartido sí es visible desde cualquier root.
 */
let state: EditorPanelState = { element: null, editor: null, textPanelEl: null };
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const getSnapshot = () => state;

type Updater<T> = T | ((prev: T) => T);
const resolve = <T,>(v: Updater<T>, prev: T): T =>
  typeof v === "function" ? (v as (p: T) => T)(prev) : v;

const setElement = (v: Updater<ElementSelection | null>) => {
  const next = resolve(v, state.element);
  if (next === state.element) return;
  state = { ...state, element: next };
  emit();
};
const setEditor = (v: Updater<any | null>) => {
  const next = resolve(v, state.editor);
  if (next === state.editor) return;
  state = { ...state, editor: next };
  emit();
};
const setTextPanelEl = (v: Updater<HTMLElement | null>) => {
  const next = resolve(v, state.textPanelEl);
  if (next === state.textPanelEl) return;
  state = { ...state, textPanelEl: next };
  emit();
};

export const useEditorPanel = () => {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return {
    element: snap.element,
    editor: snap.editor,
    textPanelEl: snap.textPanelEl,
    setElement,
    setEditor,
    setTextPanelEl,
  };
};

// Wrapper de compatibilidad: el estado ya no vive acá, pero se mantiene el
// componente para no cambiar el árbol de `PresentationPage`.
export const EditorPanelProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => <>{children}</>;

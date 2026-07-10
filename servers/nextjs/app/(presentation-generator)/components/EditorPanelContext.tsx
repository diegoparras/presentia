"use client";

import React, { useSyncExternalStore } from "react";

// Selección de un elemento (caja/imagen) de una slide para editar sus estilos.
export interface ElementSelection {
  slideIndex: number;
  path: string;
}

interface EditorPanelState {
  // Elementos (no-texto) seleccionados. Normalmente uno; la selección por
  // recuadro (marquee) puede elegir varios de la misma slide.
  elements: ElementSelection[];
  // Editor de texto activo (instancia de Tiptap) — para mostrar sus controles.
  editor: any | null;
  // Nodo destino donde el editor de texto activo portalea su toolbar.
  textPanelEl: HTMLElement | null;
  // Slide cuyo fondo se está editando (panel "Fondo").
  backgroundSlide: number | null;
  // Si el resize por esquinas mantiene la proporción (true = fija).
  aspectLocked: boolean;
}

/**
 * IMPORTANTE: el estado vive en un store a nivel de módulo, NO en un React
 * Context. `TiptapTextReplacer` monta cada `TiptapText` en un React root
 * separado (`ReactDOM.createRoot`), fuera del árbol de `PresentationPage`; un
 * Context no cruza roots, así que el toolbar de texto nunca llegaba al panel
 * derecho. Un store compartido sí es visible desde cualquier root.
 */
let state: EditorPanelState = {
  elements: [],
  editor: null,
  textPanelEl: null,
  backgroundSlide: null,
  aspectLocked: true,
};
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

// API de selección simple (la usan todos los flujos existentes): mapea al
// array de multi-selección.
const setElement = (v: Updater<ElementSelection | null>) => {
  const prev = state.elements[0] ?? null;
  const next = resolve(v, prev);
  if (next === prev && state.elements.length <= 1) return;
  state = { ...state, elements: next ? [next] : [] };
  emit();
};

// Multi-selección (marquee): todos de la misma slide.
const setElements = (v: Updater<ElementSelection[]>) => {
  const next = resolve(v, state.elements);
  if (next === state.elements) return;
  state = { ...state, elements: next };
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
const setBackgroundSlide = (v: Updater<number | null>) => {
  const next = resolve(v, state.backgroundSlide);
  if (next === state.backgroundSlide) return;
  state = { ...state, backgroundSlide: next };
  emit();
};
const setAspectLocked = (v: Updater<boolean>) => {
  const next = resolve(v, state.aspectLocked);
  if (next === state.aspectLocked) return;
  state = { ...state, aspectLocked: next };
  emit();
};

export const useEditorPanel = () => {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return {
    // `element` = selección primaria (compatibilidad con los flujos simples).
    element: snap.elements[0] ?? null,
    elements: snap.elements,
    editor: snap.editor,
    textPanelEl: snap.textPanelEl,
    backgroundSlide: snap.backgroundSlide,
    aspectLocked: snap.aspectLocked,
    setElement,
    setElements,
    setEditor,
    setTextPanelEl,
    setBackgroundSlide,
    setAspectLocked,
  };
};

// Wrapper de compatibilidad: el estado ya no vive acá, pero se mantiene el
// componente para no cambiar el árbol de `PresentationPage`.
export const EditorPanelProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => <>{children}</>;

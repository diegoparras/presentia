/**
 * Identidad de Presentia dentro de la Suite Escriba.
 * Fuente única para nombre, versión y acento del fork; el resto de la UI
 * conserva el diseño del upstream (Presenton) según el precedente de la suite
 * para forks: cambia la identidad, no la experiencia interna.
 */

export const PRESENTIA = {
  name: "Presentia",
  tagline: "Generación de presentaciones para el ecosistema Escriba",
  version: "0.1.0",
  upstreamName: "Presenton",
  upstreamVersion: "0.8.7",
  upstreamUrl: "https://github.com/presenton/presenton",
  license: "Apache 2.0",
  suiteRole: "Satélite — decks desde documentos y datos",
  author: "Diego Parras · Ecosistema Escriba",
  // Acento oficial propuesto para Presentia (ámbar dorado, brand board de la suite)
  accent: "#e25a4e",
  accentHover: "#c9473c",
  accentDark: "#ef8175",
} as const;

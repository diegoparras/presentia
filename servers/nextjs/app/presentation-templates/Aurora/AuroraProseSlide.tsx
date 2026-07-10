import * as z from "zod";

export const slideLayoutId = "aurora-prose";
export const slideLayoutName = "Aurora Text Slide";
export const slideLayoutDescription =
  "Minimalist text slide: title and one or two short paragraphs with plenty of whitespace. Use for context, story or explanation without visuals.";

export const Schema = z.object({
  title: z.string().min(3).max(70).default("Contexto").meta({
    description: "Slide title.",
  }),
  paragraphs: z
    .array(z.string().min(10).max(320))
    .min(1)
    .max(2)
    .default([
      "Los mejores productos no nacen de agregar funciones, sino de eliminar obstáculos. Cada pantalla, cada palabra y cada segundo cuentan.",
      "Por eso empezamos por entender qué sobra, antes de decidir qué falta.",
    ])
    .meta({ description: "One or two short paragraphs." }),
});

export type SchemaType = z.infer<typeof Schema>;

const AuroraProseSlide = ({ data }: { data: Partial<SchemaType> }) => {
  const { title, paragraphs = [] } = data;
  return (
    <div
      className="relative h-[720px] w-[1280px] overflow-hidden"
      style={{
        backgroundColor: "var(--background-color,#fbfbf9)",
        color: "var(--background-text,#17181a)",
        fontFamily: "var(--body-font-family,'Inter',system-ui,sans-serif)",
      }}
    >
      <div className="flex h-full items-center gap-[90px] px-[110px]">
        <div className="w-[380px] shrink-0">
          <div
            className="mb-[26px] h-[3px] w-[56px]"
            style={{ backgroundColor: "var(--primary-color,#0a84ff)" }}
          />
          <h2
            className="text-[54px] font-bold leading-[1.08] tracking-[-0.02em]"
            style={{ fontFamily: "var(--heading-font-family,inherit)" }}
          >
            {title}
          </h2>
        </div>
        <div className="min-w-0 flex-1 space-y-[30px]">
          {paragraphs.map((p, i) => (
            <p key={i} className="text-[24px] leading-[1.65] opacity-70">
              {p}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AuroraProseSlide;

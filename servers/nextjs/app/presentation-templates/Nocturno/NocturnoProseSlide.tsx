import * as z from "zod";

export const slideLayoutId = "nocturno-prose";
export const slideLayoutName = "Nocturno Text Slide";
export const slideLayoutDescription =
  "Dark text slide: title and one or two paragraphs. Use for context or narrative without visuals.";

export const Schema = z.object({
  title: z.string().min(3).max(70).default("El contexto").meta({
    description: "Slide title.",
  }),
  paragraphs: z
    .array(z.string().min(10).max(320))
    .min(1)
    .max(2)
    .default([
      "El mercado se consolidó más rápido de lo previsto: tres jugadores concentran el 70% del volumen y compiten por precio.",
      "Nuestra ventaja no es el precio: es el tiempo de implementación. Ahí es donde vamos a invertir.",
    ])
    .meta({ description: "One or two short paragraphs." }),
});

export type SchemaType = z.infer<typeof Schema>;

const NocturnoProseSlide = ({ data }: { data: Partial<SchemaType> }) => {
  const { title, paragraphs = [] } = data;
  return (
    <div
      className="relative h-[720px] w-[1280px] overflow-hidden"
      style={{
        backgroundColor: "var(--background-color,#0b0e14)",
        color: "var(--background-text,#edf1f8)",
        fontFamily: "var(--body-font-family,'Inter',system-ui,sans-serif)",
      }}
    >
      <div className="flex h-full items-center gap-[90px] px-[110px]">
        <div className="w-[380px] shrink-0">
          <div
            className="mb-[26px] h-[4px] w-[64px]"
            style={{ backgroundColor: "var(--primary-color,#5b8cff)" }}
          />
          <h2
            className="text-[52px] font-bold leading-[1.1] tracking-[-0.015em]"
            style={{ fontFamily: "var(--heading-font-family,inherit)" }}
          >
            {title}
          </h2>
        </div>
        <div
          className="min-w-0 flex-1 space-y-[28px] border-l pl-[60px]"
          style={{ borderColor: "rgba(237,241,248,0.12)" }}
        >
          {paragraphs.map((p, i) => (
            <p key={i} className="text-[23px] leading-[1.65]" style={{ opacity: 0.72 }}>
              {p}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NocturnoProseSlide;

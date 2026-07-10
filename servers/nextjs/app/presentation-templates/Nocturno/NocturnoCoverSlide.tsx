import * as z from "zod";

export const slideLayoutId = "nocturno-cover";
export const slideLayoutName = "Nocturno Cover Slide";
export const slideLayoutDescription =
  "Dark premium cover: glowing accent bar, company/kicker, bold title, subtitle and author/date. Use as the first slide.";

export const Schema = z.object({
  kicker: z.string().min(0).max(50).optional().default("Estrategia 2026").meta({
    description: "Small uppercase kicker: company, division or event.",
  }),
  title: z.string().min(4).max(80).default("El plan para liderar la categoría").meta({
    description: "Bold main title.",
  }),
  subtitle: z.string().min(0).max(140).optional().default("Visión, apuestas y ejecución para los próximos 12 meses.").meta({
    description: "Optional subtitle expanding the title.",
  }),
  author: z.string().min(0).max(60).optional().default("Dirección de Producto").meta({
    description: "Optional author or team.",
  }),
  date: z.string().min(0).max(40).optional().default("Julio 2026").meta({
    description: "Optional date.",
  }),
});

export type SchemaType = z.infer<typeof Schema>;

const NocturnoCoverSlide = ({ data }: { data: Partial<SchemaType> }) => {
  const { kicker, title, subtitle, author, date } = data;
  return (
    <div
      className="relative h-[720px] w-[1280px] overflow-hidden"
      style={{
        backgroundColor: "var(--background-color,#0b0e14)",
        color: "var(--background-text,#edf1f8)",
        fontFamily: "var(--body-font-family,'Inter',system-ui,sans-serif)",
      }}
    >
      {/* halo del acento */}
      <div
        className="absolute -right-[180px] -top-[180px] h-[520px] w-[520px] rounded-full"
        style={{ background: "radial-gradient(closest-side, var(--primary-color,#5b8cff) 0%, transparent 70%)", opacity: 0.16 }}
      />
      <div
        className="absolute left-0 top-0 h-full w-[6px]"
        style={{ backgroundColor: "var(--primary-color,#5b8cff)" }}
      />
      <div className="flex h-full flex-col justify-center px-[110px]">
        {kicker && (
          <p
            className="mb-[26px] text-[16px] font-semibold uppercase tracking-[0.3em]"
            style={{ color: "var(--primary-color,#5b8cff)" }}
          >
            {kicker}
          </p>
        )}
        <h1
          className="max-w-[950px] text-[82px] font-bold leading-[1.05] tracking-[-0.015em]"
          style={{ fontFamily: "var(--heading-font-family,inherit)" }}
        >
          {title}
        </h1>
        {subtitle && (
          <p className="mt-[30px] max-w-[720px] text-[24px] leading-[1.45]" style={{ opacity: 0.6 }}>
            {subtitle}
          </p>
        )}
      </div>
      <div
        className="absolute bottom-[52px] left-[110px] right-[110px] flex items-center justify-between border-t pt-[24px] text-[16px]"
        style={{ borderColor: "rgba(237,241,248,0.15)", opacity: 0.65 }}
      >
        <span>{author}</span>
        <span>{date}</span>
      </div>
    </div>
  );
};

export default NocturnoCoverSlide;

import * as z from "zod";

export const slideLayoutId = "nocturno-section";
export const slideLayoutName = "Nocturno Section Divider Slide";
export const slideLayoutDescription =
  "Dark section divider: accent-outlined giant number and section title. Use between major sections.";

export const Schema = z.object({
  number: z.string().min(1).max(4).default("01").meta({
    description: "Section number as text.",
  }),
  title: z.string().min(3).max(60).default("Dónde estamos").meta({
    description: "Section title.",
  }),
  hint: z.string().min(0).max(120).optional().default("").meta({
    description: "Optional one-line teaser.",
  }),
});

export type SchemaType = z.infer<typeof Schema>;

const NocturnoSectionSlide = ({ data }: { data: Partial<SchemaType> }) => {
  const { number, title, hint } = data;
  return (
    <div
      className="relative h-[720px] w-[1280px] overflow-hidden"
      style={{
        backgroundColor: "var(--background-color,#0b0e14)",
        color: "var(--background-text,#edf1f8)",
        fontFamily: "var(--body-font-family,'Inter',system-ui,sans-serif)",
      }}
    >
      <div
        className="absolute -left-[140px] -bottom-[220px] h-[560px] w-[560px] rounded-full"
        style={{ background: "radial-gradient(closest-side, var(--primary-color,#5b8cff) 0%, transparent 70%)", opacity: 0.14 }}
      />
      <span
        className="absolute right-[70px] top-1/2 -translate-y-1/2 select-none text-[360px] font-bold leading-none"
        style={{
          WebkitTextStroke: "2px var(--primary-color,#5b8cff)",
          color: "transparent",
          opacity: 0.35,
        }}
      >
        {number}
      </span>
      <div className="flex h-full flex-col justify-center px-[110px]">
        <div
          className="mb-[28px] h-[4px] w-[64px]"
          style={{ backgroundColor: "var(--primary-color,#5b8cff)" }}
        />
        <h2
          className="max-w-[760px] text-[76px] font-bold leading-[1.06] tracking-[-0.015em]"
          style={{ fontFamily: "var(--heading-font-family,inherit)" }}
        >
          {title}
        </h2>
        {hint && <p className="mt-[24px] max-w-[600px] text-[23px]" style={{ opacity: 0.55 }}>{hint}</p>}
      </div>
    </div>
  );
};

export default NocturnoSectionSlide;

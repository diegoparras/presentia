import * as z from "zod";

export const slideLayoutId = "aurora-section";
export const slideLayoutName = "Aurora Section Divider Slide";
export const slideLayoutDescription =
  "Minimalist section divider: giant faint section number and the section title. Use between major sections.";

export const Schema = z.object({
  number: z.string().min(1).max(4).default("01").meta({
    description: "Section number as text, e.g. '01', '02'.",
  }),
  title: z.string().min(3).max(60).default("El problema").meta({
    description: "Section title, short.",
  }),
  hint: z.string().min(0).max(120).optional().default("").meta({
    description: "Optional one-line teaser for the section.",
  }),
});

export type SchemaType = z.infer<typeof Schema>;

const AuroraSectionSlide = ({ data }: { data: Partial<SchemaType> }) => {
  const { number, title, hint } = data;
  return (
    <div
      className="relative h-[720px] w-[1280px] overflow-hidden"
      style={{
        backgroundColor: "var(--background-color,#fbfbf9)",
        color: "var(--background-text,#17181a)",
        fontFamily: "var(--body-font-family,'Inter',system-ui,sans-serif)",
      }}
    >
      <span
        className="absolute -top-[70px] right-[40px] select-none text-[420px] font-bold leading-none tracking-[-0.04em]"
        style={{ color: "var(--primary-color,#0a84ff)", opacity: 0.09 }}
      >
        {number}
      </span>
      <div className="flex h-full flex-col justify-center px-[110px]">
        <div
          className="mb-[30px] h-[3px] w-[72px]"
          style={{ backgroundColor: "var(--primary-color,#0a84ff)" }}
        />
        <h2
          className="max-w-[840px] text-[84px] font-bold leading-[1.04] tracking-[-0.02em]"
          style={{ fontFamily: "var(--heading-font-family,inherit)" }}
        >
          {title}
        </h2>
        {hint && <p className="mt-[26px] max-w-[640px] text-[24px] opacity-55">{hint}</p>}
      </div>
    </div>
  );
};

export default AuroraSectionSlide;

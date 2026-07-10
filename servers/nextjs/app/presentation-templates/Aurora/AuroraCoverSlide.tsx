import * as z from "zod";

export const slideLayoutId = "aurora-cover";
export const slideLayoutName = "Aurora Cover Slide";
export const slideLayoutDescription =
  "Minimalist cover: small kicker, one huge statement title, subtitle and author/date footer. Use as the first slide.";

export const Schema = z.object({
  kicker: z.string().min(0).max(40).optional().default("Presentación").meta({
    description: "Small uppercase kicker above the title (brand, event or topic).",
  }),
  title: z.string().min(4).max(70).default("Una idea simple").meta({
    description: "Huge statement title. Short and powerful, max ~8 words.",
  }),
  subtitle: z.string().min(0).max(140).optional().default("Menos ruido, más claridad.").meta({
    description: "Optional one-line subtitle that expands the title.",
  }),
  author: z.string().min(0).max(60).optional().default("Equipo").meta({
    description: "Optional author or team name.",
  }),
  date: z.string().min(0).max(40).optional().default("2026").meta({
    description: "Optional date or edition.",
  }),
});

export type SchemaType = z.infer<typeof Schema>;

const AuroraCoverSlide = ({ data }: { data: Partial<SchemaType> }) => {
  const { kicker, title, subtitle, author, date } = data;
  return (
    <div
      className="relative h-[720px] w-[1280px] overflow-hidden"
      style={{
        backgroundColor: "var(--background-color,#fbfbf9)",
        color: "var(--background-text,#17181a)",
        fontFamily: "var(--body-font-family,'Inter',system-ui,sans-serif)",
      }}
    >
      <div className="flex h-full flex-col justify-center px-[110px]">
        {kicker && (
          <p
            className="mb-[28px] text-[17px] font-semibold uppercase tracking-[0.28em]"
            style={{ color: "var(--primary-color,#0a84ff)" }}
          >
            {kicker}
          </p>
        )}
        <h1
          className="max-w-[1000px] text-[96px] font-bold leading-[1.02] tracking-[-0.02em]"
          style={{ fontFamily: "var(--heading-font-family,inherit)" }}
        >
          {title}
        </h1>
        {subtitle && (
          <p className="mt-[34px] max-w-[760px] text-[27px] leading-[1.4] opacity-60">
            {subtitle}
          </p>
        )}
      </div>
      <div className="absolute bottom-[56px] left-[110px] right-[110px] flex items-center justify-between text-[16px] opacity-45">
        <span>{author}</span>
        <span>{date}</span>
      </div>
      <div
        className="absolute bottom-0 left-[110px] h-[3px] w-[72px]"
        style={{ backgroundColor: "var(--primary-color,#0a84ff)" }}
      />
    </div>
  );
};

export default AuroraCoverSlide;

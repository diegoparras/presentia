import * as z from "zod";

export const slideLayoutId = "institucional-cover";
export const slideLayoutName = "Institutional Cover Slide";
export const slideLayoutDescription =
  "Opening/cover slide with institution or organization name, formal report title, subtitle, author and date. Use as the first slide.";

export const Schema = z.object({
  institution: z.string().min(3).max(60).default("Consejo Profesional").meta({
    description: "Institution, cátedra or organization presenting the report.",
  }),
  title: z.string().min(6).max(90).default("Informe de gestión").meta({
    description: "Main formal title of the presentation.",
  }),
  subtitle: z.string().min(0).max(120).optional().default("Período 2026").meta({
    description: "Optional subtitle: period, scope or subject of the report.",
  }),
  author: z.string().min(0).max(80).optional().default("Autoría del informe").meta({
    description: "Optional author, team or committee name.",
  }),
  date: z.string().min(0).max(40).optional().default("Julio de 2026").meta({
    description: "Optional date in formal Spanish format, e.g. '3 de julio de 2026'.",
  }),
});

export type SchemaType = z.infer<typeof Schema>;

const InstitucionalCoverSlide = ({ data }: { data: Partial<SchemaType> }) => {
  const { institution, title, subtitle, author, date } = data;
  return (
    <div
      className="relative h-[720px] w-[1280px] overflow-hidden"
      style={{
        backgroundColor: "var(--background-color,#f7f6f2)",
        fontFamily: "var(--body-font-family,Georgia,serif)",
        color: "var(--background-text,#1c1c1e)",
      }}
    >
      <div
        className="absolute left-0 top-0 h-full w-[14px]"
        style={{ backgroundColor: "var(--primary-color,#1f3a5f)" }}
      />
      <div className="flex h-full flex-col justify-between px-[96px] py-[72px]">
        <p
          className="text-[20px] uppercase tracking-[0.18em]"
          style={{ color: "var(--primary-color,#1f3a5f)" }}
        >
          {institution}
        </p>
        <div>
          <h1 className="max-w-[980px] text-[64px] font-semibold leading-[1.08]">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-[20px] text-[26px] opacity-80">{subtitle}</p>
          )}
        </div>
        <div
          className="flex items-end justify-between border-t pt-[24px] text-[18px]"
          style={{ borderColor: "var(--primary-color,#1f3a5f)" }}
        >
          <span>{author}</span>
          <span className="opacity-70">{date}</span>
        </div>
      </div>
    </div>
  );
};

export default InstitucionalCoverSlide;

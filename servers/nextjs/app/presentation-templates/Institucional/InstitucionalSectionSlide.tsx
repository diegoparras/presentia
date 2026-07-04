import * as z from "zod";

export const slideLayoutId = "institucional-section";
export const slideLayoutName = "Institutional Section Divider Slide";
export const slideLayoutDescription =
  "Section divider with a large section number and title, used to open each major part of the report.";

export const Schema = z.object({
  sectionNumber: z.string().min(1).max(4).default("01").meta({
    description: "Section number as two digits, e.g. '01'.",
  }),
  title: z.string().min(3).max(70).default("Desarrollo").meta({
    description: "Section title.",
  }),
  summary: z.string().min(0).max(200).optional().default("").meta({
    description: "Optional one-sentence summary of what the section covers.",
  }),
});

export type SchemaType = z.infer<typeof Schema>;

const InstitucionalSectionSlide = ({ data }: { data: Partial<SchemaType> }) => {
  const { sectionNumber, title, summary } = data;
  return (
    <div
      className="relative h-[720px] w-[1280px] overflow-hidden"
      style={{
        backgroundColor: "var(--primary-color,#1f3a5f)",
        fontFamily: "var(--body-font-family,Georgia,serif)",
        color: "var(--primary-text,#ffffff)",
      }}
    >
      <div className="flex h-full flex-col justify-center px-[96px]">
        <span className="text-[120px] font-semibold leading-none opacity-30 tabular-nums">
          {sectionNumber}
        </span>
        <h2 className="mt-[16px] max-w-[900px] text-[56px] font-semibold leading-[1.1]">
          {title}
        </h2>
        {summary && (
          <p className="mt-[24px] max-w-[760px] text-[22px] opacity-80">{summary}</p>
        )}
      </div>
    </div>
  );
};

export default InstitucionalSectionSlide;

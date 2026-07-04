import * as z from "zod";

export const slideLayoutId = "institucional-prose";
export const slideLayoutName = "Institutional Prose Slide";
export const slideLayoutDescription =
  "Title with two columns of formal prose paragraphs for argumentative development, analysis or context. No bullets.";

export const Schema = z.object({
  title: z.string().min(3).max(80).default("Análisis").meta({
    description: "Slide title.",
  }),
  paragraphs: z
    .array(
      z.string().min(60).max(420).meta({
        description: "Formal prose paragraph, complete sentences.",
      })
    )
    .min(1)
    .max(4)
    .default([
      "El presente informe expone los principales hallazgos del período bajo análisis.",
    ])
    .meta({ description: "Prose paragraphs distributed in two columns." }),
});

export type SchemaType = z.infer<typeof Schema>;

const InstitucionalProseSlide = ({ data }: { data: Partial<SchemaType> }) => {
  const { title, paragraphs } = data;
  return (
    <div
      className="relative h-[720px] w-[1280px] overflow-hidden"
      style={{
        backgroundColor: "var(--background-color,#f7f6f2)",
        fontFamily: "var(--body-font-family,Georgia,serif)",
        color: "var(--background-text,#1c1c1e)",
      }}
    >
      <div className="flex h-full flex-col px-[96px] py-[64px]">
        <h2
          className="border-b pb-[18px] text-[40px] font-semibold"
          style={{ borderColor: "var(--primary-color,#1f3a5f)" }}
        >
          {title}
        </h2>
        <div
          className="mt-[32px] text-[21px] leading-[1.65]"
          style={{ columnCount: 2, columnGap: "56px" }}
        >
          {(paragraphs || []).map((paragraph, index) => (
            <p key={index} className="mb-[20px]" style={{ breakInside: "avoid" }}>
              {paragraph}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
};

export default InstitucionalProseSlide;

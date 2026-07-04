import * as z from "zod";

export const slideLayoutId = "institucional-toc";
export const slideLayoutName = "Institutional Table of Contents Slide";
export const slideLayoutDescription =
  "Table of contents / index / agenda slide listing the numbered sections of the report.";

export const Schema = z.object({
  title: z.string().min(3).max(40).default("Índice").meta({
    description: "Heading of the table of contents, usually 'Índice' or 'Contenido'.",
  }),
  items: z
    .array(
      z.object({
        title: z.string().min(3).max(80).meta({
          description: "Section title as it appears in the deck.",
        }),
      })
    )
    .min(3)
    .max(8)
    .default([
      { title: "Introducción" },
      { title: "Desarrollo" },
      { title: "Conclusiones" },
    ])
    .meta({ description: "Ordered list of sections." }),
});

export type SchemaType = z.infer<typeof Schema>;

const InstitucionalTocSlide = ({ data }: { data: Partial<SchemaType> }) => {
  const { title, items } = data;
  return (
    <div
      className="relative h-[720px] w-[1280px] overflow-hidden"
      style={{
        backgroundColor: "var(--background-color,#f7f6f2)",
        fontFamily: "var(--body-font-family,Georgia,serif)",
        color: "var(--background-text,#1c1c1e)",
      }}
    >
      <div className="flex h-full px-[96px] py-[72px]">
        <div className="w-[360px]">
          <h2
            className="text-[44px] font-semibold"
            style={{ color: "var(--primary-color,#1f3a5f)" }}
          >
            {title}
          </h2>
        </div>
        <ol className="flex-1 space-y-[22px] pt-[8px]">
          {(items || []).map((item, index) => (
            <li
              key={index}
              className="flex items-baseline gap-[24px] border-b pb-[16px] text-[26px]"
              style={{ borderColor: "rgba(28,28,30,0.15)" }}
            >
              <span
                className="text-[20px] font-semibold tabular-nums"
                style={{ color: "var(--primary-color,#1f3a5f)" }}
              >
                {String(index + 1).padStart(2, "0")}
              </span>
              <span>{item.title}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
};

export default InstitucionalTocSlide;

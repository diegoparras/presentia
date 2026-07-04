import * as z from "zod";

export const slideLayoutId = "institucional-conclusions";
export const slideLayoutName = "Institutional Conclusions Slide";
export const slideLayoutDescription =
  "Numbered conclusions or recommendations, each with a short title and supporting sentence. Use near the end of the deck.";

export const Schema = z.object({
  title: z.string().min(3).max(60).default("Conclusiones y recomendaciones").meta({
    description: "Slide title.",
  }),
  items: z
    .array(
      z.object({
        heading: z.string().min(4).max(70).meta({
          description: "Short conclusion or recommendation heading.",
        }),
        detail: z.string().min(10).max(220).meta({
          description: "Supporting sentence in formal prose.",
        }),
      })
    )
    .min(2)
    .max(5)
    .default([
      { heading: "Primera conclusión", detail: "Fundamento de la conclusión." },
      { heading: "Segunda conclusión", detail: "Fundamento de la conclusión." },
    ])
    .meta({ description: "Numbered conclusions." }),
});

export type SchemaType = z.infer<typeof Schema>;

const InstitucionalConclusionsSlide = ({ data }: { data: Partial<SchemaType> }) => {
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
      <div className="flex h-full flex-col px-[96px] py-[64px]">
        <h2
          className="border-b pb-[18px] text-[40px] font-semibold"
          style={{ borderColor: "var(--primary-color,#1f3a5f)" }}
        >
          {title}
        </h2>
        <ol className="mt-[32px] space-y-[26px]">
          {(items || []).map((item, index) => (
            <li key={index} className="flex gap-[26px]">
              <span
                className="flex h-[46px] w-[46px] flex-none items-center justify-center text-[20px] font-semibold tabular-nums"
                style={{
                  backgroundColor: "var(--primary-color,#1f3a5f)",
                  color: "var(--primary-text,#ffffff)",
                }}
              >
                {index + 1}
              </span>
              <div>
                <h3 className="text-[24px] font-semibold leading-[1.25]">
                  {item.heading}
                </h3>
                <p className="mt-[6px] text-[19px] leading-[1.5] opacity-85">
                  {item.detail}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
};

export default InstitucionalConclusionsSlide;

import * as z from "zod";

export const slideLayoutId = "institucional-bullets";
export const slideLayoutName = "Institutional Bullets With Context Slide";
export const slideLayoutDescription =
  "Title with bullet points and a side context column for definitions, legal references or observations.";

export const Schema = z.object({
  title: z.string().min(3).max(80).default("Puntos principales").meta({
    description: "Slide title.",
  }),
  bullets: z
    .array(
      z.object({
        text: z.string().min(10).max(220).meta({
          description: "Bullet point in formal prose.",
        }),
      })
    )
    .min(2)
    .max(6)
    .default([{ text: "Primer punto del desarrollo." }, { text: "Segundo punto." }])
    .meta({ description: "Main bullet points." }),
  contextTitle: z.string().min(0).max(50).optional().default("Marco de referencia").meta({
    description: "Optional heading of the side context column.",
  }),
  contextText: z.string().min(0).max(320).optional().default("").meta({
    description: "Optional side note: normative reference, definition or scope remark.",
  }),
});

export type SchemaType = z.infer<typeof Schema>;

const InstitucionalBulletsSlide = ({ data }: { data: Partial<SchemaType> }) => {
  const { title, bullets, contextTitle, contextText } = data;
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
        <div className="mt-[32px] flex flex-1 gap-[56px]">
          <ul className="flex-1 space-y-[22px]">
            {(bullets || []).map((bullet, index) => (
              <li key={index} className="flex gap-[18px] text-[22px] leading-[1.5]">
                <span
                  className="mt-[12px] h-[10px] w-[10px] flex-none"
                  style={{ backgroundColor: "var(--primary-color,#1f3a5f)" }}
                />
                <span>{bullet.text}</span>
              </li>
            ))}
          </ul>
          {contextText && (
            <aside
              className="w-[330px] self-start p-[28px]"
              style={{ backgroundColor: "rgba(31,58,95,0.08)" }}
            >
              <h3
                className="text-[15px] font-semibold uppercase tracking-[0.12em]"
                style={{ color: "var(--primary-color,#1f3a5f)" }}
              >
                {contextTitle}
              </h3>
              <p className="mt-[12px] text-[17px] leading-[1.6]">{contextText}</p>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
};

export default InstitucionalBulletsSlide;

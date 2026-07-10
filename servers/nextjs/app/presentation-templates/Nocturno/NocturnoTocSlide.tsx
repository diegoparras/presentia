import * as z from "zod";

export const slideLayoutId = "nocturno-toc";
export const slideLayoutName = "Nocturno Agenda Slide";
export const slideLayoutDescription =
  "Dark agenda slide: title and numbered sections in elevated panels.";

export const Schema = z.object({
  title: z.string().min(3).max(40).default("Agenda").meta({
    description: "Agenda title.",
  }),
  items: z
    .array(z.string().min(3).max(70))
    .min(3)
    .max(6)
    .default(["Dónde estamos", "Las tres apuestas", "Roadmap", "Inversión", "Riesgos y mitigación"])
    .meta({ description: "Section names, 3 to 6 items." }),
});

export type SchemaType = z.infer<typeof Schema>;

const NocturnoTocSlide = ({ data }: { data: Partial<SchemaType> }) => {
  const { title, items = [] } = data;
  return (
    <div
      className="relative h-[720px] w-[1280px] overflow-hidden"
      style={{
        backgroundColor: "var(--background-color,#0b0e14)",
        color: "var(--background-text,#edf1f8)",
        fontFamily: "var(--body-font-family,'Inter',system-ui,sans-serif)",
      }}
    >
      <div className="flex h-full flex-col px-[110px] py-[84px]">
        <h2
          className="text-[54px] font-bold tracking-[-0.015em]"
          style={{ fontFamily: "var(--heading-font-family,inherit)" }}
        >
          {title}
        </h2>
        <div className="mt-[44px] grid flex-1 grid-cols-2 content-start gap-[20px]">
          {items.map((item, i) => (
            <div
              key={i}
              className="flex items-center gap-[24px] rounded-[14px] px-[28px] py-[24px]"
              style={{ backgroundColor: "rgba(237,241,248,0.05)", border: "1px solid rgba(237,241,248,0.09)" }}
            >
              <span
                className="text-[30px] font-bold tabular-nums"
                style={{ color: "var(--primary-color,#5b8cff)" }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="text-[22px] font-medium leading-[1.3]">{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NocturnoTocSlide;

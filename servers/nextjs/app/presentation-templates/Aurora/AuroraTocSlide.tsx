import * as z from "zod";

export const slideLayoutId = "aurora-toc";
export const slideLayoutName = "Aurora Agenda Slide";
export const slideLayoutDescription =
  "Minimalist agenda / table of contents: title on the left, numbered list of sections on the right with thin separators.";

export const Schema = z.object({
  title: z.string().min(3).max(40).default("Agenda").meta({
    description: "Short title for the agenda slide.",
  }),
  items: z
    .array(z.string().min(3).max(70))
    .min(3)
    .max(6)
    .default(["El problema", "La idea", "Cómo funciona", "Resultados", "Próximos pasos"])
    .meta({ description: "Section names, 3 to 6 short items." }),
});

export type SchemaType = z.infer<typeof Schema>;

const AuroraTocSlide = ({ data }: { data: Partial<SchemaType> }) => {
  const { title, items = [] } = data;
  return (
    <div
      className="relative h-[720px] w-[1280px] overflow-hidden"
      style={{
        backgroundColor: "var(--background-color,#fbfbf9)",
        color: "var(--background-text,#17181a)",
        fontFamily: "var(--body-font-family,'Inter',system-ui,sans-serif)",
      }}
    >
      <div className="flex h-full items-center gap-[90px] px-[110px]">
        <h2
          className="w-[360px] shrink-0 text-[64px] font-bold leading-[1.05] tracking-[-0.02em]"
          style={{ fontFamily: "var(--heading-font-family,inherit)" }}
        >
          {title}
        </h2>
        <ol className="min-w-0 flex-1">
          {items.map((item, i) => (
            <li
              key={i}
              className="flex items-baseline gap-[28px] border-t py-[26px] last:border-b"
              style={{ borderColor: "rgba(23,24,26,0.12)" }}
            >
              <span
                className="w-[46px] shrink-0 text-[20px] font-semibold tabular-nums"
                style={{ color: "var(--primary-color,#0a84ff)" }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="text-[26px] font-medium leading-[1.25]">{item}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
};

export default AuroraTocSlide;

import * as z from "zod";

export const slideLayoutId = "aurora-metrics";
export const slideLayoutName = "Aurora Metrics Slide";
export const slideLayoutDescription =
  "Minimalist metrics slide: title and 2-4 huge numbers with labels. Figures must come from provided data.";

export const Schema = z.object({
  title: z.string().min(3).max(60).default("En números").meta({
    description: "Slide title.",
  }),
  metrics: z
    .array(
      z.object({
        value: z.string().min(1).max(12).meta({ description: "Big figure, e.g. '87%', '3x', '12M'." }),
        label: z.string().min(2).max(60).meta({ description: "What the figure measures." }),
      })
    )
    .min(2)
    .max(4)
    .default([
      { value: "3x", label: "más rápido que el proceso anterior" },
      { value: "87%", label: "de satisfacción en la primera semana" },
      { value: "12", label: "equipos ya lo usan a diario" },
    ])
    .meta({ description: "2 to 4 metrics with value and label." }),
});

export type SchemaType = z.infer<typeof Schema>;

const AuroraMetricsSlide = ({ data }: { data: Partial<SchemaType> }) => {
  const { title, metrics = [] } = data;
  return (
    <div
      className="relative h-[720px] w-[1280px] overflow-hidden"
      style={{
        backgroundColor: "var(--background-color,#fbfbf9)",
        color: "var(--background-text,#17181a)",
        fontFamily: "var(--body-font-family,'Inter',system-ui,sans-serif)",
      }}
    >
      <div className="flex h-full flex-col px-[110px] py-[92px]">
        <h2
          className="text-[56px] font-bold leading-[1.06] tracking-[-0.02em]"
          style={{ fontFamily: "var(--heading-font-family,inherit)" }}
        >
          {title}
        </h2>
        <div
          className="mt-auto grid gap-[64px]"
          style={{ gridTemplateColumns: `repeat(${Math.max(metrics.length, 1)}, minmax(0,1fr))` }}
        >
          {metrics.map((m, i) => (
            <div key={i} className="border-t pt-[28px]" style={{ borderColor: "rgba(23,24,26,0.14)" }}>
              <p
                className="text-[96px] font-bold leading-none tracking-[-0.03em]"
                style={{ color: "var(--primary-color,#0a84ff)" }}
              >
                {m.value}
              </p>
              <p className="mt-[18px] text-[19px] leading-[1.45] opacity-60">{m.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AuroraMetricsSlide;

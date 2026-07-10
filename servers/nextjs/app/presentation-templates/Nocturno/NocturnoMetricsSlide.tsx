import * as z from "zod";

export const slideLayoutId = "nocturno-metrics";
export const slideLayoutName = "Nocturno Metrics Slide";
export const slideLayoutDescription =
  "Dark metrics slide: 2-4 big glowing figures in panels with labels. Figures must come from provided data.";

export const Schema = z.object({
  title: z.string().min(3).max(60).default("Resultados del trimestre").meta({
    description: "Slide title.",
  }),
  metrics: z
    .array(
      z.object({
        value: z.string().min(1).max(12).meta({ description: "Big figure, e.g. '87%', '3x', '$1.2M'." }),
        label: z.string().min(2).max(60).meta({ description: "What the figure measures." }),
      })
    )
    .min(2)
    .max(4)
    .default([
      { value: "+42%", label: "ingresos recurrentes vs. Q anterior" },
      { value: "98.9%", label: "uptime de la plataforma" },
      { value: "-18%", label: "costo de adquisición" },
    ])
    .meta({ description: "2 to 4 metrics with value and label." }),
});

export type SchemaType = z.infer<typeof Schema>;

const NocturnoMetricsSlide = ({ data }: { data: Partial<SchemaType> }) => {
  const { title, metrics = [] } = data;
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
        <div
          className="mt-auto grid gap-[24px]"
          style={{ gridTemplateColumns: `repeat(${Math.max(metrics.length, 1)}, minmax(0,1fr))` }}
        >
          {metrics.map((m, i) => (
            <div
              key={i}
              className="rounded-[16px] px-[30px] py-[36px]"
              style={{ backgroundColor: "rgba(237,241,248,0.05)", border: "1px solid rgba(237,241,248,0.09)" }}
            >
              <p
                className="text-[72px] font-bold leading-none tracking-[-0.02em]"
                style={{ color: "var(--primary-color,#5b8cff)", textShadow: "0 0 40px rgba(91,140,255,0.35)" }}
              >
                {m.value}
              </p>
              <p className="mt-[18px] text-[17px] leading-[1.45]" style={{ opacity: 0.6 }}>
                {m.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NocturnoMetricsSlide;

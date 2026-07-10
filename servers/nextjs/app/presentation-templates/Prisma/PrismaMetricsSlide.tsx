import * as z from "zod";

export const slideLayoutId = "prisma-metrics";
export const slideLayoutName = "Prisma Metrics Slide";
export const slideLayoutDescription =
  "Creative metrics slide: 2-4 big numbers in colorful tilted bubbles. Figures must come from provided data.";

const BUBBLE_COLORS = ["var(--primary-color,#ff5a5f)", "#2ec4b6", "#ffb703", "#7b2cbf"];

export const Schema = z.object({
  title: z.string().min(3).max(60).default("Los números que importan").meta({
    description: "Slide title.",
  }),
  metrics: z
    .array(
      z.object({
        value: z.string().min(1).max(12).meta({ description: "Big figure, e.g. '2M', '87%', '3x'." }),
        label: z.string().min(2).max(60).meta({ description: "What the figure measures." }),
      })
    )
    .min(2)
    .max(4)
    .default([
      { value: "2M", label: "personas alcanzadas en 4 semanas" },
      { value: "38%", label: "de interacción promedio" },
      { value: "5x", label: "más menciones de marca" },
    ])
    .meta({ description: "2 to 4 metrics with value and label." }),
});

export type SchemaType = z.infer<typeof Schema>;

const PrismaMetricsSlide = ({ data }: { data: Partial<SchemaType> }) => {
  const { title, metrics = [] } = data;
  return (
    <div
      className="relative h-[720px] w-[1280px] overflow-hidden"
      style={{
        backgroundColor: "var(--background-color,#fff8f2)",
        color: "var(--background-text,#231f20)",
        fontFamily: "var(--body-font-family,'Inter',system-ui,sans-serif)",
      }}
    >
      <div className="flex h-full flex-col px-[100px] py-[84px]">
        <h2
          className="text-[56px] font-extrabold tracking-[-0.02em]"
          style={{ fontFamily: "var(--heading-font-family,inherit)" }}
        >
          {title}
        </h2>
        <div className="mt-auto flex items-end justify-between gap-[30px]">
          {metrics.map((m, i) => (
            <div key={i} className="flex flex-1 flex-col items-center text-center">
              <div
                className="flex h-[210px] w-[210px] items-center justify-center rounded-full text-white"
                style={{
                  backgroundColor: BUBBLE_COLORS[i % BUBBLE_COLORS.length],
                  transform: `rotate(${(i % 2 ? 1 : -1) * 3}deg) translateY(${i % 2 ? -14 : 0}px)`,
                  boxShadow: "0 18px 44px rgba(35,31,32,0.18)",
                }}
              >
                <span className="text-[58px] font-extrabold tracking-[-0.02em]">{m.value}</span>
              </div>
              <p className="mt-[22px] max-w-[230px] text-[17px] font-medium leading-[1.4] opacity-70">{m.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PrismaMetricsSlide;

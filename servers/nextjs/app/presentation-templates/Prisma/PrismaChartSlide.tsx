import * as z from "zod";
import {
  FlexibleReportChart,
  flexibleChartDataSchema,
} from "../Report/flexibleReportChart";

export const slideLayoutId = "prisma-chart";
export const slideLayoutName = "Prisma Chart Slide";
export const slideLayoutDescription =
  "Creative chart slide: title, a data chart in a rounded card and a one-line takeaway. Chart figures must come from provided data.";

export const Schema = z.object({
  title: z.string().min(3).max(60).default("Cómo creció").meta({
    description: "Slide title.",
  }),
  chartData: flexibleChartDataSchema.default({
    type: "bar",
    data: [
      { name: "Semana 1", value: 120 },
      { name: "Semana 2", value: 260 },
      { name: "Semana 3", value: 540 },
      { name: "Semana 4", value: 990 },
    ],
  }),
  takeaway: z
    .string()
    .min(0)
    .max(160)
    .optional()
    .default("Cada pieza nueva duplicó el alcance de la anterior.")
    .meta({ description: "One-line conclusion under the chart." }),
});

export type SchemaType = z.infer<typeof Schema>;

const PrismaChartSlide = ({ data }: { data: Partial<SchemaType> }) => {
  const { title, chartData, takeaway } = data;
  return (
    <div
      className="relative h-[720px] w-[1280px] overflow-hidden"
      style={{
        backgroundColor: "var(--background-color,#fff8f2)",
        color: "var(--background-text,#231f20)",
        fontFamily: "var(--body-font-family,'Inter',system-ui,sans-serif)",
      }}
    >
      <div className="absolute -right-[80px] -top-[80px] h-[220px] w-[220px] rounded-full" style={{ backgroundColor: "#ffb703", opacity: 0.3 }} />
      <div className="flex h-full flex-col px-[100px] py-[76px]">
        <h2
          className="text-[50px] font-extrabold tracking-[-0.02em]"
          style={{ fontFamily: "var(--heading-font-family,inherit)" }}
        >
          {title}
        </h2>
        <div
          className="mt-[28px] min-h-0 flex-1 rounded-[26px] bg-white p-[28px]"
          style={{ boxShadow: "0 16px 44px rgba(35,31,32,0.12)" }}
        >
          {chartData && (
            <FlexibleReportChart
              chartType={chartData.type as any}
              data={(chartData.data as any[]) || []}
              series={(chartData as any).series || []}
              colorFallback="var(--primary-color,#ff5a5f)"
            />
          )}
        </div>
        {takeaway && (
          <p className="mt-[24px] text-[20px] font-medium opacity-70">
            {takeaway}
          </p>
        )}
      </div>
    </div>
  );
};

export default PrismaChartSlide;

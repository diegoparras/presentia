import * as z from "zod";
import {
  FlexibleReportChart,
  flexibleChartDataSchema,
} from "../Report/flexibleReportChart";

export const slideLayoutId = "aurora-chart";
export const slideLayoutName = "Aurora Chart Slide";
export const slideLayoutDescription =
  "Minimalist chart slide: title, a clean data chart and a one-line takeaway. Chart figures must come from provided data.";

export const Schema = z.object({
  title: z.string().min(3).max(60).default("La tendencia").meta({
    description: "Slide title.",
  }),
  chartData: flexibleChartDataSchema.default({
    type: "line",
    data: [
      { name: "Q1", value: 24 },
      { name: "Q2", value: 38 },
      { name: "Q3", value: 47 },
      { name: "Q4", value: 62 },
    ],
  }),
  takeaway: z
    .string()
    .min(0)
    .max(160)
    .optional()
    .default("El crecimiento se sostiene trimestre a trimestre.")
    .meta({ description: "One-line conclusion under the chart." }),
});

export type SchemaType = z.infer<typeof Schema>;

const AuroraChartSlide = ({ data }: { data: Partial<SchemaType> }) => {
  const { title, chartData, takeaway } = data;
  return (
    <div
      className="relative h-[720px] w-[1280px] overflow-hidden"
      style={{
        backgroundColor: "var(--background-color,#fbfbf9)",
        color: "var(--background-text,#17181a)",
        fontFamily: "var(--body-font-family,'Inter',system-ui,sans-serif)",
      }}
    >
      <div className="flex h-full flex-col px-[110px] py-[80px]">
        <h2
          className="text-[48px] font-bold leading-[1.06] tracking-[-0.02em]"
          style={{ fontFamily: "var(--heading-font-family,inherit)" }}
        >
          {title}
        </h2>
        <div className="mt-[36px] min-h-0 flex-1">
          {chartData && (
            <FlexibleReportChart
              chartType={chartData.type as any}
              data={(chartData.data as any[]) || []}
              series={(chartData as any).series || []}
              colors={(chartData as any).colors}
              colorFallback="var(--primary-color,#0a84ff)"
            />
          )}
        </div>
        {takeaway && (
          <p className="mt-[26px] border-t pt-[20px] text-[20px] opacity-60" style={{ borderColor: "rgba(23,24,26,0.14)" }}>
            {takeaway}
          </p>
        )}
      </div>
    </div>
  );
};

export default AuroraChartSlide;

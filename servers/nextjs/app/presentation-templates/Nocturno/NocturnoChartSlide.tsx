import * as z from "zod";
import {
  FlexibleReportChart,
  flexibleChartDataSchema,
} from "../Report/flexibleReportChart";

export const slideLayoutId = "nocturno-chart";
export const slideLayoutName = "Nocturno Chart Slide";
export const slideLayoutDescription =
  "Dark chart slide: title, a data chart in an elevated panel and a one-line takeaway. Chart figures must come from provided data.";

export const Schema = z.object({
  title: z.string().min(3).max(60).default("Evolución").meta({
    description: "Slide title.",
  }),
  chartData: flexibleChartDataSchema.default({
    type: "bar",
    data: [
      { name: "Q1", value: 1.2 },
      { name: "Q2", value: 1.9 },
      { name: "Q3", value: 2.6 },
      { name: "Q4", value: 3.4 },
    ],
  }),
  takeaway: z
    .string()
    .min(0)
    .max(160)
    .optional()
    .default("Tres trimestres consecutivos por encima del plan.")
    .meta({ description: "One-line conclusion under the chart." }),
});

export type SchemaType = z.infer<typeof Schema>;

const NocturnoChartSlide = ({ data }: { data: Partial<SchemaType> }) => {
  const { title, chartData, takeaway } = data;
  return (
    <div
      className="relative h-[720px] w-[1280px] overflow-hidden"
      style={{
        backgroundColor: "var(--background-color,#0b0e14)",
        color: "var(--background-text,#edf1f8)",
        fontFamily: "var(--body-font-family,'Inter',system-ui,sans-serif)",
      }}
    >
      <div className="flex h-full flex-col px-[110px] py-[76px]">
        <h2
          className="text-[46px] font-bold tracking-[-0.015em]"
          style={{ fontFamily: "var(--heading-font-family,inherit)" }}
        >
          {title}
        </h2>
        <div
          className="mt-[30px] min-h-0 flex-1 rounded-[16px] p-[26px]"
          style={{ backgroundColor: "rgba(237,241,248,0.04)", border: "1px solid rgba(237,241,248,0.09)" }}
        >
          {chartData && (
            <FlexibleReportChart
              chartType={chartData.type as any}
              data={(chartData.data as any[]) || []}
              series={(chartData as any).series || []}
              colors={(chartData as any).colors}
              colorFallback="var(--primary-color,#5b8cff)"
            />
          )}
        </div>
        {takeaway && (
          <p className="mt-[24px] text-[19px]" style={{ opacity: 0.6 }}>
            {takeaway}
          </p>
        )}
      </div>
    </div>
  );
};

export default NocturnoChartSlide;

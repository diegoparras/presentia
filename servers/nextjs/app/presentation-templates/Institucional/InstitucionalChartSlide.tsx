import * as z from "zod";

import {
  FlexibleReportChart,
  flexibleChartDataSchema,
} from "../Report/flexibleReportChart";

export const slideLayoutId = "institucional-chart";
export const slideLayoutName = "Institutional Chart With Analysis Slide";
export const slideLayoutDescription =
  "Title, a data chart (bar, line, pie, etc.) and a short written analysis. Chart figures must come from provided data.";

export const Schema = z.object({
  title: z.string().min(3).max(80).default("Evolución del período").meta({
    description: "Slide title.",
  }),
  chartData: flexibleChartDataSchema
    .default({
      type: "bar",
      data: [
        { name: "Enero", value: 120 },
        { name: "Febrero", value: 180 },
        { name: "Marzo", value: 150 },
      ],
    })
    .meta({ description: "Chart specification and data points." }),
  analysis: z.string().min(0).max(320).optional().default("").meta({
    description: "Short formal reading of what the chart shows.",
  }),
});

export type SchemaType = z.infer<typeof Schema>;

const InstitucionalChartSlide = ({ data }: { data: Partial<SchemaType> }) => {
  const { title, chartData, analysis } = data;
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
        <div className="mt-[28px] flex flex-1 gap-[48px]">
          <div className="h-[420px] flex-1">
            {chartData && (
              <FlexibleReportChart
                chartType={chartData.type as any}
                data={(chartData.data as any[]) || []}
                series={(chartData as any).series || []}
              />
            )}
          </div>
          {analysis && (
            <aside className="w-[330px] self-center">
              <p
                className="border-l-[4px] pl-[22px] text-[19px] leading-[1.6]"
                style={{ borderColor: "var(--primary-color,#1f3a5f)" }}
              >
                {analysis}
              </p>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
};

export default InstitucionalChartSlide;

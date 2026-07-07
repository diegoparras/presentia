"use client"

import React from "react"
import * as z from "zod"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LabelList,
} from "recharts"

const layoutId = "tableorChart"
const layoutName = "Table Or Chart"
const layoutDescription = "Swift: Generic data table with option to render a chart (bar, horizontalBar, line, pie)"

const ChartDatumSchema = z.object({
  label: z.string().min(1).max(12).default("A"),
  value: z.number().min(0).max(1000000).default(60),
})

const TableRowSchema = z.object({
  cells: z
    .array(z.string().min(0).max(200))
    .min(2)
    .max(10)
    .default(["Row 1", "Value", "Value"])
    .meta({ description: "Row cells; count should match columns length" }),
})

const Schema = z
  .object({
    title: z.string().min(6).max(60).default("Data Table or Chart"),
    description: z
      .string()
      .min(20)
      .max(220)
      .default(
        "Present structured information in a flexible table or visualize it with a chart."
      ),

    mode: z.enum(["table", "chart"]).default("table"),

    // Table configuration (generic)
    columns: z
      .array(z.string().min(1).max(40))
      .min(2)
      .max(10)
      .default(["Column 1", "Column 2", "Column 3"]),
    rows: z
      .array(TableRowSchema)
      .min(1)
      .max(30)
      .default([
        { cells: ["Row A", "✓", "-"] },
        { cells: ["Row B", "Text", "123"] },
        { cells: ["Row C", "More text", "456"] },
      ]),

    // Chart configuration (parity with @standard ChartLeftTextRightLayout)
    chart: z
      .object({
        type: z.enum(["bar", "horizontalBar", "line", "pie"]).default("line"),
        data: z.array(ChartDatumSchema).min(3).max(12).default([
          { label: "A", value: 60 },
          { label: "B", value: 42 },
          { label: "C", value: 75 },
          { label: "D", value: 30 },
        ]),

        showLabels: z.boolean().default(true),
      })
      .default({
        type: "line",
        data: [
          { label: "A", value: 60 },
          { label: "B", value: 42 },
          { label: "C", value: 75 },
          { label: "D", value: 30 },
        ],

        showLabels: true,
      }),

    website: z.string().min(6).max(60).default("www.yourwebsite.com"),
  })
  .default({
    title: "Data Table or Chart",
    description:
      "Present structured information in a flexible table or visualize it with a chart.",
    mode: "table",
    columns: ["Column 1", "Column 2", "Column 3"],
    rows: [
      { cells: ["Row A", "✓", "-"] },
      { cells: ["Row B", "Text", "123"] },
      { cells: ["Row C", "More text", "456"] },
    ],
    chart: {
      type: "line",
      data: [
        { label: "A", value: 60 },
        { label: "B", value: 42 },
        { label: "C", value: 75 },
        { label: "D", value: 30 },
      ],

      showLabels: true,
    },
    website: "www.yourwebsite.com",
  })

const CHART_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#e56a5c',
  '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#e56a5c'
];

type SlideData = z.infer<typeof Schema>
type ChartDatum = z.infer<typeof ChartDatumSchema>
type SwiftChartType = z.infer<typeof Schema>["chart"]["type"]

interface SlideLayoutProps {
  data?: Partial<SlideData>
}

const AXIS_TEXT = "var(--background-text, #6B7280)"
const LABEL_TEXT = "var(--background-text, #111827)"
const GRID_COLOR = "#E5E7EB"
const FONT = "var(--heading-font-family, Albert Sans)"

// Theme colors are passed to Recharts as var() strings and painted straight
// into the SVG, so the deck renders without a canvas / headless browser.
const graphVar = (index: number) => {
  const slot = index % 10
  return `var(--graph-${slot}, ${CHART_COLORS[slot % CHART_COLORS.length]})`
}

const SwiftChart: React.FC<{
  type: SwiftChartType
  data: ChartDatum[]
  showLabels: boolean
}> = ({ type, data, showLabels }) => {
  const rows = data.map((d) => ({ label: d.label, value: d.value }))
  const axisTick = { fill: AXIS_TEXT, fontSize: 12, fontWeight: 600, fontFamily: FONT } as const
  const labelStyle = { fill: LABEL_TEXT, fontSize: 12, fontWeight: 600, fontFamily: FONT } as const
  const legendEl = <Legend wrapperStyle={{ fontFamily: FONT, fontWeight: 600, color: AXIS_TEXT }} />

  if (type === "pie") {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={rows} dataKey="value" nameKey="label" outerRadius="82%" isAnimationActive={false}
               labelLine={false} label={showLabels ? ({ name }: any) => name : undefined}>
            {rows.map((_, i) => <Cell key={i} fill={graphVar(i)} />)}
          </Pie>
          <Tooltip />{legendEl}
        </PieChart>
      </ResponsiveContainer>
    )
  }

  if (type === "line") {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 15, right: 20, bottom: 4, left: 0 }}>
          <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tick={axisTick} tickLine={false} stroke={AXIS_TEXT} />
          <YAxis tick={axisTick} tickLine={false} stroke={AXIS_TEXT} />
          <Tooltip />{legendEl}
          <Line type="monotone" dataKey="value" stroke={graphVar(0)} strokeWidth={3} dot={{ r: 3 }} isAnimationActive={false}>
            {showLabels && <LabelList dataKey="value" position="top" style={labelStyle} />}
          </Line>
        </LineChart>
      </ResponsiveContainer>
    )
  }

  const horizontal = type === "horizontalBar"
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={rows} layout={horizontal ? "vertical" : "horizontal"} margin={{ top: 10, right: 20, bottom: 4, left: horizontal ? 20 : 0 }}>
        <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 3" vertical={horizontal} horizontal={!horizontal} />
        <XAxis {...(horizontal ? { type: "number" as const } : { dataKey: "label" })} tick={axisTick} tickLine={false} stroke={AXIS_TEXT} />
        <YAxis {...(horizontal ? { type: "category" as const, dataKey: "label", width: 80 } : {})} tick={axisTick} tickLine={false} stroke={AXIS_TEXT} />
        <Tooltip />{legendEl}
        <Bar dataKey="value" radius={horizontal ? [0, 6, 6, 0] : [6, 6, 0, 0]} maxBarSize={48} isAnimationActive={false}>
          {rows.map((_, i) => <Cell key={i} fill={graphVar(i)} />)}
          {showLabels && <LabelList dataKey="value" position={horizontal ? "right" : "top"} style={labelStyle} />}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

const TableOrChart: React.FC<SlideLayoutProps> = ({ data: slideData }) => {
  const mode = slideData?.mode || "table"
  const columns = slideData?.columns || []
  const rows = slideData?.rows || []

  const cData = slideData?.chart?.data || []
  const type = slideData?.chart?.type || "bar"

  const showLabels = slideData?.chart?.showLabels !== false

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Albert+Sans:wght@400;500;600;700&display=swap"
        rel="stylesheet"
      />

      <div
        className=" w-full rounded-sm max-w-[1280px] shadow-lg max-h-[720px] aspect-video relative z-20 mx-auto overflow-hidden"
        style={{
          fontFamily: "var(--heading-font-family,Albert Sans)",
          backgroundColor: "var(--background-color, #FFFFFF)",
        }}
      >
        {/* Header */}
        <div className="px-12 pt-6 pb-2">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rotate-45" style={{ backgroundColor: "var(--background-text, #111827)" }}></div>
            <div className="flex items-center gap-1">

              {(slideData as any)?._logo_url__ && <img src={(slideData as any)?._logo_url__} alt="logo" className="w-6 h-6" />}
              {(slideData as any)?.__companyName__ && <span className="text-[16px]" style={{ color: "var(--background-text, #6B7280)" }}>{(slideData as any)?.__companyName__}</span>}
            </div>
          </div>
        </div>

        {/* Title and description */}
        <div className="px-12 pt-3">
          <h1 className="text-[48px] leading-[1.1] font-semibold" style={{ color: "var(--background-text, #111827)" }}>{slideData?.title}</h1>
          <p className="mt-3 text-[16px] max-w-[900px]" style={{ color: "var(--background-text, #6B7280)" }}>{slideData?.description}</p>
        </div>

        {/* Content area: Table or Chart */}
        <div className="px-12 pt-6">
          {mode === "table" ? (
            <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--primary-color, #BFF4FF)' }}>
              <div className="overflow-x-auto rounded-lg bg-white ring-1" style={{ borderColor: 'var(--stroke, #E5E7EB)' }}>
                <table className="w-full border-separate border-spacing-0">
                  <thead className="w-full">
                    <tr>
                      {columns.map((col, idx) => (
                        <th
                          key={idx}
                          className="text-left  w-full text-[14px] font-semibold px-4 py-3 border-b first:rounded-tl-md last:rounded-tr-md"
                          style={{
                            color: 'var(--primary-text, #111827)',
                            borderColor: 'var(--stroke, #E5E7EB)',
                            backgroundColor: 'var(--primary-color, #BFF4FF)'
                          }}
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, rIdx) => (
                      <tr key={rIdx} className="align-top">
                        {columns.map((_, cIdx) => (
                          <td
                            key={cIdx}
                            className={`text-[14px] px-4 py-3 border-t ${rIdx === rows.length - 1 ? 'first:rounded-bl-md last:rounded-br-md' : ''}`}
                            style={{
                              color: 'var(--primary-text, #6B7280)',
                              borderColor: 'rgba(0,0,0,0.08)',
                              backgroundColor: rIdx % 2 === 0 ? 'var(--primary-color, #BFF4FF)' : 'var(--card-color, #F3F4F6)'
                            }}
                          >
                            {row.cells[cIdx] || ''}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="w-full h-[360px] rounded-xl p-4" >
              <SwiftChart type={type} data={cData} showLabels={showLabels} />
            </div>
          )}
        </div>

        {/* Footer (standardized like IntroSlideLayout) */}
        <div className="absolute bottom-8 left-12 right-12 flex items-center">
          <span className="text-[14px]" style={{ color: "var(--background-text, #6B7280)" }}>{slideData?.website}</span>
          <div className="ml-6 h-[2px] flex-1" style={{ backgroundColor: "var(--background-text, #111827)" }}></div>
        </div>
        <div className="absolute bottom-7 right-6 w-8 h-8 rotate-45" style={{ backgroundColor: "var(--background-text, #111827)" }}></div>
      </div>
    </>
  )
}

export { Schema, layoutId, layoutName, layoutDescription }
export default TableOrChart

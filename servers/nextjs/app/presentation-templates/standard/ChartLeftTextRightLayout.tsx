"use client"

import React from 'react'
import * as z from 'zod'
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

const layoutId = 'chart-left-text-right-layout'
const layoutName = 'Chart Left Text Right'
const layoutDescription = 'A slide with header label, a left-side inline bar chart, and right-side title with paragraph.'

const ChartDatumSchema = z.object({
  label: z.string().min(1).max(12).default('A').meta({ description: 'Category label' }),
  value: z.number().min(0).max(100).default(60).meta({ description: 'Value 0–100' }),
})

const Schema = z.object({

  title: z
    .string()
    .min(16)
    .max(64)
    .default('Insights At A Glance')
    .meta({ description: 'Main heading (max ~7 words)' }),
  paragraph: z
    .string()
    .min(50)
    .max(200)
    .default(
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.'
    )
    .meta({ description: 'Supporting description' }),
  chart: z
    .object({
      type: z.enum(['bar', 'horizontalBar', 'line', 'pie']).default('line'),
      data: z.array(ChartDatumSchema).min(3).max(8).default([
        { label: 'A', value: 60 },
        { label: 'B', value: 42 },
        { label: 'C', value: 75 },
        { label: 'D', value: 30 },
      ]),

      showLabels: z.boolean().default(true),
    })
    .default({
      type: 'line',
      data: [
        { label: 'A', value: 60 },
        { label: 'B', value: 42 },
        { label: 'C', value: 75 },
        { label: 'D', value: 30 },
      ],

      showLabels: true,
    }),
})


const CHART_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#e56a5c',
  '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#e56a5c'
];
type SlideData = z.infer<typeof Schema>
type ChartDatum = z.infer<typeof ChartDatumSchema>
type StandardChartType = z.infer<typeof Schema>["chart"]["type"]

interface SlideLayoutProps {
  data?: Partial<SlideData>
}

const AXIS_TEXT = "var(--background-text, #7f8491)"
const LABEL_TEXT = "var(--background-text, #111827)"
const GRID_COLOR = "var(--background-text, #E5E7EB)"
const FONT = "var(--heading-font-family, Playfair Display)"

// Theme colors are passed to Recharts as var() strings and painted straight
// into the SVG, so the deck renders without a canvas / headless browser.
const graphVar = (index: number) => {
  const slot = index % 10
  return `var(--graph-${slot}, ${CHART_COLORS[slot % CHART_COLORS.length]})`
}

const StandardChart: React.FC<{
  type: StandardChartType
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
          <Pie data={rows} dataKey="value" nameKey="label" outerRadius="80%" isAnimationActive={false}
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
        <LineChart data={rows} margin={{ top: 20, right: 20, bottom: 4, left: 0 }}>
          <CartesianGrid stroke={GRID_COLOR} strokeOpacity={0.5} vertical={false} />
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
      <BarChart data={rows} layout={horizontal ? "vertical" : "horizontal"} margin={{ top: 15, right: 20, bottom: 4, left: horizontal ? 20 : 0 }}>
        <CartesianGrid stroke={GRID_COLOR} strokeOpacity={0.5} vertical={horizontal} horizontal={!horizontal} />
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

const dynamicSlideLayout: React.FC<SlideLayoutProps> = ({ data: slideData }) => {
  const data = slideData?.chart?.data || []
  const type = slideData?.chart?.type || 'bar'

  const showLabels = slideData?.chart?.showLabels !== false

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&display=swap"
        rel="stylesheet"
      />
      <div
        className=" w-full rounded-sm max-w-[1280px] shadow-lg max-h-[720px] aspect-video relative z-20 mx-auto overflow-hidden"
        style={{ fontFamily: "var(--heading-font-family,Playfair Display)", backgroundColor: 'var(--background-color, #FFFFFF)' }}
      >
        <div className="w-full flex items-center justify-between px-10 pt-6">
          {((slideData as any)?.__companyName__ || (slideData as any)?._logo_url__) && <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">

              {(slideData as any)?._logo_url__ && <img src={(slideData as any)?._logo_url__} alt="logo" className="w-6 h-6" />}
              {(slideData as any)?.__companyName__ && <span className="text-[18px]  font-semibold" style={{ color: 'var(--background-text, #111827)' }}>{(slideData as any)?.__companyName__ || "Pitchdeck"}</span>}
            </div>
            <svg className="w-[220px] h-[2px]" viewBox="0 0 220 2" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="220" height="2" style={{ fill: 'var(--background-text, #111827)' }}></rect>
            </svg>
          </div>}
        </div>

        <div className="grid grid-cols-2 h-[calc(100%-64px)]">
          {/* Left: Chart visualization */}
          <div className="h-full px-10 pt-8">
            <div className="w-full h-full flex items-center">
              <div className="w-full" style={{ height: 320 }}>
                <StandardChart type={type} data={data} showLabels={showLabels} />
              </div>
            </div>
          </div>

          {/* Right: Text */}
          <div className="h-full px-12 flex flex-col justify-center">
            <h1 className="text-[64px] leading-[1.05] tracking-tight font-semibold" style={{ color: 'var(--background-text, #111827)' }}>
              {slideData?.title || 'Insights At A Glance'}
            </h1>
            <p className="mt-6 text-[16px] leading-[28px]" style={{ color: 'var(--background-text, #6B7280)' }}>
              {slideData?.paragraph ||
                'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.'}
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

export { Schema, layoutId, layoutName, layoutDescription }
export default dynamicSlideLayout

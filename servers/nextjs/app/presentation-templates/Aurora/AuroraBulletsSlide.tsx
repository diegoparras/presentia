import * as z from "zod";
import { IconSchema } from "../defaultSchemes";
import { RemoteSvgIcon } from "@/app/hooks/useRemoteSvgIcon";

export const slideLayoutId = "aurora-bullets";
export const slideLayoutName = "Aurora Points With Icons Slide";
export const slideLayoutDescription =
  "Minimalist content slide: title and 2-4 key points in a row, each with a thin icon, short heading and one-line description.";

const DEFAULT_ICON = "/static/icons/regular/star.svg";

export const Schema = z.object({
  title: z.string().min(3).max(60).default("Lo esencial").meta({
    description: "Slide title.",
  }),
  points: z
    .array(
      z.object({
        icon: IconSchema.optional().meta({ description: "Icon for the point." }),
        heading: z.string().min(2).max(40).meta({ description: "Short point heading." }),
        text: z.string().min(0).max(140).meta({ description: "One or two line description." }),
      })
    )
    .min(2)
    .max(4)
    .default([
      { icon: { __icon_url__: DEFAULT_ICON, __icon_query__: "target focus goal" }, heading: "Enfoque", text: "Una sola cosa, bien hecha." },
      { icon: { __icon_url__: DEFAULT_ICON, __icon_query__: "lightning speed fast" }, heading: "Velocidad", text: "Del concepto al resultado sin fricción." },
      { icon: { __icon_url__: DEFAULT_ICON, __icon_query__: "shield trust secure" }, heading: "Confianza", text: "Consistencia que se nota en cada detalle." },
    ])
    .meta({ description: "2 to 4 key points with icon, heading and short text." }),
});

export type SchemaType = z.infer<typeof Schema>;

const AuroraBulletsSlide = ({ data }: { data: Partial<SchemaType> }) => {
  const { title, points = [] } = data;
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
        <div className="mt-auto grid gap-[56px]" style={{ gridTemplateColumns: `repeat(${Math.max(points.length, 1)}, minmax(0,1fr))` }}>
          {points.map((p, i) => (
            <div key={i}>
              {p.icon?.__icon_url__ && (
                <span
                  className="mb-[24px] inline-block h-[44px] w-[44px]"
                  style={{ color: "var(--primary-color,#0a84ff)" }}
                >
                  <RemoteSvgIcon url={p.icon.__icon_url__} strokeColor="currentColor" className="h-full w-full" />
                </span>
              )}
              <div
                className="mb-[18px] h-[2px] w-[40px]"
                style={{ backgroundColor: "var(--primary-color,#0a84ff)" }}
              />
              <h3 className="text-[25px] font-semibold">{p.heading}</h3>
              <p className="mt-[10px] text-[18px] leading-[1.5] opacity-60">{p.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AuroraBulletsSlide;

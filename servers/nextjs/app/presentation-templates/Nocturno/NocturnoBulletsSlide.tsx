import * as z from "zod";
import { IconSchema } from "../defaultSchemes";
import { RemoteSvgIcon } from "@/app/hooks/useRemoteSvgIcon";

export const slideLayoutId = "nocturno-bullets";
export const slideLayoutName = "Nocturno Cards With Icons Slide";
export const slideLayoutDescription =
  "Dark content slide: title and 2-4 elevated cards, each with icon, heading and short description.";

const DEFAULT_ICON = "/static/icons/regular/star.svg";

export const Schema = z.object({
  title: z.string().min(3).max(60).default("Las tres apuestas").meta({
    description: "Slide title.",
  }),
  points: z
    .array(
      z.object({
        icon: IconSchema.optional().meta({ description: "Icon for the card." }),
        heading: z.string().min(2).max(40).meta({ description: "Card heading." }),
        text: z.string().min(0).max(150).meta({ description: "Short description." }),
      })
    )
    .min(2)
    .max(4)
    .default([
      { icon: { __icon_url__: DEFAULT_ICON, __icon_query__: "rocket launch growth" }, heading: "Expansión", text: "Nuevos mercados con el mismo producto core." },
      { icon: { __icon_url__: DEFAULT_ICON, __icon_query__: "robot ai automation" }, heading: "Automatización", text: "IA aplicada a los flujos de mayor volumen." },
      { icon: { __icon_url__: DEFAULT_ICON, __icon_query__: "handshake partner deal" }, heading: "Alianzas", text: "Integraciones con los líderes de cada vertical." },
    ])
    .meta({ description: "2 to 4 cards with icon, heading and text." }),
});

export type SchemaType = z.infer<typeof Schema>;

const NocturnoBulletsSlide = ({ data }: { data: Partial<SchemaType> }) => {
  const { title, points = [] } = data;
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
          style={{ gridTemplateColumns: `repeat(${Math.max(points.length, 1)}, minmax(0,1fr))` }}
        >
          {points.map((p, i) => (
            <div
              key={i}
              className="rounded-[16px] p-[30px]"
              style={{ backgroundColor: "rgba(237,241,248,0.05)", border: "1px solid rgba(237,241,248,0.09)" }}
            >
              {p.icon?.__icon_url__ && (
                <span
                  className="mb-[22px] flex h-[52px] w-[52px] items-center justify-center rounded-[12px]"
                  style={{ backgroundColor: "rgba(91,140,255,0.14)", color: "var(--primary-color,#5b8cff)" }}
                >
                  <RemoteSvgIcon url={p.icon.__icon_url__} strokeColor="currentColor" className="h-[28px] w-[28px]" />
                </span>
              )}
              <h3 className="text-[23px] font-semibold">{p.heading}</h3>
              <p className="mt-[10px] text-[17px] leading-[1.5]" style={{ opacity: 0.6 }}>
                {p.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NocturnoBulletsSlide;

import * as z from "zod";
import { IconSchema } from "../defaultSchemes";
import { RemoteSvgIcon } from "@/app/hooks/useRemoteSvgIcon";

export const slideLayoutId = "prisma-bullets";
export const slideLayoutName = "Prisma Cards With Icons Slide";
export const slideLayoutDescription =
  "Creative content slide: title and 2-4 colorful rounded cards, each with icon, heading and short description.";

const DEFAULT_ICON = "/static/icons/regular/star.svg";
const CARD_COLORS = ["var(--primary-color,#ff5a5f)", "#ffb703", "#2ec4b6", "#7b2cbf"];

export const Schema = z.object({
  title: z.string().min(3).max(60).default("Por qué funciona").meta({
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
      { icon: { __icon_url__: DEFAULT_ICON, __icon_query__: "heart love emotion" }, heading: "Emoción", text: "Habla del deseo, no del producto." },
      { icon: { __icon_url__: DEFAULT_ICON, __icon_query__: "share viral network" }, heading: "Compartible", text: "Formatos pensados para reenviar." },
      { icon: { __icon_url__: DEFAULT_ICON, __icon_query__: "repeat consistency loop" }, heading: "Consistencia", text: "La misma idea en cada punto de contacto." },
    ])
    .meta({ description: "2 to 4 cards with icon, heading and text." }),
});

export type SchemaType = z.infer<typeof Schema>;

const PrismaBulletsSlide = ({ data }: { data: Partial<SchemaType> }) => {
  const { title, points = [] } = data;
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
          className="text-[58px] font-extrabold tracking-[-0.02em]"
          style={{ fontFamily: "var(--heading-font-family,inherit)" }}
        >
          {title}
        </h2>
        <div
          className="mt-auto grid gap-[26px]"
          style={{ gridTemplateColumns: `repeat(${Math.max(points.length, 1)}, minmax(0,1fr))` }}
        >
          {points.map((p, i) => (
            <div
              key={i}
              className="rounded-[26px] p-[30px] text-white"
              style={{
                backgroundColor: CARD_COLORS[i % CARD_COLORS.length],
                transform: `rotate(${(i % 2 ? 1 : -1) * 1.2}deg)`,
                boxShadow: "0 16px 40px rgba(35,31,32,0.16)",
              }}
            >
              {p.icon?.__icon_url__ && (
                <span className="mb-[20px] inline-flex h-[52px] w-[52px] items-center justify-center rounded-full bg-white/25">
                  <RemoteSvgIcon url={p.icon.__icon_url__} strokeColor="currentColor" className="h-[28px] w-[28px]" />
                </span>
              )}
              <h3 className="text-[24px] font-extrabold">{p.heading}</h3>
              <p className="mt-[10px] text-[17px] leading-[1.5] opacity-90">{p.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PrismaBulletsSlide;

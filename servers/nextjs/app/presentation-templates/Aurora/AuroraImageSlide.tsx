import * as z from "zod";
import { ImageSchema } from "../defaultSchemes";

export const slideLayoutId = "aurora-image";
export const slideLayoutName = "Aurora Image With Text Slide";
export const slideLayoutDescription =
  "Minimalist split layout: text on the left (title + paragraph), a large full-height image on the right.";

export const Schema = z.object({
  title: z.string().min(3).max(60).default("Hecho para durar").meta({
    description: "Slide title.",
  }),
  body: z
    .string()
    .min(10)
    .max(420)
    .default(
      "Cada decisión de diseño responde a una pregunta simple: ¿esto ayuda o distrae? Lo que queda es lo esencial."
    )
    .meta({ description: "Main paragraph, 2-4 sentences." }),
  image: ImageSchema.default({
    __image_url__:
      "https://images.unsplash.com/photo-1493934558415-9d19f0b2b4d2?auto=format&fit=crop&w=1200&q=80",
    __image_prompt__: "Producto minimalista sobre fondo neutro, luz suave",
  }).meta({ description: "Large supporting image." }),
});

export type SchemaType = z.infer<typeof Schema>;

const AuroraImageSlide = ({ data }: { data: Partial<SchemaType> }) => {
  const { title, body, image } = data;
  return (
    <div
      className="relative flex h-[720px] w-[1280px] overflow-hidden"
      style={{
        backgroundColor: "var(--background-color,#fbfbf9)",
        color: "var(--background-text,#17181a)",
        fontFamily: "var(--body-font-family,'Inter',system-ui,sans-serif)",
      }}
    >
      <div className="flex w-[520px] shrink-0 flex-col justify-center px-[110px] pr-[70px]">
        <div
          className="mb-[26px] h-[3px] w-[56px]"
          style={{ backgroundColor: "var(--primary-color,#0a84ff)" }}
        />
        <h2
          className="text-[52px] font-bold leading-[1.08] tracking-[-0.02em]"
          style={{ fontFamily: "var(--heading-font-family,inherit)" }}
        >
          {title}
        </h2>
        <p className="mt-[26px] text-[20px] leading-[1.6] opacity-65">{body}</p>
      </div>
      <div className="min-w-0 flex-1">
        {image?.__image_url__ && (
          <img
            src={image.__image_url__}
            alt={image.__image_prompt__ || ""}
            className="h-full w-full object-cover"
          />
        )}
      </div>
    </div>
  );
};

export default AuroraImageSlide;

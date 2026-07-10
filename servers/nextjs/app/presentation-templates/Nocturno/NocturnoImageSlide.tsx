import * as z from "zod";
import { ImageSchema } from "../defaultSchemes";

export const slideLayoutId = "nocturno-image";
export const slideLayoutName = "Nocturno Image With Text Slide";
export const slideLayoutDescription =
  "Dark split layout: large framed image on the left, title and paragraph on the right.";

export const Schema = z.object({
  title: z.string().min(3).max(60).default("La plataforma").meta({
    description: "Slide title.",
  }),
  body: z
    .string()
    .min(10)
    .max(420)
    .default(
      "Una sola base para todos los productos: datos unificados, permisos consistentes y despliegues sin fricción."
    )
    .meta({ description: "Main paragraph, 2-4 sentences." }),
  image: ImageSchema.default({
    __image_url__:
      "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=80",
    __image_prompt__: "Sala de servidores con luces azules, estética tecnológica oscura",
  }).meta({ description: "Large supporting image." }),
});

export type SchemaType = z.infer<typeof Schema>;

const NocturnoImageSlide = ({ data }: { data: Partial<SchemaType> }) => {
  const { title, body, image } = data;
  return (
    <div
      className="relative flex h-[720px] w-[1280px] items-center gap-[70px] overflow-hidden px-[90px]"
      style={{
        backgroundColor: "var(--background-color,#0b0e14)",
        color: "var(--background-text,#edf1f8)",
        fontFamily: "var(--body-font-family,'Inter',system-ui,sans-serif)",
      }}
    >
      <div
        className="h-[520px] w-[560px] shrink-0 overflow-hidden rounded-[18px]"
        style={{ border: "1px solid rgba(237,241,248,0.12)", boxShadow: "0 30px 80px rgba(0,0,0,0.5)" }}
      >
        {image?.__image_url__ && (
          <img src={image.__image_url__} alt={image.__image_prompt__ || ""} className="h-full w-full object-cover" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div
          className="mb-[26px] h-[4px] w-[64px]"
          style={{ backgroundColor: "var(--primary-color,#5b8cff)" }}
        />
        <h2
          className="text-[50px] font-bold leading-[1.1] tracking-[-0.015em]"
          style={{ fontFamily: "var(--heading-font-family,inherit)" }}
        >
          {title}
        </h2>
        <p className="mt-[24px] text-[20px] leading-[1.6]" style={{ opacity: 0.65 }}>
          {body}
        </p>
      </div>
    </div>
  );
};

export default NocturnoImageSlide;

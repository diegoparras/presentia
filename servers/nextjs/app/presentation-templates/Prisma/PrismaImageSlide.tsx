import * as z from "zod";
import { ImageSchema } from "../defaultSchemes";

export const slideLayoutId = "prisma-image";
export const slideLayoutName = "Prisma Image With Text Slide";
export const slideLayoutDescription =
  "Creative split layout: rounded tilted image with color frame on the right, title and paragraph on the left.";

export const Schema = z.object({
  title: z.string().min(3).max(60).default("El concepto").meta({
    description: "Slide title.",
  }),
  body: z
    .string()
    .min(10)
    .max(420)
    .default(
      "Tomamos lo cotidiano y lo damos vuelta: la campaña vive en la calle, en stickers, en historias y en la conversación."
    )
    .meta({ description: "Main paragraph, 2-4 sentences." }),
  image: ImageSchema.default({
    __image_url__:
      "https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=1200&q=80",
    __image_prompt__: "Explosión de papelitos de colores sobre fondo claro, energía festiva",
  }).meta({ description: "Large supporting image." }),
});

export type SchemaType = z.infer<typeof Schema>;

const PrismaImageSlide = ({ data }: { data: Partial<SchemaType> }) => {
  const { title, body, image } = data;
  return (
    <div
      className="relative flex h-[720px] w-[1280px] items-center gap-[80px] overflow-hidden px-[100px]"
      style={{
        backgroundColor: "var(--background-color,#fff8f2)",
        color: "var(--background-text,#231f20)",
        fontFamily: "var(--body-font-family,'Inter',system-ui,sans-serif)",
      }}
    >
      <div className="absolute -left-[70px] top-[60px] h-[150px] w-[150px] rounded-full" style={{ backgroundColor: "#2ec4b6", opacity: 0.25 }} />
      <div className="relative z-10 min-w-0 flex-1">
        <div className="mb-[24px] h-[10px] w-[84px] rounded-full" style={{ backgroundColor: "var(--primary-color,#ff5a5f)" }} />
        <h2
          className="text-[56px] font-extrabold leading-[1.06] tracking-[-0.02em]"
          style={{ fontFamily: "var(--heading-font-family,inherit)" }}
        >
          {title}
        </h2>
        <p className="mt-[24px] text-[21px] leading-[1.6] opacity-70">{body}</p>
      </div>
      <div className="relative shrink-0">
        <div
          className="absolute -right-[18px] -top-[18px] h-full w-full rounded-[30px]"
          style={{ backgroundColor: "#ffb703", transform: "rotate(3deg)" }}
        />
        <div className="relative h-[480px] w-[500px] overflow-hidden rounded-[30px]" style={{ transform: "rotate(-1.5deg)" }}>
          {image?.__image_url__ && (
            <img src={image.__image_url__} alt={image.__image_prompt__ || ""} className="h-full w-full object-cover" />
          )}
        </div>
      </div>
    </div>
  );
};

export default PrismaImageSlide;

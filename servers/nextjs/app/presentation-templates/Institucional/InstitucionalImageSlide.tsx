import * as z from "zod";

export const slideLayoutId = "institucional-image";
export const slideLayoutName = "Institutional Image With Text Slide";
export const slideLayoutDescription =
  "Half-page image with title and formal descriptive text on the other half. Use to illustrate a concept, place or process.";

export const Schema = z.object({
  title: z.string().min(3).max(80).default("Contexto").meta({
    description: "Slide title.",
  }),
  body: z.string().min(40).max(480).default("Descripción formal del contenido ilustrado.").meta({
    description: "Formal descriptive prose accompanying the image.",
  }),
  image: z
    .object({
      __image_url__: z
        .string()
        .default(
          "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80"
        ),
      __image_prompt__: z.string().min(10).max(180).default("Fachada de edificio institucional, fotografía sobria"),
    })
    .default({
      __image_url__:
        "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80",
      __image_prompt__: "Fachada de edificio institucional, fotografía sobria",
    })
    .meta({ description: "Illustrative image for the slide." }),
});

export type SchemaType = z.infer<typeof Schema>;

const InstitucionalImageSlide = ({ data }: { data: Partial<SchemaType> }) => {
  const { title, body, image } = data;
  return (
    <div
      className="relative flex h-[720px] w-[1280px] overflow-hidden"
      style={{
        backgroundColor: "var(--background-color,#f7f6f2)",
        fontFamily: "var(--body-font-family,Georgia,serif)",
        color: "var(--background-text,#1c1c1e)",
      }}
    >
      <div className="h-full w-[560px] flex-none">
        <img
          src={image?.__image_url__}
          alt={image?.__image_prompt__}
          className="h-full w-full object-cover"
        />
      </div>
      <div className="flex flex-1 flex-col justify-center px-[72px]">
        <h2
          className="border-b pb-[18px] text-[40px] font-semibold"
          style={{ borderColor: "var(--primary-color,#1f3a5f)" }}
        >
          {title}
        </h2>
        <p className="mt-[26px] text-[21px] leading-[1.65]">{body}</p>
      </div>
    </div>
  );
};

export default InstitucionalImageSlide;

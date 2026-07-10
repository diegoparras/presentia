import * as z from "zod";

export const slideLayoutId = "prisma-closing";
export const slideLayoutName = "Prisma Closing Slide";
export const slideLayoutDescription =
  "Creative closing slide: full-color background, big thank-you and contact. Use as the last slide.";

export const Schema = z.object({
  title: z.string().min(2).max(60).default("¡Gracias!").meta({
    description: "Big closing word or phrase.",
  }),
  message: z.string().min(0).max(160).optional().default("Ahora, a hacerlo realidad.").meta({
    description: "Optional short closing message.",
  }),
  contact: z.string().min(0).max(90).optional().default("hola@ejemplo.com").meta({
    description: "Optional contact.",
  }),
});

export type SchemaType = z.infer<typeof Schema>;

const PrismaClosingSlide = ({ data }: { data: Partial<SchemaType> }) => {
  const { title, message, contact } = data;
  return (
    <div
      className="relative h-[720px] w-[1280px] overflow-hidden"
      style={{
        backgroundColor: "var(--primary-color,#ff5a5f)",
        color: "#ffffff",
        fontFamily: "var(--body-font-family,'Inter',system-ui,sans-serif)",
      }}
    >
      <div className="absolute -left-[90px] -bottom-[90px] h-[280px] w-[280px] rounded-full" style={{ backgroundColor: "#ffb703", opacity: 0.5 }} />
      <div className="absolute -right-[70px] -top-[70px] h-[230px] w-[230px] rounded-full" style={{ backgroundColor: "#2ec4b6", opacity: 0.5 }} />
      <div className="absolute bottom-[110px] right-[150px] h-[64px] w-[64px] rotate-12 rounded-[16px]" style={{ backgroundColor: "#7b2cbf", opacity: 0.6 }} />
      <div className="relative flex h-full flex-col items-center justify-center text-center">
        <h2
          className="text-[110px] font-extrabold leading-none tracking-[-0.02em]"
          style={{ fontFamily: "var(--heading-font-family,inherit)" }}
        >
          {title}
        </h2>
        {message && <p className="mt-[26px] max-w-[620px] text-[26px] opacity-85">{message}</p>}
        {contact && (
          <p className="mt-[50px] rounded-full bg-white px-[36px] py-[15px] text-[19px] font-bold" style={{ color: "var(--primary-color,#ff5a5f)" }}>
            {contact}
          </p>
        )}
      </div>
    </div>
  );
};

export default PrismaClosingSlide;

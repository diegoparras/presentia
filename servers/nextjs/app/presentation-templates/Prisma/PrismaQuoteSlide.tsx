import * as z from "zod";

export const slideLayoutId = "prisma-quote";
export const slideLayoutName = "Prisma Quote Slide";
export const slideLayoutDescription =
  "Creative quote slide: quote inside a big rounded speech card over color shapes, with author below.";

export const Schema = z.object({
  quote: z
    .string()
    .min(10)
    .max(220)
    .default("La gente no comparte anuncios: comparte cosas que la hacen quedar bien.")
    .meta({ description: "The quote text, without quotation marks." }),
  author: z.string().min(0).max(60).optional().default("Directora de Marca").meta({
    description: "Who said it.",
  }),
  role: z.string().min(0).max(80).optional().default("").meta({
    description: "Optional role or company.",
  }),
});

export type SchemaType = z.infer<typeof Schema>;

const PrismaQuoteSlide = ({ data }: { data: Partial<SchemaType> }) => {
  const { quote, author, role } = data;
  return (
    <div
      className="relative h-[720px] w-[1280px] overflow-hidden"
      style={{
        backgroundColor: "var(--background-color,#fff8f2)",
        color: "var(--background-text,#231f20)",
        fontFamily: "var(--body-font-family,'Inter',system-ui,sans-serif)",
      }}
    >
      <div className="absolute -left-[100px] -top-[100px] h-[300px] w-[300px] rounded-full" style={{ backgroundColor: "var(--primary-color,#ff5a5f)", opacity: 0.18 }} />
      <div className="absolute -bottom-[110px] -right-[110px] h-[320px] w-[320px] rounded-full" style={{ backgroundColor: "#2ec4b6", opacity: 0.2 }} />
      <div className="flex h-full items-center justify-center px-[130px]">
        <div
          className="relative max-w-[900px] rounded-[36px] bg-white px-[70px] py-[64px] text-center"
          style={{ boxShadow: "0 24px 60px rgba(35,31,32,0.14)", transform: "rotate(-0.6deg)" }}
        >
          <span
            className="absolute -top-[34px] left-[58px] flex h-[68px] w-[68px] items-center justify-center rounded-full text-[42px] font-extrabold text-white"
            style={{ backgroundColor: "var(--primary-color,#ff5a5f)" }}
          >
            “
          </span>
          <p
            className="text-[40px] font-bold leading-[1.3] tracking-[-0.01em]"
            style={{ fontFamily: "var(--heading-font-family,inherit)" }}
          >
            {quote}
          </p>
          {(author || role) && (
            <p className="mt-[30px] text-[19px] font-medium opacity-60">
              {author}
              {role && ` — ${role}`}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default PrismaQuoteSlide;

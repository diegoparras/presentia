import * as z from "zod";

export const slideLayoutId = "prisma-prose";
export const slideLayoutName = "Prisma Text Slide";
export const slideLayoutDescription =
  "Creative text slide: color title block on the left, one or two paragraphs on the right.";

export const Schema = z.object({
  title: z.string().min(3).max(70).default("La historia").meta({
    description: "Slide title.",
  }),
  paragraphs: z
    .array(z.string().min(10).max(320))
    .min(1)
    .max(2)
    .default([
      "Todo empezó con una pregunta incómoda: ¿por qué nadie recuerda nuestras campañas? La respuesta no estaba en el presupuesto, sino en el tono.",
      "Decidimos dejar de hablar como empresa y empezar a hablar como persona.",
    ])
    .meta({ description: "One or two short paragraphs." }),
});

export type SchemaType = z.infer<typeof Schema>;

const PrismaProseSlide = ({ data }: { data: Partial<SchemaType> }) => {
  const { title, paragraphs = [] } = data;
  return (
    <div
      className="relative flex h-[720px] w-[1280px] items-stretch overflow-hidden"
      style={{
        backgroundColor: "var(--background-color,#fff8f2)",
        color: "var(--background-text,#231f20)",
        fontFamily: "var(--body-font-family,'Inter',system-ui,sans-serif)",
      }}
    >
      <div
        className="flex w-[430px] shrink-0 items-center rounded-r-[46px] px-[80px] text-white"
        style={{ backgroundColor: "var(--primary-color,#ff5a5f)" }}
      >
        <h2
          className="text-[58px] font-extrabold leading-[1.08] tracking-[-0.02em]"
          style={{ fontFamily: "var(--heading-font-family,inherit)" }}
        >
          {title}
        </h2>
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center space-y-[30px] px-[90px]">
        {paragraphs.map((p, i) => (
          <p key={i} className="text-[24px] leading-[1.65] opacity-75">
            {p}
          </p>
        ))}
      </div>
    </div>
  );
};

export default PrismaProseSlide;

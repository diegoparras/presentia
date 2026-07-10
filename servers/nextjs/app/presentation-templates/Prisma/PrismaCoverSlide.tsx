import * as z from "zod";

export const slideLayoutId = "prisma-cover";
export const slideLayoutName = "Prisma Cover Slide";
export const slideLayoutDescription =
  "Creative cover: bold color shapes, playful oversized title, subtitle and author/date. Use as the first slide.";

export const Schema = z.object({
  kicker: z.string().min(0).max(40).optional().default("Campaña 2026").meta({
    description: "Small uppercase kicker.",
  }),
  title: z.string().min(4).max(70).default("Ideas que contagian").meta({
    description: "Playful bold title, max ~7 words.",
  }),
  subtitle: z.string().min(0).max(140).optional().default("Una marca que se anima a jugar.").meta({
    description: "Optional subtitle.",
  }),
  author: z.string().min(0).max(60).optional().default("Equipo Creativo").meta({
    description: "Optional author or team.",
  }),
  date: z.string().min(0).max(40).optional().default("2026").meta({
    description: "Optional date.",
  }),
});

export type SchemaType = z.infer<typeof Schema>;

const PrismaCoverSlide = ({ data }: { data: Partial<SchemaType> }) => {
  const { kicker, title, subtitle, author, date } = data;
  return (
    <div
      className="relative h-[720px] w-[1280px] overflow-hidden"
      style={{
        backgroundColor: "var(--background-color,#fff8f2)",
        color: "var(--background-text,#231f20)",
        fontFamily: "var(--body-font-family,'Inter',system-ui,sans-serif)",
      }}
    >
      {/* formas geométricas */}
      <div className="absolute -right-[110px] -top-[110px] h-[340px] w-[340px] rounded-full" style={{ backgroundColor: "var(--primary-color,#ff5a5f)", opacity: 0.9 }} />
      <div className="absolute right-[190px] top-[130px] h-[110px] w-[110px] rounded-[28px] rotate-12" style={{ backgroundColor: "#ffb703" }} />
      <div className="absolute -bottom-[80px] right-[80px] h-[240px] w-[240px] rounded-full" style={{ backgroundColor: "#2ec4b6", opacity: 0.85 }} />
      <div className="absolute bottom-[150px] right-[330px] h-[70px] w-[70px] rotate-45 rounded-[16px]" style={{ backgroundColor: "#7b2cbf", opacity: 0.8 }} />

      <div className="relative flex h-full w-[760px] flex-col justify-center px-[100px]">
        {kicker && (
          <span
            className="mb-[26px] inline-block w-fit rounded-full px-[20px] py-[8px] text-[15px] font-bold uppercase tracking-[0.16em] text-white"
            style={{ backgroundColor: "var(--primary-color,#ff5a5f)" }}
          >
            {kicker}
          </span>
        )}
        <h1
          className="text-[86px] font-extrabold leading-[1.02] tracking-[-0.02em]"
          style={{ fontFamily: "var(--heading-font-family,inherit)" }}
        >
          {title}
        </h1>
        {subtitle && <p className="mt-[28px] text-[25px] leading-[1.45] opacity-70">{subtitle}</p>}
        <div className="mt-[54px] flex items-center gap-[18px] text-[17px] font-medium opacity-60">
          <span>{author}</span>
          {author && date && <span className="h-[6px] w-[6px] rounded-full" style={{ backgroundColor: "var(--primary-color,#ff5a5f)" }} />}
          <span>{date}</span>
        </div>
      </div>
    </div>
  );
};

export default PrismaCoverSlide;

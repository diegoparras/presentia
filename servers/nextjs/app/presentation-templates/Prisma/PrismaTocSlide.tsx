import * as z from "zod";

export const slideLayoutId = "prisma-toc";
export const slideLayoutName = "Prisma Agenda Slide";
export const slideLayoutDescription =
  "Creative agenda: colorful numbered chips for each section.";

const CHIP_COLORS = ["var(--primary-color,#ff5a5f)", "#ffb703", "#2ec4b6", "#7b2cbf", "#f4845f", "#118ab2"];

export const Schema = z.object({
  title: z.string().min(3).max(40).default("Hoy vemos").meta({
    description: "Agenda title.",
  }),
  items: z
    .array(z.string().min(3).max(70))
    .min(3)
    .max(6)
    .default(["La gran idea", "A quién le hablamos", "El concepto", "Piezas y canales", "Calendario"])
    .meta({ description: "Section names, 3 to 6 items." }),
});

export type SchemaType = z.infer<typeof Schema>;

const PrismaTocSlide = ({ data }: { data: Partial<SchemaType> }) => {
  const { title, items = [] } = data;
  return (
    <div
      className="relative h-[720px] w-[1280px] overflow-hidden"
      style={{
        backgroundColor: "var(--background-color,#fff8f2)",
        color: "var(--background-text,#231f20)",
        fontFamily: "var(--body-font-family,'Inter',system-ui,sans-serif)",
      }}
    >
      <div className="absolute -left-[90px] -bottom-[90px] h-[260px] w-[260px] rounded-full" style={{ backgroundColor: "#ffb703", opacity: 0.25 }} />
      <div className="flex h-full flex-col px-[100px] py-[84px]">
        <h2
          className="text-[62px] font-extrabold tracking-[-0.02em]"
          style={{ fontFamily: "var(--heading-font-family,inherit)" }}
        >
          {title}
        </h2>
        <div className="mt-[44px] flex flex-1 flex-col justify-start gap-[18px]">
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-[24px]">
              <span
                className="flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-[18px] text-[22px] font-extrabold text-white"
                style={{ backgroundColor: CHIP_COLORS[i % CHIP_COLORS.length], transform: `rotate(${(i % 2 ? 1 : -1) * 4}deg)` }}
              >
                {i + 1}
              </span>
              <span className="text-[27px] font-semibold">{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PrismaTocSlide;

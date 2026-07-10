import * as z from "zod";

export const slideLayoutId = "prisma-section";
export const slideLayoutName = "Prisma Section Divider Slide";
export const slideLayoutDescription =
  "Creative section divider: full-color background block with giant number and section title.";

export const Schema = z.object({
  number: z.string().min(1).max(4).default("01").meta({
    description: "Section number as text.",
  }),
  title: z.string().min(3).max(60).default("La gran idea").meta({
    description: "Section title.",
  }),
  hint: z.string().min(0).max(120).optional().default("").meta({
    description: "Optional one-line teaser.",
  }),
});

export type SchemaType = z.infer<typeof Schema>;

const PrismaSectionSlide = ({ data }: { data: Partial<SchemaType> }) => {
  const { number, title, hint } = data;
  return (
    <div
      className="relative h-[720px] w-[1280px] overflow-hidden"
      style={{
        backgroundColor: "var(--primary-color,#ff5a5f)",
        color: "#ffffff",
        fontFamily: "var(--body-font-family,'Inter',system-ui,sans-serif)",
      }}
    >
      <div className="absolute -right-[130px] -bottom-[130px] h-[420px] w-[420px] rounded-full" style={{ backgroundColor: "#ffb703", opacity: 0.35 }} />
      <div className="absolute right-[180px] top-[90px] h-[90px] w-[90px] rotate-12 rounded-[22px]" style={{ backgroundColor: "#2ec4b6", opacity: 0.55 }} />
      <span className="absolute -left-[20px] -top-[90px] select-none text-[380px] font-extrabold leading-none opacity-15">
        {number}
      </span>
      <div className="relative flex h-full flex-col items-start justify-center px-[110px]">
        <h2
          className="max-w-[860px] text-[84px] font-extrabold leading-[1.03] tracking-[-0.02em]"
          style={{ fontFamily: "var(--heading-font-family,inherit)" }}
        >
          {title}
        </h2>
        {hint && <p className="mt-[26px] max-w-[640px] text-[24px] opacity-80">{hint}</p>}
      </div>
    </div>
  );
};

export default PrismaSectionSlide;

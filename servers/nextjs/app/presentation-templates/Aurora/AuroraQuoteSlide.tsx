import * as z from "zod";

export const slideLayoutId = "aurora-quote";
export const slideLayoutName = "Aurora Quote Slide";
export const slideLayoutDescription =
  "Minimalist quote slide: one big centered quote with the author below. Use for testimonials or powerful statements.";

export const Schema = z.object({
  quote: z
    .string()
    .min(10)
    .max(220)
    .default("La simplicidad es la máxima sofisticación.")
    .meta({ description: "The quote text, without quotation marks." }),
  author: z.string().min(0).max(60).optional().default("Leonardo da Vinci").meta({
    description: "Who said it.",
  }),
  role: z.string().min(0).max(80).optional().default("").meta({
    description: "Optional role or context of the author.",
  }),
});

export type SchemaType = z.infer<typeof Schema>;

const AuroraQuoteSlide = ({ data }: { data: Partial<SchemaType> }) => {
  const { quote, author, role } = data;
  return (
    <div
      className="relative h-[720px] w-[1280px] overflow-hidden"
      style={{
        backgroundColor: "var(--background-color,#fbfbf9)",
        color: "var(--background-text,#17181a)",
        fontFamily: "var(--body-font-family,'Inter',system-ui,sans-serif)",
      }}
    >
      <div className="flex h-full flex-col items-center justify-center px-[150px] text-center">
        <span
          className="mb-[36px] text-[120px] font-bold leading-none"
          style={{ color: "var(--primary-color,#0a84ff)", opacity: 0.25 }}
        >
          “
        </span>
        <p
          className="max-w-[920px] text-[52px] font-semibold leading-[1.2] tracking-[-0.01em]"
          style={{ fontFamily: "var(--heading-font-family,inherit)" }}
        >
          {quote}
        </p>
        {(author || role) && (
          <div className="mt-[48px]">
            <div
              className="mx-auto mb-[22px] h-[3px] w-[56px]"
              style={{ backgroundColor: "var(--primary-color,#0a84ff)" }}
            />
            <p className="text-[21px] font-medium">{author}</p>
            {role && <p className="mt-[6px] text-[17px] opacity-55">{role}</p>}
          </div>
        )}
      </div>
    </div>
  );
};

export default AuroraQuoteSlide;

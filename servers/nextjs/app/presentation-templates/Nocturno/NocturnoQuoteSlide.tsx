import * as z from "zod";

export const slideLayoutId = "nocturno-quote";
export const slideLayoutName = "Nocturno Quote Slide";
export const slideLayoutDescription =
  "Dark quote slide: big statement with accent bar and author. Use for testimonials or bold claims.";

export const Schema = z.object({
  quote: z
    .string()
    .min(10)
    .max(220)
    .default("Los datos sin decisión son solo costo de almacenamiento.")
    .meta({ description: "The quote text, without quotation marks." }),
  author: z.string().min(0).max(60).optional().default("CEO").meta({
    description: "Who said it.",
  }),
  role: z.string().min(0).max(80).optional().default("").meta({
    description: "Optional role or company.",
  }),
});

export type SchemaType = z.infer<typeof Schema>;

const NocturnoQuoteSlide = ({ data }: { data: Partial<SchemaType> }) => {
  const { quote, author, role } = data;
  return (
    <div
      className="relative h-[720px] w-[1280px] overflow-hidden"
      style={{
        backgroundColor: "var(--background-color,#0b0e14)",
        color: "var(--background-text,#edf1f8)",
        fontFamily: "var(--body-font-family,'Inter',system-ui,sans-serif)",
      }}
    >
      <div
        className="absolute -left-[160px] -top-[160px] h-[480px] w-[480px] rounded-full"
        style={{ background: "radial-gradient(closest-side, var(--primary-color,#5b8cff) 0%, transparent 70%)", opacity: 0.13 }}
      />
      <div className="flex h-full items-center px-[130px]">
        <div
          className="mr-[54px] h-[240px] w-[5px] shrink-0"
          style={{ backgroundColor: "var(--primary-color,#5b8cff)" }}
        />
        <div>
          <p
            className="max-w-[880px] text-[48px] font-semibold leading-[1.25] tracking-[-0.01em]"
            style={{ fontFamily: "var(--heading-font-family,inherit)" }}
          >
            “{quote}”
          </p>
          {(author || role) && (
            <p className="mt-[36px] text-[20px]" style={{ opacity: 0.65 }}>
              <span className="font-semibold" style={{ color: "var(--primary-color,#5b8cff)" }}>
                {author}
              </span>
              {role && <span> — {role}</span>}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default NocturnoQuoteSlide;

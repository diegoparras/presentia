import * as z from "zod";

export const slideLayoutId = "institucional-quote";
export const slideLayoutName = "Institutional Normative Quote Slide";
export const slideLayoutDescription =
  "Large centered quote for legal or normative text, doctrine or a key statement, with its source or citation.";

export const Schema = z.object({
  quote: z.string().min(20).max(380).default("Texto de la cita o del artículo normativo.").meta({
    description: "Quoted text: article of a law, resolution, doctrine or key statement.",
  }),
  source: z.string().min(3).max(120).default("Fuente de la cita").meta({
    description: "Source: norm, author, organism and year, e.g. 'Art. 60, Ley 20.488'.",
  }),
});

export type SchemaType = z.infer<typeof Schema>;

const InstitucionalQuoteSlide = ({ data }: { data: Partial<SchemaType> }) => {
  const { quote, source } = data;
  return (
    <div
      className="relative h-[720px] w-[1280px] overflow-hidden"
      style={{
        backgroundColor: "var(--background-color,#f7f6f2)",
        fontFamily: "var(--body-font-family,Georgia,serif)",
        color: "var(--background-text,#1c1c1e)",
      }}
    >
      <div className="flex h-full flex-col items-center justify-center px-[160px] text-center">
        <span
          className="text-[110px] leading-none"
          style={{ color: "var(--primary-color,#1f3a5f)" }}
          aria-hidden="true"
        >
          “
        </span>
        <blockquote className="text-[34px] italic leading-[1.5]">{quote}</blockquote>
        <cite
          className="mt-[36px] text-[19px] font-semibold not-italic uppercase tracking-[0.14em]"
          style={{ color: "var(--primary-color,#1f3a5f)" }}
        >
          {source}
        </cite>
      </div>
    </div>
  );
};

export default InstitucionalQuoteSlide;

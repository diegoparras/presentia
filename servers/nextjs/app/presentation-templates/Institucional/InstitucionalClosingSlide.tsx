import * as z from "zod";

export const slideLayoutId = "institucional-closing";
export const slideLayoutName = "Institutional Closing Slide";
export const slideLayoutDescription =
  "Closing slide with a short farewell or thanks line, institution name and contact details. Use as the last slide.";

export const Schema = z.object({
  headline: z.string().min(3).max(80).default("Muchas gracias").meta({
    description: "Closing line, e.g. 'Muchas gracias' or a final statement.",
  }),
  institution: z.string().min(0).max(80).optional().default("").meta({
    description: "Institution or team name.",
  }),
  contactLines: z
    .array(z.string().min(3).max(90))
    .min(0)
    .max(4)
    .default([])
    .meta({ description: "Contact details: email, phone, address or site." }),
});

export type SchemaType = z.infer<typeof Schema>;

const InstitucionalClosingSlide = ({ data }: { data: Partial<SchemaType> }) => {
  const { headline, institution, contactLines } = data;
  return (
    <div
      className="relative h-[720px] w-[1280px] overflow-hidden"
      style={{
        backgroundColor: "var(--primary-color,#1f3a5f)",
        fontFamily: "var(--body-font-family,Georgia,serif)",
        color: "var(--primary-text,#ffffff)",
      }}
    >
      <div className="flex h-full flex-col items-center justify-center px-[120px] text-center">
        <h1 className="text-[64px] font-semibold leading-[1.1]">{headline}</h1>
        {institution && (
          <p className="mt-[22px] text-[24px] uppercase tracking-[0.16em] opacity-85">
            {institution}
          </p>
        )}
        {contactLines && contactLines.length > 0 && (
          <div
            className="mt-[44px] border-t pt-[26px] text-[19px] leading-[1.8] opacity-85"
            style={{ borderColor: "rgba(255,255,255,0.4)" }}
          >
            {contactLines.map((line, index) => (
              <p key={index}>{line}</p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default InstitucionalClosingSlide;

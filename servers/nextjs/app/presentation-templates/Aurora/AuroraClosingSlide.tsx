import * as z from "zod";

export const slideLayoutId = "aurora-closing";
export const slideLayoutName = "Aurora Closing Slide";
export const slideLayoutDescription =
  "Minimalist closing slide: short thank-you statement and contact line. Use as the last slide.";

export const Schema = z.object({
  title: z.string().min(2).max(60).default("Gracias").meta({
    description: "Big closing word or phrase.",
  }),
  message: z.string().min(0).max(160).optional().default("Hablemos de lo que sigue.").meta({
    description: "Optional short closing message or call to action.",
  }),
  contact: z.string().min(0).max(90).optional().default("hola@ejemplo.com").meta({
    description: "Optional contact: email, site or handle.",
  }),
});

export type SchemaType = z.infer<typeof Schema>;

const AuroraClosingSlide = ({ data }: { data: Partial<SchemaType> }) => {
  const { title, message, contact } = data;
  return (
    <div
      className="relative h-[720px] w-[1280px] overflow-hidden"
      style={{
        backgroundColor: "var(--background-color,#fbfbf9)",
        color: "var(--background-text,#17181a)",
        fontFamily: "var(--body-font-family,'Inter',system-ui,sans-serif)",
      }}
    >
      <div className="flex h-full flex-col items-center justify-center text-center">
        <h2
          className="text-[110px] font-bold leading-none tracking-[-0.03em]"
          style={{ fontFamily: "var(--heading-font-family,inherit)" }}
        >
          {title}
        </h2>
        {message && <p className="mt-[30px] max-w-[640px] text-[25px] opacity-60">{message}</p>}
        {contact && (
          <p
            className="mt-[56px] border-t pt-[24px] text-[19px] font-medium"
            style={{ borderColor: "var(--primary-color,#0a84ff)", color: "var(--primary-color,#0a84ff)" }}
          >
            {contact}
          </p>
        )}
      </div>
    </div>
  );
};

export default AuroraClosingSlide;

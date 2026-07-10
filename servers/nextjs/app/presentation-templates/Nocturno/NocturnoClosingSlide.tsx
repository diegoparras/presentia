import * as z from "zod";

export const slideLayoutId = "nocturno-closing";
export const slideLayoutName = "Nocturno Closing Slide";
export const slideLayoutDescription =
  "Dark closing slide: thank-you statement, optional call to action and contact. Use as the last slide.";

export const Schema = z.object({
  title: z.string().min(2).max(60).default("Gracias").meta({
    description: "Big closing word or phrase.",
  }),
  message: z.string().min(0).max(160).optional().default("Preguntas y próximos pasos.").meta({
    description: "Optional short closing message.",
  }),
  contact: z.string().min(0).max(90).optional().default("estrategia@ejemplo.com").meta({
    description: "Optional contact: email, site or handle.",
  }),
});

export type SchemaType = z.infer<typeof Schema>;

const NocturnoClosingSlide = ({ data }: { data: Partial<SchemaType> }) => {
  const { title, message, contact } = data;
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
        className="absolute left-1/2 top-1/2 h-[620px] w-[620px] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ background: "radial-gradient(closest-side, var(--primary-color,#5b8cff) 0%, transparent 70%)", opacity: 0.12 }}
      />
      <div className="relative flex h-full flex-col items-center justify-center text-center">
        <h2
          className="text-[100px] font-bold leading-none tracking-[-0.02em]"
          style={{ fontFamily: "var(--heading-font-family,inherit)" }}
        >
          {title}
        </h2>
        {message && (
          <p className="mt-[28px] max-w-[620px] text-[24px]" style={{ opacity: 0.6 }}>
            {message}
          </p>
        )}
        {contact && (
          <p
            className="mt-[52px] rounded-full px-[34px] py-[14px] text-[18px] font-semibold"
            style={{
              color: "var(--primary-color,#5b8cff)",
              border: "1px solid var(--primary-color,#5b8cff)",
            }}
          >
            {contact}
          </p>
        )}
      </div>
    </div>
  );
};

export default NocturnoClosingSlide;

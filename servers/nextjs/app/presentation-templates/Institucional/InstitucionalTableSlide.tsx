import * as z from "zod";

export const slideLayoutId = "institucional-table";
export const slideLayoutName = "Institutional Comparison Table Slide";
export const slideLayoutDescription =
  "Title with a formal comparison table: column headers and rows of cells. Use for comparatives, balances or structured data.";

export const Schema = z.object({
  title: z.string().min(3).max(80).default("Cuadro comparativo").meta({
    description: "Slide title.",
  }),
  headers: z
    .array(z.string().min(1).max(40))
    .min(2)
    .max(5)
    .default(["Concepto", "Valor"])
    .meta({ description: "Column headers; the first column labels each row." }),
  rows: z
    .array(
      z.object({
        cells: z.array(z.string().min(1).max(80)).min(2).max(5).meta({
          description: "Cells of the row, same count and order as headers.",
        }),
      })
    )
    .min(2)
    .max(7)
    .default([{ cells: ["Ítem", "Dato"] }, { cells: ["Ítem", "Dato"] }])
    .meta({ description: "Table rows." }),
  note: z.string().min(0).max(180).optional().default("").meta({
    description: "Optional footnote: source or clarification.",
  }),
});

export type SchemaType = z.infer<typeof Schema>;

const InstitucionalTableSlide = ({ data }: { data: Partial<SchemaType> }) => {
  const { title, headers, rows, note } = data;
  return (
    <div
      className="relative h-[720px] w-[1280px] overflow-hidden"
      style={{
        backgroundColor: "var(--background-color,#f7f6f2)",
        fontFamily: "var(--body-font-family,Georgia,serif)",
        color: "var(--background-text,#1c1c1e)",
      }}
    >
      <div className="flex h-full flex-col px-[96px] py-[64px]">
        <h2
          className="border-b pb-[18px] text-[40px] font-semibold"
          style={{ borderColor: "var(--primary-color,#1f3a5f)" }}
        >
          {title}
        </h2>
        <table className="mt-[32px] w-full border-collapse text-[20px]">
          <thead>
            <tr>
              {(headers || []).map((header, index) => (
                <th
                  key={index}
                  className="px-[20px] py-[14px] text-left font-semibold"
                  style={{
                    backgroundColor: "var(--primary-color,#1f3a5f)",
                    color: "var(--primary-text,#ffffff)",
                  }}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(rows || []).map((row, rowIndex) => (
              <tr
                key={rowIndex}
                style={{
                  backgroundColor:
                    rowIndex % 2 === 1 ? "rgba(31,58,95,0.06)" : "transparent",
                }}
              >
                {(row.cells || []).map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    className="border-b px-[20px] py-[13px] tabular-nums"
                    style={{
                      borderColor: "rgba(28,28,30,0.12)",
                      fontWeight: cellIndex === 0 ? 600 : 400,
                    }}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {note && <p className="mt-[20px] text-[16px] opacity-70">{note}</p>}
      </div>
    </div>
  );
};

export default InstitucionalTableSlide;

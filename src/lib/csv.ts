// Tiny RFC4180-ish CSV parser: no dependency needed for the small data files
// under src/data/ (carousel items, site links). Supports quoted fields,
// commas/quotes inside quotes (""), and \r\n or \n line endings.
// scripts/vinted-sync.mjs imports this file directly with Node, so keep it
// free of imports and of TypeScript-only syntax beyond type annotations.
export function parseCsv(text: string): Record<string, string>[] {
  const rows = parseCsvRows(text);
  if (rows.length === 0) return [];
  const [header, ...body] = rows;
  return body
    .filter((row) => row.some((cell) => cell.trim() !== ""))
    .map((row) => Object.fromEntries(header.map((key, i) => [key.trim(), (row[i] ?? "").trim()])));
}

/** Rows as arrays of raw cells, header row included. Blank lines are skipped. */
export function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      pushField();
    } else if (char === "\n") {
      if (field !== "" || row.length > 0) pushRow();
    } else if (char === "\r") {
      // skip, \n handles the row break
    } else {
      field += char;
    }
  }
  if (field !== "" || row.length > 0) pushRow();
  return rows;
}

/** Serialize rows back to CSV, quoting only where necessary. */
export function stringifyCsv(rows: string[][]): string {
  const escape = (value: string) =>
    /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
  return rows.map((row) => row.map(escape).join(",")).join("\n") + "\n";
}

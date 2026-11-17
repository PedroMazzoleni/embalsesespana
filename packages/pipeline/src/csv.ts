/** Parser CSV minimo (RFC 4180: comillas dobles, comas y saltos de linea dentro de campos). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c !== "\r") field += c;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows;
}

/** Devuelve objetos con el numero de linea (1 = cabecera) para mensajes de error. */
export function parseCsvObjects(text: string): { line: number; rec: Record<string, string> }[] {
  const [head, ...rest] = parseCsv(text);
  if (!head) return [];
  const out: { line: number; rec: Record<string, string> }[] = [];
  rest.forEach((r, i) => {
    if (r.length === 1 && r[0] === "") return;
    out.push({ line: i + 2, rec: Object.fromEntries(head.map((k, j) => [k, r[j] ?? ""])) });
  });
  return out;
}

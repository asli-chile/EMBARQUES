import ExcelJS from "exceljs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const base = join(dirname(fileURLToPath(import.meta.url)), "../../docs/info alma");

async function dump(path, limit = 25) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path);
  const ws = wb.worksheets[0];
  console.log("\n===", path.split("\\").slice(-2).join("/"), "===");
  for (let r = 1; r <= limit; r++) {
    const row = [];
    for (let c = 1; c <= 12; c++) {
      const v = ws.getCell(r, c).value;
      if (v == null) continue;
      const s = typeof v === "object" && v.result != null ? v.result : typeof v === "object" && v.text ? v.text : v;
      row.push(`[${c}]${String(s).slice(0, 40)}`);
    }
    if (row.length) console.log(`R${r}:`, row.join(" | "));
  }
}

const samples = [
  join(base, "2025M01/PROFORMA 2025M01.xlsx"),
  join(base, "2025M01/IE 2025M01 ALMA FRUIT WOOLEE.xlsx"),
  join(base, "2025M05/FULLSET/2025M05 proforma.xlsx"),
  join(base, "2025M09/2025M09 IE ALMA FRUIT WOO LEE.xlsx"),
  join(base, "2025M12/2025M12 IE ALMA FRUIT JIANRONG.xlsx"),
];

for (const s of samples) await dump(s);

import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const viteCache = join(root, "node_modules", ".vite");
if (existsSync(viteCache)) {
  rmSync(viteCache, { recursive: true, force: true });
  process.stdout.write("Caché de Vite eliminada: node_modules/.vite\n");
} else {
  process.stdout.write("No existe node_modules/.vite (nada que limpiar).\n");
}

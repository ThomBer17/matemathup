/**
 * Procesamiento de material en el CLIENTE (browser). Extrae texto de PDF (pdfjs)
 * e imágenes (OCR con tesseract). Las librerías pesadas se cargan con dynamic import
 * solo al procesar, así no entran al bundle principal.
 *
 * Defensivo: si la extracción falla, devuelve texto vacío (el material igual se cataloga).
 * Reservamos el estado 'error' para fallos de subida/almacenamiento, no de extracción.
 */

const MAX_PAGES = 50;
export const PREVIEW_LENGTH = 400;

export type MaterialKind = "pdf" | "image";

const IMAGE_MIME = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

export function detectKind(file: File): MaterialKind | null {
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) return "pdf";
  if (IMAGE_MIME.includes(file.type) || /\.(jpe?g|png|webp)$/i.test(file.name)) return "image";
  return null;
}

export interface ExtractResult {
  text: string;
  pageCount: number | null;
}

export async function extractFromFile(file: File, kind: MaterialKind): Promise<ExtractResult> {
  try {
    if (kind === "pdf") return await extractPdf(file);
    return await extractImage(file);
  } catch (e) {
    console.warn("[materials] extracción falló, se cataloga sin texto:", e);
    return { text: "", pageCount: null };
  }
}

async function extractPdf(file: File): Promise<ExtractResult> {
  const pdfjs = await import("pdfjs-dist");
  // Worker como URL (Vite) — lazy, dentro de la función.
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const buffer = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buffer }).promise;
  const pageCount = doc.numPages;

  let text = "";
  const limit = Math.min(pageCount, MAX_PAGES);
  for (let i = 1; i <= limit; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    text += content.items
      .map((it) => ("str" in it ? it.str : ""))
      .join(" ");
    text += "\n";
  }
  return { text: text.trim(), pageCount };
}

async function extractImage(file: File): Promise<ExtractResult> {
  const Tesseract = await import("tesseract.js");
  const { data } = await Tesseract.recognize(file, "spa");
  return { text: (data.text ?? "").trim(), pageCount: null };
}

export function makePreview(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > PREVIEW_LENGTH ? clean.slice(0, PREVIEW_LENGTH) + "…" : clean;
}

// ---- Soporte de ZIP: descomprimir en el browser y extraer los archivos soportados ----

const MAX_ZIP_FILES = 30;

export function isZip(file: File): boolean {
  return (
    file.type === "application/zip" ||
    file.type === "application/x-zip-compressed" ||
    /\.zip$/i.test(file.name)
  );
}

function mimeForName(name: string): string {
  const n = name.toLowerCase();
  if (n.endsWith(".pdf")) return "application/pdf";
  if (n.endsWith(".png")) return "image/png";
  if (n.endsWith(".webp")) return "image/webp";
  if (n.endsWith(".jpg") || n.endsWith(".jpeg")) return "image/jpeg";
  return "application/octet-stream";
}

/**
 * Descomprime un ZIP en el cliente y devuelve los PDFs/imágenes que contiene
 * como objetos File, listos para procesar. fflate se carga con dynamic import.
 * Ignora carpetas, archivos ocultos y la basura de macOS (__MACOSX, .DS_Store).
 */
export async function expandZip(file: File): Promise<File[]> {
  const { unzipSync } = await import("fflate");
  const buf = new Uint8Array(await file.arrayBuffer());
  const entries = unzipSync(buf);

  const out: File[] = [];
  for (const path of Object.keys(entries)) {
    if (path.endsWith("/")) continue; // carpeta
    if (path.startsWith("__MACOSX/")) continue;
    const base = path.split("/").pop() ?? path;
    if (!base || base.startsWith(".")) continue;
    if (!/\.(pdf|jpe?g|png|webp)$/i.test(base)) continue;

    const bytes = entries[path];
    out.push(new File([bytes], base, { type: mimeForName(base) }));
    if (out.length >= MAX_ZIP_FILES) break;
  }
  return out;
}

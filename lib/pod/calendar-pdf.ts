// The print file of a wall calendar (Gelato): ONE PDF of 14 pages in reading order — cover, January …
// December, back — each page at the calendar's exact trim size (e.g. A4 210 × 297 mm; Gelato prints them
// on 7 sheets, both sides, wire-bound at the top). Pure: the caller fetches the photos (already cut to the
// photo boxes' shape) and stores the result.
//
// The month pages repeat what the customer saw in the studio (components/product-studio.tsx,
// CalendarStudio): the month's photo on top, the month name and year under it, then a Monday-first grid.
// Nothing important sits near the edges (white margins, a deeper one at the top for the wire binding), so
// the page prints correctly whether the shop trims or scales for bleed. A month without a photo gets a soft
// panel with its name instead of an empty hole.
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

export type CalendarLanguage = "es" | "pt";
export type Box = { x: number; y: number; width: number; height: number }; // mm, from the top-left corner

export const CALENDAR_PAGES = 14;

const MONTHS: Record<CalendarLanguage, string[]> = {
  es: ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"],
  pt: ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"],
};
// Monday first.
const WEEKDAYS: Record<CalendarLanguage, string[]> = { es: ["L", "M", "X", "J", "V", "S", "D"], pt: ["S", "T", "Q", "Q", "S", "S", "D"] };
const TITLE: Record<CalendarLanguage, string> = { es: "Calendario", pt: "Calendário" };

export const monthName = (language: CalendarLanguage, month: number) => MONTHS[language][month];

// Where the 1st falls in a Monday-first week (0 = Monday) and how many days the month has.
export function monthGrid(year: number, month: number) {
  return { offset: (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7, days: new Date(Date.UTC(year, month + 1, 0)).getUTCDate() };
}

// The page layout in mm for a page size. Photo boxes are what the caller crops the photos to.
export function calendarLayout(page: { width: number; height: number }) {
  const margin = Math.round(Math.min(page.width, page.height) * 0.06 * 10) / 10;
  // Room for the wire and the hook at the top.
  const top = margin + Math.max(6, Math.round(page.height * 0.025));
  const width = page.width - margin * 2;
  // Same shape as the studio preview (1.65 : 1), never more than half the page.
  const photoHeight = Math.min(width / 1.65, page.height * 0.5);
  const month: Box = { x: margin, y: top, width, height: Math.round(photoHeight * 10) / 10 };
  const coverHeight = Math.round((page.height - top - margin) * 0.74 * 10) / 10;
  const cover: Box = { x: margin, y: top, width, height: coverHeight };
  return { page, margin, top, month, cover };
}

// Pixel size of a photo box at the given resolution (300 dpi: full print quality).
export const boxPixels = (box: Box, dpi = 300) => ({ width: Math.round((box.width / 25.4) * dpi), height: Math.round((box.height / 25.4) * dpi) });

const PT = 72 / 25.4;
const NAVY = rgb(24 / 255, 36 / 255, 67 / 255);
const CORAL = rgb(238 / 255, 82 / 255, 100 / 255);
const LINE = rgb(234 / 255, 223 / 255, 216 / 255);
const PANEL = rgb(246 / 255, 239 / 255, 233 / 255);
const MUTED = rgb(146 / 255, 151 / 255, 164 / 255);

type Fonts = { serif: PDFFont; sans: PDFFont; sansBold: PDFFont };

export type CalendarInput = {
  page: { width: number; height: number }; // mm
  year: number;
  language: CalendarLanguage;
  // 12 JPEGs (January first) cut to layout.month's shape, or null for a month without a photo.
  monthPhotos: (Uint8Array | null)[];
  // A JPEG cut to layout.cover's shape, or null.
  coverPhoto: Uint8Array | null;
};

export async function buildCalendarPdf(input: CalendarInput): Promise<Uint8Array> {
  if (input.monthPhotos.length !== 12) throw new Error("A calendar needs 12 month slots");
  const layout = calendarLayout(input.page);
  const pdf = await PDFDocument.create();
  pdf.setTitle(`${TITLE[input.language]} ${input.year}`);
  pdf.setCreator("Celebra Momentos");
  const fonts: Fonts = { serif: await pdf.embedFont(StandardFonts.TimesRomanBold), sans: await pdf.embedFont(StandardFonts.Helvetica), sansBold: await pdf.embedFont(StandardFonts.HelveticaBold) };
  const size: [number, number] = [input.page.width * PT, input.page.height * PT];

  // y in mm from the top → PDF points from the bottom.
  const at = (page: PDFPage) => ({
    rect: (box: Box, color = PANEL) => page.drawRectangle({ x: box.x * PT, y: (input.page.height - box.y - box.height) * PT, width: box.width * PT, height: box.height * PT, color }),
    line: (x1: number, y1: number, x2: number, y2: number, thickness = 0.5, color = LINE) => page.drawLine({ start: { x: x1 * PT, y: (input.page.height - y1) * PT }, end: { x: x2 * PT, y: (input.page.height - y2) * PT }, thickness, color }),
    // Text whose baseline is at `y` mm; align left / center / right of x.
    text: (value: string, x: number, y: number, font: PDFFont, sizeMm: number, color = NAVY, align: "left" | "center" | "right" = "left") => {
      const points = sizeMm * PT;
      const textWidth = font.widthOfTextAtSize(value, points) / PT;
      const left = align === "left" ? x : align === "center" ? x - textWidth / 2 : x - textWidth;
      page.drawText(value, { x: left * PT, y: (input.page.height - y) * PT, size: points, font, color });
    },
  });

  const photo = async (page: PDFPage, box: Box, bytes: Uint8Array | null, label: string) => {
    const draw = at(page);
    if (bytes) {
      const image = await pdf.embedJpg(bytes);
      page.drawImage(image, { x: box.x * PT, y: (input.page.height - box.y - box.height) * PT, width: box.width * PT, height: box.height * PT });
      return;
    }
    draw.rect(box);
    draw.text(label, box.x + box.width / 2, box.y + box.height / 2 + box.height * 0.05, fonts.serif, Math.min(box.height * 0.16, box.width * 0.09), MUTED, "center");
  };

  // ── Cover ──
  const cover = pdf.addPage(size);
  // The caller cuts the customer's first photo to the cover's shape; without any photo the panel shows the year.
  await photo(cover, layout.cover, input.coverPhoto, String(input.year));
  const coverText = at(cover);
  const below = layout.cover.y + layout.cover.height;
  const room = input.page.height - layout.margin - below;
  coverText.text(String(input.year), input.page.width / 2, below + room * 0.62, fonts.serif, Math.min(room * 0.5, input.page.width * 0.14), NAVY, "center");
  coverText.text(TITLE[input.language].toUpperCase(), input.page.width / 2, below + room * 0.86, fonts.sansBold, Math.min(room * 0.1, input.page.width * 0.025), CORAL, "center");

  // ── Months ──
  for (let month = 0; month < 12; month += 1) {
    const page = pdf.addPage(size);
    const draw = at(page);
    const name = MONTHS[input.language][month];
    await photo(page, layout.month, input.monthPhotos[month], name);
    const left = layout.margin;
    const right = input.page.width - layout.margin;
    const width = right - left;
    // Title row: month name (serif, like the studio) and the year.
    const titleSize = Math.min(width * 0.075, (input.page.height - layout.month.y - layout.month.height) * 0.09);
    const titleBase = layout.month.y + layout.month.height + titleSize * 1.55;
    draw.text(name.toUpperCase(), left, titleBase, fonts.serif, titleSize);
    draw.text(String(input.year), right, titleBase, fonts.sansBold, titleSize * 0.42, NAVY, "right");
    const ruleY = titleBase + titleSize * 0.45;
    draw.line(left, ruleY, right, ruleY, 0.9, NAVY);
    // Weekday header and a 6-row grid filling the rest of the page.
    const headerSize = titleSize * 0.36;
    const headerBase = ruleY + headerSize * 2.2;
    const column = width / 7;
    WEEKDAYS[input.language].forEach((day, index) => draw.text(day, left + column * index + column / 2, headerBase, fonts.sansBold, headerSize, index === 6 ? CORAL : MUTED, "center"));
    const gridTop = headerBase + headerSize * 1.2;
    const gridBottom = input.page.height - layout.margin;
    const row = (gridBottom - gridTop) / 6;
    for (let line = 0; line <= 6; line += 1) draw.line(left, gridTop + row * line, right, gridTop + row * line);
    for (let line = 0; line <= 7; line += 1) draw.line(left + column * line, gridTop, left + column * line, gridBottom);
    const { offset, days } = monthGrid(input.year, month);
    const numberSize = Math.min(row * 0.32, column * 0.3);
    for (let day = 1; day <= days; day += 1) {
      const cell = offset + day - 1;
      const x = left + column * (cell % 7) + column * 0.1;
      const y = gridTop + row * Math.floor(cell / 7) + numberSize * 1.25;
      draw.text(String(day), x, y, fonts.sans, numberSize, cell % 7 === 6 ? CORAL : NAVY);
    }
  }

  // ── Back ──
  const back = pdf.addPage(size);
  at(back).text("celebra-momentos.com", input.page.width / 2, input.page.height - layout.margin - 4, fonts.sans, Math.min(3.2, input.page.width * 0.016), MUTED, "center");

  return pdf.save();
}

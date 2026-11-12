import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { boxPixels, buildCalendarPdf, calendarLayout, CALENDAR_PAGES, monthGrid, monthName } from "@/lib/pod/calendar-pdf";

const A4 = { width: 210, height: 297 };
const jpeg = new Uint8Array(readFileSync("public/images/magnet-photo-8.jpg"));

describe("calendar layout", () => {
  it("Monday-first grids, as in the studio", () => {
    expect(monthGrid(2027, 0)).toEqual({ offset: 4, days: 31 }); // 1 Jan 2027 is a Friday
    expect(monthGrid(2027, 1)).toEqual({ offset: 0, days: 28 }); // 1 Feb 2027 is a Monday
    expect(monthGrid(2028, 1).days).toBe(29); // leap year
    expect(monthName("pt", 2)).toBe("Março");
  });

  it("keeps the photos inside the margins, with room for the wire at the top, in the studio's 1.65:1 shape", () => {
    for (const page of [A4, { width: 297, height: 420 }, { width: 148, height: 400 }]) {
      const layout = calendarLayout(page);
      for (const box of [layout.month, layout.cover]) {
        expect(box.x).toBeGreaterThan(5);
        expect(box.x + box.width).toBeLessThanOrEqual(page.width - layout.margin + 0.01);
        expect(box.y).toBeGreaterThan(layout.margin);
        expect(box.y + box.height).toBeLessThan(page.height - layout.margin);
      }
      expect(layout.month.width / layout.month.height).toBeCloseTo(1.65, 1);
    }
    // A4 month photo at 300 dpi.
    expect(boxPixels(calendarLayout(A4).month)).toEqual({ width: 2183, height: 1323 });
  });
});

describe("calendar PDF", () => {
  it("has 14 pages (cover, 12 months, back), every page at the calendar's exact size", async () => {
    const bytes = await buildCalendarPdf({ page: A4, year: 2027, language: "es", monthPhotos: [jpeg, jpeg, jpeg, ...Array(9).fill(null)], coverPhoto: jpeg });
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBe(CALENDAR_PAGES);
    for (const page of pdf.getPages()) {
      const { width, height } = page.getSize();
      expect(width).toBeCloseTo((210 * 72) / 25.4, 3);
      expect(height).toBeCloseTo((297 * 72) / 25.4, 3);
    }
    expect(pdf.getTitle()).toBe("Calendario 2027");
  });

  it("works with Portuguese months (accents) and no photo at all, and refuses a wrong month count", async () => {
    const pdf = await PDFDocument.load(await buildCalendarPdf({ page: { width: 148, height: 400 }, year: 2027, language: "pt", monthPhotos: Array(12).fill(null), coverPhoto: null }));
    expect(pdf.getPageCount()).toBe(14);
    expect(pdf.getTitle()).toBe("Calendário 2027");
    await expect(buildCalendarPdf({ page: A4, year: 2027, language: "es", monthPhotos: [jpeg], coverPhoto: null })).rejects.toThrow(/12 month/);
  });
});

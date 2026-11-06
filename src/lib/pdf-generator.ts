import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fs from "fs";
import path from "path";
import { getPrivateFile } from "./storage";

export interface AthleteCardData {
  cardNumber: string;
  registrationNumber: string;
  kukkiwonId: string;
  fullName: string;
  gender: string;
  danOrPoom?: string | null;
  academyName: string;
  academyCity?: string | null;
  weightCategoryName: string;
  division: string;
  photoStorageKey: string;
  photoMimeType?: string;
  cardRole?: "PARTICIPANT" | "REFEREE" | "COACH" | "STAFF" | string;
  issueDate?: Date;
}

export interface ChampionshipBrandingConfig {
  championshipName: string;
  subTitle: string;
  organizationName: string;
  primaryColorHex: string;   // Navy #090D16
  backgroundColorHex: string; // Dark #0C1222
  goldColorHex: string;      // Gold #D4AF37
  cyanColorHex: string;      // Cyan #00E5FF
}

export const DEFAULT_BRANDING: ChampionshipBrandingConfig = {
  championshipName: "KYORIX TAEKWONDO CHAMPIONSHIP",
  subTitle: "OFFICIAL ATHLETE ACCREDITATION",
  organizationName: "KYORIX SPORTS TECHNOLOGY",
  primaryColorHex: "#090D16",
  backgroundColorHex: "#0C1222",
  goldColorHex: "#D4AF37",
  cyanColorHex: "#00E5FF",
};

// Standard CR80 ID-1 card dimensions in points (85.6mm x 54mm)
// 1 mm = 72 / 25.4 points ≈ 2.834645 pt
export const CARD_WIDTH_PT = 242.65;
export const CARD_HEIGHT_PT = 153.07;

// Official Championship Badge Template Dimensions (Portrait aspect ratio ~1:1.4)
export const PORTRAIT_BADGE_WIDTH_PT = 250;
export const PORTRAIT_BADGE_HEIGHT_PT = 350;

function hexToRgb(hex: string) {
  const clean = hex.replace("#", "");
  const num = parseInt(clean, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return rgb(r / 255, g / 255, b / 255);
}

/**
 * Draws an official CR80 landscape Athlete ID Card onto a PDF page
 */
export async function drawAthleteCard(
  doc: PDFDocument,
  page: any,
  data: AthleteCardData,
  config: ChampionshipBrandingConfig = DEFAULT_BRANDING
) {
  // If an official portrait template role was selected, render onto that template
  if (data.cardRole && ["PARTICIPANT", "REFEREE", "COACH", "STAFF"].includes(data.cardRole.toUpperCase())) {
    await drawPortraitTemplateCard(doc, page, data);
    return;
  }

  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontMono = await doc.embedFont(StandardFonts.CourierBold);

  const primaryColor = hexToRgb(config.primaryColorHex);
  const bgColor = hexToRgb(config.backgroundColorHex);
  const goldColor = hexToRgb(config.goldColorHex);
  const cyanColor = hexToRgb(config.cyanColorHex);
  const white = rgb(1, 1, 1);
  const slate400 = rgb(0.58, 0.64, 0.72);
  const slate600 = rgb(0.28, 0.33, 0.41);

  // 1. Full Card Base Background (#0C1222)
  page.drawRectangle({
    x: 0,
    y: 0,
    width: CARD_WIDTH_PT,
    height: CARD_HEIGHT_PT,
    color: bgColor,
  });

  // Subtle geometric corner accents (Taekwondo dynamic styling)
  page.drawLine({
    start: { x: CARD_WIDTH_PT - 30, y: CARD_HEIGHT_PT },
    end: { x: CARD_WIDTH_PT, y: CARD_HEIGHT_PT - 30 },
    thickness: 1,
    color: cyanColor,
    opacity: 0.3,
  });

  // 2. Top Header Bar (#090D16)
  const headerHeight = 28;
  const headerY = CARD_HEIGHT_PT - headerHeight;
  page.drawRectangle({
    x: 0,
    y: headerY,
    width: CARD_WIDTH_PT,
    height: headerHeight,
    color: primaryColor,
  });

  // Header bottom border line (Gold #D4AF37)
  page.drawLine({
    start: { x: 0, y: headerY },
    end: { x: CARD_WIDTH_PT, y: headerY },
    thickness: 1.5,
    color: goldColor,
  });

  // Championship Title
  page.drawText(config.championshipName, {
    x: 10,
    y: headerY + 15,
    size: 7.5,
    font: fontBold,
    color: goldColor,
  });

  // Subtitle
  page.drawText(config.subTitle, {
    x: 10,
    y: headerY + 6,
    size: 4.5,
    font: fontRegular,
    color: cyanColor,
  });

  // "ATHLETE" Badge Pill on the top right
  const badgeWidth = 44;
  const badgeHeight = 13;
  const badgeX = CARD_WIDTH_PT - badgeWidth - 8;
  const badgeY = headerY + 7;

  page.drawRectangle({
    x: badgeX,
    y: badgeY,
    width: badgeWidth,
    height: badgeHeight,
    color: goldColor,
  });

  page.drawText("ATHLETE", {
    x: badgeX + 7,
    y: badgeY + 3.5,
    size: 6.5,
    font: fontBold,
    color: primaryColor,
  });

  // 3. Athlete Photograph Box
  const photoX = 10;
  const photoWidth = 54;
  const photoHeight = 72;
  const photoY = 46;

  // Photo Frame Border (Cyan & Dark Navy)
  page.drawRectangle({
    x: photoX - 1.5,
    y: photoY - 1.5,
    width: photoWidth + 3,
    height: photoHeight + 3,
    color: primaryColor,
    borderColor: cyanColor,
    borderWidth: 1,
  });

  // Load and embed athlete photograph
  let photoEmbedded = false;
  try {
    const { buffer: photoBuffer } = await getPrivateFile(data.photoStorageKey);
    // Check if JPEG or PNG
    if (data.photoStorageKey.endsWith(".png")) {
      const pngImage = await doc.embedPng(photoBuffer);
      page.drawImage(pngImage, {
        x: photoX,
        y: photoY,
        width: photoWidth,
        height: photoHeight,
      });
      photoEmbedded = true;
    } else {
      const jpgImage = await doc.embedJpg(photoBuffer);
      page.drawImage(jpgImage, {
        x: photoX,
        y: photoY,
        width: photoWidth,
        height: photoHeight,
      });
      photoEmbedded = true;
    }
  } catch (photoErr) {
    console.warn(`[WARN] Could not embed photo for ${data.kukkiwonId}:`, photoErr);
  }

  // Fallback if image failed to load
  if (!photoEmbedded) {
    page.drawRectangle({
      x: photoX,
      y: photoY,
      width: photoWidth,
      height: photoHeight,
      color: rgb(0.1, 0.15, 0.25),
    });
    page.drawText("PHOTO", {
      x: photoX + 13,
      y: photoY + 33,
      size: 7,
      font: fontBold,
      color: slate400,
    });
  }

  // Kukkiwon ID Badge under photograph
  const kukBoxY = photoY - 17;
  page.drawRectangle({
    x: photoX - 1.5,
    y: kukBoxY,
    width: photoWidth + 3,
    height: 14,
    color: primaryColor,
    borderColor: goldColor,
    borderWidth: 0.8,
  });

  page.drawText("KUKKIWON ID", {
    x: photoX + 4,
    y: kukBoxY + 8,
    size: 4,
    font: fontBold,
    color: goldColor,
  });

  page.drawText(data.kukkiwonId, {
    x: photoX + 4,
    y: kukBoxY + 2.5,
    size: 5.5,
    font: fontMono,
    color: white,
  });

  // 4. Right Column: Athlete Details
  const textX = 72;

  // Athlete Full Name (Large bold text)
  let displayName = data.fullName.toUpperCase();
  if (displayName.length > 22) {
    displayName = displayName.substring(0, 22) + "...";
  }
  page.drawText(displayName, {
    x: textX,
    y: 110,
    size: 9.5,
    font: fontBold,
    color: white,
  });

  // Dan/Poom Rank pill
  const rankText = data.danOrPoom || "Registered Rank";
  page.drawText(rankText.toUpperCase(), {
    x: textX,
    y: 101,
    size: 5.5,
    font: fontBold,
    color: goldColor,
  });

  // Academy Information
  page.drawText("ACADEMY / CLUB", {
    x: textX,
    y: 89,
    size: 4,
    font: fontBold,
    color: slate400,
  });

  let academyDisplay = data.academyName;
  if (academyDisplay.length > 28) {
    academyDisplay = academyDisplay.substring(0, 28) + "...";
  }
  page.drawText(academyDisplay, {
    x: textX,
    y: 79,
    size: 6.5,
    font: fontBold,
    color: white,
  });

  // Weight Category Information
  page.drawText("REGISTERED WEIGHT CATEGORY", {
    x: textX,
    y: 68,
    size: 4,
    font: fontBold,
    color: slate400,
  });

  let weightDisplay = data.weightCategoryName;
  if (weightDisplay.length > 30) {
    weightDisplay = weightDisplay.substring(0, 30) + "...";
  }
  page.drawText(weightDisplay, {
    x: textX,
    y: 58,
    size: 6.5,
    font: fontBold,
    color: cyanColor,
  });

  // Division & Gender Grid
  page.drawText("DIVISION", {
    x: textX,
    y: 47,
    size: 4,
    font: fontBold,
    color: slate400,
  });
  page.drawText(data.division.toUpperCase(), {
    x: textX,
    y: 39,
    size: 6,
    font: fontBold,
    color: white,
  });

  const genderX = textX + 55;
  page.drawText("GENDER", {
    x: genderX,
    y: 47,
    size: 4,
    font: fontBold,
    color: slate400,
  });
  page.drawText(data.gender.toUpperCase(), {
    x: genderX,
    y: 39,
    size: 6,
    font: fontBold,
    color: white,
  });

  // Card & Registration Reference in Small Monospace
  const refText = `REG: ${data.registrationNumber}  |  CARD: ${data.cardNumber}`;
  page.drawText(refText, {
    x: textX,
    y: 27,
    size: 4.5,
    font: fontMono,
    color: slate400,
  });

  // 5. Bottom Footer Bar (#090D16)
  const footerHeight = 12;
  page.drawRectangle({
    x: 0,
    y: 0,
    width: CARD_WIDTH_PT,
    height: footerHeight,
    color: primaryColor,
  });

  page.drawLine({
    start: { x: 0, y: footerHeight },
    end: { x: CARD_WIDTH_PT, y: footerHeight },
    thickness: 0.8,
    color: cyanColor,
  });

  page.drawText(config.organizationName, {
    x: 10,
    y: 3.5,
    size: 4.5,
    font: fontBold,
    color: slate400,
  });

  page.drawText("OFFICIAL PARTICIPANT ACCREDITATION  •  NOT TRANSFERABLE", {
    x: CARD_WIDTH_PT - 150,
    y: 3.5,
    size: 3.8,
    font: fontRegular,
    color: slate600,
  });
}

/**
 * Draws an official championship portrait ID badge onto a template image
 */
export async function drawPortraitTemplateCard(
  doc: PDFDocument,
  page: any,
  data: AthleteCardData
) {
  const role = (data.cardRole || "PARTICIPANT").toUpperCase();
  const templateMap: Record<string, string> = {
    PARTICIPANT: "template-participant.jpg",
    REFEREE: "template-referee.jpg",
    COACH: "template-coach.jpg",
    STAFF: "template-staff.jpg",
  };
  const templateFilename = templateMap[role] || "template-participant.jpg";

  // Resolve template file path
  let templatePath = path.resolve(process.cwd(), "public", "templates", templateFilename);
  if (!fs.existsSync(templatePath)) {
    templatePath = path.resolve(process.cwd(), "src", "assets", "templates", templateFilename);
  }

  const { width: cardWidth, height: cardHeight } = page.getSize();

  // 1. Draw template background image
  if (fs.existsSync(templatePath)) {
    const templateBytes = fs.readFileSync(templatePath);
    const bgImage = await doc.embedJpg(templateBytes);
    page.drawImage(bgImage, {
      x: 0,
      y: 0,
      width: cardWidth,
      height: cardHeight,
    });
  }

  // 2. Draw Athlete Photograph in designated photo box
  // In template: x: 60.4%, y: 30% from top, w: 36.5%, h: 24.0%
  const photoX = cardWidth * 0.604;
  const photoY = cardHeight * (1 - 0.300 - 0.245);
  const photoW = cardWidth * 0.365;
  const photoH = cardHeight * 0.240;

  if (data.photoStorageKey) {
    try {
      const { buffer: photoBuffer } = await getPrivateFile(data.photoStorageKey);
      let embeddedPhoto: any = null;
      if (
        (data.photoMimeType && data.photoMimeType.includes("png")) ||
        photoBuffer.slice(0, 8).toString("hex") === "89504e470d0a1a0a"
      ) {
        embeddedPhoto = await doc.embedPng(photoBuffer);
      } else {
        embeddedPhoto = await doc.embedJpg(photoBuffer);
      }

      if (embeddedPhoto) {
        page.drawRectangle({
          x: photoX,
          y: photoY,
          width: photoW,
          height: photoH,
          color: rgb(1, 1, 1),
        });
        page.drawImage(embeddedPhoto, {
          x: photoX + 1.5,
          y: photoY + 1.5,
          width: photoW - 3,
          height: photoH - 3,
        });
      }
    } catch {
      // Photo fallback
      page.drawRectangle({
        x: photoX,
        y: photoY,
        width: photoW,
        height: photoH,
        color: rgb(0.95, 0.95, 0.95),
      });
    }
  }

  // 3. Load Fonts
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);

  const navyColor = rgb(0.04, 0.12, 0.30); // #0A1E4D
  const darkGray = rgb(0.20, 0.25, 0.30);
  const goldColor = rgb(0.78, 0.60, 0.15); // #C79A26
  const blueColor = rgb(0.00, 0.40, 0.85); // #0066D9

  // 4. Render Athlete Details in the open central area
  let textY = cardHeight * 0.41;

  // ATHLETE FULL NAME (Large Bold)
  const displayName = (data.fullName || "ATHLETE NAME").toUpperCase();
  const fontSize = displayName.length > 22 ? 11 : displayName.length > 16 ? 13 : 15;
  page.drawText(displayName, {
    x: 18,
    y: textY,
    size: fontSize,
    font: fontBold,
    color: navyColor,
  });

  textY -= 14;
  // Kukkiwon ID Badge
  page.drawRectangle({
    x: 18,
    y: textY - 2,
    width: 140,
    height: 14,
    color: rgb(0.92, 0.95, 1.0),
    borderColor: blueColor,
    borderWidth: 0.75,
  });
  page.drawText(`KUKKIWON ID: ${data.kukkiwonId || "UNVERIFIED"}`, {
    x: 22,
    y: textY + 1.5,
    size: 7.5,
    font: fontBold,
    color: blueColor,
  });

  textY -= 16;
  // Academy Name
  page.drawText("ACADEMY / CLUB", {
    x: 18,
    y: textY,
    size: 6.5,
    font: fontBold,
    color: goldColor,
  });
  textY -= 10;
  const acadName = data.academyName || "Independent Academy";
  const acadFontSize = acadName.length > 28 ? 6.5 : 7.5;
  page.drawText(acadName, {
    x: 18,
    y: textY,
    size: acadFontSize,
    font: fontBold,
    color: navyColor,
  });

  textY -= 14;
  // Weight & Division / Role
  page.drawText("CATEGORY & DIVISION", {
    x: 18,
    y: textY,
    size: 6.5,
    font: fontBold,
    color: goldColor,
  });
  textY -= 10;
  const catText = `${data.weightCategoryName || "Senior"}${data.danOrPoom ? ` • ${data.danOrPoom}` : ""}`;
  page.drawText(catText, {
    x: 18,
    y: textY,
    size: 7.5,
    font: fontRegular,
    color: darkGray,
  });

  textY -= 14;
  // Card & Registration Reference
  const refText = `REG: ${data.registrationNumber}  |  CARD: ${data.cardNumber}`;
  page.drawText(refText, {
    x: 18,
    y: textY,
    size: 6,
    font: fontBold,
    color: darkGray,
  });
}

/**
 * Generates an individual PDF document for a single athlete ID card
 */
export async function generateIndividualCardPdf(
  data: AthleteCardData,
  config?: Partial<ChampionshipBrandingConfig>
): Promise<{ buffer: Buffer; pageCount: number }> {
  const mergedConfig = { ...DEFAULT_BRANDING, ...config };
  const doc = await PDFDocument.create();

  // If a portrait official template was selected, use portrait dimensions
  const isPortraitRole = data.cardRole && ["PARTICIPANT", "REFEREE", "COACH", "STAFF"].includes(data.cardRole.toUpperCase());
  const pageWidth = isPortraitRole ? PORTRAIT_BADGE_WIDTH_PT : CARD_WIDTH_PT;
  const pageHeight = isPortraitRole ? PORTRAIT_BADGE_HEIGHT_PT : CARD_HEIGHT_PT;

  const page = doc.addPage([pageWidth, pageHeight]);

  await drawAthleteCard(doc, page, data, mergedConfig);

  const pdfBytes = await doc.save();
  return {
    buffer: Buffer.from(pdfBytes),
    pageCount: 1,
  };
}

/**
 * Generates a unified multi-page PDF document containing ID cards for multiple athletes.
 * Each page contains exactly one complete ID card with identical CR80 landscape dimensions.
 */
export async function generateBulkCardsPdf(
  cardsData: AthleteCardData[],
  config?: Partial<ChampionshipBrandingConfig>,
  onProgress?: (current: number, total: number) => void
): Promise<{ buffer: Buffer; pageCount: number; errors: { cardNumber: string; error: string }[] }> {
  const mergedConfig = { ...DEFAULT_BRANDING, ...config };
  const doc = await PDFDocument.create();
  const errors: { cardNumber: string; error: string }[] = [];

  for (let i = 0; i < cardsData.length; i++) {
    const cardData = cardsData[i];
    try {
      const isPortrait = cardData.cardRole && ["PARTICIPANT", "REFEREE", "COACH", "STAFF"].includes(cardData.cardRole.toUpperCase());
      const pW = isPortrait ? PORTRAIT_BADGE_WIDTH_PT : CARD_WIDTH_PT;
      const pH = isPortrait ? PORTRAIT_BADGE_HEIGHT_PT : CARD_HEIGHT_PT;
      const page = doc.addPage([pW, pH]);
      await drawAthleteCard(doc, page, cardData, mergedConfig);
      if (onProgress) {
        onProgress(i + 1, cardsData.length);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Render error";
      errors.push({ cardNumber: cardData.cardNumber, error: msg });
    }
  }

  const pdfBytes = await doc.save();
  return {
    buffer: Buffer.from(pdfBytes),
    pageCount: doc.getPageCount(),
    errors,
  };
}

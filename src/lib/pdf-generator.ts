import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fs from "fs";
import path from "path";
import { getPrivateFile } from "./storage";
import { drawVectorCountryFlag } from "./countries";

/**
 * Loads authentic official national flag PNG image buffer
 */
export function getCountryFlagBuffer(countryCode?: string | null): Buffer | null {
  const code = (countryCode || "IND").trim().toUpperCase();
  const candidates = [
    path.resolve(process.cwd(), "src", "assets", "flags", `${code}.png`),
    path.resolve(process.cwd(), "public", "flags", `${code}.png`),
    path.resolve("/tmp", "flags", `${code}.png`),
  ];

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate) && fs.statSync(candidate).size > 100) {
        return fs.readFileSync(candidate);
      }
    } catch {
      // ignore
    }
  }
  return null;
}

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
  countryCode?: string | null;
  countryName?: string | null;
  notes?: string | null;
  photoStorageKey: string;
  photoMimeType?: string;
  photoBase64?: string | null;
  photoBuffer?: Buffer | null;
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
  // If an official portrait template role was selected (default: PARTICIPANT), render onto that template
  const resolvedRole = (data.cardRole || "PARTICIPANT").toUpperCase();
  if (["PARTICIPANT", "REFEREE", "COACH", "STAFF"].includes(resolvedRole)) {
    await drawPortraitTemplateCard(doc, page, { ...data, cardRole: resolvedRole });
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

// Precise bounding coordinates of photo frames inside each official championship template
const PHOTO_FRAME_COORDS: Record<string, { xRatio: number; yTopRatio: number; wRatio: number; hRatio: number }> = {
  PARTICIPANT: { xRatio: 0.702, yTopRatio: 0.338, wRatio: 0.226, hRatio: 0.185 },
  COACH: { xRatio: 0.696, yTopRatio: 0.304, wRatio: 0.246, hRatio: 0.218 },
  REFEREE: { xRatio: 0.672, yTopRatio: 0.306, wRatio: 0.285, hRatio: 0.216 },
  STAFF: { xRatio: 0.705, yTopRatio: 0.306, wRatio: 0.250, hRatio: 0.216 },
};

/**
 * Draws an official championship portrait ID badge onto a template image matching the official format
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

  // Resolve private template file path
  let templatePath = path.resolve(process.cwd(), "src", "assets", "templates", templateFilename);
  if (!fs.existsSync(templatePath)) {
    templatePath = path.resolve(process.cwd(), "public", "templates", templateFilename);
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

  // 2. Draw Athlete Photograph inside the exact designated frame
  const coords = PHOTO_FRAME_COORDS[role] || PHOTO_FRAME_COORDS.PARTICIPANT;
  const photoX = cardWidth * coords.xRatio;
  const photoY = cardHeight * (1 - coords.yTopRatio - coords.hRatio);
  const photoW = cardWidth * coords.wRatio;
  const photoH = cardHeight * coords.hRatio;

  let photoBuffer: Buffer | null = data.photoBuffer || null;
  if (!photoBuffer && data.photoBase64) {
    try {
      photoBuffer = Buffer.from(data.photoBase64, "base64");
    } catch {
      // ignore
    }
  }
  if (!photoBuffer && data.photoStorageKey) {
    try {
      const res = await getPrivateFile(data.photoStorageKey);
      photoBuffer = res.buffer;
    } catch {
      // ignore
    }
  }

  if (photoBuffer) {
    try {
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
        // White backdrop
        page.drawRectangle({
          x: photoX,
          y: photoY,
          width: photoW,
          height: photoH,
          color: rgb(1, 1, 1),
        });
        // Render photo tightly inside inner box
        page.drawImage(embeddedPhoto, {
          x: photoX + 0.5,
          y: photoY + 0.5,
          width: photoW - 1,
          height: photoH - 1,
        });
      }
    } catch {
      // Photo fallback placeholder
      page.drawRectangle({
        x: photoX,
        y: photoY,
        width: photoW,
        height: photoH,
        color: rgb(0.95, 0.95, 0.95),
      });
    }
  } else {
    page.drawRectangle({
      x: photoX,
      y: photoY,
      width: photoW,
      height: photoH,
      color: rgb(0.96, 0.96, 0.97),
    });
  }

  // 3. Load Fonts
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);

  // 4. Render Details Block strictly aligned to the official format
  // Left side starts at x = 18 pt
  let textY = cardHeight * 0.49;

  // Line 1: Country Code + Authentic Official National Flag
  const country = (data.countryCode || "IND").toUpperCase();
  page.drawText(country, {
    x: 18,
    y: textY,
    size: 8.5,
    font: fontBold,
    color: rgb(0.08, 0.12, 0.18),
  });
  const countryTextWidth = fontBold.widthOfTextAtSize(country, 8.5);
  const flagX = 18 + countryTextWidth + 4.5;
  const flagW = 14;
  const flagH = 9.33;

  const flagBuffer = getCountryFlagBuffer(country);
  if (flagBuffer) {
    try {
      const flagImg = await doc.embedPng(flagBuffer);
      page.drawImage(flagImg, {
        x: flagX,
        y: textY - 1,
        width: flagW,
        height: flagH,
      });
      page.drawRectangle({
        x: flagX,
        y: textY - 1,
        width: flagW,
        height: flagH,
        borderColor: rgb(0.80, 0.82, 0.85),
        borderWidth: 0.4,
      });
    } catch {
      drawVectorCountryFlag(page, country, flagX, textY - 1, flagW, flagH);
    }
  } else {
    drawVectorCountryFlag(page, country, flagX, textY - 1, flagW, flagH);
  }

  // Line 2: Full Name (Bold Uppercase Black)
  textY -= 15;
  const displayName = (data.fullName || "NAME").toUpperCase();
  const nameFontSize = displayName.length > 24 ? 10.5 : displayName.length > 18 ? 12 : 13;
  page.drawText(displayName, {
    x: 18,
    y: textY,
    size: nameFontSize,
    font: fontBold,
    color: rgb(0.05, 0.08, 0.12),
  });

  // Line 3: Academy Name (Bold Uppercase Navy #1D3557)
  textY -= 14;
  const acadName = (data.academyName || "ACADEMY").toUpperCase();
  const acadFontSize = acadName.length > 28 ? 7.8 : 8.8;
  page.drawText(acadName, {
    x: 18,
    y: textY,
    size: acadFontSize,
    font: fontBold,
    color: rgb(0.11, 0.21, 0.34),
  });

  // Line 4: KKWID-{kukkiwonId} • {SubDetails}
  textY -= 13;
  const rawKukkiwon = (data.kukkiwonId || "").toUpperCase();
  const kkwPrefix = rawKukkiwon.startsWith("KKWID-") ? rawKukkiwon : `KKWID-${rawKukkiwon}`;

  let roleOrCategory = "";
  if (role === "COACH") {
    roleOrCategory = data.notes?.trim() || "Corner Coach";
  } else if (role === "REFEREE") {
    roleOrCategory = data.notes?.trim() || "Ring Judge / Referee";
  } else if (role === "STAFF") {
    roleOrCategory = data.notes?.trim() || "Organising Committee";
  } else {
    if (data.notes?.trim() && !data.notes.includes(data.weightCategoryName)) {
      roleOrCategory = `${data.weightCategoryName} • ${data.notes.trim()}`;
    } else {
      roleOrCategory = data.weightCategoryName || "Regular";
    }
  }

  // Draw Kukkiwon ID
  page.drawText(kkwPrefix, {
    x: 18,
    y: textY,
    size: 7.2,
    font: fontBold,
    color: rgb(0.05, 0.08, 0.12),
  });

  const kkwWidth = fontBold.widthOfTextAtSize(kkwPrefix, 7.2);
  const bulletX = 18 + kkwWidth + 3;

  // Draw gold/orange separator bullet dot •
  page.drawText("•", {
    x: bulletX,
    y: textY,
    size: 7.2,
    font: fontBold,
    color: rgb(0.92, 0.50, 0.10),
  });

  // If role is Coach/Referee/Staff or category is short: draw next to bullet on same line
  if (role !== "PARTICIPANT" || roleOrCategory.length <= 22) {
    page.drawText(roleOrCategory, {
      x: bulletX + 7,
      y: textY,
      size: 7.2,
      font: fontRegular,
      color: rgb(0.20, 0.25, 0.32),
    });
  } else {
    // If Participant category is long, wrap to line 5 as in official participant demo
    textY -= 10;
    const catFontSize = roleOrCategory.length > 50 ? 5.8 : 6.6;
    page.drawText(roleOrCategory, {
      x: 18,
      y: textY,
      size: catFontSize,
      font: fontRegular,
      color: rgb(0.20, 0.25, 0.32),
    });
  }
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
  const resolvedRole = (data.cardRole || "PARTICIPANT").toUpperCase();
  const isPortraitRole = ["PARTICIPANT", "REFEREE", "COACH", "STAFF"].includes(resolvedRole);
  const pageWidth = isPortraitRole ? PORTRAIT_BADGE_WIDTH_PT : CARD_WIDTH_PT;
  const pageHeight = isPortraitRole ? PORTRAIT_BADGE_HEIGHT_PT : CARD_HEIGHT_PT;

  const page = doc.addPage([pageWidth, pageHeight]);

  await drawAthleteCard(doc, page, { ...data, cardRole: resolvedRole }, mergedConfig);

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
      const resolvedRole = (cardData.cardRole || "PARTICIPANT").toUpperCase();
      const isPortrait = ["PARTICIPANT", "REFEREE", "COACH", "STAFF"].includes(resolvedRole);
      const pW = isPortrait ? PORTRAIT_BADGE_WIDTH_PT : CARD_WIDTH_PT;
      const pH = isPortrait ? PORTRAIT_BADGE_HEIGHT_PT : CARD_HEIGHT_PT;
      const page = doc.addPage([pW, pH]);
      await drawAthleteCard(doc, page, { ...cardData, cardRole: resolvedRole }, mergedConfig);
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

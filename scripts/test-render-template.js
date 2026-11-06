const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

async function renderTestCard(role) {
  const templateMap = {
    PARTICIPANT: 'template-participant.jpg',
    REFEREE: 'template-referee.jpg',
    COACH: 'template-coach.jpg',
    STAFF: 'template-staff.jpg',
  };

  const filename = templateMap[role] || 'template-participant.jpg';
  const templatePath = path.resolve(process.cwd(), 'public', 'templates', filename);
  const templateBytes = fs.readFileSync(templatePath);

  const doc = await PDFDocument.create();
  const bgImage = await doc.embedJpg(templateBytes);

  // Use a standard portrait badge size matching template aspect ratio
  // Standard vertical badge: 250 pt width
  const scale = 250 / bgImage.width;
  const cardWidth = 250;
  const cardHeight = bgImage.height * scale; // ~354 pt

  const page = doc.addPage([cardWidth, cardHeight]);

  // 1. Draw full template background
  page.drawImage(bgImage, {
    x: 0,
    y: 0,
    width: cardWidth,
    height: cardHeight,
  });

  // 2. Embed Sample Athlete Photo
  const photoPath = path.resolve(process.cwd(), 'public', 'logo.png'); // use photo or logo
  const photoBytes = fs.readFileSync(photoPath);
  const photoImage = await doc.embedPng(photoBytes);

  // Photo box coordinates (proportional from template analysis)
  // In template: x: 60%, y: 30% from top, w: 37.9%, h: 24.9%
  const photoX = cardWidth * 0.604;
  const photoY = cardHeight * (1 - 0.300 - 0.245);
  const photoW = cardWidth * 0.365;
  const photoH = cardHeight * 0.240;

  // Draw white background for photo box
  page.drawRectangle({
    x: photoX,
    y: photoY,
    width: photoW,
    height: photoH,
    color: rgb(1, 1, 1),
  });

  page.drawImage(photoImage, {
    x: photoX + 2,
    y: photoY + 2,
    width: photoW - 4,
    height: photoH - 4,
  });

  // 3. Load Fonts
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);

  // Colors
  const navyColor = rgb(0.04, 0.12, 0.30); // #0A1E4D
  const darkGray = rgb(0.20, 0.25, 0.30);
  const goldColor = rgb(0.78, 0.60, 0.15); // #C79A26
  const blueColor = rgb(0.00, 0.40, 0.85); // #0066D9

  // 4. Render Athlete Details in the open central area
  // Open area is between y: 0.58 and 0.82 from top (y: 0.18 to 0.42 from bottom)
  let textY = cardHeight * 0.40;

  // ATHLETE FULL NAME (Large Bold)
  const athleteName = "KANG HYUN-WOO";
  page.drawText(athleteName, {
    x: 20,
    y: textY,
    size: 15,
    font: fontBold,
    color: navyColor,
  });

  textY -= 14;
  // Kukkiwon ID Badge
  page.drawRectangle({
    x: 20,
    y: textY - 2,
    width: 140,
    height: 14,
    color: rgb(0.92, 0.95, 1.0),
    borderColor: blueColor,
    borderWidth: 0.75,
  });
  page.drawText("KUKKIWON ID: 05872134", {
    x: 24,
    y: textY + 1.5,
    size: 7.5,
    font: fontBold,
    color: blueColor,
  });

  textY -= 16;
  // Academy Name
  page.drawText("ACADEMY / CLUB", {
    x: 20,
    y: textY,
    size: 6.5,
    font: fontBold,
    color: goldColor,
  });
  textY -= 10;
  page.drawText("Kyorix National High-Performance Academy", {
    x: 20,
    y: textY,
    size: 8,
    font: fontBold,
    color: navyColor,
  });

  textY -= 14;
  // Weight & Division
  page.drawText("CATEGORY & DIVISION", {
    x: 20,
    y: textY,
    size: 6.5,
    font: fontBold,
    color: goldColor,
  });
  textY -= 10;
  page.drawText("Senior Male Under 58kg (Fly) • 1st Dan", {
    x: 20,
    y: textY,
    size: 8,
    font: fontRegular,
    color: darkGray,
  });

  textY -= 14;
  // Card & Registration Reference
  page.drawText("REG: REG-2026-0001  |  CARD: KYX-ID-2026-00001", {
    x: 20,
    y: textY,
    size: 6,
    font: fontBold,
    color: darkGray,
  });

  const pdfBytes = await doc.save();
  const outPath = path.resolve(process.cwd(), 'public', `test-${role.toLowerCase()}-card.pdf`);
  fs.writeFileSync(outPath, Buffer.from(pdfBytes));
  console.log(`Rendered ${role} card successfully:`, outPath, `(${pdfBytes.length} bytes)`);
}

async function main() {
  for (const role of ['PARTICIPANT', 'REFEREE', 'COACH', 'STAFF']) {
    await renderTestCard(role);
  }
}
main();


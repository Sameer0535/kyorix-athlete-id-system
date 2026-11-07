import { rgb } from "pdf-lib";

export interface WTCountry {
  code: string;       // 3-letter IOC / World Taekwondo NOC code
  name: string;       // Official Country Name
  flagEmoji: string;  // Unicode Flag Emoji
}

/**
 * Official World Taekwondo Member National Associations (WT MNAs)
 * Sorted alphabetically with India (Host / Default) at the top.
 */
export const WT_COUNTRIES: WTCountry[] = [
  { code: "IND", name: "India", flagEmoji: "🇮🇳" },
  { code: "AFG", name: "Afghanistan", flagEmoji: "🇦🇫" },
  { code: "ARG", name: "Argentina", flagEmoji: "🇦🇷" },
  { code: "AUS", name: "Australia", flagEmoji: "🇦🇺" },
  { code: "AUT", name: "Austria", flagEmoji: "🇦🇹" },
  { code: "AZE", name: "Azerbaijan", flagEmoji: "🇦🇿" },
  { code: "BRN", name: "Bahrain", flagEmoji: "🇧🇭" },
  { code: "BAN", name: "Bangladesh", flagEmoji: "🇧🇩" },
  { code: "BEL", name: "Belgium", flagEmoji: "🇧🇪" },
  { code: "BHU", name: "Bhutan", flagEmoji: "🇧🇹" },
  { code: "BRA", name: "Brazil", flagEmoji: "🇧🇷" },
  { code: "CAN", name: "Canada", flagEmoji: "🇨🇦" },
  { code: "CHI", name: "Chile", flagEmoji: "🇨🇱" },
  { code: "CHN", name: "China", flagEmoji: "🇨🇳" },
  { code: "TPE", name: "Chinese Taipei", flagEmoji: "🇹🇼" },
  { code: "COL", name: "Colombia", flagEmoji: "🇨🇴" },
  { code: "CRO", name: "Croatia", flagEmoji: "🇭🇷" },
  { code: "CUB", name: "Cuba", flagEmoji: "🇨🇺" },
  { code: "DEN", name: "Denmark", flagEmoji: "🇩🇰" },
  { code: "EGY", name: "Egypt", flagEmoji: "🇪🇬" },
  { code: "ESP", name: "Spain", flagEmoji: "🇪🇸" },
  { code: "FIN", name: "Finland", flagEmoji: "🇫🇮" },
  { code: "FRA", name: "France", flagEmoji: "🇫🇷" },
  { code: "GBR", name: "Great Britain", flagEmoji: "🇬🇧" },
  { code: "GER", name: "Germany", flagEmoji: "🇩🇪" },
  { code: "GRE", name: "Greece", flagEmoji: "🇬🇷" },
  { code: "HKG", name: "Hong Kong", flagEmoji: "🇭🇰" },
  { code: "HUN", name: "Hungary", flagEmoji: "🇭🇺" },
  { code: "INA", name: "Indonesia", flagEmoji: "🇮🇩" },
  { code: "IRI", name: "Iran", flagEmoji: "🇮🇷" },
  { code: "IRL", name: "Ireland", flagEmoji: "🇮🇪" },
  { code: "ITA", name: "Italy", flagEmoji: "🇮🇹" },
  { code: "JOR", name: "Jordan", flagEmoji: "🇯🇴" },
  { code: "JPN", name: "Japan", flagEmoji: "🇯🇵" },
  { code: "KAZ", name: "Kazakhstan", flagEmoji: "🇰🇿" },
  { code: "KEN", name: "Kenya", flagEmoji: "🇰🇪" },
  { code: "KOR", name: "Republic of Korea", flagEmoji: "🇰🇷" },
  { code: "KSA", name: "Saudi Arabia", flagEmoji: "🇸🇦" },
  { code: "KUW", name: "Kuwait", flagEmoji: "🇰🇼" },
  { code: "MAS", name: "Malaysia", flagEmoji: "🇲🇾" },
  { code: "MDV", name: "Maldives", flagEmoji: "🇲🇻" },
  { code: "MEX", name: "Mexico", flagEmoji: "🇲🇽" },
  { code: "MGL", name: "Mongolia", flagEmoji: "🇲🇳" },
  { code: "MAR", name: "Morocco", flagEmoji: "🇲🇦" },
  { code: "NEP", name: "Nepal", flagEmoji: "🇳🇵" },
  { code: "NED", name: "Netherlands", flagEmoji: "🇳🇱" },
  { code: "NZL", name: "New Zealand", flagEmoji: "🇳🇿" },
  { code: "NGR", name: "Nigeria", flagEmoji: "🇳🇬" },
  { code: "NOR", name: "Norway", flagEmoji: "🇳🇴" },
  { code: "OMA", name: "Oman", flagEmoji: "🇴🇲" },
  { code: "PAK", name: "Pakistan", flagEmoji: "🇵🇰" },
  { code: "PER", name: "Peru", flagEmoji: "🇵🇪" },
  { code: "PHI", name: "Philippines", flagEmoji: "🇵🇭" },
  { code: "POL", name: "Poland", flagEmoji: "🇵🇱" },
  { code: "POR", name: "Portugal", flagEmoji: "🇵🇹" },
  { code: "QAT", name: "Qatar", flagEmoji: "🇶🇦" },
  { code: "RSA", name: "South Africa", flagEmoji: "🇿🇦" },
  { code: "SRB", name: "Serbia", flagEmoji: "🇷🇸" },
  { code: "SGP", name: "Singapore", flagEmoji: "🇸🇬" },
  { code: "SRI", name: "Sri Lanka", flagEmoji: "🇱🇰" },
  { code: "SWE", name: "Sweden", flagEmoji: "🇸🇪" },
  { code: "SUI", name: "Switzerland", flagEmoji: "🇨🇭" },
  { code: "THA", name: "Thailand", flagEmoji: "🇹🇭" },
  { code: "TUN", name: "Tunisia", flagEmoji: "🇹🇳" },
  { code: "TUR", name: "Turkey", flagEmoji: "🇹🇷" },
  { code: "UAE", name: "United Arab Emirates", flagEmoji: "🇦🇪" },
  { code: "USA", name: "United States of America", flagEmoji: "🇺🇸" },
  { code: "UZB", name: "Uzbekistan", flagEmoji: "🇺🇿" },
  { code: "VIE", name: "Vietnam", flagEmoji: "🇻🇳" },
];

export function getCountryByCode(code?: string | null): WTCountry {
  if (!code) return WT_COUNTRIES[0];
  const normalized = code.trim().toUpperCase();
  const match = WT_COUNTRIES.find((c) => c.code === normalized);
  return match || { code: normalized, name: normalized, flagEmoji: "🏳️" };
}

/**
 * Draws an official vector national flag onto a PDF page.
 * Standard size: 14pt width x 9.5pt height.
 */
export function drawVectorCountryFlag(
  page: any,
  countryCode: string = "IND",
  x: number,
  y: number,
  width = 14,
  height = 9.5
) {
  const code = (countryCode || "IND").toUpperCase();

  // Helper for thin gray border
  const drawBorder = () => {
    page.drawRectangle({
      x,
      y,
      width,
      height,
      borderColor: rgb(0.75, 0.75, 0.75),
      borderWidth: 0.4,
    });
  };

  if (code === "IND") {
    // INDIA (Tiranga: Saffron, White with blue chakra, Green)
    const stripeH = height / 3;
    page.drawRectangle({ x, y: y + stripeH * 2, width, height: stripeH, color: rgb(1.0, 0.60, 0.20) });
    page.drawRectangle({ x, y: y + stripeH, width, height: stripeH, color: rgb(1.0, 1.0, 1.0) });
    page.drawRectangle({ x, y, width, height: stripeH, color: rgb(0.075, 0.533, 0.031) });
    page.drawCircle({ x: x + width / 2, y: y + height / 2, size: 1.15, color: rgb(0.0, 0.0, 0.50) });
    drawBorder();
    return;
  }

  if (code === "KOR") {
    // KOREA (White field with red/blue Taegeuk circle)
    page.drawRectangle({ x, y, width, height, color: rgb(1.0, 1.0, 1.0) });
    const cx = x + width / 2;
    const cy = y + height / 2;
    const r = 2.4;
    // Top red half
    page.drawCircle({ x: cx, y: cy + 0.6, size: r * 0.7, color: rgb(0.80, 0.18, 0.23) });
    // Bottom blue half
    page.drawCircle({ x: cx, y: cy - 0.6, size: r * 0.7, color: rgb(0.00, 0.28, 0.63) });
    // Trigram bars
    page.drawRectangle({ x: x + 1.5, y: y + height - 3, width: 2, height: 0.8, color: rgb(0, 0, 0) });
    page.drawRectangle({ x: x + width - 3.5, y: y + 2, width: 2, height: 0.8, color: rgb(0, 0, 0) });
    drawBorder();
    return;
  }

  if (code === "USA") {
    // USA (Red & white stripes with blue canton)
    const stripeH = height / 5;
    for (let i = 0; i < 5; i++) {
      page.drawRectangle({
        x,
        y: y + i * stripeH,
        width,
        height: stripeH,
        color: i % 2 === 0 ? rgb(0.70, 0.13, 0.20) : rgb(1.0, 1.0, 1.0),
      });
    }
    // Blue canton
    page.drawRectangle({
      x,
      y: y + height * 0.4,
      width: width * 0.45,
      height: height * 0.6,
      color: rgb(0.24, 0.23, 0.43),
    });
    // White star dot
    page.drawCircle({ x: x + width * 0.22, y: y + height * 0.7, size: 0.8, color: rgb(1, 1, 1) });
    drawBorder();
    return;
  }

  if (code === "GBR") {
    // GREAT BRITAIN (Navy with white and red Union crosses)
    page.drawRectangle({ x, y, width, height, color: rgb(0.00, 0.13, 0.41) });
    // White diagonal & straight cross
    page.drawRectangle({ x: x + width / 2 - 1.2, y, width: 2.4, height, color: rgb(1, 1, 1) });
    page.drawRectangle({ x, y: y + height / 2 - 1.2, width, height: 2.4, color: rgb(1, 1, 1) });
    // Red straight cross
    page.drawRectangle({ x: x + width / 2 - 0.6, y, width: 1.2, height, color: rgb(0.78, 0.06, 0.18) });
    page.drawRectangle({ x, y: y + height / 2 - 0.6, width, height: 1.2, color: rgb(0.78, 0.06, 0.18) });
    drawBorder();
    return;
  }

  if (code === "NEP") {
    // NEPAL (Crimson field with blue border)
    page.drawRectangle({ x, y, width, height, color: rgb(0.86, 0.08, 0.24) });
    page.drawCircle({ x: x + width * 0.4, y: y + height * 0.68, size: 1.2, color: rgb(1, 1, 1) });
    page.drawCircle({ x: x + width * 0.4, y: y + height * 0.32, size: 1.3, color: rgb(1, 1, 1) });
    page.drawRectangle({ x, y, width: 1, height, color: rgb(0.00, 0.22, 0.58) });
    drawBorder();
    return;
  }

  if (code === "BAN") {
    // BANGLADESH (Bottle green with red circle)
    page.drawRectangle({ x, y, width, height, color: rgb(0.00, 0.42, 0.31) });
    page.drawCircle({ x: x + width * 0.45, y: y + height / 2, size: 2.5, color: rgb(0.96, 0.16, 0.25) });
    drawBorder();
    return;
  }

  if (code === "SRI") {
    // SRI LANKA (Gold border, maroon field, green & orange stripes)
    page.drawRectangle({ x, y, width, height, color: rgb(1.0, 0.75, 0.16) });
    page.drawRectangle({ x: x + 1.2, y: y + 1, width: 2, height: height - 2, color: rgb(0.00, 0.45, 0.25) });
    page.drawRectangle({ x: x + 3.2, y: y + 1, width: 2, height: height - 2, color: rgb(0.90, 0.45, 0.10) });
    page.drawRectangle({ x: x + 5.5, y: y + 1, width: width - 6.7, height: height - 2, color: rgb(0.55, 0.08, 0.23) });
    drawBorder();
    return;
  }

  if (code === "UAE") {
    // UAE (Red vertical, green, white, black horizontal)
    const stripeH = height / 3;
    page.drawRectangle({ x, y: y + stripeH * 2, width, height: stripeH, color: rgb(0.00, 0.45, 0.18) });
    page.drawRectangle({ x, y: y + stripeH, width, height: stripeH, color: rgb(1.0, 1.0, 1.0) });
    page.drawRectangle({ x, y, width, height: stripeH, color: rgb(0.05, 0.05, 0.05) });
    page.drawRectangle({ x, y, width: 3.5, height, color: rgb(1.0, 0.00, 0.00) });
    drawBorder();
    return;
  }

  if (code === "JPN") {
    // JAPAN (White with red sun circle)
    page.drawRectangle({ x, y, width, height, color: rgb(1.0, 1.0, 1.0) });
    page.drawCircle({ x: x + width / 2, y: y + height / 2, size: 2.5, color: rgb(0.74, 0.00, 0.18) });
    drawBorder();
    return;
  }

  if (code === "CAN") {
    // CANADA (Red, white, red)
    page.drawRectangle({ x, y, width, height, color: rgb(1.0, 1.0, 1.0) });
    page.drawRectangle({ x, y, width: 3.5, height, color: rgb(1.0, 0.0, 0.0) });
    page.drawRectangle({ x: x + width - 3.5, y, width: 3.5, height, color: rgb(1.0, 0.0, 0.0) });
    page.drawCircle({ x: x + width / 2, y: y + height / 2, size: 1.5, color: rgb(1.0, 0.0, 0.0) });
    drawBorder();
    return;
  }

  if (code === "FRA") {
    // FRANCE (Blue, white, red vertical)
    const stripeW = width / 3;
    page.drawRectangle({ x, y, width: stripeW, height, color: rgb(0.00, 0.15, 0.33) });
    page.drawRectangle({ x: x + stripeW, y, width: stripeW, height, color: rgb(1.0, 1.0, 1.0) });
    page.drawRectangle({ x: x + stripeW * 2, y, width: stripeW, height, color: rgb(0.93, 0.16, 0.22) });
    drawBorder();
    return;
  }

  if (code === "GER") {
    // GERMANY (Black, red, gold horizontal)
    const stripeH = height / 3;
    page.drawRectangle({ x, y: y + stripeH * 2, width, height: stripeH, color: rgb(0.05, 0.05, 0.05) });
    page.drawRectangle({ x, y: y + stripeH, width, height: stripeH, color: rgb(0.87, 0.00, 0.00) });
    page.drawRectangle({ x, y, width, height: stripeH, color: rgb(1.00, 0.81, 0.00) });
    drawBorder();
    return;
  }

  if (code === "ITA") {
    // ITALY (Green, white, red vertical)
    const stripeW = width / 3;
    page.drawRectangle({ x, y, width: stripeW, height, color: rgb(0.00, 0.55, 0.27) });
    page.drawRectangle({ x: x + stripeW, y, width: stripeW, height, color: rgb(1.0, 1.0, 1.0) });
    page.drawRectangle({ x: x + stripeW * 2, y, width: stripeW, height, color: rgb(0.80, 0.13, 0.16) });
    drawBorder();
    return;
  }

  if (code === "ESP") {
    // SPAIN (Red, yellow, red horizontal)
    page.drawRectangle({ x, y: y + height * 0.75, width, height: height * 0.25, color: rgb(0.67, 0.08, 0.11) });
    page.drawRectangle({ x, y: y + height * 0.25, width, height: height * 0.50, color: rgb(0.95, 0.75, 0.00) });
    page.drawRectangle({ x, y, width, height: height * 0.25, color: rgb(0.67, 0.08, 0.11) });
    drawBorder();
    return;
  }

  if (code === "THA") {
    // THAILAND (Red, white, blue, white, red)
    const h1 = height * 0.16;
    const h2 = height * 0.36;
    page.drawRectangle({ x, y: y + height - h1, width, height: h1, color: rgb(0.65, 0.08, 0.15) });
    page.drawRectangle({ x, y: y + height - h1 * 2, width, height: h1, color: rgb(1.0, 1.0, 1.0) });
    page.drawRectangle({ x, y: y + h1 * 2, width, height: h2, color: rgb(0.12, 0.16, 0.32) });
    page.drawRectangle({ x, y: y + h1, width, height: h1, color: rgb(1.0, 1.0, 1.0) });
    page.drawRectangle({ x, y, width, height: h1, color: rgb(0.65, 0.08, 0.15) });
    drawBorder();
    return;
  }

  // DEFAULT FALLBACK: Clean official tournament badge with solid blue/white field
  page.drawRectangle({ x, y, width, height, color: rgb(0.10, 0.35, 0.75) });
  page.drawRectangle({ x: x + 1, y: y + 1, width: width - 2, height: height - 2, color: rgb(1.0, 1.0, 1.0) });
  page.drawRectangle({ x: x + 2, y: y + 2, width: width - 4, height: height - 4, color: rgb(0.10, 0.35, 0.75) });
  drawBorder();
}


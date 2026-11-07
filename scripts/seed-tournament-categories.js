const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const categories = [
  // -------------------------------------------------------------
  // OFFICIAL ACCREDITED ROLES (COACH, REFEREE, STAFF)
  // -------------------------------------------------------------
  {
    code: "OFFICIAL_COACH",
    division: "SENIOR",
    gender: "MALE",
    name: "Coach / Team Official",
    minWeightKg: null,
    maxWeightKg: 0,
  },
  {
    code: "OFFICIAL_REFEREE",
    division: "SENIOR",
    gender: "MALE",
    name: "Referee / Ring Official",
    minWeightKg: null,
    maxWeightKg: 0,
  },
  {
    code: "OFFICIAL_STAFF",
    division: "SENIOR",
    gender: "MALE",
    name: "Organising Committee / Staff",
    minWeightKg: null,
    maxWeightKg: 0,
  },

  // -------------------------------------------------------------
  // 1. KYORUGI (SPARRING) FRESHERS
  // -------------------------------------------------------------
  // Children (Ages 5-11, Born 2014+)
  ...["Fin", "Fly", "Bantam", "Feather", "Light", "Welter", "Middle", "Heavy"].flatMap((wt, idx) => [
    {
      code: `KY_FR_CH_M_${wt.toUpperCase()}`,
      division: "SUB_CADET",
      gender: "MALE",
      name: `Kyorugi (Freshers) - Children Male ${wt}`,
      minWeightKg: null,
      maxWeightKg: 20 + idx * 3,
    },
    {
      code: `KY_FR_CH_F_${wt.toUpperCase()}`,
      division: "SUB_CADET",
      gender: "FEMALE",
      name: `Kyorugi (Freshers) - Children Female ${wt}`,
      minWeightKg: null,
      maxWeightKg: 18 + idx * 3,
    },
  ]),

  // Sub-Junior (Ages 10-11, Born 2013-2014) -18kg to +41kg
  ...["-18kg", "-21kg", "-23kg", "-25kg", "-27kg", "-29kg", "-32kg", "-35kg", "-38kg", "-41kg", "+41kg"].flatMap((wt, idx) => [
    {
      code: `KY_FR_SUBJR_M_${wt.replace(/[^0-9A-Z]/gi, "")}`,
      division: "SUB_CADET",
      gender: "MALE",
      name: `Kyorugi (Freshers) - Sub-Junior Male ${wt}`,
      minWeightKg: idx === 0 ? null : 16 + idx * 2.5,
      maxWeightKg: 18 + idx * 2.5,
    },
    {
      code: `KY_FR_SUBJR_F_${wt.replace(/[^0-9A-Z]/gi, "")}`,
      division: "SUB_CADET",
      gender: "FEMALE",
      name: `Kyorugi (Freshers) - Sub-Junior Female ${wt}`,
      minWeightKg: idx === 0 ? null : 16 + idx * 2.5,
      maxWeightKg: 18 + idx * 2.5,
    },
  ]),

  // Cadet Freshers (Ages 12-14)
  // Male: -33, -37, -41, -45, -49, -53, -57, -61, -65, +65
  ...["-33kg", "-37kg", "-41kg", "-45kg", "-49kg", "-53kg", "-57kg", "-61kg", "-65kg", "+65kg"].map((wt, idx) => ({
    code: `KY_FR_CAD_M_${wt.replace(/[^0-9A-Z]/gi, "")}`,
    division: "CADET",
    gender: "MALE",
    name: `Kyorugi (Freshers) - Cadet Male ${wt}`,
    minWeightKg: idx === 0 ? null : 33 + idx * 4,
    maxWeightKg: 33 + idx * 4,
  })),
  // Female: -29, -33, -37, -41, -44, -47, -51, -55, -59, +59
  ...["-29kg", "-33kg", "-37kg", "-41kg", "-44kg", "-47kg", "-51kg", "-55kg", "-59kg", "+59kg"].map((wt, idx) => ({
    code: `KY_FR_CAD_F_${wt.replace(/[^0-9A-Z]/gi, "")}`,
    division: "CADET",
    gender: "FEMALE",
    name: `Kyorugi (Freshers) - Cadet Female ${wt}`,
    minWeightKg: idx === 0 ? null : 29 + idx * 4,
    maxWeightKg: 29 + idx * 4,
  })),

  // Junior Freshers (Ages 15-17)
  // Male: -45, -48, -51, -55, -59, -63, -68, -73, -78, +78
  ...["-45kg", "-48kg", "-51kg", "-55kg", "-59kg", "-63kg", "-68kg", "-73kg", "-78kg", "+78kg"].map((wt, idx) => ({
    code: `KY_FR_JR_M_${wt.replace(/[^0-9A-Z]/gi, "")}`,
    division: "JUNIOR",
    gender: "MALE",
    name: `Kyorugi (Freshers) - Junior Male ${wt}`,
    minWeightKg: idx === 0 ? null : 45 + idx * 4,
    maxWeightKg: 45 + idx * 4,
  })),
  // Female: -42, -44, -46, -49, -52, -55, -59, -63, -68, +68
  ...["-42kg", "-44kg", "-46kg", "-49kg", "-52kg", "-55kg", "-59kg", "-63kg", "-68kg", "+68kg"].map((wt, idx) => ({
    code: `KY_FR_JR_F_${wt.replace(/[^0-9A-Z]/gi, "")}`,
    division: "JUNIOR",
    gender: "FEMALE",
    name: `Kyorugi (Freshers) - Junior Female ${wt}`,
    minWeightKg: idx === 0 ? null : 42 + idx * 3,
    maxWeightKg: 42 + idx * 3,
  })),

  // Senior Freshers (17+ Years)
  // Male: -54, -58, -63, -68, -74, -80, -87, +87
  ...["-54kg (Fin)", "-58kg (Fly)", "-63kg (Bantam)", "-68kg (Feather)", "-74kg (Light)", "-80kg (Welter)", "-87kg (Middle)", "+87kg (Heavy)"].map((wt, idx) => ({
    code: `KY_FR_SR_M_W${idx + 1}`,
    division: "SENIOR",
    gender: "MALE",
    name: `Kyorugi (Freshers) - Senior Male ${wt}`,
    minWeightKg: null,
    maxWeightKg: 54 + idx * 5,
  })),
  // Female: -46, -49, -53, -57, -62, -67, -73, +73
  ...["-46kg (Fin)", "-49kg (Fly)", "-53kg (Bantam)", "-57kg (Feather)", "-62kg (Light)", "-67kg (Welter)", "-73kg (Middle)", "+73kg (Heavy)"].map((wt, idx) => ({
    code: `KY_FR_SR_F_W${idx + 1}`,
    division: "SENIOR",
    gender: "FEMALE",
    name: `Kyorugi (Freshers) - Senior Female ${wt}`,
    minWeightKg: null,
    maxWeightKg: 46 + idx * 4,
  })),

  // -------------------------------------------------------------
  // 2. KYORUGI (SPARRING) REGULAR (WT / OLYMPIC)
  // -------------------------------------------------------------
  // Sub-Junior Regular (Ages 10-11)
  ...["-18kg", "-21kg", "-23kg", "-25kg", "-27kg", "-29kg", "-32kg", "-35kg", "-38kg", "-41kg", "+41kg"].flatMap((wt, idx) => [
    {
      code: `KY_REG_SUBJR_M_${wt.replace(/[^0-9A-Z]/gi, "")}`,
      division: "SUB_CADET",
      gender: "MALE",
      name: `Kyorugi (Regular) - Sub-Junior Male ${wt}`,
      minWeightKg: null,
      maxWeightKg: 18 + idx * 2.5,
    },
    {
      code: `KY_REG_SUBJR_F_${wt.replace(/[^0-9A-Z]/gi, "")}`,
      division: "SUB_CADET",
      gender: "FEMALE",
      name: `Kyorugi (Regular) - Sub-Junior Female ${wt}`,
      minWeightKg: null,
      maxWeightKg: 18 + idx * 2.5,
    },
  ]),

  // Cadet Regular (Ages 12-14)
  ...["-33kg (Fin)", "-37kg (Fly)", "-41kg (Bantam)", "-45kg (Feather)", "-49kg (Light)", "-53kg (Welter)", "-57kg (Light Middle)", "-61kg (Middle)", "-65kg (Light Heavy)", "+65kg (Heavyweight)"].map((wt, idx) => ({
    code: `KY_REG_CAD_M_W${idx + 1}`,
    division: "CADET",
    gender: "MALE",
    name: `Kyorugi (Regular) - Cadet Male ${wt}`,
    minWeightKg: null,
    maxWeightKg: 33 + idx * 4,
  })),
  ...["-29kg (Fin)", "-33kg (Fly)", "-37kg (Bantam)", "-41kg (Feather)", "-44kg (Light)", "-47kg (Welter)", "-51kg (Light Middle)", "-55kg (Middle)", "-59kg (Light Heavy)", "+59kg (Heavyweight)"].map((wt, idx) => ({
    code: `KY_REG_CAD_F_W${idx + 1}`,
    division: "CADET",
    gender: "FEMALE",
    name: `Kyorugi (Regular) - Cadet Female ${wt}`,
    minWeightKg: null,
    maxWeightKg: 29 + idx * 4,
  })),

  // Junior Regular (Ages 15-17)
  ...["-45kg (Fin)", "-48kg (Fly)", "-51kg (Bantam)", "-55kg (Feather)", "-59kg (Light)", "-63kg (Welter)", "-68kg (Light Middle)", "-73kg (Middle)", "-78kg (Light Heavy)", "+78kg (Heavy)"].map((wt, idx) => ({
    code: `KY_REG_JR_M_W${idx + 1}`,
    division: "JUNIOR",
    gender: "MALE",
    name: `Kyorugi (Regular) - Junior Male ${wt}`,
    minWeightKg: null,
    maxWeightKg: 45 + idx * 4,
  })),
  ...["-42kg (Fin)", "-44kg (Fly)", "-46kg (Bantam)", "-49kg (Feather)", "-52kg (Light)", "-55kg (Welter)", "-59kg (Light Middle)", "-63kg (Middle)", "-68kg (Light Heavy)", "+68kg (Heavy)"].map((wt, idx) => ({
    code: `KY_REG_JR_F_W${idx + 1}`,
    division: "JUNIOR",
    gender: "FEMALE",
    name: `Kyorugi (Regular) - Junior Female ${wt}`,
    minWeightKg: null,
    maxWeightKg: 42 + idx * 3,
  })),

  // Senior Regular (17+ Years)
  ...["-54kg (Fin)", "-58kg (Fly)", "-63kg (Bantam)", "-68kg (Feather)", "-74kg (Light)", "-80kg (Welter)", "-87kg (Middle)", "+87kg (Heavy)"].map((wt, idx) => ({
    code: `KY_REG_SR_M_W${idx + 1}`,
    division: "SENIOR",
    gender: "MALE",
    name: `Kyorugi (Regular) - Senior Male ${wt}`,
    minWeightKg: null,
    maxWeightKg: 54 + idx * 5,
  })),
  ...["-46kg (Fin)", "-49kg (Fly)", "-53kg (Bantam)", "-57kg (Feather)", "-62kg (Light)", "-67kg (Welter)", "-73kg (Middle)", "+73kg (Heavy)"].map((wt, idx) => ({
    code: `KY_REG_SR_F_W${idx + 1}`,
    division: "SENIOR",
    gender: "FEMALE",
    name: `Kyorugi (Regular) - Senior Female ${wt}`,
    minWeightKg: null,
    maxWeightKg: 46 + idx * 4,
  })),

  // -------------------------------------------------------------
  // 3. KYORUGI TEAM REGULAR
  // -------------------------------------------------------------
  {
    code: "KY_TEAM_SR_M",
    division: "SENIOR",
    gender: "MALE",
    name: "Kyorugi Team Regular - Senior Boys (Team of 3)",
    minWeightKg: null,
    maxWeightKg: 240,
  },
  {
    code: "KY_TEAM_SR_F",
    division: "SENIOR",
    gender: "FEMALE",
    name: "Kyorugi Team Regular - Senior Girls (Team of 3)",
    minWeightKg: null,
    maxWeightKg: 200,
  },

  // -------------------------------------------------------------
  // 4. RECOGNISED POOMSAE INDIVIDUAL
  // -------------------------------------------------------------
  // Freshers
  { code: "POOM_FR_IND_CH_M", division: "SUB_CADET", gender: "MALE", name: "Recognised Poomsae Individual (Freshers) - Children Male (U12)", maxWeightKg: 0 },
  { code: "POOM_FR_IND_CH_F", division: "SUB_CADET", gender: "FEMALE", name: "Recognised Poomsae Individual (Freshers) - Children Female (U12)", maxWeightKg: 0 },
  { code: "POOM_FR_IND_SUBJR_M", division: "SUB_CADET", gender: "MALE", name: "Recognised Poomsae Individual (Freshers) - Sub-Junior Male", maxWeightKg: 0 },
  { code: "POOM_FR_IND_SUBJR_F", division: "SUB_CADET", gender: "FEMALE", name: "Recognised Poomsae Individual (Freshers) - Sub-Junior Female", maxWeightKg: 0 },
  { code: "POOM_FR_IND_CAD_M", division: "CADET", gender: "MALE", name: "Recognised Poomsae Individual (Freshers) - Cadet Male", maxWeightKg: 0 },
  { code: "POOM_FR_IND_CAD_F", division: "CADET", gender: "FEMALE", name: "Recognised Poomsae Individual (Freshers) - Cadet Female", maxWeightKg: 0 },

  // Regular
  ...[
    "Junior I (U12)",
    "Junior II (U15)",
    "Junior III (U18)",
    "Senior I (U29)",
    "Senior II (U39)",
    "Senior III (U49)",
    "Senior IV (U59)",
    "Master I (U69)",
    "Master II (Over 70)",
  ].flatMap((band, idx) => {
    const div = idx === 0 ? "SUB_CADET" : idx === 1 ? "CADET" : idx === 2 ? "JUNIOR" : "SENIOR";
    return [
      {
        code: `POOM_REG_IND_M_${idx + 1}`,
        division: div,
        gender: "MALE",
        name: `Recognised Poomsae Individual (Regular) - ${band} Male`,
        maxWeightKg: 0,
      },
      {
        code: `POOM_REG_IND_F_${idx + 1}`,
        division: div,
        gender: "FEMALE",
        name: `Recognised Poomsae Individual (Regular) - ${band} Female`,
        maxWeightKg: 0,
      },
    ];
  }),

  // -------------------------------------------------------------
  // 5. RECOGNISED POOMSAE MIX PAIR
  // -------------------------------------------------------------
  { code: "POOM_FR_PAIR_CH", division: "SUB_CADET", gender: "MALE", name: "Recognised Poomsae Mix Pair (Freshers) - Children (U12)", maxWeightKg: 0 },
  { code: "POOM_FR_PAIR_SUBJR", division: "SUB_CADET", gender: "MALE", name: "Recognised Poomsae Mix Pair (Freshers) - Sub-Junior", maxWeightKg: 0 },
  { code: "POOM_FR_PAIR_CAD", division: "CADET", gender: "MALE", name: "Recognised Poomsae Mix Pair (Freshers) - Cadet", maxWeightKg: 0 },
  ...["Children", "Sub-Junior", "Cadet", "Junior", "Under 30 Yrs", "Above 30 Yrs"].map((band, idx) => {
    const div = idx <= 1 ? "SUB_CADET" : idx === 2 ? "CADET" : idx === 3 ? "JUNIOR" : "SENIOR";
    return {
      code: `POOM_REG_PAIR_${idx + 1}`,
      division: div,
      gender: "MALE",
      name: `Recognised Poomsae Mix Pair (Regular) - ${band}`,
      maxWeightKg: 0,
    };
  }),

  // -------------------------------------------------------------
  // 6. RECOGNISED POOMSAE TEAM (TRIO)
  // -------------------------------------------------------------
  ...["Children", "Sub-Junior", "Cadet", "Junior", "Under 30 Yrs", "Above 30 Yrs"].flatMap((band, idx) => {
    const div = idx <= 1 ? "SUB_CADET" : idx === 2 ? "CADET" : idx === 3 ? "JUNIOR" : "SENIOR";
    return [
      {
        code: `POOM_REG_TEAM_M_${idx + 1}`,
        division: div,
        gender: "MALE",
        name: `Recognised Poomsae Team (Regular) - ${band} Male (Trio)`,
        maxWeightKg: 0,
      },
      {
        code: `POOM_REG_TEAM_F_${idx + 1}`,
        division: div,
        gender: "FEMALE",
        name: `Recognised Poomsae Team (Regular) - ${band} Female (Trio)`,
        maxWeightKg: 0,
      },
    ];
  }),

  // -------------------------------------------------------------
  // 7. SPEED KICKING (Electronic Impact Counter)
  // -------------------------------------------------------------
  ...["Sub-Junior", "Cadet", "Junior", "Senior"].flatMap((divName, idx) => {
    const div = idx === 0 ? "SUB_CADET" : idx === 1 ? "CADET" : idx === 2 ? "JUNIOR" : "SENIOR";
    return [
      {
        code: `SPEED_KICK_M_${idx + 1}`,
        division: div,
        gender: "MALE",
        name: `Speed Kicking (Individual) - ${divName} Male`,
        maxWeightKg: 0,
      },
      {
        code: `SPEED_KICK_F_${idx + 1}`,
        division: div,
        gender: "FEMALE",
        name: `Speed Kicking (Individual) - ${divName} Female`,
        maxWeightKg: 0,
      },
    ];
  }),

  // -------------------------------------------------------------
  // 8. BREAKING (KYUKPA) (Board Breaking Assessment)
  // -------------------------------------------------------------
  ...["Sub-Junior", "Cadet", "Junior", "Senior"].flatMap((divName, idx) => {
    const div = idx === 0 ? "SUB_CADET" : idx === 1 ? "CADET" : idx === 2 ? "JUNIOR" : "SENIOR";
    return [
      {
        code: `KYUKPA_M_${idx + 1}`,
        division: div,
        gender: "MALE",
        name: `Breaking (Kyukpa) - ${divName} Male`,
        maxWeightKg: 0,
      },
      {
        code: `KYUKPA_F_${idx + 1}`,
        division: div,
        gender: "FEMALE",
        name: `Breaking (Kyukpa) - ${divName} Female`,
        maxWeightKg: 0,
      },
    ];
  }),
];

async function seed() {
  console.log(`Starting to seed ${categories.length} tournament categories...`);
  let upserted = 0;
  for (const cat of categories) {
    await prisma.weightCategory.upsert({
      where: { code: cat.code },
      update: {
        division: cat.division,
        gender: cat.gender,
        name: cat.name,
        minWeightKg: cat.minWeightKg,
        maxWeightKg: cat.maxWeightKg,
        isActive: true,
      },
      create: {
        code: cat.code,
        division: cat.division,
        gender: cat.gender,
        name: cat.name,
        minWeightKg: cat.minWeightKg,
        maxWeightKg: cat.maxWeightKg,
        isActive: true,
      },
    });
    upserted++;
  }
  console.log(`Successfully upserted ${upserted} tournament categories into database.`);
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seeding error:", err);
    process.exit(1);
  });

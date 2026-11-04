import { AgeDivision, Gender } from "@prisma/client";

export interface DefaultWeightCategory {
  code: string;
  division: AgeDivision;
  gender: Gender;
  name: string;
  minWeightKg?: number;
  maxWeightKg: number;
}

export const INITIAL_WEIGHT_CATEGORIES: DefaultWeightCategory[] = [
  // Senior Men (Olympic & WT standard weight classes)
  { code: "SR_M_U54", division: "SENIOR", gender: "MALE", name: "Senior Male Under 54kg (Fin)", maxWeightKg: 54 },
  { code: "SR_M_U58", division: "SENIOR", gender: "MALE", name: "Senior Male Under 58kg (Fly)", minWeightKg: 54, maxWeightKg: 58 },
  { code: "SR_M_U63", division: "SENIOR", gender: "MALE", name: "Senior Male Under 63kg (Bantam)", minWeightKg: 58, maxWeightKg: 63 },
  { code: "SR_M_U68", division: "SENIOR", gender: "MALE", name: "Senior Male Under 68kg (Feather)", minWeightKg: 63, maxWeightKg: 68 },
  { code: "SR_M_U74", division: "SENIOR", gender: "MALE", name: "Senior Male Under 74kg (Light)", minWeightKg: 68, maxWeightKg: 74 },
  { code: "SR_M_U80", division: "SENIOR", gender: "MALE", name: "Senior Male Under 80kg (Welter)", minWeightKg: 74, maxWeightKg: 80 },
  { code: "SR_M_U87", division: "SENIOR", gender: "MALE", name: "Senior Male Under 87kg (Middle)", minWeightKg: 80, maxWeightKg: 87 },
  { code: "SR_M_O87", division: "SENIOR", gender: "MALE", name: "Senior Male Over 87kg (Heavy)", minWeightKg: 87, maxWeightKg: 999 },

  // Senior Women
  { code: "SR_F_U46", division: "SENIOR", gender: "FEMALE", name: "Senior Female Under 46kg (Fin)", maxWeightKg: 46 },
  { code: "SR_F_U49", division: "SENIOR", gender: "FEMALE", name: "Senior Female Under 49kg (Fly)", minWeightKg: 46, maxWeightKg: 49 },
  { code: "SR_F_U53", division: "SENIOR", gender: "FEMALE", name: "Senior Female Under 53kg (Bantam)", minWeightKg: 49, maxWeightKg: 53 },
  { code: "SR_F_U57", division: "SENIOR", gender: "FEMALE", name: "Senior Female Under 57kg (Feather)", minWeightKg: 53, maxWeightKg: 57 },
  { code: "SR_F_U62", division: "SENIOR", gender: "FEMALE", name: "Senior Female Under 62kg (Light)", minWeightKg: 57, maxWeightKg: 62 },
  { code: "SR_F_U67", division: "SENIOR", gender: "FEMALE", name: "Senior Female Under 67kg (Welter)", minWeightKg: 62, maxWeightKg: 67 },
  { code: "SR_F_U73", division: "SENIOR", gender: "FEMALE", name: "Senior Female Under 73kg (Middle)", minWeightKg: 67, maxWeightKg: 73 },
  { code: "SR_F_O73", division: "SENIOR", gender: "FEMALE", name: "Senior Female Over 73kg (Heavy)", minWeightKg: 73, maxWeightKg: 999 },

  // Junior Men
  { code: "JR_M_U45", division: "JUNIOR", gender: "MALE", name: "Junior Male Under 45kg", maxWeightKg: 45 },
  { code: "JR_M_U48", division: "JUNIOR", gender: "MALE", name: "Junior Male Under 48kg", minWeightKg: 45, maxWeightKg: 48 },
  { code: "JR_M_U51", division: "JUNIOR", gender: "MALE", name: "Junior Male Under 51kg", minWeightKg: 48, maxWeightKg: 51 },
  { code: "JR_M_U55", division: "JUNIOR", gender: "MALE", name: "Junior Male Under 55kg", minWeightKg: 51, maxWeightKg: 55 },
  { code: "JR_M_U59", division: "JUNIOR", gender: "MALE", name: "Junior Male Under 59kg", minWeightKg: 55, maxWeightKg: 59 },
  { code: "JR_M_U63", division: "JUNIOR", gender: "MALE", name: "Junior Male Under 63kg", minWeightKg: 59, maxWeightKg: 63 },
  { code: "JR_M_U68", division: "JUNIOR", gender: "MALE", name: "Junior Male Under 68kg", minWeightKg: 63, maxWeightKg: 68 },
  { code: "JR_M_U73", division: "JUNIOR", gender: "MALE", name: "Junior Male Under 73kg", minWeightKg: 68, maxWeightKg: 73 },
  { code: "JR_M_U78", division: "JUNIOR", gender: "MALE", name: "Junior Male Under 78kg", minWeightKg: 73, maxWeightKg: 78 },
  { code: "JR_M_O78", division: "JUNIOR", gender: "MALE", name: "Junior Male Over 78kg", minWeightKg: 78, maxWeightKg: 999 },

  // Junior Women
  { code: "JR_F_U42", division: "JUNIOR", gender: "FEMALE", name: "Junior Female Under 42kg", maxWeightKg: 42 },
  { code: "JR_F_U44", division: "JUNIOR", gender: "FEMALE", name: "Junior Female Under 44kg", minWeightKg: 42, maxWeightKg: 44 },
  { code: "JR_F_U46", division: "JUNIOR", gender: "FEMALE", name: "Junior Female Under 46kg", minWeightKg: 44, maxWeightKg: 46 },
  { code: "JR_F_U49", division: "JUNIOR", gender: "FEMALE", name: "Junior Female Under 49kg", minWeightKg: 46, maxWeightKg: 49 },
  { code: "JR_F_U52", division: "JUNIOR", gender: "FEMALE", name: "Junior Female Under 52kg", minWeightKg: 49, maxWeightKg: 52 },
  { code: "JR_F_U55", division: "JUNIOR", gender: "FEMALE", name: "Junior Female Under 55kg", minWeightKg: 52, maxWeightKg: 55 },
  { code: "JR_F_U59", division: "JUNIOR", gender: "FEMALE", name: "Junior Female Under 59kg", minWeightKg: 55, maxWeightKg: 59 },
  { code: "JR_F_U63", division: "JUNIOR", gender: "FEMALE", name: "Junior Female Under 63kg", minWeightKg: 59, maxWeightKg: 63 },
  { code: "JR_F_U68", division: "JUNIOR", gender: "FEMALE", name: "Junior Female Under 68kg", minWeightKg: 63, maxWeightKg: 68 },
  { code: "JR_F_O68", division: "JUNIOR", gender: "FEMALE", name: "Junior Female Over 68kg", minWeightKg: 68, maxWeightKg: 999 },
];


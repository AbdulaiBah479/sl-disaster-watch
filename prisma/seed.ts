import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { DISTRICTS } from "../lib/districts";
import { SETTLEMENTS } from "../lib/settlements";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});
const prisma = new PrismaClient({ adapter });

// Curated historical record. Every entry below is a documented event with a
// public source; figures are the commonly cited totals from WHO/World
// Bank/GDACS reporting and are approximate where the source itself reports
// a range. This seeds the dashboard's historical timeline and gives current
// risk scores real precedent to be compared against.
const HISTORICAL_DISASTERS = [
  {
    districtId: "western_rural",
    category: "LANDSLIDE" as const,
    title: "Regent / Freetown mudslide and flash flood",
    description:
      "Heavy rainfall triggered a catastrophic mudslide on Sugar Loaf Mountain above Regent, followed by flash flooding across Freetown. It remains Sierra Leone's deadliest documented disaster.",
    date: new Date("2017-08-14"),
    deaths: 1141,
    affected: 6000,
    source: "World Bank / ReliefWeb situation reports",
    sourceUrl:
      "https://blogs.worldbank.org/en/sustainablecities/preventable-disaster-landslides-and-flooding-disaster-freetown-sierra-leone",
  },
  {
    districtId: "western_urban",
    category: "FLOOD_COASTAL" as const,
    title: "Freetown flash floods",
    description:
      "Intense rainfall caused flash flooding across low-lying and informal settlement areas of Freetown, displacing thousands of residents.",
    date: new Date("2015-09-16"),
    deaths: 10,
    affected: 9000,
    source: "ReliefWeb / IFRC",
    sourceUrl: "https://reliefweb.int/country/sle",
  },
  {
    districtId: null,
    category: "EPIDEMIC_HUMAN" as const,
    title: "West Africa Ebola virus disease epidemic — Sierra Leone",
    description:
      "The largest Ebola outbreak in history reached Sierra Leone via Kailahun and Kenema districts in May 2014, eventually spreading nationwide before being declared over in March 2016.",
    date: new Date("2014-05-25"),
    deaths: 3956,
    affected: 14124,
    source: "World Health Organization",
    sourceUrl: "https://www.who.int/emergencies/situations/ebola-outbreak-2014-2016-west-africa",
  },
  {
    districtId: null,
    category: "EPIDEMIC_HUMAN" as const,
    title: "National cholera epidemic",
    description:
      "Sierra Leone's worst cholera outbreak in decades spread through Freetown and riverine districts, driven by contaminated water sources during the rainy season.",
    date: new Date("2012-08-01"),
    deaths: 300,
    affected: 22000,
    source: "WHO / UNICEF Sierra Leone",
    sourceUrl: "https://reliefweb.int/country/sle",
  },
  {
    districtId: null,
    category: "EPIDEMIC_HUMAN" as const,
    title: "Mpox (monkeypox) public health emergency",
    description:
      "Sierra Leone confirmed its first mpox case on 10 January 2025 and declared a public health emergency three days later; the country became the epicenter of a continental clade Ib/G.1 outbreak.",
    date: new Date("2025-01-13"),
    deaths: 29,
    affected: 4500,
    source: "Africa CDC / Nature / Al Jazeera",
    sourceUrl: "https://www.aljazeera.com/news/2025/1/14/sierra-leone-declares-emergency-over-mpox-outbreak",
  },
  {
    districtId: null,
    category: "EPIDEMIC_ANIMAL" as const,
    title: "First African swine fever outbreak",
    description:
      "Sierra Leone reported its first-ever African swine fever outbreak to the World Organisation for Animal Health (WOAH); the disease is now considered endemic in the domestic pig population.",
    date: new Date("2020-11-01"),
    deaths: null,
    affected: null,
    source: "WOAH / OIE WAHIS",
    sourceUrl: "https://www.woah.org/en/disease/african-swine-fever/",
  },
  {
    districtId: null,
    category: "EPIDEMIC_ANIMAL" as const,
    title: "Foot-and-mouth disease notification",
    description:
      "Sierra Leone submitted an immediate notification of a foot-and-mouth disease outbreak in cattle to WOAH.",
    date: new Date("2018-09-10"),
    deaths: null,
    affected: null,
    source: "WOAH / OIE WAHIS",
    sourceUrl: "https://www.woah.org/en/home/",
  },
  {
    districtId: "port_loko",
    category: "WILDFIRE" as const,
    title: "Forest fires in Sierra Leone",
    description:
      "GDACS/GWIS satellite detection recorded bush fires burning an estimated 5,282 hectares, consistent with dry-season slash-and-burn agricultural clearing.",
    date: new Date("2026-04-14"),
    deaths: null,
    affected: null,
    source: "GDACS (Global Wildfire Information System)",
    sourceUrl: "https://www.gdacs.org/report.aspx?eventid=1028563&episodeid=1&eventtype=WF",
  },
];

async function main() {
  console.log(`Seeding ${DISTRICTS.length} districts...`);
  for (const d of DISTRICTS) {
    await prisma.district.upsert({
      where: { id: d.id },
      update: {
        name: d.name,
        province: d.province,
        capital: d.capital,
        areaKm2: d.areaKm2,
        population: d.population,
        lat: d.lat,
        lon: d.lon,
        coastal: d.coastal,
        riverine: d.riverine,
        landslideRisk: d.landslideRisk,
        vulnerabilityIndex: d.vulnerabilityIndex,
        primaryCrops: JSON.stringify(d.primaryCrops),
        livestockPresent: d.livestockPresent,
      },
      create: {
        id: d.id,
        name: d.name,
        province: d.province,
        capital: d.capital,
        areaKm2: d.areaKm2,
        population: d.population,
        lat: d.lat,
        lon: d.lon,
        coastal: d.coastal,
        riverine: d.riverine,
        landslideRisk: d.landslideRisk,
        vulnerabilityIndex: d.vulnerabilityIndex,
        primaryCrops: JSON.stringify(d.primaryCrops),
        livestockPresent: d.livestockPresent,
      },
    });
  }

  console.log(`Seeding ${SETTLEMENTS.length} settlements (cities/towns/areas)...`);
  for (const s of SETTLEMENTS) {
    await prisma.settlement.upsert({
      where: { id: s.id },
      update: {
        name: s.name,
        type: s.type,
        districtId: s.districtId,
        lat: s.lat,
        lon: s.lon,
        population: s.population,
      },
      create: {
        id: s.id,
        name: s.name,
        type: s.type,
        districtId: s.districtId,
        lat: s.lat,
        lon: s.lon,
        population: s.population,
      },
    });
  }

  console.log(`Seeding ${HISTORICAL_DISASTERS.length} historical disasters...`);
  await prisma.historicalDisaster.deleteMany();
  for (const h of HISTORICAL_DISASTERS) {
    await prisma.historicalDisaster.create({ data: h });
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

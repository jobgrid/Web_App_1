import { generateObject } from "ai";
import { z } from "zod";

import { KNOWN_SKILLS } from "@/lib/constants";

export type ParsedCv = {
  headline: string;
  location: string;
  skills: string[];
  yearsExperience: number | null;
};

const cvSchema = z.object({
  headline: z.string().describe("Short professional headline, e.g. 'Senior Frontend Engineer'"),
  location: z.string().describe("City and state/country if present, else empty string"),
  skills: z.array(z.string()).describe("Up to 20 concrete skills found in the CV"),
  yearsExperience: z.number().nullable().describe("Total years of professional experience"),
});

export async function extractCvText(file: File): Promise<string> {
  const buffer = new Uint8Array(await file.arrayBuffer());
  if (file.name.toLowerCase().endsWith(".pdf") || file.type === "application/pdf") {
    const { extractText } = await import("unpdf");
    const { text } = await extractText(buffer, { mergePages: true });
    return text;
  }
  return new TextDecoder().decode(buffer);
}

export async function parseCv(text: string): Promise<ParsedCv> {
  const clipped = text.slice(0, 20_000);
  if (process.env.AI_GATEWAY_API_KEY) {
    try {
      const { object } = await generateObject({
        model: "openai/gpt-4o-mini",
        schema: cvSchema,
        prompt: `Extract structured profile data from this CV/resume:\n\n${clipped}`,
      });
      return {
        headline: object.headline.slice(0, 120),
        location: object.location.slice(0, 80),
        skills: object.skills.slice(0, 20),
        yearsExperience: object.yearsExperience,
      };
    } catch (error) {
      console.error("[cv-parser] AI extraction failed, using heuristics", error);
    }
  }
  return heuristicParse(clipped);
}

function heuristicParse(text: string): ParsedCv {
  const skills = KNOWN_SKILLS.filter((skill) =>
    new RegExp(`(^|[^a-z0-9])${escapeRegex(skill.toLowerCase())}([^a-z0-9]|$)`).test(
      text.toLowerCase()
    )
  ).slice(0, 20);

  const yearsMatch = text.match(/(\d{1,2})\+?\s*years?(?:\s+of)?\s+(?:professional\s+)?experience/i);
  const yearsExperience = yearsMatch ? Number(yearsMatch[1]) : null;

  const lines = text.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const headline =
    lines.find(
      (line) =>
        line.length > 5 &&
        line.length < 90 &&
        /engineer|developer|designer|manager|analyst|scientist|consultant|nurse|doctor|practitioner|teacher|lead|architect|specialist|marketer|accountant/i.test(line)
    ) ?? "";

  const locationMatch = text.match(
    /(Sydney|Melbourne|Brisbane|Perth|Adelaide|Canberra|Hobart|Darwin|Gold Coast|Auckland|Wellington|London|New York|San Francisco|Singapore)\s*,?\s*(NSW|VIC|QLD|WA|SA|ACT|TAS|NT|Australia|NZ|UK|USA|CA)?/i
  );
  const location = locationMatch
    ? [locationMatch[1], locationMatch[2]].filter(Boolean).join(", ")
    : "";

  return { headline: headline.slice(0, 120), location, skills, yearsExperience };
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

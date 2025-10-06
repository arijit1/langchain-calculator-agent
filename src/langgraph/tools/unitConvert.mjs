// src/langgraph/tools/unitConvert.mjs
import { z } from "zod";
import { tool } from "@langchain/core/tools";

const METERS_TO_FEET = 3.280839895;       // 1 m = 3.2808 ft
const FAHRENHEIT_TO_CELSIUS = (f) => (f - 32) * (5/9);
const CELSIUS_TO_FAHRENHEIT = (c) => (c * 9/5) + 32;

export const unitConvert = tool(
  async ({ from, to, value }) => {
    if (from === "meter" && to === "foot") {
      return value * METERS_TO_FEET;
    }
    if (from === "foot" && to === "meter") {
      return value / METERS_TO_FEET;
    }
    if (from === "fahrenheit" && to === "celsius") {
      return FAHRENHEIT_TO_CELSIUS(value);
    }
    if (from === "celsius" && to === "fahrenheit") {
      return CELSIUS_TO_FAHRENHEIT(value);
    }
    return `Unsupported conversion: ${from} -> ${to}`;
  },
  {
    name: "unitConvert",
    description:
      "Converts between units. Supported: meter<->foot, celsius<->fahrenheit",
    schema: z.object({
      from: z.enum(["meter", "foot", "celsius", "fahrenheit"]),
      to: z.enum(["meter", "foot", "celsius", "fahrenheit"]),
      value: z.number(),
    }),
  }
);
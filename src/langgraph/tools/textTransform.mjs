// src/langgraph/tools/textTransform.mjs
import { z } from "zod";
import { tool } from "@langchain/core/tools";

export const textTransform = tool(
  async ({ op, text }) => {
    console.log("textTransform tool initialized...!")
    switch (op) {
      case "upper":
        return text.toUpperCase();
      case "lower":
        return text.toLowerCase();
      case "slug": {
        const slug = text
          .normalize("NFKD")
          .replace(/[\u0300-\u036f]/g, "")  // strip accents
          .replace(/[^a-zA-Z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "")
          .toLowerCase();
        return slug || "n-a";
      }
      default:
        return `Unknown op: ${op}`;
    }
  },
  {
    name: "textTransform",
    description:
      "Transforms text. ops: upper|lower|slug. Example: { op: 'slug', text: 'Hello World!' }",
    schema: z.object({
      op: z.enum(["upper", "lower", "slug"]),
      text: z.string().describe("input text"),
    }),
  }
);



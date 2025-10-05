/**
 * Direct Usage of only langchain with gpt-4o-mini
 * To Run -> node langchain.mjs
 */

import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";
import { config } from 'dotenv';

config();

const prompt = ChatPromptTemplate.fromTemplate(
  `What is sum of {a} and {b}`
);

const model = new ChatOpenAI({
  model: "gpt-4o-mini",
  temperature: 0.8,
});

const outputParser = new StringOutputParser();

const chain = prompt.pipe(model).pipe(outputParser);

const stream = await chain.stream({
  a: 2,
  b: 3
});

for await (const chunk of stream) {
  console.log(chunk);
}
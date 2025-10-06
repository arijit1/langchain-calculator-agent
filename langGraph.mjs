//all langGraph flows starts from this file. and all langGraph files like tools , utility is under src/langgraph

import { config } from "dotenv";
import readline from "readline";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { app } from "./src/langgraph/graph.mjs";

config();

if (!process.env.OPENAI_API_KEY) {
  console.error("❌ Missing OPENAI_API_KEY env var");
  process.exit(1);
}

// Setup terminal input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Helper function for prompting input
function askQuestion(query){
    return new Promise(function( resolve, reject){
        if(resolve){
            //rl.question(query, resolve);
                //or
            rl.question(query, (answer) => resolve(answer));
            
        }
        
    });
}

const SYSTEM = `
You have these tools:
- textTransform(op, text): op ∈ {upper, lower, slug}

Rules:
1) If the user asks to slug/uppercase/lowercase, ALWAYS call textTransform.
2) For slug requests, set op="slug".
3) If the user provides quoted text (e.g., "arijit"), use the quoted part as the 'text' argument.
4) Do not answer directly when a matching tool exists; use the tool.
`;

async function main() {
  console.log("🚀 LangGraph Interactive Session Started");
  console.log("💡 Type your prompt (or type 'exit' to quit):");

  while (true) {
    const prompt = await askQuestion("\n💬 You: ");

    

    if (prompt.trim().toLowerCase() === "exit") {
      console.log("👋 Exiting LangGraph session. Goodbye!");
      rl.close();
      break;
    }

    try {
        //console.log(prompt)
      const result = await app.invoke({
        messages: [
          new SystemMessage(SYSTEM),
          new HumanMessage(prompt)]
          ,
      });
      console.log(result)
      const final = result.messages[result.messages.length - 1];
      console.log("🟢 Assistant:", final.content);
    } catch (err) {
      console.error("💥 Error:", err?.message || err);
    }
  }
}

main();
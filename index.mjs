import { config } from "dotenv";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, ToolMessage } from "@langchain/core/messages";
import { tools } from "./src/tools/calculate.mjs";

config();

/**
 * ──────────────────────────────────────────────────────────────────────────────
 * 0) Sanity checks
 * ──────────────────────────────────────────────────────────────────────────────
 */
if (!process.env.OPENAI_API_KEY) {
  console.error("❌ Missing OPENAI_API_KEY env var");
  process.exit(1);
}

/**
 * ──────────────────────────────────────────────────────────────────────────────
 * 1) Model setup (bind tools here)
 * ──────────────────────────────────────────────────────────────────────────────
 */
const base = new ChatOpenAI({
  model: "gpt-4o",
  temperature: 0, // deterministic for math
});

// Force tool usage while debugging:
// - "any" / "required" → must call some tool
// - a specific tool name (e.g. "calculate") → must call that tool
const llm = base.bindTools(tools, {
  tool_choice: "any", // change to "calculate" to force your calculator specifically
  // parallel_tool_calls: false, // uncomment to avoid multi-tool-call quirks
});

/**
 * ──────────────────────────────────────────────────────────────────────────────
 * 2) Utility logger
 * ──────────────────────────────────────────────────────────────────────────────
 */
function logDivider(title = "") {
  console.log("\n" + "─".repeat(30));
  if (title) console.log(title);
  console.log("─".repeat(30));
}

function logToolCalls(toolCalls = []) {
  if (!toolCalls.length) return;
  toolCalls.forEach((c, i) => {
    console.log(`   #${i + 1} → name: ${c.name}`);
    console.log(`        id: ${c.id}`);
    console.log(`      args:`, c.args);
  });
}

/**
 * ──────────────────────────────────────────────────────────────────────────────
 * 3) One agent loop: user → model → (maybe) tools → model → final
 * ──────────────────────────────────────────────────────────────────────────────
 */
async function ask(prompt) {
  logDivider("🚀 New Request");
  console.log("💬 User:", prompt);

  const history = [new HumanMessage(prompt)];

  try {
    console.log("🤖 Sending to GPT-4o (first turn)...");
    const first = await llm.invoke(history);

    // Helpful raw dump while debugging:
    // console.log("📥 First model response:", JSON.stringify(first, null, 2));

    if (!first.tool_calls?.length) {
      console.log("✅ No tool calls — model answered directly:");
      console.log("🟢 Final:", first.content);
      return;
    }

    console.log("🛠️ Model requested tool call(s):");
    logToolCalls(first.tool_calls);

    // Execute all requested tools and collect ToolMessages
    const toolMsgs = await Promise.all(
      first.tool_calls.map(async (call) => {
        console.log(`⚡ Running tool "${call.name}" with:`, call.args);

        const tool = tools.find((t) => t.name === call.name);
        if (!tool) {
          console.warn(`❗ No matching tool found for "${call.name}". Skipping.`);
          return new ToolMessage({
            tool_call_id: call.id,
            name: call.name,
            content: "Tool not found",
          });
        }

        const result = await tool.invoke(call.args);
        console.log(`🔙 Tool "${call.name}" result:`, result);

        return new ToolMessage({
          tool_call_id: call.id, // 🔴 REQUIRED for tool replies
          name: call.name,
          content: String(result),
        });
      })
    );

    console.log("📤 Sending tool result(s) back to model (second turn)...");
    const final = await llm.invoke([...history, first, ...toolMsgs]);

    console.log("🟢 Final:", final.content);
  } catch (err) {
    console.error("💥 Error in ask():", err?.message || err);
  }
}

/**
 * ──────────────────────────────────────────────────────────────────────────────
 * 4) Demo calls
 * ──────────────────────────────────────────────────────────────────────────────
 */
(async () => {
  await ask("add 2 and 5");
  await ask("add 10 and 10 then find Number Value of the result")
  // Example follow-up (if you later add memory/state handling)
  // await ask("multiply result with 10");
})();

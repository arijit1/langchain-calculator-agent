// graph.mjs
import { ChatOpenAI } from "@langchain/openai";
import { StateGraph,START, END } from "@langchain/langgraph";
import { ToolMessage } from "@langchain/core/messages";
import { tools } from "./tools/index.mjs";

const llm = new ChatOpenAI({
  model: "gpt-4o",
  temperature: 0,
}).bindTools(tools);

const graph = new StateGraph({
  channels: {
    messages: { value: (x = [], y = []) => [...x, ...y] },
  },
}).addEdge(START, "llm")
  .addNode("llm", async (state) => {
    console.log("#1 ENTER node: llm");
    try {
      const resp = await llm.invoke(state.messages, {
        // Optionally force tools for debugging the first hop:
        // tool_choice: "any",
        parallel_tool_calls: false,
      });
      console.log("#1.1 LLM returned tool_calls:", resp.tool_calls?.map(c => c.name));
      return { messages: [resp] };
    } catch (err) {
      console.error("💥 LLM error:", err?.message || err);
      throw err;
    }
  })
  .addNode("tools", async (state) => {
    console.log("#2 ENTER node: tools");
    const last = state.messages[state.messages.length - 1];
    const calls = last?.tool_calls ?? [];
    console.log("#2.1 tool_calls count:", calls.length);

    const toolMsgs = await Promise.all(
      calls.map(async (c, i) => {
        try {
          const tool = tools.find((t) => t.name === c.name);
          if (!tool) {
            console.warn("⚠️ tool not found:", c.name);
            return new ToolMessage({
              tool_call_id: c.id,
              name: c.name,
              content: "ToolNotFound",
            });
          }
          console.log(`#2.${i + 2} running tool`, c.name, "args:", c.args);
          const out = await tool.invoke(c.args);
          console.log(`#2.${i + 2} result:`, out);
          return new ToolMessage({
            tool_call_id: c.id,
            name: c.name,
            content: String(out),
          });
        } catch (err) {
          console.error(`💥 Tool error (${c.name}):`, err?.message || err);
          return new ToolMessage({
            tool_call_id: c.id,
            name: c.name,
            content: `ToolError: ${(err && err.message) || String(err)}`,
          });
        }
      })
    );

    return { messages: toolMsgs };
  })
  .addConditionalEdges(
    "llm",
    (state) => {
      console.log("#3 ROUTER after LLM");
      const last = state.messages[state.messages.length - 1];
      const next = (last?.tool_calls?.length ?? 0) > 0 ? "tools" : END;
      console.log("#3.1 routing to:", next);
      return next;
    },
    { tools: "tools", [END]: END }
  )
  .addEdge("tools", "llm");

console.log("COMPILING GRAPH");
export const app = graph.compile();

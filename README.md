# langchain-calculator-agent

A minimal **JavaScript (Node.js, ESM)** project demonstrating how **GPT-4o** can use a **LangChain tool** (a simple calculator) and later be extended into a **LangGraph agent loop**.

---

## 🧰 Prerequisites

* Node.js 18+
* An OpenAI API Key:

  ```bash
  export OPENAI_API_KEY=sk-...
  ```

---

## ⚡ Quick Start

```bash
git clone <your-repo-url>
cd langchain-calculator-agent
npm install
node index.mjs
```

---

## 📂 Project Structure

```
.
├─ index.mjs                # Main LangChain agent
├─ src/
│  └─ tools/
│     └─ calculate.mjs      # Calculator tool, exported as tools = [calculate]
├─ FLOW.md                  # Diagrams of the multi-step flow
├─ README.md                # This file
└─ package.json             # "type": "module" for ESM support
```

---

## 🧩 Part 1 — LangChain Only

### 1️⃣ Install Dependencies

```bash
npm init -y
npm i langchain @langchain/openai zod dotenv
```

Add to `package.json`:

```json
{
  "type": "module"
}
```

### 2️⃣ Create the Calculator Tool

**src/tools/calculate.mjs**

```js
import { z } from "zod";
import { tool } from "@langchain/core/tools";

const calculate = tool(
  async ({ op, a, b }) => {
    switch (op) {
      case "add": return a + b;
      case "sub": return a - b;
      case "mul": return a * b;
      case "div": return b === 0 ? "Division by zero" : a / b;
      default: return "Unknown op";
    }
  },
  {
    name: "calculate",
    description: "Basic calculator tool (add, sub, mul, div)",
    schema: z.object({
      op: z.enum(["add", "sub", "mul", "div"]),
      a: z.number(),
      b: z.number(),
    }),
  }
);

export const tools = [calculate];
```

### 3️⃣ Bind Tool and Get Final Answer

**index.mjs**

```js
import { config } from "dotenv";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, ToolMessage } from "@langchain/core/messages";
import { tools } from "./src/tools/calculate.mjs";

config();

if (!process.env.OPENAI_API_KEY) {
  console.error("❌ Missing OPENAI_API_KEY env var");
  process.exit(1);
}

const base = new ChatOpenAI({ model: "gpt-4o", temperature: 0 });
const llm = base.bindTools(tools);

async function ask(prompt) {
  console.log("\n💬 User:", prompt);

  const history = [new HumanMessage(prompt)];
  const first = await llm.invoke(history);

  if (!first.tool_calls?.length) {
    console.log("🟢 Final:", first.content);
    return;
  }

  const toolMsgs = await Promise.all(
    first.tool_calls.map(async (call) => {
      const tool = tools.find((t) => t.name === call.name);
      const result = await tool.invoke(call.args);
      return new ToolMessage({
        tool_call_id: call.id,
        name: call.name,
        content: String(result),
      });
    })
  );

  const final = await llm.invoke([...history, first, ...toolMsgs]);
  console.log("🟢 Final:", final.content);
}

(async () => {
  await ask("add 2 and 5");
})();
```

### 4️⃣ Run It

```bash
node index.mjs
```

🖥 Example Output:

```
💬 User: add 2 and 5
⚡ Running calculate with { op: 'add', a: 2, b: 5 }
🟢 Final: 2 plus 5 equals 7.
```

---

## 🧠 Part 2 — Add LangGraph

### 1️⃣ Install LangGraph

```bash
npm i @langchain/langgraph
```

### 2️⃣ Create a Simple Graph

**graph.mjs**

```js
import { ChatOpenAI } from "@langchain/openai";
import { StateGraph, END } from "@langchain/langgraph";
import { HumanMessage, ToolMessage } from "@langchain/core/messages";
import { tools } from "./src/tools/calculate.mjs";

const llm = new ChatOpenAI({ model: "gpt-4o", temperature: 0 }).bindTools(tools);

const graph = new StateGraph({
  channels: { messages: { value: (x = [], y = []) => [...x, ...y] } },
})
  .addNode("llm", async (state) => {
    const resp = await llm.invoke(state.messages);
    return { messages: [resp] };
  })
  .addNode("tools", async (state) => {
    const last = state.messages[state.messages.length - 1];
    const calls = last?.tool_calls ?? [];

    const toolMsgs = await Promise.all(
      calls.map(async (c) => {
        const tool = tools.find((t) => t.name === c.name);
        const out = await tool.invoke(c.args);
        return new ToolMessage({ tool_call_id: c.id, name: c.name, content: String(out) });
      })
    );
    return { messages: toolMsgs };
  })
  .addConditionalEdges(
    "llm",
    (state) => {
      const last = state.messages[state.messages.length - 1];
      return (last?.tool_calls?.length ?? 0) > 0 ? "tools" : END;
    },
    { tools: "tools", [END]: END }
  )
  .addEdge("tools", "llm");

export const app = graph.compile();
```

### 3️⃣ Run the Graph

**run-graph.mjs**

```js
import { config } from "dotenv";
import { app } from "./graph.mjs";
import { HumanMessage } from "@langchain/core/messages";

config();

(async () => {
  const result = await app.invoke({ messages: [new HumanMessage("add 2 and 5, then multiply by 3")] });
  const final = result.messages[result.messages.length - 1];
  console.log("🟢 Final:", final.content);
})();
```

Run it:

```bash
node run-graph.mjs
```

---

## 🧭 Flow Overview

```mermaid
flowchart TD
  A[User Prompt] --> B[Invoke LLM (tools bound)]
  B -->|tool_calls == 0| E[Final Answer]
  B -->|tool_calls > 0| C[Execute Tool(s)]
  C --> D[Return ToolMessage(s)]
  D --> B
  E --> F[Print/Return]
```

---

## 🪄 Troubleshooting

**1️⃣ Missing parameter 'tool_call_id'**
→ Always reply with:

```js
new ToolMessage({ tool_call_id: call.id, name: call.name, content: String(result) });
```

**2️⃣ Invalid value for 'tool_choice'**
→ Only use `tool_choice` when invoking a **bound** model (from `.bindTools([...])`).

**3️⃣ Tool args mismatch**
→ The tool receives an **object**, not positional args:

```js
async ({ op, a, b }) => {...}
```

**4️⃣ Empty final content**
→ Don’t force `tool_choice` on the second call. Let the model produce natural text.

---

## 📘 Notes

* 100% JavaScript (no TypeScript)
* Uses ESM modules (`.mjs` + `"type": "module"`)
* Easy to extend with new tools → just append to `tools` array.
* LangChain part is good for quick demos; LangGraph for structured multi-step agents.

---

🚀 **Enjoy building your first LangChain + LangGraph agent!**

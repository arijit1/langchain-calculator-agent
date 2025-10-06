# 🧠 LangGraph Text Transform Agent

A simple **LangGraph**-based AI agent built with **LangChain + OpenAI GPT-4o**, capable of transforming text using tools such as converting to uppercase, lowercase, or slug. It demonstrates how to structure a graph-based LLM workflow with tool execution loops, runtime prompts, and robust logging.

---

## 📂 Project Structure

```
langgraph-agent/
├── langGraph.mjs                   # Entry point for interactive terminal session
├── src/
│   └── langgraph/
│       ├── graph.mjs          # Defines LangGraph flow (LLM + Tools + Routing)
│       ├── tools/
│       │   └── textTransform.mjs  # Tool: text transformation operations
│       └── utils/             # (optional) Shared helpers or state mgmt
└── package.json
```

---

## 🚀 How It Works

### 1️⃣ Terminal Input

You type prompts like:

```bash
You: slug this text
```

### 2️⃣ System Rules

A **System Message** defines how the model should behave:

```text
You have these tools:
- textTransform(op, text): op ∈ {upper, lower, slug}

Rules:
1) If the user asks to slug/uppercase/lowercase, ALWAYS call textTransform.
2) For slug requests, set op="slug".
3) Use quoted text (e.g., "hello world") when provided.
```

### 3️⃣ Graph Flow

The LangGraph executes the following state machine:

```
        ┌────────────┐
 START →│    LLM     │
        └─────┬──────┘
              │ (if tool_calls)
              ▼
        ┌────────────┐
        │   TOOLS    │
        └─────┬──────┘
              │
              ▼
             END
```

**Nodes:**

* `llm` → runs OpenAI GPT-4o with bound tools.
* `tools` → executes actual tool(s) like `textTransform`.

**Edges:**

* `START → llm`
* `llm → tools → llm` (if more tool calls)
* `llm → END` (if no more tool calls)

---

## 🧩 Tools

### 🛠️ textTransform.mjs

Performs text operations using Zod schema validation and LangChain `tool()` helper.

```js
const textTransform = tool(
  async ({ op, text }) => {
    switch (op) {
      case 'upper':  return text.toUpperCase();
      case 'lower':  return text.toLowerCase();
      case 'slug':   return text.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase();
      default:       return `Unknown op: ${op}`;
    }
  },
  {
    name: 'textTransform',
    description: 'Transforms text based on given op: upper, lower, or slug.',
    schema: z.object({
      op: z.enum(['upper', 'lower', 'slug']),
      text: z.string(),
    }),
  }
);
```

---

## ⚙️ Running the Agent

### 1️⃣ Setup

```bash
npm install
```

Create a `.env` file:

```bash
OPENAI_API_KEY=sk-xxxx
```

### 2️⃣ Run

```bash
node entry.js
```

Example run:

```
🚀 LangGraph Interactive Session Started
💡 Type your prompt (or 'exit' to quit):

💬 You: slug this text
#1 ENTER node: llm
#1.1 LLM returned tool_calls: [ 'textTransform' ]
#2 ENTER node: tools
#2.2 Running tool textTransform args: { op: 'slug', text: 'this text' }
#2.2 result: this-text
🟢 Assistant: this-text
```

---

## 🧭 Key Learnings

✅ LangGraph requires **an explicit START → node edge** to begin execution.
✅ **StateGraph** merges state via channels (e.g., `messages`).
✅ The **LLM node** decides when to end or loop back via conditional edges.
✅ **System prompts** are critical guardrails for guiding tool usage.
✅ Debug with rich logs for LLM → tool → response flow.
✅ You can normalize aliases (like slug → slug) either in prompt or code.

---

## 🔍 Future Extensions

* Add multiple tools (e.g., date parsing, math operations)
* Introduce persistent memory or external state
* Visualize graph execution using LangGraph’s inspector
* Add cost and token tracking middleware
* Integrate a MockLLM for offline testing

---

## 📘 References

* [LangGraph Documentation](https://js.langchain.com/docs/langgraph/)
* [LangChain JS Docs](https://js.langchain.com/docs/)
* [OpenAI GPT-4o Model](https://platform.openai.com/docs/models/gpt-4o)

---

🧩 **Author’s Note:**
This project serves as a minimal, debuggable LangGraph agent template — a perfect starting point for multi-tool AI workflows.

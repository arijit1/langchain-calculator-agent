# Calculator Agent — Multi-Step Flow (LangChain JS)

This shows the runtime flow when using LangChain (JS) with tool-calling enabled and an agent loop that repeats until the model no longer requests tools.

---

## High-Level Flow

- User asks a question (e.g., “add 2 and 5, then multiply by 3”).
- Model may request one or more tool calls.
- Your app executes those tool calls and returns results as `ToolMessage`s.
- The model sees tool outputs and may:
  - request more tool calls, or
  - produce the final natural-language answer.
- Loop ends when there are **no** more `tool_calls` in the model response.

---

## Flowchart

```mermaid
flowchart TD
    A[Start] --> B[User Prompt]
    B --> C[Invoke LLM (tools bound)]
    C -->|tool_calls.length == 0| D[Final AI Answer]
    C -->|tool_calls.length > 0| E[Execute Each Tool]
    E --> F[Create ToolMessage(s) with tool_call_id]
    F --> G[Invoke LLM Again (with prior messages + tool results)]
    G -->|tool_calls.length > 0| E
    G -->|tool_calls.length == 0| D
    D --> H[Return/Print Final Answer]
    H --> I[End]

# Orchestrating Determinism: A Comprehensive Architecture for Enforcing Skill Activation in TypeScript Coding Agents (2026)

## Executive Summary

As of early 2026, the landscape of autonomous coding agents has bifurcated into two distinct categories: generalist conversationalists that occasionally stumble into utility, and strictly orchestrated engineering systems that enforce deterministic workflows. The primary bottleneck preventing the former from evolving into the latter is the reliance on "Auto-Detection"—the presumption that a Large Language Model (LLM), when presented with a natural language query and a list of tools, will correctly infer the intent, select the appropriate tool, and generate valid parameters. Research and practical deployment data from late 2025 consistently demonstrate that this presumption is flawed. The "Skill Router Excuse"—a phenomenon where the model hallucinates a decision to defer action or misclassifies an operational command as conversational filler—remains the dominant failure mode in production coding agents.

This report provides an exhaustive validation and refinement of the "Skills Auto-Activation" hypothesis. It posits that relying on the probabilistic nature of transformer-based models for critical control flow is architecturally unsound for high-reliability engineering tasks. Instead, the State-of-the-Art (SOTA) solution involves shifting the decision-making logic upstream into a semantic routing layer (inspired by vLLM's "Iris" architecture) and downstream into a rigorous interception middleware (leveraging the Model Context Protocol and local hook systems). By treating the LLM as a "Brain in a Vat" whose inputs are curated by a routing engine and whose outputs are gated by a schema enforcer, we can achieve the reliability of a compiler with the flexibility of an AI.

The following analysis details the architectural components required to build this "Workflow Enforcer" in TypeScript. It examines the "Iris" signal-decision chain, the nuances of local embedding generation via transformers.js, the implementation of interception layers using hookable, and the integration of kernel-level sandboxing via isolated-vm and ceLLMate policies. The report culminates in a robust, actionable plan to extend a TypeScript Skills CLI into a deterministic agentic runtime.

---

## 1. The Stochastic Fallacy: Deconstructing the "Skill Router" Problem

The foundational premise of modern agentic frameworks—from the early LangChain implementations to the sophisticated Model Context Protocol (MCP) clients of 2026—has been that LLMs are capable of autonomous reasoning regarding tool usage. The marketing narrative suggests that given a prompt like "fix the bug," the model will intuitively understand the need to read files, run tests, and apply patches. However, the reality of deployment reveals a stochastic fallacy that undermines this approach.

### 1.1 The Phenomenology of the "Skill Router Excuse"

The "Skill Router Excuse" is not merely a hallucination; it is a structural artifact of the alignment training inherent in frontier models. When an agent is faced with an ambiguous or complex coding task, the reward models used during training often favor safe, conversational responses over potentially destructive tool invocations. Consequently, instead of executing a `git_commit` or `fs.writeFile`, the model generates a response such as, "I can certainly help you with that. Please provide the file path you would like me to edit," even when the path is implicit in the context.

This failure mode is exacerbated by the "Semantic Gap" identified in the ceLLMate research. Agents operate through low-level UI or API observations, but the policies and intents are high-level semantic constructs. When the model attempts to bridge this gap without structural support, it often defaults to the path of least resistance: conversation. This behavior is particularly prevalent in "Reasoning Models" (like the hypothetical successors to OpenAI o1 or DeepSeek-R1), which may spend excessive token budgets "thinking" about the safety of a tool call only to decide against it due to a misaligned internal safety guardrail.

### 1.2 The Failure of "One-Size-Fits-All" Routing

Traditional architectures route all user requests through a general-purpose model, hoping it will self-select the correct "mode." Research into the vLLM Semantic Router (vLLM-SR) highlights the inefficiency and unreliability of this approach. The 2025/2026 SOTA recognizes that "policy prediction is the norm rather than the exception". A robust agent cannot act as a monolith; it must be a Mixture-of-Agents (MoA) or a routed system where specific queries are shunted to specialized sub-routines or strictly constrained execution pipelines.

The "Skill Router Excuse" effectively signals that the Control Plane (the logic deciding what to do) has been improperly merged with the Execution Plane (the logic deciding how to do it). By decoupling these, we can enforce skill usage. **The LLM should not decide if it uses a tool; it should only be responsible for populating the parameters of a tool that the system has already decided must be used.**

### 1.3 The Deterministic Imperative

To solve this, the architecture must transition from "Auto-Detection" (passive) to "Auto-Activation" (active).

| Approach | Description |
|----------|-------------|
| **Auto-Detection** | The system provides a list of tools and asks the LLM, "What do you want to do?" The LLM effectively controls the workflow. |
| **Auto-Activation** | The system analyzes the input using non-LLM or specialized SLM (Small Language Model) techniques, determines that Tool A is required, and instructs the LLM, "You are executing Tool A. Extract parameters X, Y, Z from the context." |

This shift requires a sophisticated "pre-computation" layer, which leads us to the study of Semantic Routing.

---

## 2. Semantic Routing: The Pre-Emptive Control Layer

The "Brain" of the deterministic agent is not the LLM itself, but the Semantic Router that sits in front of it. In 2026, the SOTA for this technology is exemplified by the vLLM Semantic Router v0.1 "Iris", which moves beyond simple vector similarity into complex signal processing.

### 2.1 The "Iris" Architecture: A Reference Model

The "Iris" architecture, released in January 2026, represents a transformative milestone in intelligent routing. Unlike its predecessors, which relied on single-dimensional embedding matches, Iris employs a **Signal-Decision Plugin Chain Architecture**. This architecture is critical for a TypeScript CLI because it allows for the layering of deterministic rules (Regex/Keywords) on top of probabilistic ones (Embeddings).

#### 2.1.1 Multi-Signal Extraction

Iris extracts six distinct types of signals from a user query, a pattern that should be replicated in any robust coding agent:

1. **Domain Signals**: Classification of the query into broad categories (e.g., "Coding," "Debugging," "Documentation," "Chit-Chat"). This is often powered by MMLU-trained classifiers with LoRA extensibility.

2. **Keyword Signals**: Fast, interpretable regex-based pattern matching. For a CLI, this is essential. If a user types `git commit`, the system should not need an embedding model to know this is a Git operation. A simple regex `^git\s` serves as a "Hard Override."

3. **Embedding Signals**: Scalable semantic similarity using neural embeddings. This captures the nuance of "Save my work" mapping to `git_commit` even without the keyword.

4. **Factual/Hallucination Signals**: Checks for grounding requirements.

5. **Feedback/Preference Signals**: Personalization based on user history.

#### 2.1.2 The "Chain" Mechanism

The power of Iris lies in the "Plugin Chain." The router evaluates signals in a specific order. A "Keyword Signal" can short-circuit the chain. If `detect_file_path` regex matches, the system might skip the embedding check and immediately activate the `FileOpener` skill. This reduces latency and eliminates the possibility of the embedding model misinterpreting a filename as a semantic concept.

### 2.2 Local Embeddings in Node.js: The 2026 Stack

For a CLI tool, calling an external API (like OpenAI's text-embedding-3) for every routing decision introduces unacceptable latency and privacy risks. The SOTA requires running embedding models locally within the Node.js process. Two primary libraries dominate this space in 2026: **transformers.js** and **fastembed-js**.

#### 2.2.1 transformers.js (The ONNX Runtime Approach)

`transformers.js` has become the de facto standard for running Hugging Face models in JavaScript environments. It utilizes the ONNX Runtime to execute models compiled to WebAssembly (WASM).

- **Quantization**: Crucially, it supports quantized models (e.g., q8, q4), which compress high-performance models like `all-MiniLM-L6-v2` or `bge-small-en` into <50MB files. This allows the CLI to load the routing "Brain" in milliseconds without consuming gigabytes of RAM.

- **WebGPU Acceleration**: In environments with GPU access, transformers.js can leverage WebGPU for near-native inference speeds, though for simple text embeddings on a CLI, CPU inference via WASM SIMD is often sufficient and more portable.

#### 2.2.2 fastembed-js vs. Native Bindings

An alternative is `fastembed-js`, a port of Qdrant's FastEmbed. While transformers.js focuses on breadth and ONNX compatibility, fastembed-js is optimized for speed using native C++ bindings where possible. However, benchmark discussions from 2025 suggest that fastembed-js can sometimes be slower than sentence-transformers (Python) if the underlying bindings aren't perfectly optimized for the specific architecture (e.g., Apple Silicon M-series chips).

**Recommendation**: For a pure TypeScript CLI that prioritizes ease of distribution (no native compilation headaches for users), **transformers.js is the superior choice**. Its performance on quantized models is adequate for routing (<50ms latency), and it removes the complexity of node-gyp builds.

#### 2.2.3 Vector Similarity in TypeScript

Implementing the router requires a mechanism to compare the user's input embedding against the stored embeddings of available skills.

- **Cosine Similarity**: The standard metric. Since most modern embedding models produce normalized vectors, the Dot Product is mathematically equivalent to Cosine Similarity and faster to compute.

- **Implementation Detail**: Use `Float32Array` for storage. JavaScript's standard `Array<number>` is boxed and memory-inefficient. A typed array allows for SIMD-like operations if optimized.

The mathematical operation for routing score `S` between query vector **q** and skill vector **s** is:

```
S = q · s = Σ(i=0 to d-1) q_i * s_i
```

(Assuming normalized vectors where ||q|| = ||s|| = 1).

### 2.3 Specialized Embedding Models: Code vs. Text

A critical insight for coding agents is that general-purpose text embeddings (like all-MiniLM) often fail to capture the specific semantics of code operations. For example, they might not distinguish well between "refactor" (change structure, keep behavior) and "rewrite" (change behavior).

- **Voyage AI & Specialized Models**: Models like `voyage-code-3` or `voyage-large-2` are trained specifically on code and technical documentation. While voyage-code-3 is an API-based model, distilled versions or similar open-source models (like `jina-embeddings-v3` or `bge-m3`) can be run locally via transformers.js.

- **The "Hybrid" Router**: A robust plan involves a two-stage router.
  - **Stage 1 (Fast)**: Use `all-MiniLM-L6-v2` locally to determine if the intent is "Code Modification" vs "General Query."
  - **Stage 2 (Precise)**: If "Code Modification" is detected, use a specialized local model (or API if permitted) to disambiguate the specific coding skill (e.g., `git_diff` vs `git_show`).

---

## 3. The Interception Layer: Middleware for the Mind

Once the Semantic Router determines what should happen, the Interception Layer ensures that the agent actually complies. This layer acts as the "Nervous System" of the CLI, mediating signals between the user, the router, and the LLM.

### 3.1 Hook Systems: The Mechanism of Control

To enforce a workflow, the agent's lifecycle must be event-driven and hookable. We analyzed the two dominant libraries in the ecosystem: **Tapable** and **Hookable**.

#### 3.1.1 Tapable vs. Hookable

| Feature | Tapable | Hookable (unjs) |
|---------|---------|-----------------|
| Origin | Webpack Core | Nuxt / UnJS Ecosystem |
| Complexity | High (Sync, Async, Waterfall, Bail types) | Low to Medium (Awaitable Hooks) |
| Async Support | Robust but verbose | Native Promise support |
| Prioritization | Complex (Stage-based) | Emerging support (Late 2025) |
| TypeScript | Good | Excellent (First-class types) |

**SOTA Decision: `hookable` is the superior choice for a modern TypeScript CLI in 2026.**

**Reasoning**: `hookable` provides a cleaner API for async interception (`await this.callHook(...)`). It allows for "serial" execution of hooks, which is vital for security checks (e.g., "Policy Check" hook must pass before "Execution" hook begins). It is also lighter weight, reducing the CLI's startup time compared to the heavy machinery of Tapable.

**Prioritized Hooks**: Recent updates allow for prioritized execution, enabling a "System Hook" (e.g., Safety Policy) to always preempt "User Hooks" (e.g., Custom Logger).

### 3.2 The Model Context Protocol (MCP) Interceptor Pattern

The Model Context Protocol (MCP), open-sourced by Anthropic in late 2024, has become the standard for connecting agents to tools. In late 2025, the ecosystem introduced the Interceptor Framework, which standardizes how middleware observes and mutates MCP traffic.

#### 3.2.1 The "Workflow Injection" Technique

The core innovation here is **Dynamic Context Injection**. The Interceptor doesn't just watch; it actively mutates the `tools/list` capability presented to the LLM based on the state determined by the Semantic Router.

**The Workflow:**

1. **State Detection**: Semantic Router sets state to `GIT_MERGE`.
2. **Tool Interception**: The Interceptor catches the `tools/list` request from the Client (Claude).
3. **Context Mutation**: It filters out irrelevant tools (e.g., `weather_check`, `fun_fact`) and injects a temporary, virtual tool description for `resolve_conflict` that includes highly specific prompt instructions.
4. **Prompt Injection**: It appends a "System Instruction" to the `prompts/get` response: "Current Workflow: GIT_MERGE. You MUST use the git_status tool first."

This forces the "Auto-Activation" by narrowing the LLM's choices. **If the only tool available is the one required for the workflow, the probability of "Skill Router Excuse" drops to near zero.**

#### 3.2.2 Dry Runs and Corrective Loops

The Interceptor also handles the "Output" side.

- **Hook**: `onToolCall`
- **Logic**: If the Router set a "Dry Run" policy for this skill (e.g., `delete_file`), the Interceptor intercepts the execution, runs a non-destructive verification (e.g., checking file existence and permissions), and returns a simulated result to the LLM.

**Corrective Loop**: If the LLM returns text instead of a tool call when the Router demanded one (e.g., `State=MUST_CALL_TOOL`), the Interceptor acts as a firewall. It rejects the text response and feeds back a synthesized error message: "Error: Workflow Violation. You must invoke a tool in this turn. Do not reply with text." This "Constraint Loop" forces the model to regenerate until it complies.

### 3.3 Node.js Event Loop Management

High-performance interception requires mastering the Node.js event loop.

- **Priority Queues**: Critical hook logic (e.g., Safety Policy) should be scheduled on `process.nextTick()` to ensure it executes before any I/O callbacks (like the actual tool execution or network response). This prevents "Time-of-Check to Time-of-Use" (TOCTOU) race conditions.

- **AsyncLocalStorage**: When managing complex workflows that span multiple async hops (e.g., an agent thinking, then calling a tool, then waiting for a result), using `AsyncLocalStorage` from the `async_hooks` module is essential to preserve the "Workflow Context" (e.g., the specific Request ID and associated Policy) across the async boundary.

---

## 4. Enforcing Structured Output: The Interface of Control

Even with routing and interception, if the LLM generates a tool call with malformed JSON or hallucinated parameters, the workflow fails. SOTA 2026 relies on **Schema-First Design** and **Constrained Decoding**.

### 4.1 Schema-First Design with Zod

Zod remains the "Gold Standard" for runtime schema validation in TypeScript. It bridges the gap between static types (compile time) and dynamic LLM outputs (runtime).

**Integration Strategy:**

1. **Tool Definition**: Every skill in the CLI must be defined as a Zod schema.

```typescript
const GitCommitSchema = z.object({
  message: z.string().describe("Conventional commit message"),
  files: z.array(z.string()).describe("Files to stage")
});
```

2. **Active Generation**: When the Semantic Router activates a skill, the CLI should switch the LLM interaction mode from `generateText` to `generateObject` (using the Vercel AI SDK or similar abstraction). This explicitly instructs the provider (Anthropic, OpenAI, etc.) that the expected output is not a stream of tokens, but a structured JSON object conforming to the schema.

3. **Validation**: The output is parsed by `GitCommitSchema.parse()`. If validation fails, the error (e.g., "Field 'files' is missing") is automatically fed back to the LLM for a self-correction loop.

### 4.2 Constrained Decoding (xgrammar/outlines)

For local models or providers that support low-level control, **Constrained Decoding** is the ultimate enforcement mechanism. Libraries like `xgrammar` (formerly part of the MLC-LLM/TVM ecosystem) allow for the generation of a Context-Free Grammar (CFG) derived directly from the Zod schema.

**How it Works:**
During inference, the decoding engine masks the logits (probabilities) of the next token. If the schema expects a boolean, the only allowed tokens are `true` and `false`. The probability of any other token is set to zero.

**Impact**: This makes it mathematically impossible for the model to generate syntactically invalid JSON or to "hallucinate" a key that doesn't exist in the schema.

**TypeScript Integration**: While xgrammar is often Python-centric, 2026 bindings (via WASM or NAPI) allow Node.js CLIs to pass the grammar to the inference engine (e.g., llama.cpp or a local specialized routing model). This provides 100% reliability for parameter extraction.

---

## 5. Safe Execution: Sandboxing and The "ceLLMate" Defense

"Auto-Activation" implies a higher degree of autonomy. If the Router decides to run a script, and that script is malicious or buggy, the agent executes it immediately. Therefore, a robust sandbox is not optional—it is a dependency of the architecture.

### 5.1 The "ceLLMate" Paradigm

Research on ceLLMate (Sandboxing Browser AI Agents) introduces the concept of **Policy Prediction** coupled with **Mandatory Policies**.

- **Semantic Gap**: The research argues that policies cannot be written effectively at the low level (e.g., "Allow click at x,y"). They must be semantic (e.g., "Allow Checkout").

- **CLI Adaptation**: Our CLI must map low-level fs operations to high-level capabilities.
  - `Capability: ProjectScaffold` -> Allows write access only to `./src` and `./package.json`.
  - `Capability: SystemConfig` -> Allows read access to `/etc/hosts` (but not write).

- **Policy Enforcement**: The Semantic Router, upon detecting the intent "Scaffold new project," loads the `ProjectScaffold` policy. The sandbox then enforces this filesystem view.

### 5.2 The Fall of vm2 and the Rise of isolated-vm

For years, `vm2` was the standard for Node.js sandboxing. However, a series of critical vulnerabilities (CVE-2023-XXXX series) proved that its proxy-based architecture was fundamentally insecure against prototype pollution attacks. **As of 2026, vm2 is considered dead technology.**

**SOTA: `isolated-vm`**

The industry standard is now `isolated-vm`.

- **Mechanism**: It uses the native V8 Isolate API to create a fresh JavaScript heap. Memory is strictly isolated; objects cannot be shared by reference, only by copy or explicit transferable handles.

- **Why it works**: It provides a hard boundary (C++ level) rather than a soft boundary (JavaScript Proxy level). Even if the agent code tries to access `process.env`, it physically cannot, because the `process` object does not exist in the Isolate's heap unless explicitly injected.

- **Usage in Skills**: All "Auto-Activated" skills must run inside an `isolated-vm` context. The CLI acts as the "Host," injecting a sanitized API (e.g., a `fs` wrapper that checks the ceLLMate policy) into the Isolate.

### 5.3 The Node.js Permission Model

Node.js v20+ introduced an experimental Permission Model (`--permission`), which stabilized by 2026.

- **Process-Level Gating**: This allows starting the CLI with:

```bash
node --permission --allow-fs-read=* --allow-fs-write=./workspace index.js
```

- **Defense in Depth**: This acts as a final fail-safe. Even if `isolated-vm` is bypassed (highly unlikely), the Node.js process itself is restricted by the OS from touching files outside the workspace. This is the "Seat Belt" approach described in the documentation.

---

## 6. Robust Plan of Attack: The "EnforcerCLI" Architecture

Based on the validated research, the following plan outlines the development of the "EnforcerCLI"—a TypeScript extension to your existing skills CLI that implements deterministic auto-activation.

### 6.1 Architectural Component Diagram

The system is composed of five distinct layers:

1. **The Sentinel (Input/Router)**: transformers.js + Regex Engine
2. **The State Manager (Context)**: XState Machine
3. **The Nervous System (Middleware)**: hookable + MCP Interceptor
4. **The Executive (Runner)**: isolated-vm + Zod Validator
5. **The Output (Interface)**: Structured Response Generator

### 6.2 Detailed Implementation Steps

#### Phase 1: The "Iris" Router Implementation

**Goal**: Replace the "System Prompt Router" with a local embedding classification system.

1. **Dependency**: Install `@xenova/transformers`.

2. **Index Generation**: Create a build script that scans all your skill definitions (name, description, examples).

3. **Embedding**: Generate embeddings using `Xenova/all-MiniLM-L6-v2` (Quantized). Store these in a simple JSON file (`vector_store.json`) containing `id` and `vector` (base64 encoded Float32Array).

4. **Runtime**: On user input, generate the query embedding and perform a dot product against the store.

5. **Thresholding**:
   - Score > 0.85: **Immediate Activation** (Skip LLM "thought", go straight to parameter extraction).
   - Score 0.70 - 0.85: **Suggestion Mode** (Inject "Did you mean...?" into prompt).
   - Score < 0.70: **Chat Mode**.

#### Phase 2: The Workflow State Machine (XState)

**Goal**: Maintain context awareness to prevent the "Skill Router Excuse."

1. **Dependency**: Install `xstate`.

2. **Machine Definition**: Define states: `IDLE`, `PLANNING`, `EXECUTING`, `REVIEWING`, `ERROR_RECOVERY`.

3. **Transition Logic**:
   - `IDLE` + (Router=CodeMod) -> `PLANNING`
   - `PLANNING` + (LLM=PlanApproved) -> `EXECUTING`
   - `EXECUTING` + (ToolResult=Error) -> `ERROR_RECOVERY`

4. **Context Injection**: Use xstate's context to store the list of Required Tools for the current state.

#### Phase 3: The Interception Middleware

**Goal**: Enforce the "Must Use" logic.

1. **Dependency**: Install `hookable`.

2. **Interceptor Class**: Create `AgentMiddleware` extending `Hookable`.

3. **Hooks**:
   - `onBeforeRequest(prompt, state)`: If state is `EXECUTING`, append "SYSTEM: You are in execution mode. You MUST output a tool call."
   - `onAfterResponse(response, state)`:
     - Parse response.
     - If `response.tool_calls` is empty AND state is `EXECUTING`: **Intercept**.
       - Do not show user.
       - Add message to history: "System Error: No tool called. Retry."
       - Re-trigger generation (Max 3 retries).

This "Loop" effectively bans the "Skill Router Excuse" by refusing to accept it as a valid turn.

#### Phase 4: Sandboxed Skill Runner

**Goal**: Safe execution of auto-activated tools.

1. **Dependency**: Install `isolated-vm`.

2. **Host Bridge**: Create a `HostAPI` class that exposes only the permitted functions (e.g., `safeReadFile`, `safeExecuteCommand`).

3. **Policy Check**: Inside `HostAPI`, implement the ceLLMate check:

```typescript
safeWriteFile(path: string, content: string) {
   if (!Policy.canWrite(path)) throw new Error("Sandbox Violation");
   return fs.writeFileSync(path, content);
}
```

4. **Execution**: Transfer the skill code into the Isolate and invoke it with the parameters extracted by the Zod schema.

### 6.3 Table: Technology Stack Selection (2026 SOTA)

| Component | Selected Technology | Alternative (Rejected) | Reason for Selection |
|-----------|---------------------|------------------------|----------------------|
| Embeddings | transformers.js (Quantized) | fastembed-js | Better quantization support, lighter footprint for CLI distributions. |
| Middleware | hookable | tapable | Modern Async/Await API, cleaner TypeScript types, prioritized execution. |
| Sandboxing | isolated-vm | vm2 | vm2 is insecure (CVE history). isolated-vm uses hard V8 isolation. |
| Schema | Zod | TypeBox / Joi | Industry standard, deep integration with Vercel AI SDK and TypeScript inference. |
| State | XState | Redux / Custom | Visualizable statecharts map perfectly to agentic "Workflows." |
| Routing | vLLM "Iris" Style (Signal Chain) | Single Vector Search | Multi-signal (Regex + Vector) required for reliability. |

---

## 7. Conclusion

The "Skill Router Excuse" is a symptom of insufficient architecture, not just a model failure. By relying on the probabilistic nature of LLMs to choose to work, we invite stochastic failure. The research confirms that the **SOTA for 2026 Coding Agents is Deterministic Enforcement**.

This report outlines a transition from a chat-based architecture to a **Workflow Engine**. By implementing the "Iris" routing pattern locally with transformers.js, enforcing transitions with an XState machine, actively intercepting non-compliant responses with hookable middleware, and sandboxing execution with isolated-vm, you can build a Claude Code environment that is not merely "helpful" but strictly, deterministically effective. The "Auto-Activation" CLI does not ask permission to be useful; it identifies intent and enforces the workflow required to execute it.

---

## Key Takeaways for Implementation

### Priority Order (Recommended)

1. **Phase 1: Semantic Router with transformers.js** - Enables deterministic skill detection
2. **Phase 3: Interception Middleware with hookable** - Enforces tool usage, prevents "Skill Router Excuse"
3. **Phase 2: State Machine with XState** - Maintains workflow context
4. **Phase 4: Sandboxing with isolated-vm** - Safe execution (can be deferred if trust model allows)

### Critical Insight

> **The LLM should not decide IF it uses a tool; it should only be responsible for populating the PARAMETERS of a tool that the system has already decided must be used.**

This is the fundamental architectural shift from "Auto-Detection" to "Auto-Activation".

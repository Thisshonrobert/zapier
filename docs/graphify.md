# Graphify Knowledge Graph Guidance

This document outlines how Graphify is used in this repository, where its outputs reside, and the policy regarding when to query and update it.

---

## 🗺️ What is Graphify?

[Graphify](https://github.com/graphify-ai/graphify) analyzes the repository's Abstract Syntax Tree (AST), module imports, community clusters, and conceptual relationships to generate a structural and semantic knowledge graph of the codebase.

The generated graph artifacts reside in the [`graphify-out/`](../graphify-out) directory:

- [`graphify-out/GRAPH_REPORT.md`](../graphify-out/GRAPH_REPORT.md): Human- and agent-readable summary of repository nodes, central abstractions ("God nodes"), community hubs, and inferred connections.
- `graphify-out/graph.json`: Machine-readable graph data (nodes, edges, hyperedges).
- `graphify-out/graph.html`: Visual interactive graph explorer for developers.

---

## 🔍 When to Consult Graphify

Consult Graphify when you need to:

1. **Understand Call Paths & Dependencies**: Trace cross-package imports, Prisma delegate usages, and service interactions.
2. **Identify Core Abstractions**: Inspect high-centrality hubs (e.g. `ActionDelegate`, `ZapRunExecution`, `PrismaClient`).
3. **Explore Architectural Communities**: See how modules cluster conceptually across the monorepo.

> [!IMPORTANT]
> **Source of Truth Invariant**: The source code (`apps/`, `packages/`) remains the ultimate source of truth. If a discrepancy exists between code and Graphify output, rely on the actual code implementation.

---

## ⏱️ Update Policy & Workflow

To conserve execution overhead and avoid unnecessary token churn:

- **Do NOT update Graphify for every small code change or individual commit.**
- **Update Graphify ONLY AFTER**:
  1. A major architectural change or major implementation milestone has been completed, verified, and pushed to GitHub.
  2. Introducing or restructuring entire services, shared packages, database schemas, or event buses.

---

## 🔄 Updating Graphify

When a milestone is reached, update Graphify using the Graphify CLI / update tool configured for the environment:

```bash
graphify
```

Verify that `graphify-out/GRAPH_REPORT.md` and associated artifacts are updated and committed alongside the milestone release.

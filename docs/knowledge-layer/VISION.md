# Vision

## Mission

Papership is the Knowledge Layer for agents. It determines what a particular agent needs to know to perform a task under the active constraints, gives the agent that knowledge, and learns whether the knowledge worked.

The human Workspace is the control plane for inspecting and governing that knowledge. The machine interface is mandatory. Neither client is a second source of truth.

## Core loop

```text
TASK
-> KNOWLEDGE_GAP
-> DISCOVER
-> RESOLVE
-> VERIFY
-> ACQUIRE
-> ASSEMBLE
-> APPLY
-> EXECUTE
-> MEASURE_IMPACT
-> LEARN
-> UPDATE_CONTEXT_GRAPH
-> NEXT_TASK
```

That loop is Papership. Static context files are inputs. The advantage is knowing what exists, what is relevant, what is trustworthy, what works, for which task, model, and runtime, and under which constraints.

## Moats

New work must reinforce at least one of:

- Context Graph
- Resolver intelligence
- Trust graph
- Impact graph
- Knowledge lineage
- Public and private context composition
- Cross-ecosystem interoperability
- Network effects

Features that do not reinforce the Knowledge Layer are deferred.

## What Papership does not rebuild

Papership sits above existing ecosystems. It does not replace foundation models, coding agents, source control, generic vector or memory databases, generic observability or tracing, MCP, Agent Skills, plugin standards, cloud hosting, CI/CD, app stores, payment rails, generic workflow engines, or generic business systems (CRM, project management, accounting).

It federates, references, normalises, resolves, and evaluates. It does not duplicate, replace, fork, or lock in those systems. A Papership-native format exists only where Papership-specific metadata or behaviour requires it. The native source stays canonical.

## Relationship to the current product

The running Papership Workspace is the primitive human surface: a blueprint-2 web app at `/papership`, a FastAPI store, a Hermes worker adapter, and a Tauri host that loads the web build. Company OS capabilities (work ledger, seats, grants, memory, connections, usage measurement) remain useful. KL-P1 reframes them as operational context around knowledge. It does not delete them.

## Non-goals of this vision document

This file does not choose libraries, schemas, or endpoint shapes. Those belong to the phase that implements them, using existing project conventions.

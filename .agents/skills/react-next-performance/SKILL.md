---
name: react-next-performance
description: Apply high-impact React and Next.js performance practices for async orchestration, effects, and rendering behavior.
---

# React and Next Performance Rules (Curated)

Source baseline: `vercel-labs/agent-skills` -> `react-best-practices` (curated for this repo).

## Purpose

Improve real-world responsiveness by removing avoidable waterfalls, unnecessary effects, and expensive first-load work.

## When to Use This Skill

- Data-fetching or route-handler changes.
- UI workflows with heavy state/effect orchestration.
- Performance-focused refactors in app or presentation layers.

## Scope

- `src/app/**`
- `src/presentation/**`
- `src/infrastructure/**`

## Rules

1. Parallelize independent async work.

- Use `Promise.all` when operations do not depend on each other.
- Start independent promises early and await only when values are needed.

2. Avoid route-handler waterfalls.

- Start independent operations immediately in route handlers.
- Keep serial awaits only for true dependencies.

3. Keep effect dependencies narrow and stable.

- Depend on primitives (`user.id`) instead of whole objects (`user`).
- Use functional state updates when next state depends on previous state.

4. Do not use effects for derived state.

- Compute derived values during render when based on existing props/state.
- Reserve effects for external synchronization (network, subscriptions, DOM APIs).

5. Put interaction side effects in event handlers.

- Handle click/submit/drag-triggered operations directly in handlers.
- Avoid modeling one-off interactions as `state + useEffect` chains.

6. Load heavy non-critical UI lazily.

- Use `next/dynamic` for expensive components not needed at first paint.
- Keep critical above-the-fold UI statically loaded.

7. Keep server composition parallel.

- Structure server fetches so sibling requests can run concurrently.
- Avoid serial chains without hard data dependency.

## Repo-specific Guidance

- Break orchestration-heavy components before micro-optimizing.
- Prioritize the largest workflow files first.
- Prefer clear architecture boundaries over clever caching complexity.

## Precedence

- Follow `AGENTS.md` first on any conflict.
- Apply this skill as a performance lens within existing architecture rules.

## PR Checklist

- Any sequential `await` chain without dependency justification?
- Any `useEffect` used for derived state?
- Any stale closure update that should be functional state update?
- Any heavy component that should be dynamically imported?

# React + Next Performance Rules (Curated)

Source baseline: `vercel-labs/agent-skills` -> `react-best-practices` (curated for this repo).

## Purpose

Apply only the highest-impact React/Next performance rules that match this codebase.

## Scope

- `src/app/**`
- `src/presentation/**`
- `src/infrastructure/**`

## Rules

1. Parallelize independent async work.

- Use `Promise.all` when operations do not depend on each other.
- Start independent promises early, await later.

2. Avoid API-route waterfalls.

- In route handlers, start independent operations immediately.
- Await only when values are needed.

3. Keep effect dependencies narrow and stable.

- Depend on primitives (`user.id`) instead of whole objects (`user`).
- Use functional state updates when next state depends on previous state.

4. Do not use effects for derived state.

- Compute values during render if they can be derived from existing state/props.
- Reserve effects for external synchronization (network, subscriptions, DOM APIs).

5. Put interaction side effects in handlers.

- If triggered by click/submit/drag, execute in the event handler.
- Do not model one-off user actions as `state + useEffect`.

6. Use dynamic imports for heavy, non-critical UI.

- Use `next/dynamic` for expensive components not needed at first paint.
- Keep critical above-the-fold UI statically loaded.

7. Keep server composition parallel.

- In server components/helpers, structure fetches so siblings can run concurrently.
- Avoid serial fetch chains unless there is a hard dependency.

## Repo-specific guidance

- Break orchestration-heavy components before micro-optimizing.
- Prioritize the largest files first (for example, `ProjectDetailPage` and scene editor flows).
- Prefer clear architecture boundaries over clever caching tricks.

## PR checklist

- Any sequential `await` chain justified by dependency?
- Any `useEffect` that can be replaced by render-time derivation?
- Any callback state update using stale closure instead of functional update?
- Any heavy component that should be dynamically imported?

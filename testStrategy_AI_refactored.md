# 🧪 Automated Test Strategy — Ad Campaign

> **Feature:** Create / Edit / Preview Ad Campaigns
> **Owner:** QA Department · v1.0
> **Stack:** TypeScript · Playwright · GitHub Actions

---

## Table of Contents

- [Scope \& Objective](#scope--objective)
- [Testing Types \& Levels](#testing-types--levels)
  - [Unit Tests](#a-unit-tests--5060-coverage)
  - [Integration Tests](#b-integration-tests--2030-coverage)
  - [End-to-End Tests](#c-end-to-end-e2e-tests--1020-coverage)
  - [API Testing](#d-api-testing--embedded-across-all-layers)
  - [API Health Checks](#e-api-endpoint-health-check-tests)
- [Test Environment \& Tooling](#test-environment--tooling)
- [CI/CD Integration](#cicd-integration)
- [Coverage vs. Speed](#coverage-vs-speed)

---

## Scope & Objective

The **Ad Campaign** feature enables publishers to **create**, **edit**, and **preview** ad campaigns. Because the feature is under active development with frequent changes, the testing strategy must be:

- ⚡ Fast to execute
- 🔧 Cheap to maintain
- 🛡️ Structured to prevent regressions at every pipeline stage

> **Guiding principle:** Maximise confidence in critical publisher workflows while keeping pipeline feedback under **5 minutes on every commit**. Coverage and speed are not in conflict — they are a consequence of correct test architecture.

---

## Testing Types & Levels

The strategy follows the **test pyramid** model. Each layer has a defined ownership, coverage target, and rationale. API testing is embedded horizontally across all layers where relevant.

```
        /\
       /  \
      / E2E \         10–20%   →  Critical user journeys only
     /--------\
    /Integration\     20–30%   →  Component interaction & contracts
   /--------------\
  /   Unit Tests   \  50–60%   →  Business logic, validation, state
 /------------------\
      [API Health]            →  Fast-fail availability gate
```

---

### Unit Tests — 50–60% coverage

Unit tests form the **foundation** of the suite. Each test is scoped to a single function or module and runs in isolation with no external dependencies.

**Why unit tests are the primary investment:**

- **Fast & cheap** — run in milliseconds, require no environment setup
- **Easy to maintain** — when the feature changes, unit tests are the least expensive to update; a targeted edit rather than a rewrite
- **Composable like building blocks** — individual unit tests can be assembled into focused regression packs targeting specific behaviours or modules
- **Tag-based organisation** — tests are tagged (e.g. `@create`, `@edit`, `@preview`, `@regression`) to enable selective execution; tags also provide traceability — each regression pack carries a version and historical execution data is trackable over time
- **Regression packs** — grouped tagged suites give the team confidence that new changes have not broken existing behaviour, without running the full suite every time

---

### Integration Tests — 20–30% coverage

Integration tests validate how components **interact** — service layers, database operations, internal APIs, and event flows — rather than individual units in isolation.

**Why integration coverage is deliberately bounded:**

- **Reuse of unit test logic** — because unit tests are composable, their assertions and data setups can be reused or extended when writing integration tests, reducing duplication
- **Higher implementation cost** — integration tests are more complex to write and maintain; given the feature is still evolving, over-investing at this stage creates unnecessary maintenance burden
- **Right-sized for the current phase** — 20–30% covers the critical integration points (campaign persistence, edit state management, preview data assembly) without locking in brittle structures against an unstable API surface

---

### End-to-End (E2E) Tests — 10–20% coverage

A small, focused set of E2E tests validates the most important **publisher journeys** through the full system stack — from UI interaction to data persistence.

**The three covered journeys:**

| # | Journey | Priority |
|---|---------|----------|
| 1 | Create a new campaign | 🔴 Critical |
| 2 | Edit an existing campaign | 🔴 Critical |
| 3 | Preview a campaign | 🔴 Critical |

**Why E2E coverage is kept deliberately small:**

- **Highest implementation and maintenance cost** — E2E tests require a running environment, real browser interactions, and are the most sensitive to UI and workflow changes
- **Playwright as the chosen tool** — provides built-in flakiness detection, reliable waiting mechanisms (no arbitrary timeouts), caching, and test sharding — all of which directly improve execution speed and result reliability

---

### API Testing — embedded across all layers

API testing is **not a standalone layer**. It is a practice embedded within unit, integration, and E2E tests wherever a network boundary is crossed.

- Request/response contract assertions are included in integration tests
- Schema validation is applied at E2E boundaries
- Error handling, status codes, and edge-case payloads are covered at unit and integration level

---

### API Endpoint Health Check Tests

A lightweight, dedicated health check suite pings all API endpoints to assert availability and expected HTTP status. These tests run **first** in every pipeline stage as a fast-fail gate.

> **Why run health checks first?**
> If an environment is broken or a deployment has failed, there is no value in running a 20-minute regression suite. A 30-second health check catches this immediately and saves the full suite from executing against a dead environment.

---

## Test Environment & Tooling

| Concern | Tool / Approach | Rationale |
|---------|----------------|-----------|
| Language | TypeScript | Type safety reduces test bugs; consistent with the application codebase |
| Test framework | Playwright Test | Unified runner for unit, integration, and E2E; excellent CI tooling |
| Flakiness detection | `--retries` + trace viewer | Built-in retry logic and failure traces eliminate guesswork in CI |
| Performance / speed | Sharding + caching | Native sharding splits suites across parallel runners; dependency caching speeds setup |
| Pipeline | GitHub Actions | Native GitHub integration; workflow YAML lives alongside the codebase |

---

## CI/CD Integration

Tests are integrated at **every stage of the promotion pipeline**. The rule is consistent: tests block promotion if they fail. The process repeats at each environment boundary until the change reaches production.

```
  [Push to sandbox branch]
           │
           ▼
  🏥 Health Check  ──FAIL──► ✋ Block PR
           │ PASS
           ▼
  🧪 Unit + Integration + API Contracts  ──FAIL──► ✋ Block PR merge
           │ PASS
           ▼
  [Merge to sandbox main]
           │
           ▼
  🎭 E2E Smoke (3 journeys)  ──FAIL──► ✋ Block deploy to Test env
           │ PASS
           ▼
  [Promote to Test / UAT]
           │
           ▼
  📦 Health Check + Regression Pack  ──FAIL──► ✋ Block promotion
           │ PASS
           ▼
  [Promote to Production]
           │
           ▼
  🚀 Health Check + Smoke  ──FAIL──► ✋ Block production deploy
           │ PASS
           ▼
  ✅ Live
```

### Pipeline Gates Summary

| Trigger | Tests Executed | Time Target | Blocks? |
|---------|---------------|-------------|---------|
| Push to sandbox branch | Health check → Unit → Integration → API contracts | < 5 min | ✅ Yes — blocks PR merge |
| Merge to sandbox main | All above + E2E smoke (3 journeys) | < 15 min | ✅ Yes — blocks deploy to test env |
| Promote to Test / UAT | Health check + targeted regression pack | < 20 min | ✅ Yes — blocks next env promotion |
| Promote to Production | Health check + full smoke suite | < 10 min | ✅ Yes — blocks production deploy |
| Nightly `02:00–03:00` | Full regression suite across all envs | < 45 min | ⚠️ No — alert + report only |

> **Nightly execution window:** All available automated tests run against each environment between `02:00–03:00`, when user traffic is at its lowest. Results are published to designated reporting channels (Slack, email, Allure dashboard) immediately after completion.

---

## Coverage vs. Speed

The goal is **not** to run all tests on every trigger — that produces noise, wastes time, and makes it harder to identify what actually failed. The tagging strategy and smoke-first pattern together solve this.

### Tag-Based Test Composition

Every test carries one or more tags that describe its scope and purpose:

| Tag | Runs When | Contains |
|-----|-----------|----------|
| `@health` | Every trigger | API availability checks — ~30 sec fast-fail signal |
| `@smoke` | Every PR commit | Core unit + integration tests for changed module |
| `@regression` | Merge to main / env promotion | Full module regression packs, versioned, with execution history |
| `@e2e` | Merge to main | Three critical publisher journeys only |
| `@nightly` | `02:00` schedule | Complete suite across all envs; includes visual regression |

### Smoke-First, Fail-Fast Execution

Before executing a regression suite that can take 30–60 minutes, a **targeted smoke test runs against the affected module first**. If the smoke test fails, the regression suite is skipped entirely.

```
  ┌─────────────────────┐
  │  @smoke suite       │  ~2 min
  │  (fast gate)        │
  └────────┬────────────┘
           │
      PASS │        FAIL
           │          └──► ✋ Skip regression. File defect. Notify team.
           ▼
  ┌─────────────────────┐
  │  @regression suite  │  ~20–60 min
  │  (full confidence)  │
  └─────────────────────┘
```

### Coverage Is Non-Negotiable — But Architecture Is Revisable

When pipeline execution time becomes a problem, the right response is to **re-examine test architecture — not reduce coverage**. The levers to pull, in order:

1. **Sharding** — Playwright distributes the suite across parallel workers, cutting execution time without removing tests
2. **Caching** — `node_modules` and browser binaries are cached in GitHub Actions, eliminating repeated install overhead
3. **Flakiness quarantine** — any test failing intermittently is quarantined and filed for investigation; it does not block the pipeline but is not silently ignored
4. **Tag refinement** — review which tests belong in `@smoke` vs `@regression` vs `@nightly`; misclassified tests are the most common source of unnecessary slowness

---

> 📝 **This document is a living artefact.** It should be reviewed and updated at the start of each major feature iteration or sprint cycle.

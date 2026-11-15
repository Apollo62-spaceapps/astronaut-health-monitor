# 🚀 Apollo 62 — Astronaut Health Monitor

Team **Apollo 62** (Goiânia, Brazil 🇧🇷) · **NASA Space Apps Challenge 2026** · Challenge: *Create Health Monitoring Software for Astronauts on Space Missions*.

**▶ Live demo:** https://astronaut-health-monitor-beta.vercel.app/ (desktop and mobile)

> **Decision-support prototype — not a medical device, not for diagnosis.** Some data is simulated, and every number on screen is labeled **REAL** or **SIMULATED**.

## 💡 What it is

A visual self-assessment tool that keeps working far from Earth. The astronaut sees their vital signs compared with **their own pre-flight baseline**, plus radiation, wellbeing and exercise, on one body map. **Orbit**, an onboard copilot, explains what the data means and helps decide when to call the Crew Medical Officer (CMO) or the ground.

**Four ideas set it apart:**

1. **One system, four environments.** A mode button switches the whole platform between **Earth · Space Station · Moon · Spacecraft**. One click changes the communication delay, the escalation, the gravity phase, the radiation dose rate, the exercise context and the mission banner.
2. **The communication delay is part of the interface.** On the Spacecraft: *"Ground reply in ~40 min — follow these safe actions now"*. On Earth: *"Flight surgeon available now"*.
3. **Early warning, not just a readout.** The rule engine projects each vital from the astronaut's own last 7 days and warns *before* it crosses the next line (*"Resting heart rate heading toward Urgent in ~3 days"*). The career dose is projected with the sourced cruise rate. Orbit tells the crew proactively, with safe actions, as soon as a warning appears. If a vital turns **Urgent** (e.g. a very fast resting heart rate), Orbit interrupts with *"This needs a person now"*, the safe actions, the delay to the ground and a one-tap **Notify CMO now** that queues a priority message.
4. **Rules decide, AI assists.** Colors, alerts and escalation come from a deterministic, tested rule engine. Orbit only explains, cites its sources and drafts the report to the ground; it never changes an alert, names a condition or suggests medication.

## 🧭 Screens

| Screen | What you can do |
|---|---|
| **Overview** | Body map (head, heart, torso, skin, arms, legs and a radiation overlay), active alerts, **Log measurement**, daily check-in, ground report |
| **Vitals** | Heart rate, blood pressure, glucose and temperature against the pre-flight baseline, with trend and provenance |
| **Baseline** | How the personal reference is built, and how it adapts after a gravity change (urgent is never masked) |
| **Radiation** | Career dose against the 600 mSv limit; replay of a **real NASA DONKI solar particle event** that triggers an Orion-based shelter flow |
| **Exercise** | Self-reported training time and weekly activity |
| **Wellbeing** | Private mood and sleep check-in, 14-day chart, private journal and consent to share alerts (not details) with the CMO |
| **Crew outlook** | Risk outlook for a small synthetic crew (Low / Guarded / Elevated / High), with the driver and safe actions |
| **Orbit** | Chat with step-by-step answers and citations; detects emergency phrases; prepares a compact report for the ground |
| **Data & Sources** | Every source (S01–S28) with links and terms, and how Orbit works |

A floating **Demo** panel replays the solar event, simulates a heart-rate change and speeds up time.

## 🛡️ Principles

- **Works without Earth:** everything runs in the browser, with no backend, no API keys and no CDN.
- **Visible provenance:** REAL or SIMULATED on every number, with the source one click away.
- **Never "fit", "healthy" or a diagnosis:** statuses are Normal / Attention / Urgent / Adapting / Restricted, always shown as color + icon + text.
- **Privacy by role:** wellbeing is private; CMO access requires consent or an audited break-glass. This is implemented and tested, but the demo shows the astronaut's view.
- **Illustrative thresholds:** no validated clinical ranges yet, and the screen says so.

## 🔍 Real vs. simulated

| Real (cited in the app) | Simulated |
|---|---|
| NASA DONKI solar particle event `2024-05-11T02:10:00-SEP-001` | Astronaut, vitals, wellbeing and exercise history (fixed-seed synthetic data) |
| 600 mSv career limit (NASA OCHMO) | Mission day 120 scenario and prior career dose |
| 1.8 mSv/day cruise dose measured by MSL/RAD | Alert thresholds (labeled *Illustrative thresholds*) |
| Earth–Mars delay of up to ~22 min and blackouts of up to 2–3 weeks (NASA) | Crew outlook crew members |
| ARED / T2 / CEVIS and ~2 h/day of exercise on the ISS (NASA) | Dose rates for the Station, Moon and Earth (not shown: no source) |

## 🧠 How Orbit works

1. **Rule layer** (pure functions, tested): decides every status, alert and escalation.
2. **Local library** of 58 short passages, most from NASA sources, retrieved on device (edge RAG) and cited in each answer.
3. **Optional on-device model** (WebLLM, Llama 3.2 1B by default) that only rewrites the wording. If it is unavailable, protocol mode answers everything and the traffic light does not change.

## 🛠️ Tech stack

React 19 · TypeScript (strict) · Vite 8 · Tailwind CSS 4 · shadcn/ui (Radix) · Recharts · Zustand · Zod · Vitest (436 tests) · WebLLM in a Web Worker · oxlint + Prettier.

## 🚀 Run locally

Requirements: Node.js 22 or 24 (minimum 20.19).

```bash
npm install
npm run dev        # development server
npm test           # all tests (rule engine, Orbit, screens)
npm run build      # production build
npm run preview    # serve the build at http://localhost:4173
```

Add `?ai=protocol` to the URL to run Orbit without the language model.

## 📚 Docs

- [Frontend specification (pt-BR)](docs/SPEC-frontend.md): requirements, rules, data model and source catalog
- [Design system (NASA style)](docs/DESIGN-SYSTEM.md) · [PDF](docs/design/)
- Sources used in the app: **Data & Sources** screen, or [`src/data/sources.ts`](src/data/sources.ts)

## 👨‍💻 Team

Software Engineering students from the **Federal University of Goiás (UFG)** and researchers from the **Center of Excellence in Artificial Intelligence (CEIA-UFG)**.

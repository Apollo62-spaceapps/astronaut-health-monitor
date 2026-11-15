# 🚀 Apollo 62 — NASA Space Apps Challenge 2026
Official repository for team **Apollo 62** (Goiânia, Brazil 🇧🇷) for the **NASA Space Apps Challenge 2026**.

> **Decision-support prototype — not a medical device, not for diagnosis.** This is a navigable frontend prototype built for the pitch. Some data is simulated, and every number on screen is labeled **REAL** or **SIMULATED**.

## 🩺 Challenge
**Create Health Monitoring Software for Astronauts on Space Missions** (AEB / NASA) — Development of a visual health self-assessment and medical guidance tool for astronauts on space missions.

## 💡 What we are building

The astronaut self-assesses through a **core of vital signs compared with their own baseline**, plus three modules that talk to each other: **radiation**, **mental wellbeing** and **exercise adherence**. The system keeps working far from Earth and escalates to the Crew Medical Officer (CMO) or to the ground, respecting who is allowed to see each piece of data.

| Feature | What it shows |
|---|---|
| **Body Status Map** | A clickable silhouette. Each zone (head, heart, torso, skin, plus a radiation overlay) shows the worst status of its indicators. The zone card shows the value vs. the personal baseline, the related NASA hazard and the source. |
| **Vitals** | Heart rate, blood pressure, glucose and temperature, each with its % deviation from the pre-flight baseline (drawn as one range on the chart), the in-flight average, its trend and a provenance badge. |
| **Radiation** | Career dose vs. the 600 mSv limit. A **real solar particle event from NASA DONKI** (May 11, 2024) is replayed in the scenario and triggers a shelter flow adapted from NASA's Orion procedure. |
| **Wellbeing (restricted)** | Daily mood and sleep self-report, private by default. The CMO sees it only with the astronaut's consent, or through an audited **break-glass** emergency access. |
| **Exercise** | Adherence to the prescribed ARED / T2 / CEVIS plan. |
| **Environment mode button** | A button in the top bar switches the whole platform between **Earth · Space Station · Moon · Spacecraft**, the way a theme button switches a website. It is not a dark mode: one click changes the communication delay, escalation, gravity phase, daily radiation dose rate, exercise equipment, mission routine and the mission-banner color. Numbers without a source for that environment are not shown. |
| **Delay-aware escalation** | The communication delay is part of the interface. On the Spacecraft: "Ground reply in ~40 min — follow these safe actions now", with a store-and-forward queue. On Earth: "Flight surgeon available now". |
| **Assistant** | An on-device language model running in the browser (WebLLM), with a deterministic protocol fallback. The AI only talks and summarizes; it never changes an alert. |
| **Mission routine** | The tool prompts the astronaut to take specific measurements and do activities at set times, as part of the mission routine (e.g. resting heart rate in the morning, wellbeing check-in, exercise, and spacecraft maintenance while docked at the Space Station). One click on **Log measurement** updates the body map and the charts. |
| **Data & Sources** | Every source used, with links and terms. |

**Principles:**
- **Rules decide, AI assists.** Colors, alerts and escalation come from a deterministic, tested rule engine.
- **Works without Earth.** Everything runs locally, aligned with NASA's Earth-Independent Medical Operations research.
- **Visible provenance:** REAL vs. SIMULATED on every number.
- **Privacy by role**, in line with NASA's private medical communications.
- **Never "fit", "healthy" or a diagnosis.** Statuses are Normal / Attention / Urgent / Adapting / Restricted, always shown with color + icon + text.

## 🔍 Real vs. simulated

| Real | Simulated |
|---|---|
| NASA DONKI solar particle event `2024-05-11T02:10:00-SEP-001` | Astronaut, vitals, wellbeing and exercise history (fixed-seed synthetic data) |
| 600 mSv career limit (NASA OCHMO) | Prior career dose; dose increments during the event |
| 1.8 mSv/day cruise average measured by MSL/RAD | Mission day 120 scenario |
| Communication delay range of 4–24 min to Mars (NASA) | Alert thresholds, labeled *Illustrative thresholds* |
| Mars communication blackouts of up to 2–3 weeks (NASA) | Exercise equipment on the Moon and on the Spacecraft; daily dose rates for the Station, Moon and Earth (not shown) |
| ARED / T2 / CEVIS and ~2 h/day of exercise (NASA) | Exercise prescription split between devices |

## 🛠️ Tech stack

React 19 · TypeScript 7 (strict) · Vite 8 · Tailwind CSS 4 · shadcn/ui (Radix) · Recharts 3 · Zustand · Zod · Vitest · WebLLM (in a Web Worker) · oxlint + Prettier. No backend, no API keys, nothing loaded from a CDN. The only exception is the one-time download of the model weights, which are then cached for offline use.

## 🚀 Getting started

Requirements: Node.js 22 or 24 (minimum 20.19) and Git.

```bash
npm install
npm run dev        # development server
npm test           # run the rule-engine tests once
npm run build      # production build
npm run preview    # serve the production build at http://localhost:4173 (offline demo mode)
```

Add `?ai=protocol` to the URL to run the assistant without the language model.

## 📚 Docs

- [Frontend specification (pt-BR)](docs/SPEC-frontend.md): requirements, rules, data model, demo script and the full source catalog.
- [Design system (NASA style)](docs/DESIGN-SYSTEM.md): colors, type, components ([PDF](docs/design/)).
- Onboarding: [Lucas](docs/onboarding/LUCAS.md) · [Felipe](docs/onboarding/FELIPE.md)
- [Project context (pt-BR)](CLAUDE.md)
- [Coding guide (pt-BR)](INSTRUCOES-DE-CODIGO.md)
- [Team kanban](https://github.com/orgs/Apollo62-spaceapps/projects/3)

## 👨‍💻 Team
Software Engineering students from the **Federal University of Goiás (UFG)** and researchers from the **Center of Excellence in Artificial Intelligence (CEIA-UFG)**.

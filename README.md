# 🚀 Apollo 62 — NASA Space Apps Challenge 2026
Official repository for team **Apollo 62** (Goiânia, Brazil 🇧🇷) for the **NASA Space Apps Challenge 2026**.

## 🩺 Challenge
**Create Health Monitoring Software for Astronauts on Space Missions** (AEB / NASA) — Development of a visual health self-assessment and medical guidance tool for astronauts on space missions.

## 👨‍💻 Team
Software Engineering students from the **Federal University of Goiás (UFG)** and researchers from the **Center of Excellence in Artificial Intelligence (CEIA-UFG)**.

## 🧬 Scientific Foundation & Data Sources

The clinical triage engine, emergency protocols, and environmental thresholds of this software were modeled directly from official guidelines and research published by the **NASA Human Research Program (HRP)** and the **Canadian Space Agency (CSA)**.

| Official Source | Risks & Metrics Extracted | Direct Software Implementation |
| :--- | :--- | :--- |
| 🚀 **NASA HRP — 5 Hazards of Human Spaceflight** | Radiation, isolation, distance from Earth, altered gravity, and closed environments (CO₂/pressure). | Dynamic parameter calibration by mission profile (**Spacecraft, Space Station, Lunar Base**) and **100% offline-first** autonomous operation. |
| 🩺 **NASA HRP — Risks of Human Spaceflight** | Cardiovascular deconditioning, bone loss, immune dysregulation, fatigue, and sleep disorders. | Vital sign anomaly thresholds, step-by-step emergency protocols (e.g., acute chest pain), and fatigue/circadian alerts. |
| 📊 **NASA HRP — Ongoing Research & Standard Measures** | Core set of physiological and cognitive biomarkers collected in-flight (plus HERA/MMEA analogs). | Selection of priority vital indicators and guided workflows explaining *"How to Measure"* and *"Why It Matters"* for non-physicians. |
| ☢️ **CSA — Radiation Monitoring & Microgravity Science** | Cumulative radiation dosimetry and microgravity biological research (ISS). | Cumulative ionizing radiation exposure tracking module and solar particle event (SPE) preventive alerts. |

<details>
<summary><strong>📚 Click to expand the complete catalog of analyzed sources and sub-sources (NASA HRP & CSA)</strong></summary>

<br>

### 🛸 1. NASA — Human Research Program (HRP)
* **5 Hazards of Human Spaceflight:**
  * **1.1 Space Radiation:** Biological impact of invisible ionizing particles and ground-based simulation laboratories.
  * **1.2 Isolation & Confinement:** Behavioral responses, mental health, and crew dynamics in confined spaces over extended durations.
  * **1.3 Distance from Earth:** Operational autonomy challenges and communication latency/lack of real-time medical support on deep-space missions (e.g., Mars).
  * **1.4 Gravity Fields:** Muscular, skeletal, vestibular, and organ adaptation to microgravity and altered gravity environments (Moon/Mars).
  * **1.5 Hostile/Closed Environments:** Spacecraft internal ecology (temperature, cabin pressure, noise, lighting, CO₂ levels, and microbiomes).
* **Risks of Human Spaceflight:**
  * **2.1 Risks Involving Human Physiology:** Immune system alterations, cardiovascular adaptations, bone density loss, malnutrition, and Extravehicular Activity (EVA) risks.
  * **2.2 Risks Involving Behavioral Performance:** Sleep disturbances, chronic fatigue, isolation-induced psychiatric disorders, and crew communication breakdowns.
  * **2.3 Risks Involving Space Radiation:** Cellular damage, genetic mutations, and cancer risks induced by galactic cosmic rays (GCR) and solar storms.
* **Ongoing HRP Research in Space:**
  * **3.1 Spaceflight Standard Measures:** Core suite of physiological and psychological metrics collected from astronauts to characterize human adaptation.
  * **3.2 Ground Analogs & Studies (HERA & MMEA):** Earth-based isolation and mission simulators used to validate human resilience and countermeasures.

### 🍁 2. CSA (Canadian Space Agency)
* **Monitoring Radiation for Astronaut Health:**
  * **4.1 Dosimetry & Sensors:** Canadian dosimetry technologies and cumulative radiation tracking systems for long-duration crews.
* **Why Do We Conduct Science Experiments in Space?:**
  * **5.1 Microgravity Medical Research:** Advanced biological and medical experiments conducted aboard the International Space Station (ISS) targeting human physiology.

</details>

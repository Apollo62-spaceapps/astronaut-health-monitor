// Catálogo de fontes (SPEC §16, acesso em 14/11/2026). Usado pela página Data & Sources (F5, SRC-01)
// e pelos selos REAL. Não acrescente fonte sem abrir e conferir a página (CLAUDE.md §0).
//
// PENDÊNCIAS (fora da tela, polimento 15/11): os termos marcados "Verificar" na SPEC §16 ainda não foram
// conferidos pelo time em S02, S03, S04, S05, S12, S13, S14 e S19 — a UI mostra só a regra que seguimos
// (citar, não reproduzir). S08: conferir o valor exato no artigo antes de citar no pitch. S17: licenças da
// biblioteca e do modelo (P-03). S10/S11/S20: termos conferidos no registro do NTRS em 15/11.
import type { Source, SourceId } from '@/domain/types'

const ACCESSED = '2026-11-14'

export const SOURCES: readonly Source[] = [
  {
    id: 'S01',
    provider: 'NASA Space Apps',
    title: 'Create Health Monitoring Software for Astronauts on Space Missions',
    urls: ['https://www.spaceappschallenge.org/2026/challenges/health-monitoring-software/?tab=details'],
    accessed: ACCESSED,
    use: 'Challenge brief: self-assessment, indicators, body map, charts, colors, reminders, environments',
    terms: 'Challenge brief (public)',
  },
  {
    id: 'S02',
    provider: 'NASA OCHMO',
    title: 'NASA-STD-3001, Volume 1, Revision C (2023)',
    urls: ['https://www.nasa.gov/wp-content/uploads/2023/11/nasa-std-3001-vol-1-rev-c-with-signature.pdf'],
    accessed: ACCESSED,
    use: 'CMO role (at least two per vehicle), private medical communications',
    terms: 'NASA public document · cited, not reproduced',
  },
  {
    id: 'S03',
    provider: 'NASA OCHMO',
    title: 'OCHMO-TB-020 Design for Ionizing Radiation Protection',
    urls: ['https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-020-radiation-protection.pdf'],
    accessed: ACCESSED,
    use: 'Career radiation limit of 600 mSv',
    terms: 'NASA public document · cited, not reproduced',
  },
  {
    id: 'S04',
    provider: 'NASA OCHMO',
    title: 'OCHMO-TB-044 Medical Operations (2025-08-13)',
    urls: ['https://www.nasa.gov/wp-content/uploads/2025/08/ochmo-tb-044-medical-operations.pdf'],
    accessed: ACCESSED,
    use: 'Crew Surgeon authority, ASCRs, private conferences, Privacy Act, onboard medical checklist',
    terms: 'NASA public document · cited, not reproduced',
  },
  {
    id: 'S05',
    provider: 'NASA',
    title: 'Crew Systems (Orion), Radiation Shelter; Scientists and Engineers Evaluate Orion Radiation Protection Plan',
    urls: [
      'https://www.nasa.gov/reference/crew-systems/',
      'https://www.nasa.gov/missions/artemis/orion/scientists-and-engineers-evaluate-orion-radiation-protection-plan/',
    ],
    accessed: ACCESSED,
    use: 'Shelter flow adapted from the Orion procedure',
    terms: 'NASA public document · cited, not reproduced',
  },
  {
    id: 'S06',
    provider: 'NASA GSFC CCMC',
    title: 'CCMC DONKI System (terms of use)',
    urls: ['https://ccmc.gsfc.nasa.gov/tools/DONKI/'],
    accessed: ACCESSED,
    use: 'Space weather database terms',
    terms:
      'CCMC terms: prototype-quality data, no NASA endorsement; acknowledgement below',
  },
  {
    id: 'S07',
    provider: 'NASA GSFC CCMC',
    title: 'DONKI API GET /get/SEP — event 2024-05-11T02:10:00-SEP-001',
    urls: [
      'https://ccmc.gsfc.nasa.gov/DONKI-API/get/SEP?startDate=2024-05-01&endDate=2024-05-31',
      'https://ccmc.gsfc.nasa.gov/DONKI/view/SEP/30714/-1',
    ],
    accessed: ACCESSED,
    use: 'Real solar particle event replayed in the scenario',
    terms: 'CCMC terms (S06)',
  },
  {
    id: 'S08',
    provider: 'PubMed (Zeitlin et al., 2013)',
    title:
      'Measurements of energetic particle radiation in transit to Mars on the Mars Science Laboratory (PMID 23723233)',
    urls: ['https://pubmed.ncbi.nlm.nih.gov/23723233/'],
    accessed: ACCESSED,
    use: 'Original article for the MSL/RAD cruise dose rate',
    terms: 'Cited, not reproduced',
  },
  {
    id: 'S09',
    provider: 'Southwest Research Institute',
    title: 'SwRI-led team calculates the radiation exposure associated with a trip to Mars',
    urls: [
      'https://www.swri.org/newsroom/press-releases/swri-led-team-calculates-the-radiation-exposure-associated-trip-mars',
    ],
    accessed: ACCESSED,
    use: '1.8 mSv/day cruise average (galactic cosmic rays)',
    terms: 'Cited, not reproduced',
  },
  {
    id: 'S10',
    provider: 'NASA NTRS (Robinson et al., IAC-19, 2019)',
    title: 'Innovative Approaches to Using the International Space Station as a Mars Transit Analog',
    urls: ['https://ntrs.nasa.gov/api/citations/20190032318/downloads/20190032318.pdf'],
    accessed: ACCESSED,
    use: 'Earth–Mars communication delay range (4–24 min) and blackouts',
    terms: 'NTRS: public, government use permitted',
  },
  {
    id: 'S11',
    provider: 'NASA NTRS (Cannon and Sapp, 2025)',
    title: 'Expertise and Training Considerations for Crew Complement to the Mars Vicinity',
    urls: ['https://ntrs.nasa.gov/api/citations/20250007638/downloads/Crew_Complement_Mars_Vicinity_Final.pdf'],
    accessed: ACCESSED,
    use: 'Mars delay (22 min each way) and three-week blackout',
    terms: 'NTRS: public; cited, not reproduced',
  },
  {
    id: 'S12',
    provider: 'NASA Ames',
    title:
      'A Clinical Decision Support System for Earth-independent Medical Operations (2024); Russell et al., npj Microgravity 9, 46 (2023)',
    urls: [
      'https://www.nasa.gov/centers-and-facilities/ames/ames-science/ames-space-biosciences/a-clinical-decision-support-system-for-earth-independent-medical-operations/',
      'https://doi.org/10.1038/s41526-023-00284-1',
    ],
    accessed: ACCESSED,
    use: 'EIMO / clinical decision support concept',
    terms: 'Cited, not reproduced',
  },
  {
    id: 'S13',
    provider: 'NASA',
    title: 'Astronaut Exercise (ARED, T2, CEVIS; about 2 h/day)',
    urls: ['https://www.nasa.gov/missions/station/iss-research/astronaut-exercise/'],
    accessed: ACCESSED,
    use: 'ISS exercise devices and daily average',
    terms: 'NASA public document · cited, not reproduced',
  },
  {
    id: 'S14',
    provider: 'NOAA SWPC',
    title: 'GOES Proton Flux; NOAA Space Weather Scales',
    urls: ['https://www.swpc.noaa.gov/products/goes-proton-flux', 'https://www.swpc.noaa.gov/noaa-scales-explanation'],
    accessed: ACCESSED,
    use: 'Explanatory reference only (S-scale is never shown as real data, RAD-07)',
    terms: 'NOAA public page · explanatory only',
  },
  {
    id: 'S15',
    provider: 'Google Cloud Blog',
    title: 'How Google and NASA are testing AI for medical care in space (2025-08-07)',
    urls: [
      'https://cloud.google.com/blog/topics/public-sector/how-google-and-nasa-are-testing-ai-for-medical-care-in-space',
    ],
    accessed: ACCESSED,
    use: 'Pitch context (related work)',
    terms: 'Cited for context only',
  },
  {
    id: 'S16',
    provider: 'ISO / IEC',
    title: 'IEC 62304:2006 Medical device software — Software life cycle processes',
    urls: ['https://www.iso.org/standard/38421.html'],
    accessed: ACCESSED,
    use: 'Engineering practices inspired by the standard (no compliance claimed)',
    terms: 'Cited; no compliance claimed',
  },
  {
    id: 'S17',
    provider: 'WebLLM / MLC',
    title: 'WebLLM documentation; arXiv 2412.15803',
    urls: ['https://webllm.mlc.ai/docs/', 'https://arxiv.org/abs/2412.15803'],
    accessed: ACCESSED,
    use: 'On-device language model in the browser',
    terms: 'Cited, not reproduced',
  },
  {
    id: 'S18',
    provider: 'shadcn/ui',
    title: 'Tailwind v4 (Tailwind v4 and React 19 support)',
    urls: ['https://ui.shadcn.com/docs/tailwind-v4'],
    accessed: ACCESSED,
    use: 'UI components',
    terms: 'Cited, not reproduced',
  },
  {
    id: 'S19',
    provider: 'NASA Human Research Program',
    title: 'The Human Body in Space (2021, updated 2026-05-26)',
    urls: ['https://www.nasa.gov/humans-in-space/the-human-body-in-space/'],
    accessed: ACCESSED,
    use: 'Body map zone → hazard mapping; software-generated exercise partners',
    terms: 'NASA public document · cited, not reproduced',
  },
  {
    // Fonte extra verificada em 14/11 (CLAUDE.md §8); registro conferido no NTRS em 15/11.
    id: 'S20',
    provider: 'NASA NTRS (McBrayer, Chai and Judd, 2022)',
    title: 'Communication Delays, Disruptions, and Blackouts for Crewed Mars Missions',
    urls: ['https://ntrs.nasa.gov/citations/20220013418'],
    accessed: '2026-11-15',
    use: 'Earth–Mars delay from 0 to about 22 min over a mission',
    terms: 'NTRS: public, government use permitted',
  },
  {
    // Título corrigido em 15/11: o DOI/PMC apontam para Patel et al. 2020 (PMID 33298950), não para um artigo
    // sobre exercício. Por isso a S21 não é mais citada nas afirmações de exercício (S13) nem de osso/músculo (S19).
    id: 'S21',
    provider: 'npj Microgravity (Patel et al., 2020)',
    title: 'Red risks for a journey to the red planet: The highest priority human health risks for a mission to Mars',
    urls: ['https://pmc.ncbi.nlm.nih.gov/articles/PMC7645687/', 'https://doi.org/10.1038/s41526-020-00124-6'],
    accessed: '2026-11-15',
    use: 'Background on the highest-priority human health risks for a Mars mission',
    terms: 'Open access · cited, not reproduced',
  },
  // ── NASA Spaceflight Standard Measures (SSM), L7 / Orbit §5C. Pesquisa do time em 15/11/2026; os ids do
  // prompt (S21–S27) viraram S22–S28 porque S21 já estava em uso. PENDENTE: o time ainda precisa abrir cada página e conferir os termos (a UI não mostra nota interna).
  {
    id: 'S22',
    provider: 'NASA',
    title: 'Spaceflight Standard Measures: Characterizing How Humans Adapt in Space',
    urls: ['https://www.nasa.gov/?p=329041'],
    accessed: '2026-11-15',
    use: 'Overview of the Standard Measures domains and the purpose of each measure; wellbeing questionnaire format',
    terms: 'NASA public page · cited, not reproduced',
  },
  {
    id: 'S23',
    provider: 'NASA NTRS (Clément, Mullenax et al., 2020)',
    title: 'Spaceflight Standard Measures',
    urls: ['https://ntrs.nasa.gov/api/citations/20200001281/downloads/20200001281.pdf'],
    accessed: '2026-11-15',
    use: 'HRP risks addressed (Crew outlook event types); example pre-, in- and post-flight schedule',
    terms: 'NASA public page · cited, not reproduced',
  },
  {
    id: 'S24',
    provider: 'NASA NTRS (Zwart, 2018)',
    title: 'Spaceflight Standard Measures',
    urls: ['https://ntrs.nasa.gov/api/citations/20180002943/downloads/20180002943.pdf'],
    accessed: '2026-11-15',
    use: 'Earlier schedule by domain (differs in part from S23; both cited)',
    terms: 'NASA public page · cited, not reproduced',
  },
  {
    id: 'S25',
    provider: 'NASA Life Sciences Portal',
    title: 'Standard Measures',
    urls: ['https://nlsp.nasa.gov/explore/home/lsda_sm'],
    accessed: '2026-11-15',
    use: 'The six core domains of the Standard Measures',
    terms: 'NASA public page · cited, not reproduced',
  },
  {
    id: 'S26',
    provider: 'NASA NTRS (Theriot et al., 2023)',
    title: 'Standard Measures in Analogs of Spaceflight',
    urls: ['https://ntrs.nasa.gov/citations/20220014080'],
    accessed: '2026-11-15',
    use: 'Analog crews (HERA: 4 people): size of the synthetic crew in Crew outlook',
    terms: 'NTRS: Public Use Permitted',
  },
  {
    id: 'S27',
    provider: 'NASA',
    title: 'Artemis II Standard Measures',
    urls: ['https://www.nasa.gov/reference/artemis-ii-standard-measures'],
    accessed: '2026-11-15',
    use: 'Lunar branch of the Standard Measures (context for the Moon environment)',
    terms: 'NASA public page · cited, not reproduced',
  },
  {
    id: 'S28',
    provider: 'NASA NTRS (Williams, 2017)',
    title: 'Behavioral Health and Performance Laboratory Standard Measures (BHP-SM)',
    urls: ['https://ntrs.nasa.gov/citations/20170005421'],
    accessed: '2026-11-15',
    use: 'Caveat: research measures for longitudinal analysis; they do not define health or readiness',
    terms: 'NASA public page · cited, not reproduced',
  },
]

/** Ressalva do SSM (S28, parafraseada): mostrada em Data & Sources e no "about" do Orbit. */
export const SSM_CAVEAT =
  'NASA Standard Measures are research measures collected for longitudinal analysis; this prototype does not define health or readiness.'

export function sourceById(id: SourceId): Source | undefined {
  return SOURCES.find((s) => s.id === id)
}

/** Agradecimento ao DONKI. PENDENTE P-06: conferir o texto exato na política de publicação da CCMC (S06). */
export const DONKI_ACKNOWLEDGEMENT =
  'Solar particle event data courtesy of the Community Coordinated Modeling Center (CCMC) DONKI system, NASA Goddard Space Flight Center.'

// Catálogo de fontes (SPEC §16, acesso em 14/11/2026). Usado pela página Data & Sources (F5, SRC-01)
// e pelos selos REAL. Não acrescente fonte sem abrir e conferir a página (CLAUDE.md §0).
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
    terms: 'Challenge brief',
  },
  {
    id: 'S02',
    provider: 'NASA OCHMO',
    title: 'NASA-STD-3001, Volume 1, Revision C (2023)',
    urls: ['https://www.nasa.gov/wp-content/uploads/2023/11/nasa-std-3001-vol-1-rev-c-with-signature.pdf'],
    accessed: ACCESSED,
    use: 'CMO role (at least two per vehicle), private medical communications',
    terms: 'Verify',
  },
  {
    id: 'S03',
    provider: 'NASA OCHMO',
    title: 'OCHMO-TB-020 Design for Ionizing Radiation Protection',
    urls: ['https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-020-radiation-protection.pdf'],
    accessed: ACCESSED,
    use: 'Career radiation limit of 600 mSv',
    terms: 'Verify',
  },
  {
    id: 'S04',
    provider: 'NASA OCHMO',
    title: 'OCHMO-TB-044 Medical Operations (2025-08-13)',
    urls: ['https://www.nasa.gov/wp-content/uploads/2025/08/ochmo-tb-044-medical-operations.pdf'],
    accessed: ACCESSED,
    use: 'Crew Surgeon authority, ASCRs, private conferences, Privacy Act, onboard medical checklist',
    terms: 'Verify',
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
    terms: 'Verify',
  },
  {
    id: 'S06',
    provider: 'NASA GSFC CCMC',
    title: 'CCMC DONKI System (terms of use)',
    urls: ['https://ccmc.gsfc.nasa.gov/tools/DONKI/'],
    accessed: ACCESSED,
    use: 'Space weather database terms',
    terms:
      'Prototype-quality data for research context; no license or NASA endorsement; follow the CCMC publication policy',
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
    terms: 'Same terms as S06',
  },
  {
    id: 'S08',
    provider: 'PubMed (Zeitlin et al., 2013)',
    title:
      'Measurements of energetic particle radiation in transit to Mars on the Mars Science Laboratory (PMID 23723233)',
    urls: ['https://pubmed.ncbi.nlm.nih.gov/23723233/'],
    accessed: ACCESSED,
    use: 'Original article for the MSL/RAD cruise dose rate (check the exact value before citing)',
    terms: 'Cite, do not reproduce',
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
    terms: 'Cite',
  },
  {
    id: 'S10',
    provider: 'NASA NTRS (Robinson et al., IAC-19, 2019)',
    title: 'Innovative Approaches to using the ISS… (4–24 min delay, blackouts of up to 2 weeks)',
    urls: ['https://ntrs.nasa.gov/api/citations/20190032318/downloads/20190032318.pdf'],
    accessed: ACCESSED,
    use: 'Earth–Mars communication delay range and blackouts',
    terms: 'Verify',
  },
  {
    id: 'S11',
    provider: 'NASA NTRS (2025)',
    title: 'Expertise and Training Considerations for Crew… Mars Vicinity (up to 22 min, 3-week blackout)',
    urls: ['https://ntrs.nasa.gov/api/citations/20250007638/downloads/Crew_Complement_Mars_Vicinity_Final.pdf'],
    accessed: ACCESSED,
    use: 'Mars delay and blackout duration',
    terms: 'Verify',
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
    terms: 'Verify',
  },
  {
    id: 'S13',
    provider: 'NASA',
    title: 'Astronaut Exercise (ARED, T2, CEVIS; about 2 h/day)',
    urls: ['https://www.nasa.gov/missions/station/iss-research/astronaut-exercise/'],
    accessed: ACCESSED,
    use: 'ISS exercise devices and daily average',
    terms: 'Verify',
  },
  {
    id: 'S14',
    provider: 'NOAA SWPC',
    title: 'GOES Proton Flux; NOAA Space Weather Scales',
    urls: ['https://www.swpc.noaa.gov/products/goes-proton-flux', 'https://www.swpc.noaa.gov/noaa-scales-explanation'],
    accessed: ACCESSED,
    use: 'Explanatory reference only (S-scale is never shown as real data, RAD-07)',
    terms: 'Verify',
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
    terms: 'Context for the pitch',
  },
  {
    id: 'S16',
    provider: 'ISO / IEC',
    title: 'IEC 62304:2006 Medical device software — Software life cycle processes',
    urls: ['https://www.iso.org/standard/38421.html'],
    accessed: ACCESSED,
    use: 'Engineering practices inspired by the standard (no compliance claimed)',
    terms: 'Reference; do not claim compliance',
  },
  {
    id: 'S17',
    provider: 'WebLLM / MLC',
    title: 'WebLLM documentation; arXiv 2412.15803',
    urls: ['https://webllm.mlc.ai/docs/', 'https://arxiv.org/abs/2412.15803'],
    accessed: ACCESSED,
    use: 'On-device language model in the browser',
    terms: 'Verify the library and model licenses (P-03)',
  },
  {
    id: 'S18',
    provider: 'shadcn/ui',
    title: 'Tailwind v4 (Tailwind v4 and React 19 support)',
    urls: ['https://ui.shadcn.com/docs/tailwind-v4'],
    accessed: ACCESSED,
    use: 'UI components',
    terms: '—',
  },
  {
    id: 'S19',
    provider: 'NASA Human Research Program',
    title: 'The Human Body in Space (2021, updated 2026-05-26)',
    urls: ['https://www.nasa.gov/humans-in-space/the-human-body-in-space/'],
    accessed: ACCESSED,
    use: 'Body map zone → hazard mapping; software-generated exercise partners',
    terms: 'Verify',
  },
]

export function sourceById(id: SourceId): Source | undefined {
  return SOURCES.find((s) => s.id === id)
}

/** Agradecimento ao DONKI (P-06: conferir o texto exato na política de publicação da CCMC). */
export const DONKI_ACKNOWLEDGEMENT =
  'Solar particle event data courtesy of the CCMC DONKI system (NASA Goddard Space Flight Center). [Wording pending P-06: check the CCMC publication policy.]'

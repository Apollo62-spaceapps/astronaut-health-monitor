// OnboardModelEngine (AI-02): WebLLM no navegador, num Web Worker. Sem chave de API.
// Exceção documentada ao "nada via CDN" (NFR-02, R-06): os pesos são baixados UMA vez e ficam em cache.
// Modelo confirmado na lista pré-compilada do @mlc-ai/web-llm 0.2.87 (Apache-2.0, ~1,1 GB de VRAM).
// P-03 pendente: conferir a licença do MODELO (Llama 3.2 Community License) antes do pitch.
import type { AssistantContext, AssistantEngine, ChatMessage } from '@/domain/types'
import { SYSTEM_PROMPT, contextMessage } from '@/ai/prompts'

export const ONBOARD_MODEL_ID = 'Llama-3.2-1B-Instruct-q4f32_1-MLC'

/**
 * Modelos de bordo oferecidos (L8). IDs conferidos na lista pré-compilada do @mlc-ai/web-llm 0.2.87; versões
 * q4f32 (não exigem shader-f16). VRAM de lá. P-03: conferir as licenças antes do pitch — Llama 3.2: Llama 3.2
 * Community License; Qwen2.5-1.5B: Apache-2.0.
 */
export const ONBOARD_MODELS = [
  { id: 'Llama-3.2-1B-Instruct-q4f32_1-MLC', label: 'Light · Llama 3.2 1B', vramMB: 1129 },
  { id: 'Qwen2.5-1.5B-Instruct-q4f32_1-MLC', label: 'Recommended · Qwen2.5 1.5B', vramMB: 1889 },
  { id: 'Llama-3.2-3B-Instruct-q4f32_1-MLC', label: 'Best quality · Llama 3.2 3B', vramMB: 2952 },
] as const
export type OnboardModelId = (typeof ONBOARD_MODELS)[number]['id']
/** Acima disso, a mensagem cai para o protocolo (AI-03). */
export const GENERATION_TIMEOUT_MS = 20_000

type Engine = {
  chat: {
    completions: {
      create: (req: {
        messages: { role: 'system' | 'user' | 'assistant'; content: string }[]
        temperature: number
        max_tokens: number
      }) => Promise<{ choices: { message: { content: string | null } }[] }>
    }
  }
}

export class OnboardModelEngine implements AssistantEngine {
  readonly mode = 'onboard-model' as const
  private engine: Engine | null = null
  readonly modelId: string
  constructor(modelId: string = ONBOARD_MODEL_ID) {
    this.modelId = modelId
  }

  async init(onProgress?: (p: number, text: string) => void) {
    if (this.engine) return
    if (!('gpu' in navigator)) throw new Error('WebGPU not available')
    // Import dinâmico: a biblioteca só é carregada quando alguém liga o modelo (o modo protocolo fica leve).
    const webllm = await import('@mlc-ai/web-llm')
    const worker = new Worker(new URL('./onboard.worker.ts', import.meta.url), { type: 'module' })
    this.engine = (await webllm.CreateWebWorkerMLCEngine(worker, this.modelId, {
      initProgressCallback: (r: { progress: number; text: string }) => onProgress?.(r.progress, r.text),
    })) as unknown as Engine
  }

  /** L7 (Orbit): gera só o JSON do resumo, com temperatura baixa e poucos tokens. */
  async generate(messages: { role: 'system' | 'user'; content: string }[]): Promise<string> {
    if (!this.engine) throw new Error('Onboard model not initialized')
    const timeout = new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), GENERATION_TIMEOUT_MS))
    const res = await Promise.race([
      this.engine.chat.completions.create({ messages, temperature: 0.2, max_tokens: 160 }),
      timeout,
    ])
    return res.choices[0]?.message.content?.trim() || ''
  }

  get ready(): boolean {
    return this.engine !== null
  }

  async reply(ctx: AssistantContext, history: ChatMessage[], userText: string) {
    if (!this.engine) throw new Error('Onboard model not initialized')
    const messages = [
      {
        role: 'system' as const,
        content: `${SYSTEM_PROMPT}\n\nCurrent data (from the rule engine):\n${contextMessage(ctx)}`,
      },
      ...history.slice(-6).map((m) => ({ role: m.role, content: m.text })),
      { role: 'user' as const, content: userText },
    ]
    const timeout = new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), GENERATION_TIMEOUT_MS))
    const res = await Promise.race([
      this.engine.chat.completions.create({ messages, temperature: 0.2, max_tokens: 160 }),
      timeout,
    ])
    return res.choices[0]?.message.content?.trim() || ''
  }
}

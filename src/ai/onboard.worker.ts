// Web Worker do modelo de bordo (AI-02, NFR-03): a geração roda fora da thread da interface.
import { WebWorkerMLCEngineHandler } from '@mlc-ai/web-llm'

const handler = new WebWorkerMLCEngineHandler()
self.onmessage = (msg: MessageEvent) => {
  handler.onmessage(msg)
}

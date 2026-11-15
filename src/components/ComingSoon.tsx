import { Construction } from 'lucide-react'

/** Placeholder das telas ainda não feitas. Mostra o dono e a task, para ninguém duplicar trabalho. */
export function ComingSoon({ title, owner, task }: { title: string; owner: string; task: string }) {
  return (
    <section aria-labelledby="coming-soon-title" className="rounded-lg bg-surface p-8">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted">Coming soon</p>
      <h1 id="coming-soon-title" className="mt-2 text-3xl">
        {title}
      </h1>
      <p className="mt-3 flex items-center gap-2 text-muted">
        <Construction aria-hidden className="size-4" />
        Owner: {owner} · task <span className="num">{task}</span>
      </p>
    </section>
  )
}

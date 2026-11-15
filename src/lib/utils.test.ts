import { describe, expect, it } from 'vitest'
import { cn } from '@/lib/utils'

describe('cn', () => {
  it('junta classes e resolve conflito do Tailwind (a última vence)', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4')
    const hidden = false as boolean
    expect(cn('text-normal', hidden && 'hidden', undefined)).toBe('text-normal')
  })
})

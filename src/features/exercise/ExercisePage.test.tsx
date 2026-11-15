// @vitest-environment jsdom
// Exercício: o campo de minutos nunca salva vazio como 0 (o dia virava "skipped") e mostra o erro.
import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { ExercisePage } from '@/features/exercise/ExercisePage'
import { useAppStore } from '@/state/store'

const today = () => useAppStore.getState().simNowIso.slice(0, 10)
const todaySessions = () => useAppStore.getState().exercise.filter((s) => s.date === today())

describe('ExercisePage · minutos do dia', () => {
  beforeEach(() => useAppStore.getState().resetScenario())

  it('vazio → erro visível e nada muda; 30 → salva e confirma', () => {
    const before = JSON.stringify(todaySessions())
    render(<ExercisePage />)
    const input = screen.getByLabelText('Total minutes today') as HTMLInputElement
    fireEvent.change(input, { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: /Save check-in/ }))
    expect(screen.getByText(/Enter whole minutes from 0 to 240/)).toBeTruthy()
    expect(JSON.stringify(todaySessions())).toBe(before)

    fireEvent.change(input, { target: { value: '300' } })
    fireEvent.click(screen.getByRole('button', { name: /Save check-in/ }))
    expect(JSON.stringify(todaySessions())).toBe(before)

    fireEvent.change(input, { target: { value: '30' } })
    fireEvent.click(screen.getByRole('button', { name: /Save check-in/ }))
    expect(screen.getByText('Saved · 30 min today.')).toBeTruthy()
    expect(todaySessions()[0]!.doneMin).toBe(30)
  })
})

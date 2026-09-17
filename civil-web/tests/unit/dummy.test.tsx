import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

function Dummy() {
  return <p>web unit ok</p>
}

describe('web unit (dummy)', () => {
  it('adds numbers', () => {
    expect(1 + 1).toBe(2)
  })

  it('renders with React Testing Library', () => {
    render(<Dummy />)
    expect(screen.getByText('web unit ok')).toBeInTheDocument()
  })
})

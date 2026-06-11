import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import App from './App'

afterEach(() => cleanup())

describe('App', () => {
  it('renders the emergency route planner dashboard', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: /Emergency Route Planner/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Real Surabaya/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Synthetic grid/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/Hospital destination/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Run Dijkstra/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Run A\*/i })).toBeInTheDocument()
  })

  it('keeps the synthetic grid mode available', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /Synthetic grid/i }))

    expect(screen.getByRole('button', { name: /Generate city grid/i })).toBeInTheDocument()
    expect(screen.getAllByTestId('map-node-tile')).toHaveLength(600)
  })
})

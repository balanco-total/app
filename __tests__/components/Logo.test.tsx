import { render } from '@testing-library/react'
import Logo from '@/components/Logo'

describe('<Logo>', () => {
  it('renders an SVG with the BalançoTotal aria-label', () => {
    const { container } = render(<Logo />)
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
    expect(svg).toHaveAttribute('aria-label', 'BalançoTotal')
  })

  it('uses default dimensions', () => {
    const { container } = render(<Logo />)
    const svg = container.querySelector('svg')!
    expect(svg.getAttribute('width')).toBe('181')
    expect(svg.getAttribute('height')).toBe('56')
  })

  it('respects custom width/height', () => {
    const { container } = render(<Logo width={100} height={32} />)
    const svg = container.querySelector('svg')!
    expect(svg.getAttribute('width')).toBe('100')
    expect(svg.getAttribute('height')).toBe('32')
  })
})

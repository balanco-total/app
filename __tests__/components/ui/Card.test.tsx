import { render, screen } from '@testing-library/react'
import Card from '@/components/ui/Card'

describe('<Card>', () => {
  it('renders children', () => {
    render(<Card>content</Card>)
    expect(screen.getByText('content')).toBeInTheDocument()
  })

  it('applies medium padding and large shadow by default', () => {
    render(<Card data-testid="card">x</Card>)
    const card = screen.getByTestId('card')
    expect(card.className).toContain('p-6')
    expect(card.className).toContain('shadow-lg')
  })

  it.each([
    ['sm', 'p-4'],
    ['md', 'p-6'],
    ['lg', 'p-8'],
  ] as const)('padding=%s applies %s', (padding, cls) => {
    render(<Card data-testid="card" padding={padding}>x</Card>)
    expect(screen.getByTestId('card').className).toContain(cls)
  })

  it.each([
    ['none', ''],
    ['sm', 'shadow-sm'],
    ['md', 'shadow-md'],
    ['lg', 'shadow-lg'],
    ['xl', 'shadow-xl'],
  ] as const)('shadow=%s applies %s', (shadow, cls) => {
    render(<Card data-testid="card" shadow={shadow}>x</Card>)
    if (cls) expect(screen.getByTestId('card').className).toContain(cls)
  })

  it('merges custom className', () => {
    render(<Card data-testid="card" className="my-extra">x</Card>)
    expect(screen.getByTestId('card').className).toContain('my-extra')
  })

  it('forwards additional HTML attributes', () => {
    render(<Card data-testid="card" id="my-card">x</Card>)
    expect(screen.getByTestId('card')).toHaveAttribute('id', 'my-card')
  })
})

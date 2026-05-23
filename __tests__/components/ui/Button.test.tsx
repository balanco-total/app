import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Button from '@/components/ui/Button'

describe('<Button>', () => {
  it('renders children', () => {
    render(<Button>Salvar</Button>)
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeInTheDocument()
  })

  it('defaults to type="button"', () => {
    render(<Button>X</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button')
  })

  it('respects an explicit type', () => {
    render(<Button type="submit">X</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit')
  })

  it('applies primary variant classes by default', () => {
    render(<Button>Primary</Button>)
    expect(screen.getByRole('button')).toHaveClass('bg-brand-500')
  })

  it('applies secondary variant classes', () => {
    render(<Button variant="secondary">Secondary</Button>)
    const btn = screen.getByRole('button')
    expect(btn).toHaveClass('bg-gray-100')
    expect(btn).not.toHaveClass('bg-brand-500')
  })

  it('applies destructive variant classes', () => {
    render(<Button variant="destructive">Excluir</Button>)
    expect(screen.getByRole('button')).toHaveClass('bg-red-600')
  })

  it('applies full-width class when fullWidth is set', () => {
    render(<Button fullWidth>X</Button>)
    expect(screen.getByRole('button')).toHaveClass('w-full')
  })

  it('disables the button while loading', () => {
    render(<Button isLoading>Loading</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('renders a spinner while loading', () => {
    const { container } = render(<Button isLoading>Loading</Button>)
    expect(container.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('does not render the icon when loading', () => {
    render(<Button isLoading icon={<span data-testid="icon">i</span>}>X</Button>)
    expect(screen.queryByTestId('icon')).not.toBeInTheDocument()
  })

  it('renders a leading icon when not loading', () => {
    render(<Button icon={<span data-testid="icon">i</span>}>X</Button>)
    expect(screen.getByTestId('icon')).toBeInTheDocument()
  })

  it('forwards onClick events', async () => {
    const onClick = jest.fn()
    render(<Button onClick={onClick}>Click</Button>)
    await userEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('does not fire onClick when disabled', async () => {
    const onClick = jest.fn()
    render(<Button onClick={onClick} disabled>Click</Button>)
    await userEvent.click(screen.getByRole('button'))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('merges additional className', () => {
    render(<Button className="custom-class">X</Button>)
    expect(screen.getByRole('button')).toHaveClass('custom-class')
  })

  it('forwards ref to the underlying button', () => {
    const ref = { current: null as HTMLButtonElement | null }
    render(<Button ref={ref}>X</Button>)
    expect(ref.current).toBeInstanceOf(HTMLButtonElement)
  })
})

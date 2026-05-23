import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Input from '@/components/ui/Input'

describe('<Input>', () => {
  it('renders without label or error', () => {
    render(<Input placeholder="Nome" />)
    expect(screen.getByPlaceholderText('Nome')).toBeInTheDocument()
  })

  it('renders a label associated with the input via htmlFor/id', () => {
    render(<Input label="E-mail" />)
    const input = screen.getByLabelText('E-mail')
    expect(input).toBeInTheDocument()
  })

  it('uses the provided id when given', () => {
    render(<Input id="my-input" label="Custom" />)
    expect(screen.getByLabelText('Custom')).toHaveAttribute('id', 'my-input')
  })

  it('shows the error message when error prop is set', () => {
    render(<Input label="Senha" error="Campo obrigatório" />)
    expect(screen.getByText('Campo obrigatório')).toBeInTheDocument()
  })

  it('applies the red border when error is set', () => {
    render(<Input error="bad" />)
    const input = screen.getByRole('textbox')
    expect(input.className).toContain('border-red-400')
  })

  it('uses the brand ring color by default', () => {
    render(<Input />)
    expect(screen.getByRole('textbox').className).toContain('focus:ring-brand-500')
  })

  it('uses the danger ring color when variant=danger', () => {
    render(<Input variant="danger" />)
    expect(screen.getByRole('textbox').className).toContain('focus:ring-red-500')
  })

  it('forwards user typing through onChange', async () => {
    const onChange = jest.fn()
    render(<Input onChange={onChange} />)
    await userEvent.type(screen.getByRole('textbox'), 'hi')
    expect(onChange).toHaveBeenCalled()
  })

  it('forwards ref to the underlying input', () => {
    const ref = { current: null as HTMLInputElement | null }
    render(<Input ref={ref} />)
    expect(ref.current).toBeInstanceOf(HTMLInputElement)
  })

  it('merges additional className on the input', () => {
    render(<Input className="text-sm" />)
    expect(screen.getByRole('textbox').className).toContain('text-sm')
  })
})

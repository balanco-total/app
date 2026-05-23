import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PasswordInput from '@/components/PasswordInput'

describe('<PasswordInput>', () => {
  function getInput() {
    return document.querySelector('input') as HTMLInputElement
  }

  it('renders an input of type password by default', () => {
    render(<PasswordInput />)
    expect(getInput().type).toBe('password')
  })

  it('toggles to text when the eye is clicked', async () => {
    render(<PasswordInput />)
    await userEvent.click(screen.getByLabelText('Mostrar senha'))
    expect(getInput().type).toBe('text')
    expect(screen.getByLabelText('Ocultar senha')).toBeInTheDocument()
  })

  it('toggles back to password on second click', async () => {
    render(<PasswordInput />)
    const toggle = screen.getByLabelText('Mostrar senha')
    await userEvent.click(toggle)
    await userEvent.click(screen.getByLabelText('Ocultar senha'))
    expect(getInput().type).toBe('password')
  })

  it('forwards onChange', async () => {
    const onChange = jest.fn()
    render(<PasswordInput onChange={onChange} />)
    await userEvent.type(getInput(), 'x')
    expect(onChange).toHaveBeenCalled()
  })

  it('passes through name and placeholder', () => {
    render(<PasswordInput name="pwd" placeholder="Senha" />)
    expect(getInput().name).toBe('pwd')
    expect(getInput().placeholder).toBe('Senha')
  })

  it('toggle has tabIndex -1 to skip in tab order', () => {
    render(<PasswordInput />)
    expect(screen.getByLabelText('Mostrar senha')).toHaveAttribute('tabindex', '-1')
  })
})

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AccountForm from '@/components/accounts/AccountForm'
import type { FinancialAccount } from '@/components/accounts/types'

describe('<AccountForm>', () => {
  const baseProps = {
    saving: false,
    onSave: jest.fn(),
    onCancel: jest.fn(),
  }

  beforeEach(() => {
    baseProps.onSave.mockClear()
    baseProps.onCancel.mockClear()
  })

  it('renders empty fields when no account is being edited', () => {
    render(<AccountForm editingAccount={null} {...baseProps} />)
    expect(screen.getByText('Nova conta')).toBeInTheDocument()
    expect((screen.getByLabelText('Nome') as HTMLInputElement).value).toBe('')
  })

  it('renders pre-filled fields when editing', () => {
    const editing: FinancialAccount = {
      id: 'a',
      account_id: 'acc',
      name: 'Nubank',
      description: 'Conta principal',
      balance: 1234.56,
      created_at: new Date().toISOString(),
    } as unknown as FinancialAccount

    render(<AccountForm editingAccount={editing} {...baseProps} />)
    expect(screen.getByText('Editar conta')).toBeInTheDocument()
    expect((screen.getByLabelText('Nome') as HTMLInputElement).value).toBe('Nubank')
    expect((screen.getByLabelText('Descrição (opcional)') as HTMLInputElement).value).toBe('Conta principal')
    expect((screen.getByLabelText('Saldo inicial (R$)') as HTMLInputElement).value).toBe('1.234,56')
  })

  it('calls onSave with parsed balance and null description when empty', async () => {
    render(<AccountForm editingAccount={null} {...baseProps} />)
    await userEvent.type(screen.getByLabelText('Nome'), 'Itaú')
    await userEvent.type(screen.getByLabelText('Saldo inicial (R$)'), '10000')
    await userEvent.click(screen.getByRole('button', { name: 'Criar conta' }))
    expect(baseProps.onSave).toHaveBeenCalledWith('Itaú', null, 100)
  })

  it('passes the description trimmed when provided', async () => {
    render(<AccountForm editingAccount={null} {...baseProps} />)
    await userEvent.type(screen.getByLabelText('Nome'), 'Caixa')
    await userEvent.type(screen.getByLabelText('Descrição (opcional)'), '  poupança  ')
    await userEvent.click(screen.getByRole('button', { name: 'Criar conta' }))
    expect(baseProps.onSave).toHaveBeenCalledWith('Caixa', 'poupança', 0)
  })

  it('shows "Salvando…" while saving', () => {
    render(<AccountForm editingAccount={null} {...baseProps} saving />)
    expect(screen.getByRole('button', { name: 'Salvando…' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Salvando…' })).toBeDisabled()
  })

  it('calls onCancel when Cancelar is clicked', async () => {
    render(<AccountForm editingAccount={null} {...baseProps} />)
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(baseProps.onCancel).toHaveBeenCalledTimes(1)
  })
})

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import BillingBanner from '@/components/BillingBanner'

const pushMock = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}))

describe('<BillingBanner>', () => {
  const FIXED_NOW = new Date('2026-05-22T12:00:00.000Z').getTime()

  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(FIXED_NOW)
    pushMock.mockClear()
  })

  it('renders nothing when subscription is active', () => {
    const { container } = render(
      <BillingBanner subscriptionStatus="active" trialEndsAt="2026-06-01T12:00:00Z" isOwner />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('shows days-remaining message for owner with trial active', () => {
    const inFive = new Date(FIXED_NOW + 5 * 24 * 60 * 60 * 1000).toISOString()
    render(<BillingBanner subscriptionStatus="trialing" trialEndsAt={inFive} isOwner />)
    expect(screen.getByText(/5 dias restantes no período de teste\. Assine/i)).toBeInTheDocument()
  })

  it('shows expired message for owner when trial ended', () => {
    render(<BillingBanner subscriptionStatus="trialing" trialEndsAt="2026-05-20T12:00:00Z" isOwner />)
    expect(screen.getByText(/Seu período de teste encerrou/i)).toBeInTheDocument()
  })

  it('shows non-owner message variant when isOwner=false', () => {
    const inFive = new Date(FIXED_NOW + 5 * 24 * 60 * 60 * 1000).toISOString()
    render(<BillingBanner subscriptionStatus="trialing" trialEndsAt={inFive} isOwner={false} />)
    expect(screen.getByText(/5 dias restantes no período de teste da conta\./i)).toBeInTheDocument()
  })

  it('shows the "Assinar" button only for owner', () => {
    const inFive = new Date(FIXED_NOW + 5 * 24 * 60 * 60 * 1000).toISOString()
    const { rerender } = render(
      <BillingBanner subscriptionStatus="trialing" trialEndsAt={inFive} isOwner />,
    )
    expect(screen.getByRole('button', { name: /Assinar/i })).toBeInTheDocument()

    rerender(<BillingBanner subscriptionStatus="trialing" trialEndsAt={inFive} isOwner={false} />)
    expect(screen.queryByRole('button', { name: /Assinar/i })).not.toBeInTheDocument()
  })

  it('navigates to /app/billing when "Assinar" is clicked', async () => {
    const inFive = new Date(FIXED_NOW + 5 * 24 * 60 * 60 * 1000).toISOString()
    render(<BillingBanner subscriptionStatus="trialing" trialEndsAt={inFive} isOwner />)
    await userEvent.click(screen.getByRole('button', { name: /Assinar/i }))
    expect(pushMock).toHaveBeenCalledWith('/app/billing')
  })

  it('can be dismissed by clicking the X (when not expired)', async () => {
    const inFive = new Date(FIXED_NOW + 5 * 24 * 60 * 60 * 1000).toISOString()
    const { container } = render(
      <BillingBanner subscriptionStatus="trialing" trialEndsAt={inFive} isOwner />,
    )
    const close = screen.getByLabelText('Fechar aviso')
    await userEvent.click(close)
    expect(container).toBeEmptyDOMElement()
  })

  it('does not render the X when expired', () => {
    render(<BillingBanner subscriptionStatus="trialing" trialEndsAt="2026-05-20T12:00:00Z" isOwner />)
    expect(screen.queryByLabelText('Fechar aviso')).not.toBeInTheDocument()
  })

  it('shows last-day-of-trial message at 1 day remaining', () => {
    const inOneDay = new Date(FIXED_NOW + 60 * 60 * 1000).toISOString() // 1h → ceil to 1 day
    render(<BillingBanner subscriptionStatus="trialing" trialEndsAt={inOneDay} isOwner />)
    expect(screen.getByText(/Último dia de teste!/i)).toBeInTheDocument()
  })
})

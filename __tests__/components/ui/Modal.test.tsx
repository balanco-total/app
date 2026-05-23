import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Modal from '@/components/ui/Modal'

describe('<Modal>', () => {
  it('renders nothing when closed', () => {
    render(<Modal open={false} onClose={jest.fn()}>content</Modal>)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders content when open', () => {
    render(<Modal open onClose={jest.fn()}>Hello modal</Modal>)
    expect(screen.getByText('Hello modal')).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('renders the title when provided', () => {
    render(<Modal open onClose={jest.fn()} title="My title">x</Modal>)
    expect(screen.getByRole('heading', { name: 'My title' })).toBeInTheDocument()
  })

  it('renders an X close button when showClose is true', () => {
    const onClose = jest.fn()
    render(<Modal open onClose={onClose} showClose>x</Modal>)
    const closeBtn = screen.getByLabelText('Fechar')
    expect(closeBtn).toBeInTheDocument()
  })

  it('calls onClose when the X close button is clicked', async () => {
    const onClose = jest.fn()
    render(<Modal open onClose={onClose} showClose>x</Modal>)
    await userEvent.click(screen.getByLabelText('Fechar'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when Escape is pressed', () => {
    const onClose = jest.fn()
    render(<Modal open onClose={onClose}>x</Modal>)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('does not call onClose for other keys', () => {
    const onClose = jest.fn()
    render(<Modal open onClose={onClose}>x</Modal>)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('calls onClose when the backdrop is clicked', async () => {
    const onClose = jest.fn()
    const { container } = render(<Modal open onClose={onClose}>x</Modal>)
    const backdrop = container.querySelector('[role="presentation"]') as HTMLElement
    await userEvent.click(backdrop)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('does NOT call onClose when content inside is clicked', async () => {
    const onClose = jest.fn()
    render(<Modal open onClose={onClose}><span data-testid="inner">inner</span></Modal>)
    await userEvent.click(screen.getByTestId('inner'))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('renders the footer when provided', () => {
    render(
      <Modal open onClose={jest.fn()} footer={<button>OK</button>}>body</Modal>,
    )
    expect(screen.getByRole('button', { name: 'OK' })).toBeInTheDocument()
  })

  it('applies the size class', () => {
    const { container } = render(<Modal open onClose={jest.fn()} size="lg">x</Modal>)
    expect(container.querySelector('.max-w-lg')).toBeInTheDocument()
  })
})

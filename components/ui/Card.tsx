import { HTMLAttributes, ReactNode } from 'react'

type Padding = 'sm' | 'md' | 'lg'
type Shadow = 'none' | 'sm' | 'md' | 'lg' | 'xl'

type CardProps = HTMLAttributes<HTMLDivElement> & {
  padding?: Padding
  shadow?: Shadow
  children: ReactNode
}

const PADDING: Record<Padding, string> = {
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
}

const SHADOW: Record<Shadow, string> = {
  none: '',
  sm:   'shadow-sm',
  md:   'shadow-md',
  lg:   'shadow-lg',
  xl:   'shadow-xl',
}

export default function Card({
  padding = 'md',
  shadow = 'lg',
  className = '',
  children,
  ...rest
}: CardProps) {
  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-2xl ${SHADOW[shadow]} ${PADDING[padding]} ${className}`.trim()}
      {...rest}
    >
      {children}
    </div>
  )
}

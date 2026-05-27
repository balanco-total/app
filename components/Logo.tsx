export default function Logo({ width = 181, height = 56 }: { width?: number; height?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 172 56" width={width} height={height} aria-label="BalançoTotal">
      <polyline points="4,26 28,4 52,26" fill="none" className="stroke-brand-500 dark:stroke-brand-300" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round"/>
      <rect x="9" y="21" width="38" height="31" rx="4" className="fill-brand-500 dark:fill-brand-300"/>
      <rect x="13" y="40" width="7" height="8" rx="1.5" className="fill-accent dark:fill-gray-800"/>
      <rect x="23" y="35" width="7" height="13" rx="1.5" className="fill-accent dark:fill-gray-800"/>
      <rect x="33" y="29" width="7" height="19" rx="1.5" className="fill-accent dark:fill-gray-800"/>
      <text x="60" y="27" fontFamily="'Arial Black', 'Helvetica Neue', Arial, sans-serif" fontSize="21" fontWeight="900" className="fill-brand-500 dark:fill-brand-300" letterSpacing="0.5">BALANÇO</text>
      <text x="60" y="51" fontFamily="'Arial Black', 'Helvetica Neue', Arial, sans-serif" fontSize="21" fontWeight="900" className="fill-brand-500 dark:fill-brand-300" letterSpacing="0.5">TOTAL</text>
    </svg>
  )
}

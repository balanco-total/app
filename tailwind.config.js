/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f0f4f2',
          100: '#d9e5e1',
          200: '#b3cac5',
          300: '#7fa298',
          400: '#3e6f5c',
          500: '#1B4332',
          600: '#163a2b',
          700: '#14332a',
          800: '#0f2818',
          900: '#0a1d11',
        },
        accent: {
          DEFAULT: '#F5A623',
          hover:   '#e09510',
        },
      },
      fontSize: {
        'xxs': '0.625rem', // 10px
        '3xs': '0.5rem',   // 8px
      }
    },
  },
  plugins: [],
}
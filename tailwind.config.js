/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#0a0e0f',
          secondary: '#0f1415',
          tertiary: '#161b1d',
          hover: '#1c2325',
        },
        border: {
          primary: '#1f2628',
          secondary: '#2e3739',
        },
        text: {
          primary: '#e6edf0',
          secondary: '#7d8a8c',
          muted: '#5a6668',
        },
        accent: {
          blue: '#1EBCAD',
          'blue-dim': '#179C8F',
        },
        long: '#1fb98a',
        'long-dim': '#178a67',
        'long-bg': '#0c2a22',
        short: '#ed7088',
        'short-dim': '#c2526a',
        'short-bg': '#2a1219',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        '2xs': '10px',
        xs: '11px',
        sm: '12px',
        base: '13px',
        md: '14px',
        lg: '15px',
      },
    },
  },
  plugins: [],
}

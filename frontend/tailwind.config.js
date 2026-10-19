/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#ffffff',
        foreground: '#09090b',
        muted: {
          DEFAULT: '#f4f4f5',
          foreground: '#71717a',
        },
        card: {
          DEFAULT: '#ffffff',
          foreground: '#09090b',
        },
        border: '#e4e4e7',
        primary: {
          DEFAULT: '#0f172a',
          foreground: '#ffffff',
          light: '#3b82f6',
        },
      },
    },
  },
  plugins: [],
}


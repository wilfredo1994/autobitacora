/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Manrope', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        // Verde oscuro principal de la marca
        pine: {
          50: '#eef5f1',
          100: '#d7e7de',
          200: '#b0cfbf',
          600: '#1f6b4d',
          700: '#17573e',
          800: '#10432f',
          900: '#0b3123',
        },
        // Fondo claro de la app
        surface: '#f4f7f5',
      },
      boxShadow: {
        card: '0 1px 2px rgba(11, 49, 35, 0.05), 0 4px 16px rgba(11, 49, 35, 0.04)',
      },
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        neutral: {
          950: '#0a0a0a',
        }
      },
      animation: {
        'shake': 'shake 0.6s cubic-bezier(0.36, 0.07, 0.19, 0.97) both',
        'flash': 'flash 0.4s ease-in-out',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'bounce-in': 'bounce-in 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      },
      keyframes: {
        shake: {
          '0%, 100%': { transform: 'translateX(0) rotate(0deg)' },
          '10%': { transform: 'translateX(-8px) rotate(-1deg)' },
          '20%': { transform: 'translateX(8px) rotate(1deg)' },
          '30%': { transform: 'translateX(-6px) rotate(-0.5deg)' },
          '40%': { transform: 'translateX(6px) rotate(0.5deg)' },
          '50%': { transform: 'translateX(-4px) rotate(-0.25deg)' },
          '60%': { transform: 'translateX(4px) rotate(0.25deg)' },
          '70%': { transform: 'translateX(-2px) rotate(-0.1deg)' },
          '80%': { transform: 'translateX(2px) rotate(0.1deg)' },
          '90%': { transform: 'translateX(-1px) rotate(0deg)' },
        },
        flash: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '25%': { opacity: '0.3', transform: 'scale(1.05)' },
          '50%': { opacity: '0.7', transform: 'scale(0.98)' },
          '75%': { opacity: '0.4', transform: 'scale(1.02)' },
        },
        'pulse-glow': {
          '0%, 100%': { 
            boxShadow: '0 0 20px rgba(59, 130, 246, 0.5)',
            transform: 'scale(1)'
          },
          '50%': { 
            boxShadow: '0 0 40px rgba(59, 130, 246, 0.8)',
            transform: 'scale(1.02)'
          },
        },
        'bounce-in': {
          '0%': { 
            transform: 'scale(0.3) translateY(-100px)',
            opacity: '0'
          },
          '50%': { 
            transform: 'scale(1.05) translateY(10px)',
            opacity: '0.8'
          },
          '70%': { 
            transform: 'scale(0.9) translateY(-5px)',
            opacity: '0.9'
          },
          '100%': { 
            transform: 'scale(1) translateY(0)',
            opacity: '1'
          },
        }
      }
    },
  },
  plugins: [],
}

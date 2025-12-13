/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'dvision-blue': {
          DEFAULT: '#2563EB', // Vibrant deep blue matching logo
          light: '#3B82F6', // Lighter blue for gradients
          dark: '#1E40AF', // Darker blue
          bright: '#2563EB', // Bright vibrant blue
          pastel: '#EFF6FF', // Light pastel blue for backgrounds
          lightBg: '#DBEAFE', // Light tint of vibrant blue (#2563EB) - 10% opacity equivalent
          lighterBg: '#BFDBFE', // Lighter tint of vibrant blue (#2563EB) - 15% opacity equivalent
          lightestBg: '#EFF6FF', // Lightest tint for subtle backgrounds
        },
        'dvision-orange': {
          DEFAULT: '#F97316', // Bright warm orange matching logo "D"
          light: '#FB923C', // Lighter orange
          dark: '#EA580C', // Darker orange
          warm: '#FF6B35', // Warm orange accent
        },
      },
    },
  },
  plugins: [],
}


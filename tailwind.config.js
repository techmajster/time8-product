/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  prefix: "",
  theme: {
  	container: {
  		center: true,
  		padding: '2rem',
  		screens: {
  			'2xl': '1400px'
  		}
  	},
  	extend: {
  		colors: {
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			'input-border': 'hsl(var(--input-border))',
  			ring: 'hsl(var(--ring))',
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			},
  						success: {
				DEFAULT: 'hsl(var(--success))',
				foreground: 'hsl(var(--success-foreground))'
			},
			warning: {
				DEFAULT: 'hsl(var(--warning))',
				foreground: 'hsl(var(--warning-foreground))'
			},
			info: {
				DEFAULT: 'hsl(var(--info))',
				foreground: 'hsl(var(--info-foreground))'
			},
			'accent-success': 'hsl(var(--accent-success))',
			'accent-warning': 'hsl(var(--accent-warning))',
			'accent-info': 'hsl(var(--accent-info))',
			'accent-destructive': 'hsl(var(--accent-destructive))',
			'surface-primary': 'hsl(var(--surface-primary))',
			'surface-secondary': 'hsl(var(--surface-secondary))',
			'surface-tertiary': 'hsl(var(--surface-tertiary))',
			'border-success': 'hsl(var(--border-success))',
			'border-warning': 'hsl(var(--border-warning))',
			'border-info': 'hsl(var(--border-info))',
			'border-destructive': 'hsl(var(--border-destructive))',
			text: {
				primary: 'hsl(var(--text-primary))',
				secondary: 'hsl(var(--text-secondary))',
				tertiary: 'hsl(var(--text-tertiary))',
				disabled: 'hsl(var(--text-disabled))',
				inverse: 'hsl(var(--text-inverse))',
				link: 'hsl(var(--text-link))',
				'link-hover': 'hsl(var(--text-link-hover))',
				placeholder: 'hsl(var(--text-placeholder))'
			},
			heading: {
				primary: 'hsl(var(--heading-primary))',
				secondary: 'hsl(var(--heading-secondary))'
			}
		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		fontFamily: {
  			sans: [
  				'var(--font-sans)',
  				'sans-serif'
  			],
  			serif: [
  				'var(--font-serif)',
  				'serif'
  			],
  			mono: [
  				'var(--font-mono)',
  				'monospace'
  			],
  			display: [
  				'var(--font-display)',
  				'sans-serif'
  			]
  		},
  		fontSize: {
  			'type-xs': 'var(--type-xs)',
  			'type-sm': 'var(--type-sm)',
  			'type-base': 'var(--type-base)',
  			'type-lg': 'var(--type-lg)',
  			'type-xl': 'var(--type-xl)',
  			'type-2xl': 'var(--type-2xl)',
  			'type-3xl': 'var(--type-3xl)',
  			'type-4xl': 'var(--type-4xl)',
  			'type-5xl': 'var(--type-5xl)',
  			'type-6xl': 'var(--type-6xl)'
  		},
  		lineHeight: {
  			'none': 'var(--leading-none)',
  			'tight': 'var(--leading-tight)',
  			'snug': 'var(--leading-snug)',
  			'normal': 'var(--leading-normal)',
  			'relaxed': 'var(--leading-relaxed)',
  			'loose': 'var(--leading-loose)'
  		},
  		letterSpacing: {
  			'tighter': 'var(--tracking-tighter)',
  			'tight': 'var(--tracking-tight)',
  			'normal': 'var(--tracking-normal)',
  			'wide': 'var(--tracking-wide)',
  			'wider': 'var(--tracking-wider)',
  			'widest': 'var(--tracking-widest)'
  		},
  		boxShadow: {
  			'2xs': 'var(--shadow-2xs)',
  			xs: 'var(--shadow-xs)',
  			sm: 'var(--shadow-sm)',
  			DEFAULT: 'var(--shadow)',
  			md: 'var(--shadow-md)',
  			lg: 'var(--shadow-lg)',
  			xl: 'var(--shadow-xl)',
  			'2xl': 'var(--shadow-2xl)'
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} 
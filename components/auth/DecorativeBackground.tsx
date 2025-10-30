/**
 * Decorative background component for authentication pages
 * Features a rotated (270deg) abstract design with orange/purple gradients
 * Pure CSS implementation - no images required
 */
export function DecorativeBackground() {
  return (
    <div className="absolute inset-0 overflow-clip">
      <div className="bg-white h-full overflow-clip relative w-full">
            {/* Orange radial gradient - appears top left after 270deg rotation */}
            <div 
              className="absolute -top-[250px] -left-[250px]"
              style={{
                width: '500px',
                height: '500px',
                flexShrink: 0,
                borderRadius: '500px',
                opacity: 0.3,
                background: '#F59E0B',
                filter: 'blur(131.96295166015625px)',
                border: '2px solid black'
              }}
            />

            {/* Purple radial gradient - appears bottom right after 270deg rotation */}
            <div 
              className="absolute -bottom-[950px] -right-[950px]"
              style={{
                width: '1500px',
                height: '1500px',
                flexShrink: 0,
                borderRadius: '1500px',
                opacity: 0.5,
                background: '#7C3AED',
                filter: 'blur(131.96295166015625px)',
                border: '2px solid black'
              }}
            />

            {/* Noise texture overlay */}
            <div
              className="absolute inset-0 opacity-[0.015]"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'repeat',
                backgroundSize: '200px 200px',
                mixBlendMode: 'multiply'
              }}
            />
      </div>
    </div>
  )
}

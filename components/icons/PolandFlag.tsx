interface PolandFlagProps {
  className?: string
  size?: number
}

export function PolandFlag({ className = '', size = 16 }: PolandFlagProps) {
  return (
    <div
      className={`relative inline-block ${className}`}
      style={{ width: size, height: size }}
      aria-label="Poland flag"
    >
      <div className="absolute inset-0">
        <img
          alt=""
          className="block max-w-none size-full"
          src="/figma-assets/a5f23b00eceee7ff461eea8965fa592add8348ce.svg"
        />
      </div>
      <div className="absolute bottom-0 left-0 right-0 top-1/2">
        <img
          alt=""
          className="block max-w-none size-full"
          src="/figma-assets/ec557d7c25a6aa87a1b05c6c962bd473ce9877ee.svg"
        />
      </div>
    </div>
  )
}

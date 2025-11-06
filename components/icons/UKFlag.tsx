interface UKFlagProps {
  className?: string
  size?: number
}

export function UKFlag({ className = '', size = 16 }: UKFlagProps) {
  return (
    <div
      className={`relative inline-block ${className}`}
      style={{ width: size, height: size }}
      aria-label="United Kingdom flag"
    >
      <div className="absolute inset-0">
        <img
          alt=""
          className="block max-w-none size-full"
          src="/figma-assets/a5f23b00eceee7ff461eea8965fa592add8348ce.svg"
        />
      </div>
      <div className="absolute inset-[1.722%]">
        <img
          alt=""
          className="block max-w-none size-full"
          src="/figma-assets/d40ae980154e48c60635fc6acb75861f7d6a3899.svg"
        />
      </div>
      <div className="absolute inset-0">
        <img
          alt=""
          className="block max-w-none size-full"
          src="/figma-assets/e01e62f07cc69d8c29a6a4a99e8cf48baa000513.svg"
        />
      </div>
    </div>
  )
}

import React from 'react'

export function Time8Logo({ className }: { className?: string }) {
  return (
    <div className={`flex items-center gap-[19.454px] ${className}`}>
      <div className="h-[30px] relative w-[123.333px]">
        {/* T letter */}
        <div className="absolute flex h-[23.333px] items-center justify-center left-[2.5px] top-[4.17px] w-[19.583px]">
          <div className="flex-none rotate-[180deg] scale-y-[-100%]">
            <div className="h-[23.333px] relative w-[19.583px]">
              <div className="absolute bottom-0 left-0 right-[-10.64%] top-[-8.93%]">
                <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 22 27">
                  <path
                    d="M0 3H10.4167M10.4167 3H19.1667C19.3968 3 19.5833 3.18655 19.5833 3.41667V5.08333M10.4167 3V26.3333"
                    stroke="black"
                    strokeLinejoin="bevel"
                    strokeWidth="4.16667"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* i letter */}
        <div className="absolute flex h-[21.25px] items-center justify-center left-[27.08px] top-[6.25px] w-0">
          <div className="flex-none rotate-[180deg] scale-y-[-100%]">
            <div className="h-[21.25px] relative" style={{ width: "3.84877e-14px" }}>
              <div className="absolute bottom-0 left-[-2.08px] right-[-2.08px] top-0">
                <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 6 22">
                  <path
                    d="M3 0L3 21.25"
                    stroke="black"
                    strokeLinejoin="bevel"
                    strokeWidth="4.16667"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* m letter */}
        <div className="absolute flex h-[19.167px] items-center justify-center left-[36.25px] top-[8.33px] w-[22.5px]">
          <div className="flex-none rotate-[180deg] scale-y-[-100%]">
            <div className="h-[19.167px] relative w-[22.5px]">
              <div className="absolute bottom-0 left-[-9.26%] right-[-9.26%] top-[-10.87%]">
                <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 28 23">
                  <path
                    d="M14.25 3V22.1634M14.25 3L7.16546 3.00205C4.86475 3.00272 3 4.868 3 7.16872V22.1667M14.25 3L20.9167 3C21.1468 3 21.3333 3.18655 21.3333 3.41667V5.08623M25.5 22.1634V5.08623"
                    stroke="black"
                    strokeLinejoin="bevel"
                    strokeWidth="4.16667"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* e letter */}
        <div className="absolute flex h-[17.083px] items-center justify-center left-[67.08px] top-[8.33px] w-[18.75px]">
          <div className="flex-none scale-y-[-100%]">
            <div className="h-[17.083px] relative w-[18.75px]">
              <div className="absolute inset-[-12.2%_-11.11%]">
                <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 23">
                  <path
                    d="M3 11.3333L3 15.9167C3 18.2179 4.86548 20.0833 7.16667 20.0833H17.5833C19.8845 20.0833 21.75 18.2179 21.75 15.9167V13.4167C21.75 12.2661 20.8173 11.3333 19.6667 11.3333H3ZM3 11.3333L3 7.16666C3 4.86548 4.86548 3 7.16667 3H19.25C19.4801 3 19.6667 3.18655 19.6667 3.41667V5.08333"
                    stroke="black"
                    strokeLinejoin="bevel"
                    strokeWidth="4.16667"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Purple dot for the 8 */}
        <div className="absolute inset-[12.5%_9.12%_54.17%_77.36%] rounded-[20px]">
          <div className="absolute border-[4.167px] border-solid border-violet-700 inset-[-2.083px] pointer-events-none rounded-[22.083px]" />
        </div>

        {/* Purple 8 shape */}
        <div className="absolute bottom-[13.89%] left-3/4 right-[6.76%] top-[45.83%]">
          <div className="absolute inset-[-17.24%_-9.26%]">
            <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 28 18">
              <path
                d="M19.4583 3H9.04167C5.70495 3 3 5.70495 3 9.04167C3 12.3784 5.70495 15.0833 9.04167 15.0833H19.4583C22.7951 15.0833 25.5 12.3784 25.5 9.04167C25.5 5.70495 22.7951 3 19.4583 3Z"
                stroke="#6D28D9"
                strokeLinejoin="bevel"
                strokeWidth="4.16667"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  )
}
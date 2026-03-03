export function SegiOrb({ size = 24, className }: { size?: number; className?: string }) {
  const id = `segiOrb_${size}_${Math.random().toString(36).slice(2, 6)}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 42 42"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <filter id={`${id}_f0`} x="-28.3043" y="-9.13042" width="79.4348" height="79.4348" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
          <feGaussianBlur stdDeviation="10.9565" result="effect1_foregroundBlur" />
        </filter>
        <filter id={`${id}_f1`} x="-4.56527" y="-0.913044" width="79.4348" height="79.4348" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
          <feGaussianBlur stdDeviation="10.9565" result="effect1_foregroundBlur" />
        </filter>
        <filter id={`${id}_f2`} x="-25.5653" y="-29.2174" width="79.4348" height="79.4348" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
          <feGaussianBlur stdDeviation="10.9565" result="effect1_foregroundBlur" />
        </filter>
        <filter id={`${id}_f3`} x="-1.90735e-05" y="-23.7391" width="79.4348" height="79.4348" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
          <feGaussianBlur stdDeviation="10.9565" result="effect1_foregroundBlur" />
        </filter>
        <clipPath id={`${id}_clip`}>
          <rect width="42" height="42" rx="21" fill="white" />
        </clipPath>
        <style>{`
          @keyframes ${id}_rotate {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          #${id}_inner {
            transform-origin: 21px 21px;
            animation: ${id}_rotate 4s linear infinite;
          }
        `}</style>
      </defs>
      <g clipPath={`url(#${id}_clip)`}>
        <g id={`${id}_inner`}>
          <g filter={`url(#${id}_f0)`}>
            <circle cx="11.4131" cy="30.587" r="17.8043" fill="#CBB83A" />
          </g>
          <g filter={`url(#${id}_f1)`}>
            <circle cx="35.1521" cy="38.8043" r="17.8043" fill="#3ACB68" />
          </g>
          <g filter={`url(#${id}_f2)`}>
            <circle cx="14.1521" cy="10.5" r="17.8043" fill="#FA783E" />
          </g>
          <g filter={`url(#${id}_f3)`}>
            <circle cx="39.7174" cy="15.9783" r="17.8043" fill="#BDCB3A" />
          </g>
        </g>
      </g>
    </svg>
  );
}

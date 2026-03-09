import { useMemo } from "react";

const GOLDEN_ANGLE = 2.39996322;
const NUM_CIRCLES = 600;
const SCALE = 8.0;
const COLOR = "rgb(250, 108, 52)";

export function SegiOrb({
  size = 24,
  className,
  thinking = false,
}: {
  size?: number;
  className?: string;
  thinking?: boolean;
}) {
  const dur = thinking ? "1.2s" : "3s";
  const beginScale = thinking ? 0.002 : 0.005;
  const beginOffset = thinking ? 0.001 : 0.0025;
  const rValues = thinking ? "1;4;1" : "1;3;1";
  const opacityValues = thinking ? "0.4;1;0.4" : "0.3;1;0.3";

  const circles = useMemo(() => {
    return Array.from({ length: NUM_CIRCLES }, (_, i) => {
      const t = i + 0.5;
      const angle = t * GOLDEN_ANGLE;
      const r = SCALE * Math.sqrt(t);
      return {
        cx: 200 + r * Math.cos(angle),
        cy: 200 + r * Math.sin(angle),
      };
    });
  }, []);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 400 400"
      className={className}
      style={{ maxWidth: "100%", maxHeight: "100%", width: "auto", height: "auto" }}
    >
      {circles.map((c, i) => (
        <circle key={i} cx={c.cx} cy={c.cy} r={1} fill={COLOR} opacity={0.3}>
          <animate
            attributeName="r"
            values={rValues}
            dur={dur}
            begin={`${(i * beginScale + beginOffset).toFixed(4)}s`}
            repeatCount="indefinite"
            calcMode="spline"
            keySplines="0.4 0 0.6 1;0.4 0 0.6 1"
          />
          <animate
            attributeName="opacity"
            values={opacityValues}
            dur={dur}
            begin={`${(i * beginScale + beginOffset).toFixed(4)}s`}
            repeatCount="indefinite"
            calcMode="spline"
            keySplines="0.4 0 0.6 1;0.4 0 0.6 1"
          />
        </circle>
      ))}
    </svg>
  );
}

import Svg, { Path } from 'react-native-svg';

interface MeteringIconProps {
  size?: number;
  color?: string;
}

// Source SVGs (assets/camera-icons/*.svg) draw at a large origin and recenter
// with `translate(...)`. We fold that offset into the viewBox instead so the
// path data is used verbatim with no transform: original viewBox "0 -2 19 19"
// plus the translate becomes "<−tx> <243> 19 19".

/** Evaluative / matrix metering: a framed grid of zones. */
export function MatrixMeteringIcon({
  size = 22,
  color = '#ffffff',
}: MeteringIconProps) {
  return (
    <Svg width={size} height={size} viewBox="197 243 19 19">
      <Path
        fill={color}
        fillRule="evenodd"
        d="M199,253 L199,258 L206,258 L206,255.96 C204.47,255.75 203.25,254.53 203.04,253 L199,253 Z M199,252 L199,247 L206,247 L206,249.04 C204.47,249.25 203.25,250.47 203.04,252 L199,252 Z M214,253 L214,258 L207,258 L207,255.96 C208.53,255.75 209.75,254.53 209.96,253 L214,253 Z M214,252 L214,247 L207,247 L207,249.04 C208.53,249.25 209.75,250.47 209.96,252 L214,252 Z M206,245 L197.99,245 C197.45,245 197,245.45 197,246.01 L197,258.99 C197,259.55 197.45,260 197.99,260 L215.01,260 C215.55,260 216,259.55 216,258.99 L216,246.01 C216,245.45 215.55,245 215.01,245 L207,245 L207,246 L215,246 L215,259 L207,259 L207,260 L206,260 L206,259 L198,259 L198,246 L206,246 L206,245 Z M206.5,255 C207.88,255 209,253.88 209,252.5 C209,251.12 207.88,250 206.5,250 C205.12,250 204,251.12 204,252.5 C204,253.88 205.12,255 206.5,255 Z"
      />
    </Svg>
  );
}

/** Spot metering: a single sampled point inside the frame. */
export function SpotMeteringIcon({
  size = 22,
  color = '#ffffff',
}: MeteringIconProps) {
  return (
    <Svg width={size} height={size} viewBox="59 243 19 19">
      <Path
        fill={color}
        fillRule="evenodd"
        d="M68,245 L59.99,245 C59.45,245 59,245.45 59,246.01 L59,258.99 C59,259.55 59.45,260 59.99,260 L77.01,260 C77.55,260 78,259.55 78,258.99 L78,246.01 C78,245.45 77.55,245 77.01,245 L69,245 L69,246 L77,246 L77,259 L69,259 L69,260 L68,260 L68,259 L60,259 L60,246 L68,246 L68,245 Z M68.5,255 C69.88,255 71,253.88 71,252.5 C71,251.12 69.88,250 68.5,250 C67.12,250 66,251.12 66,252.5 C66,253.88 67.12,255 68.5,255 Z"
      />
    </Svg>
  );
}

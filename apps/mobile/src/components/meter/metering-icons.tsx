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
        d="M199,253 L199,258 L206,258 L206,255.964556 C204.467154,255.745299 203.254701,254.532846 203.035444,253 L199,253 Z M199,252 L199,247 L206,247 L206,249.035444 C204.467154,249.254701 203.254701,250.467154 203.035444,252 L199,252 Z M214,253 L214,258 L207,258 L207,255.964556 C208.532846,255.745299 209.745299,254.532846 209.964556,253 L214,253 Z M214,252 L214,247 L207,247 L207,249.035444 C208.532846,249.254701 209.745299,250.467154 209.964556,252 L214,252 Z M206,245 L197.994771,245 C197.450925,245 197,245.451066 197,246.007484 L197,258.992516 C197,259.55108 197.445374,260 197.994771,260 L215.005229,260 C215.549075,260 216,259.548934 216,258.992516 L216,246.007484 C216,245.44892 215.554626,245 215.005229,245 L207,245 L207,246 L215,246 L215,259 L207,259 L207,260 L206,260 L206,259 L198,259 L198,246 L206,246 L206,245 Z M206.5,255 C207.880712,255 209,253.880712 209,252.5 C209,251.119288 207.880712,250 206.5,250 C205.119288,250 204,251.119288 204,252.5 C204,253.880712 205.119288,255 206.5,255 Z"
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
        d="M68,245 L59.9947712,245 C59.4509254,245 59,245.451066 59,246.007484 L59,258.992516 C59,259.55108 59.4453742,260 59.9947712,260 L77.0052288,260 C77.5490746,260 78,259.548934 78,258.992516 L78,246.007484 C78,245.44892 77.5546258,245 77.0052288,245 L69,245 L69,246 L77,246 L77,259 L69,259 L69,260 L68,260 L68,259 L60,259 L60,246 L68,246 L68,245 Z M68.5,255 C69.8807119,255 71,253.880712 71,252.5 C71,251.119288 69.8807119,250 68.5,250 C67.1192881,250 66,251.119288 66,252.5 C66,253.880712 67.1192881,255 68.5,255 Z"
      />
    </Svg>
  );
}

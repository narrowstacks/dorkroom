// Ambient declaration for CSS side-effect imports (e.g. `import './global.css'`
// for NativeWind). Expo's generated `expo-env.d.ts` normally provides this via
// `expo/types`, but that file is gitignored and absent in CI, so `tsc` there
// fails with TS2882. Committing the declaration keeps typecheck deterministic.
declare module '*.css';

// Ambient declaration for static image assets. React Native resolves these at
// runtime as a number (the asset registry id); tsc needs a type for the import.
declare module '*.png' {
  const value: number;
  export default value;
}

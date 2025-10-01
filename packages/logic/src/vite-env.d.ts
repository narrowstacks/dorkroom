/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FEATURE_INFOBASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}


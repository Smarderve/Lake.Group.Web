/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the Lake Group backend when it is NOT same-origin (see .env.example). */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

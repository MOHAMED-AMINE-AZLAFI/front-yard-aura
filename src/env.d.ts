/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_SITE_URL: string;
  readonly PUBLIC_BRAND_NAME: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

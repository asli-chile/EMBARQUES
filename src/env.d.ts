/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_SUPABASE_URL: string;
  readonly PUBLIC_SUPABASE_ANON_KEY: string;
  /** URL pública del sitio (sin / final); mejora enlaces a imágenes en HTML de correo. */
  readonly PUBLIC_SITE_URL?: string;
  readonly SUPABASE_SERVICE_ROLE_KEY?: string;
}

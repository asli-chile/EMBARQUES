/** @type {import('next').NextConfig} */
/**
 * Sitio público (web2):  https://asli.cl
 * Sistema embarques en URL pública: https://asli.cl/embarques/...
 *
 * IMPORTANTE: NEXT_PUBLIC_EMBARQUES_BASE_URL debe ser la URL del proyecto Astro en Vercel
 * (p. ej. https://embarques-teal.vercel.app/embarques), NUNCA https://asli.cl/embarques
 * (si no, el proxy apunta a sí mismo → 404).
 */
const embarquesBase =
  process.env.NEXT_PUBLIC_EMBARQUES_BASE_URL ||
  "https://embarques-teal.vercel.app/embarques";

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ["asli.cl", "www.asli.cl", "embarques-teal.vercel.app"],
  },
  /** Normaliza /embarques y /embarques/ hacia /embarques/inicio antes del proxy */
  async redirects() {
    return [
      {
        source: "/embarques",
        destination: "/embarques/inicio",
        permanent: false,
      },
      {
        source: "/embarques/",
        destination: "/embarques/inicio",
        permanent: false,
      },
    ];
  },
  /** Evita HTML viejo en CDN al publicar traducciones o textos nuevos */
  async headers() {
    const htmlNoCache = {
      key: "Cache-Control",
      value: "public, max-age=0, must-revalidate",
    };
    const paths = [
      "/",
      "/contacto",
      "/ejecutivos",
      "/nosotros",
      "/presentacion",
      "/servicios",
      "/tracking",
    ];
    return paths.map((source) => ({
      source,
      headers: [htmlNoCache],
    }));
  },
  async rewrites() {
    return [
      { source: "/logoasli.png", destination: `${embarquesBase}/logoasli.png` },
      // Astro usa logoasli.png como icono; no hay favicon.ico en public → evita 404 en consola
      { source: "/favicon.ico", destination: `${embarquesBase}/logoasli.png` },
      {
        source: "/embarques/favicon.ico",
        destination: `${embarquesBase}/logoasli.png`,
      },
      { source: "/fonts/:path*", destination: `${embarquesBase}/fonts/:path*` },
      { source: "/embarques/:path*", destination: `${embarquesBase}/:path*` },
      { source: "/api/:path*", destination: `${embarquesBase}/api/:path*` },
      { source: "/auth", destination: `${embarquesBase}/auth/login` },
      { source: "/indicadores", destination: `${embarquesBase}/indicadores` },
      { source: "/dashboard/:path*", destination: `${embarquesBase}/dashboard/:path*` },
      { source: "/documentos/:path*", destination: `${embarquesBase}/documentos/:path*` },
      { source: "/facturas/:path*", destination: `${embarquesBase}/facturas/:path*` },
      { source: "/facturar-preview/:path*", destination: `${embarquesBase}/facturar-preview/:path*` },
      { source: "/itinerario/:path*", destination: `${embarquesBase}/itinerario/:path*` },
      { source: "/itinerario-asli", destination: `${embarquesBase}/itinerario-asli` },
      { source: "/mantenimiento/:path*", destination: `${embarquesBase}/mantenimiento/:path*` },
      { source: "/profile/:path*", destination: `${embarquesBase}/profile/:path*` },
      { source: "/registros/:path*", destination: `${embarquesBase}/registros/:path*` },
      {
        source: "/tablas-personalizadas/:path*",
        destination: `${embarquesBase}/tablas-personalizadas/:path*`,
      },
      { source: "/transportes/:path*", destination: `${embarquesBase}/transportes/:path*` },
      { source: "/vessel-diagnose/:path*", destination: `${embarquesBase}/vessel-diagnose/:path*` },
    ];
  },
};

module.exports = nextConfig;

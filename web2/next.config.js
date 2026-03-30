/** @type {import('next').NextConfig} */
/**
 * Sitio público (web2) en producción: https://asli.cl
 * Sistema embarques (Astro, base "/embarques"): https://asli.cl/embarques
 *
 * NEXT_PUBLIC_ERP_URL — origen del sitio (ej. https://asli.cl)
 * NEXT_PUBLIC_EMBARQUES_BASE_URL — override de la app embarques (ej. https://asli.cl/embarques)
 */
const publicSiteOrigin =
  process.env.NEXT_PUBLIC_ERP_URL || "https://asli.cl";
const embarquesBase =
  process.env.NEXT_PUBLIC_EMBARQUES_BASE_URL ||
  `${publicSiteOrigin}/embarques`;

/** Hostnames permitidos para next/image cuando Embarques y web2 están en dominios distintos */
function imageAllowedHosts() {
  const hosts = new Set(["asli.cl", "www.asli.cl"]);
  for (const base of [publicSiteOrigin, embarquesBase]) {
    try {
      hosts.add(new URL(base).hostname);
    } catch {
      /* ignore */
    }
  }
  return Array.from(hosts);
}

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: imageAllowedHosts(),
  },
  async rewrites() {
    return [
      { source: "/logoasli.png", destination: `${embarquesBase}/logoasli.png` },
      { source: "/favicon.ico", destination: `${embarquesBase}/favicon.ico` },
      { source: "/fonts/:path*", destination: `${embarquesBase}/fonts/:path*` },
      { source: "/embarques", destination: `${embarquesBase}/inicio` },
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

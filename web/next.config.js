/** @type {import('next').NextConfig} */
const erpBaseUrl =
  process.env.NEXT_PUBLIC_ERP_URL ||
  "https://registo-de-embarques-asli-toox.vercel.app";

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ["asli.cl"],
  },
  async rewrites() {
    return [
      // IMPORTANTE: Assets de Next.js PRIMERO (mayor prioridad)
      // Assets de Next.js (JS, CSS, chunks, etc.) - ambas variantes
      { source: "/_next/static/:path*", destination: `${erpBaseUrl}/_next/static/:path*` },
      { source: "/_next/image/:path*", destination: `${erpBaseUrl}/_next/image/:path*` },
      { source: "/_next/chunks/:path*", destination: `${erpBaseUrl}/_next/chunks/:path*` },
      { source: "/_next/:path*", destination: `${erpBaseUrl}/_next/:path*` },
      { source: "/next/static/:path*", destination: `${erpBaseUrl}/_next/static/:path*` },
      { source: "/next/:path*", destination: `${erpBaseUrl}/_next/:path*` },
      // Assets estáticos de la ERP (logos, imágenes, etc.)
      { source: "/logoasli.png", destination: `${erpBaseUrl}/logoasli.png` },
      { source: "/favicon.ico", destination: `${erpBaseUrl}/favicon.ico` },
      // Fuentes y otros recursos
      { source: "/fonts/:path*", destination: `${erpBaseUrl}/fonts/:path*` },
      // Rutas API completas
      { source: "/api/:path*", destination: `${erpBaseUrl}/api/:path*` },
      // Rutas principales de la ERP
      { source: "/auth", destination: `${erpBaseUrl}/auth` },
      { source: "/indicadores", destination: `${erpBaseUrl}/indicadores` },
      { source: "/contacto", destination: `${erpBaseUrl}/contacto` },
      { source: "/dashboard/:path*", destination: `${erpBaseUrl}/dashboard/:path*` },
      { source: "/documentos/:path*", destination: `${erpBaseUrl}/documentos/:path*` },
      { source: "/facturas/:path*", destination: `${erpBaseUrl}/facturas/:path*` },
      { source: "/facturar-preview/:path*", destination: `${erpBaseUrl}/facturar-preview/:path*` },
      { source: "/itinerario/:path*", destination: `${erpBaseUrl}/itinerario/:path*` },
      { source: "/itinerario-asli", destination: `${erpBaseUrl}/itinerario-asli` },
      { source: "/mantenimiento/:path*", destination: `${erpBaseUrl}/mantenimiento/:path*` },
      { source: "/profile/:path*", destination: `${erpBaseUrl}/profile/:path*` },
      { source: "/registros/:path*", destination: `${erpBaseUrl}/registros/:path*` },
      {
        source: "/tablas-personalizadas/:path*",
        destination: `${erpBaseUrl}/tablas-personalizadas/:path*`,
      },
      { source: "/transportes/:path*", destination: `${erpBaseUrl}/transportes/:path*` },
      { source: "/vessel-diagnose/:path*", destination: `${erpBaseUrl}/vessel-diagnose/:path*` },
    ];
  },
};

module.exports = nextConfig;

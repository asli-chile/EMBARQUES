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
      // Nunca proxyear /_next/* al ERP: en `next dev` los hashes de chunks son locales
      // y el otro sitio devuelve 404 → pantalla en blanco.
      { source: "/logoasli.png", destination: `${erpBaseUrl}/logoasli.png` },
      { source: "/favicon.ico", destination: `${erpBaseUrl}/favicon.ico` },
      { source: "/fonts/:path*", destination: `${erpBaseUrl}/fonts/:path*` },
      { source: "/embarques", destination: "https://embarques-teal.vercel.app" },
      { source: "/embarques/:path*", destination: "https://embarques-teal.vercel.app/:path*" },
      { source: "/api/:path*", destination: `${erpBaseUrl}/api/:path*` },
      { source: "/auth", destination: `${erpBaseUrl}/auth` },
      { source: "/indicadores", destination: `${erpBaseUrl}/indicadores` },
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

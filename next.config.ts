import type { NextConfig } from "next";

// El sitio se exporta como archivos estáticos (carpeta out/) para publicarlo en GitHub Pages.
// En GitHub, el sitio vive en /Pulso-Financiero; la acción de publicación define NEXT_PUBLIC_BASE_PATH.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;

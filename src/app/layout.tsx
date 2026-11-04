import type { Metadata, Viewport } from "next"
import "./globals.css"
import { basePath } from "@/lib/utils"

export const metadata: Metadata = {
  title: {
    default: "Test de salud financiera gratis en 5 minutos | Pulso Financiero",
    template: "%s | Pulso Financiero",
  },
  description:
    "Finanzas para no financieros: un test gratis de 5 minutos para saber cómo estás, y un tablero que te muestra tu excedente mensual y cómo ponerlo a trabajar, en la moneda de tu país.",
  icons: { icon: `${basePath}/favicon.svg` },
  openGraph: {
    title: "Test de salud financiera gratis | Pulso Financiero",
    description: "16 preguntas, 5 minutos y un puntaje de 0 a 100 para saber cómo están tus finanzas.",
    type: "website",
    locale: "es_LA",
  },
}

export const viewport: Viewport = { themeColor: "#050806" }

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&family=DM+Sans:opsz,wght@9..40,500;9..40,700&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  )
}

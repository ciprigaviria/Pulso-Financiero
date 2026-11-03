import Link from "next/link"
import { config } from "@/config"

export function SiteFooter() {
  return (
    <footer className="border-t py-10 text-sm text-muted-foreground">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5">
        <p>© {new Date().getFullYear()} {config.brand}. Herramienta educativa; no es asesoría financiera.</p>
        <p className="flex gap-5">
          <Link href="/privacidad" className="hover:text-foreground">Privacidad</Link>
          <Link href="/aviso-legal" className="hover:text-foreground">Aviso legal</Link>
        </p>
      </div>
    </footer>
  )
}

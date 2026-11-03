import Link from "next/link"
import { BrandMark } from "./brand-mark"
import { Button } from "@/components/ui/button"
import { config } from "@/config"

export function SiteHeader({ minimal = false }: { minimal?: boolean }) {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link href="/" className="flex items-center gap-2.5 font-extrabold tracking-tight" aria-label={`${config.brand}, inicio`}>
          <BrandMark />
          <span>{config.brand}</span>
        </Link>
        {minimal ? (
          <span className="text-sm text-muted-foreground">Test personal · 5 min</span>
        ) : (
          <nav className="flex items-center gap-6 text-sm font-semibold text-ink-2">
            <Link href="/#tablero" className="hidden hover:text-foreground md:inline">El tablero</Link>
            <Link href="/tablero" className="hidden hover:text-foreground md:inline">Mi tablero</Link>
            <Link href="/#acceso" className="hidden hover:text-foreground md:inline">Cómo funciona</Link>
            <Link href="/#precios" className="hidden hover:text-foreground md:inline">Precios</Link>
            <Button asChild size="sm"><Link href="/prueba-personal">Hacer el test</Link></Button>
          </nav>
        )}
      </div>
    </header>
  )
}

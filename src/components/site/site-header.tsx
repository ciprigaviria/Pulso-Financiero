import Link from "next/link"
import { BrandMark } from "./brand-mark"
import { Button } from "@/components/ui/button"
import { config } from "@/config"
import { cn } from "@/lib/utils"

export function SiteHeader({ minimal = false, tone = "light" }: { minimal?: boolean; tone?: "light" | "dark" }) {
  const dark = tone === "dark"
  return (
    <header className={cn("sticky top-0 z-30", dark ? "-mb-[68px] px-3 pt-3 text-white" : "border-b bg-background/80 backdrop-blur-md")}>
      <div className={cn("mx-auto flex items-center justify-between", dark ? "h-14 max-w-5xl rounded-full border border-white/15 bg-black/70 pl-4 pr-2 shadow-[0_10px_30px_-10px_rgba(0,0,0,.7)] backdrop-blur-xl" : "h-16 max-w-6xl px-5")}>
        <Link href="/" className="flex items-center gap-2.5 font-extrabold tracking-tight" aria-label={`${config.brand}, inicio`}>
          <BrandMark />
          <span>{config.brand}</span>
        </Link>
        {minimal ? (
          <span className="text-sm text-muted-foreground">Test personal · 5 min</span>
        ) : (
          <nav className={cn("flex items-center gap-6 text-sm font-semibold", dark ? "text-white/60" : "text-ink-2")}>
            {[["/#como-funciona", "Cómo funciona"], ["/#incluye", "Premium"], ["/#precios", "Precios"], ["/tablero", "Mi tablero"]].map(([href, label]) => (
              <Link key={href} href={href} className={cn("hidden transition-colors md:inline", dark ? "hover:text-white" : "hover:text-foreground")}>{label}</Link>
            ))}
            <Button asChild size="sm" variant={dark ? "white" : "default"} className={dark ? "rounded-lg" : undefined}><Link href="/prueba-personal">Hacer el test</Link></Button>
          </nav>
        )}
      </div>
    </header>
  )
}

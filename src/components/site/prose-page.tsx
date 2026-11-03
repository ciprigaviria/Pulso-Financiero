import { SiteHeader } from "./site-header"
import { SiteFooter } from "./site-footer"

export function ProsePage({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-5 pb-20 pt-14 [&_h1]:mb-2 [&_h1]:text-4xl [&_h1]:font-extrabold [&_h1]:tracking-tight [&_h2]:mb-2 [&_h2]:mt-9 [&_h2]:text-xl [&_h2]:font-extrabold [&_li]:mb-1.5 [&_p]:mb-4 [&_p]:text-ink-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:text-ink-2 [&_a]:text-primary [&_a]:underline">
        {children}
      </main>
      <SiteFooter />
    </>
  )
}

"use client"

import * as React from "react"

export function Redirect() {
  React.useEffect(() => {
    window.location.replace(window.location.pathname.replace(/movimientos\/?$/, "tablero/") + window.location.search)
  }, [])
  return <p className="p-10 text-center text-muted-foreground">Abriendo tu tablero…</p>
}

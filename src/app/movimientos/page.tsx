import type { Metadata } from "next"
import { Redirect } from "./redirect"

export const metadata: Metadata = { title: "Mi tablero", robots: { index: false } }

// La antigua página "Mis movimientos" ahora vive dentro del tablero Premium.
export default function Movimientos() {
  return <Redirect />
}

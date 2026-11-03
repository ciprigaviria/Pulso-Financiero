import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Prefijo de la dirección del sitio (en GitHub Pages: /Pulso-Financiero). */
export const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

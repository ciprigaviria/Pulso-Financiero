"use client"

// Aparece con un desenfoque suave cuando entra en pantalla; cada elemento
// espera según su posición (animationNum) para crear una secuencia.
import * as React from "react"
import { motion, type Variants } from "motion/react"

const defaultVariants: Variants = {
  visible: (i: number) => ({
    y: 0,
    opacity: 1,
    filter: "blur(0px)",
    transition: { delay: i * 0.15, duration: 0.5 },
  }),
  hidden: { filter: "blur(10px)", y: 20, opacity: 0 },
}

type Tag = "div" | "p" | "section" | "li" | "span"

export function TimelineContent({
  as = "div",
  animationNum = 0,
  customVariants,
  className,
  children,
}: {
  as?: Tag
  animationNum?: number
  customVariants?: Variants
  className?: string
  children: React.ReactNode
}) {
  const Comp = motion[as]
  return (
    <Comp
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      custom={animationNum}
      variants={customVariants ?? defaultVariants}
      className={className}
    >
      {children}
    </Comp>
  )
}

"use client"

// Revelado de texto palabra por palabra (adaptado de danielpetho/vertical-cut-reveal).
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from "react"
import { motion, type Transition } from "motion/react"
import { cn } from "@/lib/utils"

interface TextProps {
  children: React.ReactNode
  reverse?: boolean
  transition?: Transition & { delay?: number }
  splitBy?: "words" | "characters" | "lines" | string
  staggerDuration?: number
  staggerFrom?: "first" | "last" | "center" | number
  containerClassName?: string
  wordLevelClassName?: string
  elementLevelClassName?: string
  onComplete?: () => void
  autoStart?: boolean
}

export interface VerticalCutRevealRef {
  startAnimation: () => void
  reset: () => void
}

interface WordObject {
  characters: string[]
  needsSpace: boolean
}

function splitIntoCharacters(text: string): string[] {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const segmenter = new Intl.Segmenter("es", { granularity: "grapheme" })
    return Array.from(segmenter.segment(text), ({ segment }) => segment)
  }
  return Array.from(text)
}

const VerticalCutReveal = forwardRef<VerticalCutRevealRef, TextProps>(
  (
    {
      children,
      reverse = false,
      transition = { type: "spring", stiffness: 190, damping: 22 },
      splitBy = "words",
      staggerDuration = 0.2,
      staggerFrom = "first",
      containerClassName,
      wordLevelClassName,
      elementLevelClassName,
      onComplete,
      autoStart = true,
    },
    ref
  ) => {
    const text = typeof children === "string" ? children : children?.toString() || ""
    const [isAnimating, setIsAnimating] = useState(false)

    const words: WordObject[] = useMemo(() => {
      const parts =
        splitBy === "characters" || splitBy === "words"
          ? text.split(" ")
          : splitBy === "lines"
            ? text.split("\n")
            : text.split(splitBy)
      return parts.map((part, i) => ({
        characters: splitBy === "characters" ? splitIntoCharacters(part) : [part],
        needsSpace: i !== parts.length - 1,
      }))
    }, [text, splitBy])

    const total = words.reduce((acc, w) => acc + w.characters.length, 0)

    const getStaggerDelay = useCallback(
      (index: number) => {
        if (staggerFrom === "first") return index * staggerDuration
        if (staggerFrom === "last") return (total - 1 - index) * staggerDuration
        if (staggerFrom === "center") return Math.abs(Math.floor(total / 2) - index) * staggerDuration
        return Math.abs(staggerFrom - index) * staggerDuration
      },
      [total, staggerFrom, staggerDuration]
    )

    const startAnimation = useCallback(() => setIsAnimating(true), [])

    useImperativeHandle(ref, () => ({
      startAnimation,
      reset: () => setIsAnimating(false),
    }))

    useEffect(() => {
      if (autoStart) startAnimation()
    }, [autoStart, startAnimation])

    const variants = {
      hidden: { y: reverse ? "-100%" : "100%" },
      visible: (i: number) => ({
        y: 0,
        transition: { ...transition, delay: (transition?.delay || 0) + getStaggerDelay(i) },
      }),
    }

    return (
      <span className={cn(containerClassName, "flex flex-wrap whitespace-pre-wrap", splitBy === "lines" && "flex-col")}>
        <span className="sr-only">{text}</span>
        {words.map((wordObj, wordIndex, array) => {
          const previous = array.slice(0, wordIndex).reduce((sum, w) => sum + w.characters.length, 0)
          return (
            <span key={wordIndex} aria-hidden="true" className={cn("inline-flex overflow-hidden", wordLevelClassName)}>
              {wordObj.characters.map((char, charIndex) => (
                <span className={cn(elementLevelClassName, "whitespace-pre-wrap relative")} key={charIndex}>
                  <motion.span
                    custom={previous + charIndex}
                    initial="hidden"
                    animate={isAnimating ? "visible" : "hidden"}
                    variants={variants}
                    onAnimationComplete={
                      wordIndex === words.length - 1 && charIndex === wordObj.characters.length - 1 ? onComplete : undefined
                    }
                    className="inline-block"
                  >
                    {char}
                  </motion.span>
                </span>
              ))}
              {wordObj.needsSpace && <span> </span>}
            </span>
          )
        })}
      </span>
    )
  }
)

VerticalCutReveal.displayName = "VerticalCutReveal"

export { VerticalCutReveal }

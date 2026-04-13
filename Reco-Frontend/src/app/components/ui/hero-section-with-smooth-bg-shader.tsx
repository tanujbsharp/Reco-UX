import { MeshGradient } from "@paper-design/shaders-react"
import { useEffect, useState } from "react"

interface HeroSectionProps {
  title?: React.ReactNode
  description?: React.ReactNode
  colors?: string[]
  distortion?: number
  swirl?: number
  speed?: number
  offsetX?: number
  className?: string
  maxWidth?: string
  veilOpacity?: string
  children?: React.ReactNode
}

export function HeroSection({
  title,
  description,
  colors = ["#ffffff", "#f0f9ff", "#e0f2fe", "#bae6fd", "#7dd3fc", "#ffffff"],
  distortion = 0.5,
  swirl = 0.4,
  speed = 0.3,
  offsetX = 0.08,
  className = "",
  maxWidth = "max-w-6xl",
  veilOpacity = "bg-white/40 dark:bg-black/25",
  children
}: HeroSectionProps) {
  const [dimensions, setDimensions] = useState({ width: 1920, height: 1080 })
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const update = () =>
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      })
    update()
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [])

  return (
    <section className={`relative w-full min-h-screen overflow-hidden flex flex-col justify-center ${className}`}>
      <div className="fixed inset-0 w-screen h-screen -z-10">
        {mounted && (
          <>
            <MeshGradient
              width={dimensions.width}
              height={dimensions.height}
              colors={colors}
              distortion={distortion}
              swirl={swirl}
              grainMixer={0.1}
              grainOverlay={0.05}
              speed={speed}
              offsetX={offsetX}
            />
            <div className={`absolute inset-0 pointer-events-none ${veilOpacity}`} />
          </>
        )}
      </div>
      
      <div className={`relative z-10 ${maxWidth} mx-auto w-full`}>
        {title && (
          <div className="text-center mb-10">
            {title}
            {description}
          </div>
        )}
        {children}
      </div>
    </section>
  )
}

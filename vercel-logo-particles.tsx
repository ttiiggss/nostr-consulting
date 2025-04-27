"use client"

import { useRef, useEffect, useState } from "react"

export default function Component() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mousePositionRef = useRef({ x: 0, y: 0 })
  const isTouchingRef = useRef(false)
  const [isMobile, setIsMobile] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isBitcoinMode, setIsBitcoinMode] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const particlesRef = useRef<any[]>([])

  const tigsNpub = "npub1q7why7lw8kq9ufr43ps75ngz3vhx5duqt7xmgklcq3dljqqfjegq2km2vr"
  const kmanNpub = "npub1cyla8qgt9gv8y6ydv8s2prt89h8afc0sr2kaz64ryjmlpdrzxm4qwlh53q"

  const currentNpub = isBitcoinMode ? kmanNpub : tigsNpub

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(currentNpub)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy text: ", err)
    }
  }

  const toggleMode = () => {
    if (isTransitioning) return

    setIsTransitioning(true)

    // Start the transition animation
    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext("2d")
      if (ctx) {
        // Fade out particles
        fadeParticles(ctx, canvas, isBitcoinMode)
      }
    }

    // Change mode after a delay
    setTimeout(() => {
      setIsBitcoinMode(!isBitcoinMode)
      setTimeout(() => {
        setIsTransitioning(false)
      }, 500) // Allow time for new particles to appear
    }, 600) // Wait for fade out to complete
  }

  const fadeParticles = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, currentMode: boolean) => {
    let opacity = 1.0
    const fadeStep = 0.05

    const fadeInterval = setInterval(() => {
      opacity -= fadeStep

      if (opacity <= 0) {
        clearInterval(fadeInterval)
        return
      }

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = currentMode ? "white" : "black"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Draw particles with fading opacity
      for (const p of particlesRef.current) {
        ctx.globalAlpha = opacity
        ctx.fillStyle = currentMode ? "black" : "white"
        ctx.fillRect(p.x, p.y, p.size, p.size)
      }

      ctx.globalAlpha = 1.0
    }, 30)
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const updateCanvasSize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      setIsMobile(window.innerWidth < 768) // Set mobile breakpoint
    }

    updateCanvasSize()

    let particles: {
      x: number
      y: number
      baseX: number
      baseY: number
      size: number
      color: string
      scatteredColor: string
      life: number
      opacity: number
    }[] = []

    particlesRef.current = particles

    let textImageData: ImageData | null = null

    function createTextImage() {
      if (!ctx || !canvas) return 0

      ctx.fillStyle = isBitcoinMode ? "black" : "white"
      ctx.save()

      const fontSize = isMobile ? 80 : 140
      ctx.font = `bold ${fontSize}px sans-serif`
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"

      // Draw main text based on mode
      ctx.fillText(isBitcoinMode ? "Bitcoin" : "NOSTR", canvas.width / 2, canvas.height / 2)

      ctx.restore()

      textImageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      return fontSize / 20 // Return a scale factor
    }

    function createParticle(scale: number) {
      if (!ctx || !canvas || !textImageData) return null

      const data = textImageData.data
      const particleGap = 2

      for (let attempt = 0; attempt < 100; attempt++) {
        const x = Math.floor(Math.random() * canvas.width)
        const y = Math.floor(Math.random() * canvas.height)

        if (data[(y * canvas.width + x) * 4 + 3] > 128) {
          return {
            x: x,
            y: y,
            baseX: x,
            baseY: y,
            size: Math.random() * 1 + 0.5,
            color: isBitcoinMode ? "black" : "white",
            scatteredColor: isBitcoinMode ? "#FF9900" : "#8A2BE2", // Orange for Bitcoin, Purple for NOSTR
            life: Math.random() * 100 + 50,
            opacity: isTransitioning ? 0 : 1, // Start with 0 opacity during transition
          }
        }
      }

      return null
    }

    function createInitialParticles(scale: number) {
      const baseParticleCount = 7000 // Increased base count for higher density
      const particleCount = Math.floor(baseParticleCount * Math.sqrt((canvas.width * canvas.height) / (1920 * 1080)))
      for (let i = 0; i < particleCount; i++) {
        const particle = createParticle(scale)
        if (particle) particles.push(particle)
      }

      particlesRef.current = particles
    }

    let animationFrameId: number

    function animate(scale: number) {
      if (!ctx || !canvas) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = isBitcoinMode ? "white" : "black"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      const { x: mouseX, y: mouseY } = mousePositionRef.current
      const maxDistance = 240

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]

        // Fade in particles if transitioning
        if (isTransitioning && p.opacity < 1) {
          p.opacity += 0.02
        }

        const dx = mouseX - p.x
        const dy = mouseY - p.y
        const distance = Math.sqrt(dx * dx + dy * dy)

        if (distance < maxDistance && (isTouchingRef.current || !("ontouchstart" in window))) {
          const force = (maxDistance - distance) / maxDistance
          const angle = Math.atan2(dy, dx)
          const moveX = Math.cos(angle) * force * 60
          const moveY = Math.sin(angle) * force * 60
          p.x = p.baseX - moveX
          p.y = p.baseY - moveY

          ctx.globalAlpha = p.opacity
          ctx.fillStyle = p.scatteredColor
        } else {
          p.x += (p.baseX - p.x) * 0.1
          p.y += (p.baseY - p.y) * 0.1

          ctx.globalAlpha = p.opacity
          ctx.fillStyle = isBitcoinMode ? "black" : "white"
        }

        ctx.fillRect(p.x, p.y, p.size, p.size)
        ctx.globalAlpha = 1.0

        p.life--
        if (p.life <= 0) {
          const newParticle = createParticle(scale)
          if (newParticle) {
            particles[i] = newParticle
          } else {
            particles.splice(i, 1)
            i--
          }
        }
      }

      const baseParticleCount = 7000
      const targetParticleCount = Math.floor(
        baseParticleCount * Math.sqrt((canvas.width * canvas.height) / (1920 * 1080)),
      )

      // Only add new particles if not transitioning
      if (!isTransitioning) {
        while (particles.length < targetParticleCount) {
          const newParticle = createParticle(scale)
          if (newParticle) particles.push(newParticle)
        }
      }

      particlesRef.current = particles
      animationFrameId = requestAnimationFrame(() => animate(scale))
    }

    const scale = createTextImage()
    particles = [] // Clear particles when mode changes
    createInitialParticles(scale)
    animate(scale)

    const handleResize = () => {
      updateCanvasSize()
      const newScale = createTextImage()
      particles = []
      createInitialParticles(newScale)
    }

    const handleMove = (x: number, y: number) => {
      mousePositionRef.current = { x, y }
    }

    const handleMouseMove = (e: MouseEvent) => {
      handleMove(e.clientX, e.clientY)
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        e.preventDefault()
        handleMove(e.touches[0].clientX, e.touches[0].clientY)
      }
    }

    const handleTouchStart = () => {
      isTouchingRef.current = true
    }

    const handleTouchEnd = () => {
      isTouchingRef.current = false
      mousePositionRef.current = { x: 0, y: 0 }
    }

    const handleMouseLeave = () => {
      if (!("ontouchstart" in window)) {
        mousePositionRef.current = { x: 0, y: 0 }
      }
    }

    window.addEventListener("resize", handleResize)
    canvas.addEventListener("mousemove", handleMouseMove)
    canvas.addEventListener("touchmove", handleTouchMove, { passive: false })
    canvas.addEventListener("mouseleave", handleMouseLeave)
    canvas.addEventListener("touchstart", handleTouchStart)
    canvas.addEventListener("touchend", handleTouchEnd)

    return () => {
      window.removeEventListener("resize", handleResize)
      canvas.removeEventListener("mousemove", handleMouseMove)
      canvas.removeEventListener("touchmove", handleTouchMove)
      canvas.removeEventListener("mouseleave", handleMouseLeave)
      canvas.removeEventListener("touchstart", handleTouchStart)
      canvas.removeEventListener("touchend", handleTouchEnd)
      cancelAnimationFrame(animationFrameId)
    }
  }, [isMobile, isBitcoinMode, isTransitioning]) // Added isTransitioning as dependency

  return (
    <div
      className={`relative w-full h-dvh flex flex-col items-center justify-center transition-colors duration-1000 ${
        isBitcoinMode ? "bg-white" : "bg-black"
      }`}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full absolute top-0 left-0 touch-none"
        aria-label={`Interactive particle effect with ${isBitcoinMode ? "Bitcoin" : "NOSTR"} text`}
        onClick={toggleMode}
      />
      <div
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 cursor-pointer"
        onClick={toggleMode}
      >
        <div
          className={`font-bold text-4xl sm:text-6xl md:text-8xl select-none transition-all duration-1000 ${
            isTransitioning ? "opacity-0 scale-90" : "opacity-100 scale-100"
          } ${isBitcoinMode ? "text-black hover:text-orange-500" : "text-transparent"}`}
        >
          {isBitcoinMode ? "Bitcoin" : "NOSTR"}
        </div>
      </div>
      <div className="absolute bottom-[100px] text-center z-10">
        <p
          className={`font-mono text-2xl sm:text-4xl md:text-5xl font-bold transition-all duration-1000 ${
            isTransitioning ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0"
          } ${isBitcoinMode ? "text-black" : "text-gray-300"}`}
        >
          {isBitcoinMode ? "Kman2140" : "tigs"}
        </p>
        <div className="relative inline-block mt-2">
          <p
            className={`font-mono text-xs sm:text-sm md:text-base cursor-pointer transition-all duration-300 whitespace-nowrap overflow-x-auto max-w-[90vw] scrollbar-hide ${
              isTransitioning ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0"
            } ${isBitcoinMode ? "text-gray-600 hover:text-orange-500" : "text-gray-400 hover:text-purple-500"}`}
            onClick={copyToClipboard}
            title="Click to copy"
          >
            {currentNpub}
          </p>
          {copied && (
            <div
              className={`absolute -top-8 left-1/2 transform -translate-x-1/2 text-xs px-2 py-1 rounded transition-colors duration-500 ${
                isBitcoinMode ? "bg-gray-200 text-black" : "bg-gray-800 text-white"
              }`}
            >
              Copied!
            </div>
          )}
        </div>
      </div>
      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
      `}</style>
    </div>
  )
}

import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import 'lenis/dist/lenis.css'

gsap.registerPlugin(ScrollTrigger)

export async function bootMotion() {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  await runLoader(reduce)
  document.body.classList.remove('is-loading')

  if (reduce) {
    document.querySelectorAll('.media-reveal').forEach((el) => {
      ;(el as HTMLElement).style.clipPath = 'none'
    })
    return
  }

  const lenis = new Lenis({
    duration: 1.15,
    smoothWheel: true,
  })

  lenis.on('scroll', ScrollTrigger.update)
  gsap.ticker.add((time) => {
    lenis.raf(time * 1000)
  })
  gsap.ticker.lagSmoothing(0)

  intro()
  reveal()
  images()
  numbers()
  horizontal()
  progress()
}

function runLoader(reduce: boolean) {
  const root = document.querySelector<HTMLElement>('.loader')
  const bar = document.querySelector<HTMLElement>('.loader-bar span')
  const count = document.querySelector<HTMLElement>('.loader-count')
  if (!root || !bar || !count) return Promise.resolve()

  if (reduce) {
    root.remove()
    return Promise.resolve()
  }

  const state = { n: 0 }
  return new Promise<void>((resolve) => {
    gsap.to(state, {
      n: 100,
      duration: 1.35,
      ease: 'power2.inOut',
      onUpdate: () => {
        const value = Math.round(state.n)
        count.textContent = String(value).padStart(2, '0')
        bar.style.width = `${value}%`
      },
      onComplete: () => {
        gsap.to(root, {
          yPercent: -100,
          duration: 0.9,
          ease: 'power4.inOut',
          onComplete: () => {
            root.remove()
            resolve()
          },
        })
      },
    })
  })
}

function intro() {
  const lines = document.querySelectorAll('.hero-title .line-inner')
  if (!lines.length) return
  gsap.from(lines, {
    yPercent: 115,
    duration: 1.15,
    ease: 'power4.out',
    stagger: 0.08,
  })
  gsap.from('.hero .reveal', {
    y: 24,
    opacity: 0,
    duration: 0.9,
    ease: 'power3.out',
    stagger: 0.08,
    delay: 0.35,
  })
}

function reveal() {
  document.querySelectorAll('.reveal').forEach((el) => {
    if (el.closest('.hero')) return
    gsap.from(el, {
      y: 36,
      opacity: 0,
      duration: 0.95,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: el,
        start: 'top 88%',
      },
    })
  })
}

function images() {
  document.querySelectorAll<HTMLElement>('.media-reveal, .card img').forEach((el) => {
    gsap.fromTo(
      el,
      { clipPath: 'inset(100% 0 0 0)', scale: 1.08 },
      {
        clipPath: 'inset(0% 0 0 0)',
        scale: 1,
        duration: 1.25,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 86%',
        },
      },
    )
  })
}

function numbers() {
  document.querySelectorAll<HTMLElement>('[data-count]').forEach((el) => {
    const end = Number(el.dataset.count ?? 0)
    const obj = { n: 0 }
    gsap.to(obj, {
      n: end,
      duration: 1.6,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: el,
        start: 'top 85%',
      },
      onUpdate: () => {
        const value = Math.round(obj.n)
        if (end === 24) el.textContent = `${value}/7`
        else if (end === 12) el.textContent = `${value} Std.`
        else if (end === 3) el.textContent = `${value} Min.`
        else el.textContent = String(value)
      },
    })
  })
}

function horizontal() {
  const pin = document.querySelector<HTMLElement>('.ansatz-pin')
  const track = document.querySelector<HTMLElement>('[data-steps]')
  if (!pin || !track) return
  if (!window.matchMedia('(min-width: 900px)').matches) return

  const distance = () => Math.max(0, track.scrollWidth - window.innerWidth + 80)

  gsap.to(track, {
    x: () => -distance(),
    ease: 'none',
    scrollTrigger: {
      trigger: pin,
      start: 'top 96px',
      end: () => `+=${distance()}`,
      scrub: 0.7,
      pin: true,
      anticipatePin: 1,
      invalidateOnRefresh: true,
    },
  })
}

function progress() {
  const bar = document.querySelector<HTMLElement>('.scroll-progress')
  if (!bar) return
  gsap.to(bar, {
    width: '100%',
    ease: 'none',
    scrollTrigger: {
      trigger: document.documentElement,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.2,
    },
  })
}

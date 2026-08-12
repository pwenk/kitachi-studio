export function initMagnetic() {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  document.querySelectorAll<HTMLElement>('.magnetic').forEach((el) => {
    const strength = 18
    el.addEventListener('pointermove', (event) => {
      const rect = el.getBoundingClientRect()
      const x = event.clientX - (rect.left + rect.width / 2)
      const y = event.clientY - (rect.top + rect.height / 2)
      el.style.transform = `translate3d(${(x / rect.width) * strength}px, ${(y / rect.height) * strength}px, 0)`
    })
    el.addEventListener('pointerleave', () => {
      el.style.transform = 'translate3d(0, 0, 0)'
    })
  })
}

export function initOrb() {
  const orb = document.querySelector<HTMLElement>('[data-orb]')
  if (!orb) return
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  let rx = 0
  let ry = 0
  let tx = 0
  let ty = 0

  window.addEventListener(
    'pointermove',
    (event) => {
      const nx = (event.clientX / window.innerWidth) * 2 - 1
      const ny = (event.clientY / window.innerHeight) * 2 - 1
      tx = ny * -10
      ty = nx * 14
    },
    { passive: true },
  )

  const tick = () => {
    rx += (tx - rx) * 0.06
    ry += (ty - ry) * 0.06
    orb.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`
    requestAnimationFrame(tick)
  }
  tick()
}

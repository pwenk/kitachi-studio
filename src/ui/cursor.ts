export function initCursor() {
  const el = document.querySelector<HTMLElement>('.cursor')
  if (!el) return
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return

  document.body.classList.add('has-cursor')
  let x = window.innerWidth / 2
  let y = window.innerHeight / 2
  let tx = x
  let ty = y

  window.addEventListener(
    'pointermove',
    (event) => {
      tx = event.clientX
      ty = event.clientY
    },
    { passive: true },
  )

  const hoverables = 'a, button, input, select, textarea, .craft, .frame'
  document.addEventListener('pointerover', (event) => {
    const target = event.target as HTMLElement | null
    el.classList.toggle('is-hover', Boolean(target?.closest(hoverables)))
  })

  const tick = () => {
    x += (tx - x) * 0.2
    y += (ty - y) * 0.2
    el.style.transform = `translate3d(${x}px, ${y}px, 0)`
    requestAnimationFrame(tick)
  }
  tick()
}

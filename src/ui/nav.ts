export function initNav() {
  const nav = document.querySelector<HTMLElement>('[data-nav]')
  const toggle = document.querySelector<HTMLButtonElement>('.menu-toggle')
  const panel = document.querySelector<HTMLElement>('#mobile-panel')
  if (!nav) return

  let last = 0
  let hidden = false

  const desktop = window.matchMedia('(min-width: 900px)')

  const onScroll = () => {
    const y = window.scrollY
    nav.classList.toggle('is-scrolled', y > 20)
    if (!desktop.matches) {
      nav.classList.remove('is-hidden')
      hidden = false
      last = y
      return
    }
    if (y > last && y > 120 && !panel?.classList.contains('is-open')) {
      if (!hidden) {
        nav.classList.add('is-hidden')
        hidden = true
      }
    } else if (y < last - 4) {
      nav.classList.remove('is-hidden')
      hidden = false
    }
    last = y
  }

  window.addEventListener('scroll', onScroll, { passive: true })

  const close = () => {
    if (!toggle || !panel) return
    toggle.classList.remove('is-open')
    toggle.setAttribute('aria-expanded', 'false')
    toggle.setAttribute('aria-label', 'Menü öffnen')
    panel.classList.remove('is-open')
    panel.hidden = true
    document.body.style.overflow = ''
  }

  const open = () => {
    if (!toggle || !panel) return
    toggle.classList.add('is-open')
    toggle.setAttribute('aria-expanded', 'true')
    toggle.setAttribute('aria-label', 'Menü schließen')
    panel.hidden = false
    requestAnimationFrame(() => panel.classList.add('is-open'))
    document.body.style.overflow = 'hidden'
    nav.classList.remove('is-hidden')
  }

  toggle?.addEventListener('click', () => {
    panel?.classList.contains('is-open') ? close() : open()
  })

  panel?.querySelectorAll('a').forEach((link) => link.addEventListener('click', close))
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') close()
  })
}

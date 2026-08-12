export function initForm() {
  const form = document.querySelector<HTMLFormElement>('#contact-form')
  if (!form) return

  form.addEventListener('submit', (event) => {
    event.preventDefault()
    const data = new FormData(form)
    const name = String(data.get('name') ?? '').trim()
    const firma = String(data.get('firma') ?? '').trim()
    const email = String(data.get('email') ?? '').trim()
    const interesse = String(data.get('interesse') ?? '').trim()
    const nachricht = String(data.get('nachricht') ?? '').trim()

    if (!name || !email || !nachricht) {
      form.reportValidity()
      return
    }

    const subject = encodeURIComponent(`Anfrage von ${name}${firma ? ` · ${firma}` : ''}`)
    const body = encodeURIComponent(
      [
        `Name: ${name}`,
        `Firma: ${firma || '—'}`,
        `E-Mail: ${email}`,
        `Interesse: ${interesse}`,
        '',
        nachricht,
      ].join('\n'),
    )

    window.location.href = `mailto:human@kitachi.de?subject=${subject}&body=${body}`
    form.classList.add('is-sent')
  })
}

export function initClock() {
  const el = document.querySelector<HTMLElement>('[data-clock]')
  if (!el) return

  const tick = () => {
    const now = new Date()
    const time = new Intl.DateTimeFormat('de-DE', {
      timeZone: 'Europe/Berlin',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(now)
    el.textContent = `${time} CET`
  }

  tick()
  window.setInterval(tick, 1000)
}

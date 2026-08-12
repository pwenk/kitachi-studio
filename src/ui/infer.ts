type Preset = {
  id: string
  prompt: string
  log: string[]
}

const PRESETS: Preset[] = [
  {
    id: 'leads',
    prompt: 'Wir verlieren Anfragen über das Wochenende.',
    log: [
      'KONTEXT · Kanal Website / Formular / Mail',
      'ENGPASS · Antwortlatenz außerhalb Mo–Fr 09–17',
      'SYS.01  Empfangsschicht nimmt den Fall auf',
      'SYS.02  Modell sortiert nach Dringlichkeit + Wert',
      'SYS.03  Montag 08:00 liegt eine priorisierte Liste vor',
      'OUTPUT · weniger verlorene Gespräche, gleiche Belegschaft',
      'NEXT   · 60-Minuten-Briefing, Oldenburg oder remote',
    ],
  },
  {
    id: 'quotes',
    prompt: 'Angebote dauern bei uns zwei Tage.',
    log: [
      'KONTEXT · Angebot aus Kopf + Excel + letzter PDF',
      'ENGPASS · jedes Mal neu denken, statt zusammenzusetzen',
      'SYS.01  Vorlagen lesen Preis, Leistung, Ton',
      'SYS.02  Modell schreibt den Erstentwurf in 3 Minuten',
      'SYS.03  Mensch gibt frei. Absenden ist ein Klick.',
      'OUTPUT · zwei Tage werden zu einem Vormittag',
      'NEXT   · wir schneiden den ersten echten Fall mit Ihnen',
    ],
  },
  {
    id: 'support',
    prompt: 'Derselbe Anruf kommt dreimal die Woche.',
    log: [
      'KONTEXT · Wiederholfragen im Telefon und Postfach',
      'ENGPASS · Wissen sitzt in Köpfen, nicht im System',
      'SYS.01  Wissensschicht aus Ihren echten Antworten',
      'SYS.02  Stimme oder Text löst 70% ohne Warten',
      'SYS.03  Rest landet sortiert bei der richtigen Person',
      'OUTPUT · weniger Lärm, mehr Fälle, die zählen',
      'NEXT   · 60 Minuten, wir hören drei echte Anrufe',
    ],
  },
  {
    id: 'web',
    prompt: 'Unsere Website erklärt uns, statt uns zu verkaufen.',
    log: [
      'KONTEXT · Auftritt vorhanden, Anfragen zu weich',
      'ENGPASS · Besucher versteht Sie, entscheidet sich nicht',
      'SYS.01  Eine Fläche, ein Versprechen, ein nächster Schritt',
      'SYS.02  Formular, das qualifiziert statt sammelt',
      'SYS.03  Danach greift das Modell — nicht eine neue Broschüre',
      'OUTPUT · weniger Bewunderung, mehr Termine',
      'NEXT   · wir skizzieren die erste Fläche in der Session',
    ],
  },
]

const GLYPHS = '01<>/|#█▓░'

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function customLog(prompt: string): string[] {
  const clip = prompt.replace(/\s+/g, ' ').trim().slice(0, 72)
  return [
    `KONTEXT · "${clip}${prompt.length > 72 ? '…' : ''}"`,
    'PARSE   · Ziel, Reibung, vorhandene Werkzeuge',
    'HYPOTH. · der Engpass sitzt zwischen Eingang und Entscheidung',
    'SYS.01  Oberfläche, die den Fall aufnimmt',
    'SYS.02  Modell, das sortiert und vorschlägt',
    'SYS.03  Mensch gibt frei, wo es zählt',
    'NEXT   · 60 Minuten, eine ehrliche Karte',
  ]
}

export function initInfer() {
  const input = document.querySelector<HTMLTextAreaElement>('#infer-input')
  const logEl = document.querySelector<HTMLElement>('#infer-log')
  const runBtn = document.querySelector<HTMLButtonElement>('#infer-run')
  const dot = document.querySelector<HTMLElement>('#infer-dot')
  if (!input || !logEl || !runBtn) return

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  let token = 0

  const write = async (lines: string[]) => {
    const id = ++token
    logEl.textContent = ''
    dot?.classList.add('is-run')
    runBtn.disabled = true

    if (reduce) {
      logEl.innerHTML = lines.map((line) => `<span class="ok">›</span> ${line}`).join('\n')
      dot?.classList.remove('is-run')
      runBtn.disabled = false
      return
    }

    for (const line of lines) {
      if (id !== token) return
      const row = document.createElement('div')
      const mark = document.createElement('span')
      mark.className = 'ok'
      mark.textContent = '› '
      row.append(mark)
      logEl.append(row)

      for (const ch of line) {
        if (id !== token) return
        row.append(ch)
        await sleep(9)
      }
      await sleep(90)
    }

    if (id === token) {
      dot?.classList.remove('is-run')
      runBtn.disabled = false
    }
  }

  const runFromPrompt = (prompt: string) => {
    const hit = PRESETS.find((item) => item.prompt === prompt)
    void write(hit ? hit.log : customLog(prompt))
  }

  document.querySelectorAll<HTMLButtonElement>('[data-preset]').forEach((chip) => {
    chip.addEventListener('click', () => {
      const preset = PRESETS.find((item) => item.id === chip.dataset.preset)
      if (!preset) return
      document.querySelectorAll('.chip').forEach((el) => el.classList.toggle('is-on', el === chip))
      input.value = preset.prompt
      void write(preset.log)
    })
  })

  runBtn.addEventListener('click', () => {
    const prompt = input.value.trim()
    if (!prompt) {
      input.focus()
      return
    }
    document.querySelectorAll('.chip').forEach((el) => {
      const preset = PRESETS.find((item) => item.id === (el as HTMLElement).dataset.preset)
      el.classList.toggle('is-on', Boolean(preset && preset.prompt === prompt))
    })
    runFromPrompt(prompt)
  })

  input.addEventListener('keydown', (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      runBtn.click()
    }
  })

  logEl.textContent = reduce ? '' : `${GLYPHS[0]} warte auf Brief…`
  window.setTimeout(() => {
    if (logEl.textContent?.includes('warte')) void write(PRESETS[0].log)
  }, 700)
}

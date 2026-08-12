import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'

const out = resolve(process.cwd(), 'audit')
await mkdir(out, { recursive: true })

const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
})

const findings = []

async function measure(page) {
  return page.evaluate(() => {
    const doc = document.documentElement
    const offenders = [...document.querySelectorAll('body *')]
      .filter((el) => {
        const r = el.getBoundingClientRect()
        return r.width > window.innerWidth + 2
      })
      .slice(0, 12)
      .map((el) => ({
        tag: el.tagName.toLowerCase(),
        cls: el.className?.toString?.().slice(0, 80) ?? '',
        w: Math.round(el.getBoundingClientRect().width),
      }))
    return {
      inner: window.innerWidth,
      scrollW: doc.scrollWidth,
      overflow: doc.scrollWidth - window.innerWidth,
      offenders,
      title: document.title,
      h1: document.querySelector('h1')?.textContent?.replace(/\s+/g, ' ').trim(),
    }
  })
}

async function run(name, viewport) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: name === 'mobile' ? 3 : 1,
    locale: 'de-DE',
    hasTouch: name === 'mobile',
    isMobile: name === 'mobile',
  })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (err) => errors.push(err.message))
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })

  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle', timeout: 30000 })
  await page.waitForSelector('.loader', { state: 'detached', timeout: 8000 }).catch(() => {})
  await page.waitForTimeout(1200)

  const home = await measure(page)
  await page.screenshot({ path: `${out}/${name}-hero.png`, fullPage: false })

  for (const id of ['leistungen', 'arbeit', 'ansatz', 'kontakt']) {
    await page.locator(`#${id}`).scrollIntoViewIfNeeded()
    await page.waitForTimeout(400)
    await page.screenshot({ path: `${out}/${name}-${id}.png`, fullPage: false })
  }

  if (name === 'mobile') {
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.waitForTimeout(250)
    await page.locator('.menu-toggle').click({ force: true })
    await page.waitForTimeout(500)
    await page.screenshot({ path: `${out}/${name}-menu.png`, fullPage: false })
    await page.locator('#mobile-panel a[href="#kontakt"]').click({ force: true })
    await page.waitForTimeout(600)
  }

  await page.goto('http://127.0.0.1:5173/impressum.html', { waitUntil: 'networkidle' })
  const impressum = await measure(page)
  await page.screenshot({ path: `${out}/${name}-impressum.png`, fullPage: false })

  await page.goto('http://127.0.0.1:5173/datenschutz.html', { waitUntil: 'networkidle' })
  const datenschutz = await measure(page)

  findings.push({ name, viewport, errors, home, impressum, datenschutz })
  await context.close()
}

await run('desktop', { width: 1440, height: 900 })
await run('mobile', { width: 390, height: 844 })

await browser.close()
console.log(JSON.stringify(findings, null, 2))

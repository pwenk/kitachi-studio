import './styles.css'
import { initCursor } from './ui/cursor'
import { initNav } from './ui/nav'
import { initClock, initForm } from './ui/form'
import { initMagnetic, initOrb } from './ui/magnetic'

initNav()
initForm()
initClock()
initCursor()
initMagnetic()
initOrb()

const page = document.body.dataset.page
if (page === 'home') {
  void Promise.all([import('./webgl/field'), import('./motion/app')]).then(
    ([{ createField }, { bootMotion }]) => {
      const canvas = document.querySelector<HTMLCanvasElement>('#field')
      if (canvas) {
        try {
          createField(canvas)
        } catch {
          canvas.style.display = 'none'
        }
      }
      void bootMotion()
    },
  )
} else {
  document.body.classList.remove('is-loading')
  document.querySelector('.loader')?.remove()
}

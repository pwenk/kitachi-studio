import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  LineBasicMaterial,
  LineSegments,
  PerspectiveCamera,
  Points,
  Scene,
  ShaderMaterial,
  Vector2,
  WebGLRenderer,
} from 'three'

const pointVert = `
attribute float aSeed;
uniform float uTime;
uniform float uPixelRatio;
varying float vGlow;

void main() {
  vec3 pos = position;
  float wave = sin(uTime * 0.55 + aSeed * 18.0);
  pos += normalize(position + 0.0001) * wave * 0.045;

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;

  float pulse = 0.62 + 0.38 * sin(uTime * 2.1 + aSeed * 28.0);
  vGlow = pulse;
  float size = 4.2 + pulse * 3.4 + aSeed * 2.2;
  gl_PointSize = size * uPixelRatio * (2.6 / max(-mv.z, 0.8));
}
`

const pointFrag = `
varying float vGlow;

void main() {
  vec2 uv = gl_PointCoord * 2.0 - 1.0;
  float d = length(uv);
  float core = smoothstep(0.42, 0.0, d);
  float halo = exp(-d * 3.4) * 0.62;
  vec3 cyan = vec3(0.30, 0.91, 1.0);
  vec3 white = vec3(0.95, 0.98, 1.0);
  vec3 col = mix(cyan, white, core);
  float alpha = (core * 0.95 + halo) * vGlow;
  if (alpha < 0.03) discard;
  gl_FragColor = vec4(col, alpha);
}
`

function fibonacciSphere(count: number, radius: number) {
  const out = new Float32Array(count * 3)
  const golden = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / Math.max(count - 1, 1)) * 2
    const r = Math.sqrt(Math.max(0, 1 - y * y))
    const theta = golden * i
    const jitter = 0.92 + ((i * 17) % 11) / 80
    out[i * 3] = Math.cos(theta) * r * radius * jitter
    out[i * 3 + 1] = y * radius * 0.88
    out[i * 3 + 2] = Math.sin(theta) * r * radius * jitter
  }
  return out
}

function nearestEdges(points: Float32Array, maxLinks: number, maxDist: number) {
  const n = points.length / 3
  const segments: number[] = []
  const dist2 = maxDist * maxDist

  for (let i = 0; i < n; i++) {
    const ix = points[i * 3]
    const iy = points[i * 3 + 1]
    const iz = points[i * 3 + 2]
    const found: Array<[number, number]> = []
    for (let j = i + 1; j < n; j++) {
      const dx = ix - points[j * 3]
      const dy = iy - points[j * 3 + 1]
      const dz = iz - points[j * 3 + 2]
      const d = dx * dx + dy * dy + dz * dz
      if (d < dist2) found.push([d, j])
    }
    found.sort((a, b) => a[0] - b[0])
    const take = Math.min(maxLinks, found.length)
    for (let k = 0; k < take; k++) {
      const j = found[k][1]
      segments.push(ix, iy, iz, points[j * 3], points[j * 3 + 1], points[j * 3 + 2])
    }
  }
  return new Float32Array(segments)
}

export function createField(canvas: HTMLCanvasElement) {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const isMobile =
    window.matchMedia('(max-width: 800px)').matches || window.matchMedia('(pointer: coarse)').matches

  const renderer = new WebGLRenderer({
    canvas,
    antialias: false,
    alpha: false,
    powerPreference: 'high-performance',
  })
  renderer.setClearColor(new Color('#05060a'), 1)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.15 : 1.6))

  const scene = new Scene()
  const camera = new PerspectiveCamera(48, 1, 0.1, 30)
  camera.position.set(0, 0.12, isMobile ? 5.4 : 4.7)

  const count = isMobile ? 520 : 1280
  const positions = fibonacciSphere(count, isMobile ? 1.55 : 1.85)
  const seeds = new Float32Array(count)
  for (let i = 0; i < count; i++) seeds[i] = Math.random()

  const pointGeo = new BufferGeometry()
  pointGeo.setAttribute('position', new BufferAttribute(positions, 3))
  pointGeo.setAttribute('aSeed', new BufferAttribute(seeds, 1))

  const pointMat = new ShaderMaterial({
    vertexShader: pointVert,
    fragmentShader: pointFrag,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: renderer.getPixelRatio() },
    },
  })

  const points = new Points(pointGeo, pointMat)
  scene.add(points)

  const edges = nearestEdges(positions, isMobile ? 2 : 3, isMobile ? 0.52 : 0.42)
  const lineGeo = new BufferGeometry()
  lineGeo.setAttribute('position', new BufferAttribute(edges, 3))
  const lineMat = new LineBasicMaterial({
    color: 0x4de8ff,
    transparent: true,
    opacity: 0.13,
    blending: AdditiveBlending,
    depthWrite: false,
  })
  const lines = new LineSegments(lineGeo, lineMat)
  scene.add(lines)

  const mouse = new Vector2(0, 0)
  const target = new Vector2(0, 0)
  let raf = 0
  let running = true
  let time = 0
  let last = performance.now()

  const resize = () => {
    const w = canvas.clientWidth || window.innerWidth
    const h = canvas.clientHeight || window.innerHeight
    renderer.setSize(w, h, false)
    camera.aspect = w / Math.max(h, 1)
    camera.updateProjectionMatrix()
    pointMat.uniforms.uPixelRatio.value = renderer.getPixelRatio()
  }

  const onMove = (event: PointerEvent) => {
    target.set((event.clientX / window.innerWidth) * 2 - 1, (event.clientY / window.innerHeight) * 2 - 1)
  }

  const loop = (now: number) => {
    if (!running) return
    raf = requestAnimationFrame(loop)
    const dt = Math.min(0.05, (now - last) / 1000)
    last = now
    time += dt
    mouse.lerp(target, 0.045)
    points.rotation.y = time * 0.07 + mouse.x * 0.38
    points.rotation.x = 0.16 + mouse.y * 0.18
    lines.rotation.copy(points.rotation)
    pointMat.uniforms.uTime.value = time
    renderer.render(scene, camera)
  }

  const onVisibility = () => {
    if (document.hidden) {
      running = false
      cancelAnimationFrame(raf)
      return
    }
    if (!running) {
      running = true
      last = performance.now()
      loop(last)
    }
  }

  resize()
  window.addEventListener('resize', resize, { passive: true })
  window.addEventListener('pointermove', onMove, { passive: true })
  document.addEventListener('visibilitychange', onVisibility)

  if (!reduce) {
    loop(performance.now())
  } else {
    renderer.render(scene, camera)
  }

  return () => {
    running = false
    cancelAnimationFrame(raf)
    window.removeEventListener('resize', resize)
    window.removeEventListener('pointermove', onMove)
    document.removeEventListener('visibilitychange', onVisibility)
    pointGeo.dispose()
    lineGeo.dispose()
    pointMat.dispose()
    lineMat.dispose()
    renderer.dispose()
  }
}

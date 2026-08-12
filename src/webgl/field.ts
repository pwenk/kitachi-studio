import {
  Clock,
  Color,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Vector2,
  WebGLRenderer,
} from 'three'

const vertex = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

const fragment = `
precision highp float;

varying vec2 vUv;
uniform float uTime;
uniform vec2 uRes;
uniform vec2 uMouse;
uniform float uReduce;

vec3 plum = vec3(0.420, 0.027, 0.388);
vec3 magenta = vec3(0.706, 0.075, 0.416);
vec3 crimson = vec3(0.894, 0.180, 0.345);
vec3 coral = vec3(0.961, 0.353, 0.173);
vec3 amber = vec3(0.976, 0.576, 0.047);
vec3 cream = vec3(0.984, 0.969, 0.949);

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p *= 2.02;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = vUv;
  float aspect = uRes.x / max(uRes.y, 1.0);
  vec2 p = vec2(uv.x * aspect, uv.y);
  float t = uTime * 0.07;

  vec2 m = (uMouse - 0.5) * vec2(aspect, 1.0) * 0.22;

  vec2 c1 = vec2(0.62 * aspect, 0.58) + m + vec2(sin(t * 0.9), cos(t * 0.7)) * 0.07;
  vec2 c2 = vec2(0.78 * aspect, 0.38) - m * 0.55 + vec2(cos(t * 0.6), sin(t * 0.85)) * 0.06;
  vec2 c3 = vec2(0.70 * aspect, 0.72) + m * 0.3 + vec2(sin(t * 0.5 + 1.2), cos(t * 0.4)) * 0.05;

  float n = fbm(p * 2.1 + vec2(t, -t * 0.7));
  float n2 = fbm(p * 4.0 - t * 1.15 + 8.0);

  float v1 = 0.72 / (0.07 + length(p - c1));
  float v2 = 0.62 / (0.08 + length(p - c2));
  float v3 = 0.58 / (0.09 + length(p - c3));
  float field = (v1 + v2 + v3) * 0.42 + n * 0.85;

  float band = smoothstep(0.18, 0.95, field + n2 * 0.22);
  vec3 heat = mix(plum, magenta, smoothstep(0.12, 0.38, band));
  heat = mix(heat, crimson, smoothstep(0.34, 0.58, band));
  heat = mix(heat, coral, smoothstep(0.52, 0.76, band));
  heat = mix(heat, amber, smoothstep(0.70, 0.98, band));

  float left = smoothstep(0.0, 0.55, uv.x);
  vec3 col = mix(cream, heat, (0.38 + 0.55 * left) * (0.55 + 0.45 * n));
  col = mix(col, cream, 0.06 + (1.0 - uv.x) * 0.18);

  float vig = smoothstep(1.2, 0.22, length((uv - vec2(0.72, 0.5)) * vec2(1.05, 1.15)));
  col = mix(col * 0.9, col, vig);

  if (uReduce > 0.5) {
    col = mix(cream, heat, 0.28 + uv.x * 0.18);
  }

  gl_FragColor = vec4(col, 1.0);
}
`

export function createField(canvas: HTMLCanvasElement) {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const isMobile = window.matchMedia('(max-width: 800px)').matches || window.matchMedia('(pointer: coarse)').matches

  const renderer = new WebGLRenderer({
    canvas,
    antialias: false,
    alpha: false,
    powerPreference: 'high-performance',
  })
  renderer.setClearColor(new Color('#fbf7f2'), 1)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.15 : 1.6))

  const scene = new Scene()
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1)
  const geometry = new PlaneGeometry(2, 2)
  const mouse = new Vector2(0.5, 0.5)
  const target = new Vector2(0.5, 0.5)

  const material = new ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: fragment,
    uniforms: {
      uTime: { value: 0 },
      uRes: { value: new Vector2(1, 1) },
      uMouse: { value: mouse },
      uReduce: { value: reduce ? 1 : 0 },
    },
  })

  scene.add(new Mesh(geometry, material))
  const clock = new Clock()
  let raf = 0
  let running = true

  const resize = () => {
    const { clientWidth: w, clientHeight: h } = canvas
    renderer.setSize(w, h, false)
    material.uniforms.uRes.value.set(w, h)
  }

  const onMove = (event: PointerEvent) => {
    const rect = canvas.getBoundingClientRect()
    target.set((event.clientX - rect.left) / rect.width, 1 - (event.clientY - rect.top) / rect.height)
  }

  const loop = () => {
    if (!running) return
    raf = requestAnimationFrame(loop)
    mouse.lerp(target, 0.045)
    material.uniforms.uTime.value = clock.getElapsedTime()
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
      clock.start()
      loop()
    }
  }

  resize()
  window.addEventListener('resize', resize, { passive: true })
  window.addEventListener('pointermove', onMove, { passive: true })
  document.addEventListener('visibilitychange', onVisibility)

  if (!reduce) loop()
  else renderer.render(scene, camera)

  return () => {
    running = false
    cancelAnimationFrame(raf)
    window.removeEventListener('resize', resize)
    window.removeEventListener('pointermove', onMove)
    document.removeEventListener('visibilitychange', onVisibility)
    geometry.dispose()
    material.dispose()
    renderer.dispose()
  }
}

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
uniform float uQuality;

vec3 plum = vec3(0.420, 0.027, 0.388);
vec3 magenta = vec3(0.706, 0.075, 0.416);
vec3 crimson = vec3(0.894, 0.180, 0.345);
vec3 coral = vec3(0.961, 0.353, 0.173);
vec3 amber = vec3(0.976, 0.576, 0.047);
vec3 cream = vec3(0.984, 0.969, 0.949);
vec3 ink = vec3(0.086, 0.043, 0.063);

vec2 rot(vec2 p, float a) {
  float c = cos(a);
  float s = sin(a);
  return vec2(c * p.x - s * p.y, s * p.x + c * p.y);
}

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
  int oct = uQuality > 0.5 ? 5 : 3;
  for (int i = 0; i < 5; i++) {
    if (i >= oct) break;
    v += a * noise(p);
    p *= 2.05;
    a *= 0.5;
  }
  return v;
}

float tomoe(vec2 p) {
  float head = length(p - vec2(0.0, 0.30)) - 0.195;
  float mid = length(p - vec2(-0.11, 0.06)) - 0.125;
  float tail = length(p - vec2(-0.20, -0.16)) - 0.055;
  float tip = length(p - vec2(-0.16, -0.28)) - 0.028;
  return min(min(head, mid), min(tail, tip));
}

vec3 heat(float t) {
  t = clamp(t, 0.0, 1.0);
  vec3 c = mix(plum, magenta, smoothstep(0.0, 0.28, t));
  c = mix(c, crimson, smoothstep(0.22, 0.50, t));
  c = mix(c, coral, smoothstep(0.46, 0.74, t));
  c = mix(c, amber, smoothstep(0.70, 1.0, t));
  return c;
}

void main() {
  vec2 uv = vUv;
  float aspect = uRes.x / max(uRes.y, 1.0);
  vec2 p = (uv - 0.5) * vec2(aspect, 1.0);
  float t = uTime * 0.22;

  vec2 m = (uMouse - 0.5) * vec2(aspect, 1.0);
  p -= m * 0.16;

  float n = fbm(p * 2.4 + vec2(t * 0.35, -t * 0.28));
  float n2 = fbm(p * 5.2 - t * 0.55 + 9.0);
  vec2 warp = vec2(
    fbm(p * 1.8 + t * 0.4),
    fbm(p * 1.8 - t * 0.35 + 4.2)
  ) - 0.5;
  vec2 q = p + warp * 0.18;

  float field = 1.0;
  float glow = 0.0;
  float spin = t * 0.55;

  for (int i = 0; i < 3; i++) {
    float a = float(i) * 2.09439510239 + spin;
    vec2 local = rot(q, -a);
    float d = tomoe(local * 1.55);
    field = min(field, d);
    glow += exp(-max(d, 0.0) * (18.0 + n * 10.0));
  }

  float ring = abs(length(q) - 0.62) - 0.007;
  glow += exp(-max(ring, 0.0) * 90.0) * 0.85;
  field = min(field, ring);

  float fill = 1.0 - smoothstep(-0.012, 0.018, field);
  float fog = smoothstep(0.15, 0.92, n) * 0.55 + n2 * 0.18;
  float angle = atan(q.y, q.x);
  float ramp = fract(angle / 6.28318530718 + 0.5 + t * 0.08);

  vec3 brand = heat(ramp + n * 0.12);
  vec3 smoke = mix(cream, heat(0.35 + n * 0.5), 0.22 + fog * 0.45);

  float left = smoothstep(-0.15, 0.55, uv.x);
  vec3 col = mix(cream, smoke, 0.35 + 0.55 * left);
  col = mix(col, brand, fill * 0.96);
  col = mix(col, brand, clamp(glow * 0.42, 0.0, 0.85));
  col = mix(col, cream, (1.0 - left) * 0.18);

  float vig = smoothstep(1.25, 0.28, length((uv - vec2(0.58, 0.48)) * vec2(1.15, 1.2)));
  col = mix(col * 0.88, col, vig);

  float grain = hash(uv * uRes.xy + fract(uTime) * 40.0) * 0.035;
  col += grain - 0.017;

  if (uReduce > 0.5) {
    col = mix(cream, brand, fill * 0.88 + glow * 0.2);
  }

  gl_FragColor = vec4(col, 1.0);
}
`

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
  renderer.setClearColor(new Color('#fbf7f2'), 1)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.1 : 1.55))

  const scene = new Scene()
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1)
  const geometry = new PlaneGeometry(2, 2)
  const mouse = new Vector2(0.62, 0.48)
  const target = new Vector2(0.62, 0.48)

  const material = new ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: fragment,
    uniforms: {
      uTime: { value: 0 },
      uRes: { value: new Vector2(1, 1) },
      uMouse: { value: mouse },
      uReduce: { value: reduce ? 1 : 0 },
      uQuality: { value: isMobile ? 0 : 1 },
    },
  })

  scene.add(new Mesh(geometry, material))
  const clock = new Clock()
  let raf = 0
  let running = true

  const resize = () => {
    const w = canvas.clientWidth || window.innerWidth
    const h = canvas.clientHeight || window.innerHeight
    renderer.setSize(w, h, false)
    material.uniforms.uRes.value.set(w, h)
  }

  const onMove = (event: PointerEvent) => {
    target.set(event.clientX / window.innerWidth, 1 - event.clientY / window.innerHeight)
  }

  const loop = () => {
    if (!running) return
    raf = requestAnimationFrame(loop)
    mouse.lerp(target, 0.04)
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

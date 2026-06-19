// Pixie's Garden — click anywhere and a flower grows where you clicked.
//
// How it works: two render targets ping-pong as a feedback buffer, so every
// bloom already painted persists on screen while a freshly clicked one grows.
// All the petals/stem are drawn procedurally in the fragment shader (see the
// `#fragmentShader` block in index.html), driven by a per-flower randomizer
// and an animation clock (`u_stop_time`).
//
// Adapted from a CodePen by Ksenia Kondrashova; rewired to the local Three.js
// dependency and themed for Pixie.

import * as THREE from 'three'

const canvasEl = document.querySelector('#canvas')
const cleanBtn = document.querySelector('.clean-btn')

const pointer = {
  x: 0.66,
  y: 0.3,
  clicked: true,
  vanishCanvas: false,
}

// A welcoming first bloom so the garden isn't empty on open.
window.setTimeout(() => {
  pointer.x = 0.75
  pointer.y = 0.5
  pointer.clicked = true
}, 700)

let basicMaterial, shaderMaterial
const renderer = new THREE.WebGLRenderer({
  canvas: canvasEl,
  alpha: true,
})
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
const sceneShader = new THREE.Scene()
const sceneBasic = new THREE.Scene()
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 10)
const clock = new THREE.Clock()

let renderTargets = [
  new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight),
  new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight),
]

createPlane()
updateSize()

window.addEventListener('resize', () => {
  updateSize()
  cleanCanvas()
})

render()

let isTouchScreen = false

window.addEventListener('click', (e) => {
  if (!isTouchScreen) {
    pointer.x = e.pageX / window.innerWidth
    pointer.y = e.pageY / window.innerHeight
    pointer.clicked = true
  }
})
window.addEventListener('touchstart', (e) => {
  isTouchScreen = true
  pointer.x = e.targetTouches[0].pageX / window.innerWidth
  pointer.y = e.targetTouches[0].pageY / window.innerHeight
  pointer.clicked = true
})

cleanBtn.addEventListener('click', cleanCanvas)

function cleanCanvas() {
  pointer.vanishCanvas = true
  setTimeout(() => {
    pointer.vanishCanvas = false
  }, 50)
}

function createPlane() {
  shaderMaterial = new THREE.ShaderMaterial({
    uniforms: {
      u_stop_time: { type: 'f', value: 0 },
      u_stop_randomizer: { type: 'v2', value: new THREE.Vector2(Math.random(), Math.random()) },
      u_cursor: { type: 'v2', value: new THREE.Vector2(pointer.x, pointer.y) },
      u_ratio: { type: 'f', value: window.innerWidth / window.innerHeight },
      u_texture: { type: 't', value: null },
      u_clean: { type: 'f', value: 1 },
    },
    vertexShader: document.getElementById('vertexShader').textContent,
    fragmentShader: document.getElementById('fragmentShader').textContent,
  })
  basicMaterial = new THREE.MeshBasicMaterial()
  const planeGeometry = new THREE.PlaneGeometry(2, 2)
  const planeBasic = new THREE.Mesh(planeGeometry, basicMaterial)
  const planeShader = new THREE.Mesh(planeGeometry, shaderMaterial)
  sceneBasic.add(planeBasic)
  sceneShader.add(planeShader)
}

function render() {
  shaderMaterial.uniforms.u_clean.value = pointer.vanishCanvas ? 0 : 1
  shaderMaterial.uniforms.u_texture.value = renderTargets[0].texture

  if (pointer.clicked) {
    shaderMaterial.uniforms.u_cursor.value = new THREE.Vector2(pointer.x, 1 - pointer.y)
    shaderMaterial.uniforms.u_stop_randomizer.value = new THREE.Vector2(Math.random(), Math.random())
    shaderMaterial.uniforms.u_stop_time.value = 0
    pointer.clicked = false
  }
  // Clamp the per-frame step: a flower only paints into the feedback buffer
  // while it's growing (u_stop_time ~0.25..1.0). If the tab was backgrounded
  // (or we're rendering under a fast-forwarded clock), getDelta() returns a
  // huge value that would leap past the growth window and skip the bloom
  // entirely. Capping it keeps every bloom smooth and reliable.
  shaderMaterial.uniforms.u_stop_time.value += Math.min(clock.getDelta(), 0.033)

  renderer.setRenderTarget(renderTargets[1])
  renderer.render(sceneShader, camera)
  basicMaterial.map = renderTargets[1].texture
  renderer.setRenderTarget(null)
  renderer.render(sceneBasic, camera)

  const tmp = renderTargets[0]
  renderTargets[0] = renderTargets[1]
  renderTargets[1] = tmp

  requestAnimationFrame(render)
}

function updateSize() {
  shaderMaterial.uniforms.u_ratio.value = window.innerWidth / window.innerHeight
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderTargets[0].setSize(window.innerWidth, window.innerHeight)
  renderTargets[1].setSize(window.innerWidth, window.innerHeight)
}

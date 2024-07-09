import "../style.css"
import * as THREE from "three"
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js"

/******************** SET UP ********************/
const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
const renderer = new THREE.WebGLRenderer({ canvas: document.querySelector("#index"), antialias: true })
const controls: FirstPersonCamera = new FirstPersonCamera(camera, renderer.domElement)
const clock = new THREE.Clock()

scene.background = new THREE.Color("#5381f1")

renderer.setPixelRatio(window.devicePixelRatio)
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setAnimationLoop(animate)

/*** POKDPWKDPWQKDPOWQKP */

/******************** WORLD ********************/
const gridHelper = new THREE.GridHelper(200, 200)
const geometry = new THREE.BoxGeometry(1, 1, 1)
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 })
const cube = new THREE.Mesh(geometry, material)
scene.add(cube)
scene.add(gridHelper)

camera.position.z = 5

/******************** LIGHTS ********************/

const dirLight1 = new THREE.DirectionalLight(0xffffff, 3)
dirLight1.position.set(1, 1, 1)
scene.add(dirLight1)

const dirLight2 = new THREE.DirectionalLight(0x002288, 3)
dirLight2.position.set(-1, -1, -1)
scene.add(dirLight2)

const ambientLight = new THREE.AmbientLight(0x555555)
scene.add(ambientLight)

/******************** START CODE ********************/
window.addEventListener("resize", onWindowResize)

/******************** FUNCTIONS ********************/
function animate() {
	cube.rotation.x += 0.01
	cube.rotation.y += 0.01
	controls.update(clock.getDelta())
	renderer.render(scene, camera)
}

function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight
	camera.updateProjectionMatrix()
	renderer.setSize(window.innerWidth, window.innerHeight)
}

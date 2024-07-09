import * as THREE from "three"
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js"
import { random_spherical_cartesian_coordinate } from "./utils/spherical"
import gsap from "gsap"
import { IVideo, IPhrase, Player } from "textalive-app-api"

const media = document.querySelector("#media")! as HTMLElement

let playing = false

const player = new Player({
	app: { token: "3vrjMH3wtSxCx2oX" },
	mediaElement: media,
	mediaBannerPosition: "bottom right",
})

player.volume = 50

player.addListener({
	onAppReady: (app) => {
		//play song
		media.className = "disabled"

		// Future Notes / shikisai
		player.createFromSongUrl("https://piapro.jp/t/XiaI/20240201203346", {
			video: {
				// Music Map Correction History
				beatId: 4592297,
				chordId: 2727637,
				repetitiveSegmentId: 2824328,
				// Lyric timing correction history: https://textalive.jp/lyrics/piapro.jp%2Ft%2FXiaI%2F20240201203346
				lyricId: 59417,
				lyricDiffId: 13964,
			},
		})
	},

	onVideoReady: (video: IVideo) => {
		console.log(video)
		threeJS()
	},
	// onAppMediaChange: () => {
	// 	console.log("app media change")
	// },
	// onTimerReady: (timer) => {
	// 	console.log(timer)
	// },
	// onTimeUpdate: (position) => {
	// 	console.log(position)
	// },
	// onPlay: () => {
	// 	console.log("play")
	// },
	// onPause: () => {
	// 	console.log("pause")
	// },
})

const threeJS = () => {
	// CONFIG
	const NUM_PARTICLES = 5000
	const PARTICLE_SIZE = 50
	const SKY_RADIUS = 7000
	const POINTS_THRESHOLD = 100
	const LINES_THRESHOLD = 100
	const SPEED = 50
	const BRUSH_PALETTE: Array<{ color: string; hex: string }> = [
		{
			color: "BLUE-GREEN",
			hex: "#39C5BB",
		},
		{
			color: "ORANGE",
			hex: "#ffa500",
		},
		{
			color: "YELLOW",
			hex: "#FFE211",
		},
		{
			color: "PINK",
			hex: "#ffc0cb",
		},
		{
			color: "RED",
			hex: "#D80000",
		},
		{
			color: "BLUE",
			hex: "#0000ff",
		},
		{
			color: "GREEN",
			hex: "#00FF00",
		},
		{
			color: "MAGENTA",
			hex: "#FF00FF",
		},
		{
			color: "WHITE",
			hex: "#FFFFFF",
		},
	]
	/******************** SET UP ********************/
	const scene: THREE.Scene = new THREE.Scene()
	const camera: THREE.PerspectiveCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 10000)
	const renderer: THREE.WebGLRenderer = new THREE.WebGLRenderer({ canvas: document.getElementById("index")!, antialias: true })
	const controls: PointerLockControls = new PointerLockControls(camera, document.body)
	const raycaster: THREE.Raycaster = new THREE.Raycaster()
	const BIGraycaster: THREE.Raycaster = new THREE.Raycaster()

	scene.background = new THREE.Color("#1c1624")

	renderer.setPixelRatio(window.devicePixelRatio)
	renderer.setSize(window.innerWidth, window.innerHeight)
	renderer.setAnimationLoop(animate)

	raycaster.params.Points.threshold = POINTS_THRESHOLD
	raycaster.params.Line.threshold = LINES_THRESHOLD

	BIGraycaster.params.Points.threshold = 1000

	enum DrawMode {
		VIEW,
		PAINT,
		ERASE,
	}

	let drawingMode: DrawMode = DrawMode.PAINT
	let drawingModeString: string = "PAINT"
	let toolActive: boolean = false

	const toggleDrawMode = () => {
		switch (drawingMode) {
			case DrawMode.VIEW:
				drawingMode = DrawMode.PAINT
				drawingModeString = "PAINT"
				break
			case DrawMode.PAINT:
				drawingMode = DrawMode.ERASE
				drawingModeString = "ERASE"
				break
			case DrawMode.ERASE:
				drawingMode = DrawMode.VIEW
				drawingModeString = "VIEW"
				break
		}
		const brushColorText = document.getElementById("brushColorText")
		if (brushColorText) {
			if (drawingMode == DrawMode.PAINT) {
				brushColorText.style.display = "block"
			} else {
				brushColorText.style.display = "none"
			}
		}
	}

	let brushColorIndex: number = 0

	const toggleColorPalette = () => {
		brushColorIndex = (brushColorIndex + 1) % BRUSH_PALETTE.length
	}

	let moveForward: boolean = false
	let moveBackward: boolean = false
	let moveLeft: boolean = false
	let moveRight: boolean = false
	let canJump: boolean = false
	let prevTime: number = performance.now()

	const velocity: THREE.Vector3 = new THREE.Vector3()
	const direction: THREE.Vector3 = new THREE.Vector3()

	const phrases: IPhrase[] = player.video.phrases
	let currentPhraseIndex: number = 0

	/******************** WORLD ********************/
	const gridHelper = new THREE.GridHelper(50, 50)
	const cube = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0x39c5bb }))
	cube.position.set(0, -0.5, 0)
	scene.add(gridHelper)
	scene.add(cube)

	// STARS
	const geometry = new THREE.BufferGeometry()
	const positions = []
	const colors = []
	const sizes = []

	const color = new THREE.Color()
	for (let i = 0; i < NUM_PARTICLES; i++) {
		const coords = random_spherical_cartesian_coordinate(SKY_RADIUS)
		positions.push(coords.x, coords.y, coords.z)

		// colors
		color.setRGB(0, 1, 1)
		colors.push(color.r, color.g, color.b)
		sizes[i] = PARTICLE_SIZE * 0.5 
	}
	geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3))
	geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3))
	geometry.setAttribute("size", new THREE.Float32BufferAttribute(sizes, 1))

	const material = new THREE.PointsMaterial({ size: PARTICLE_SIZE, vertexColors: true })

	const stars = new THREE.Points(geometry, material)
	scene.add(stars)

	// LINES
	const lines: Map<number, THREE.Line> = new Map()
	let linesToDelete: Array<THREE.Object3D> = []
	const lineMaterial = new THREE.LineBasicMaterial({ linewidth: 100, vertexColors: true })
	let lineGeometry = new THREE.BufferGeometry()
	let linePositions = []
	let lineColors = []

	/******************** EVENT LISTENERS ********************/
	const blocker = document.getElementById("blocker")!
	const instructions = document.getElementById("instructions")!
	const crosshair = document.getElementById("crosshair")!

	instructions.addEventListener("click", function () {
		controls.lock()
	})

	controls.addEventListener("lock", function () {
		instructions.style.display = "none"
		blocker.style.display = "none"
		crosshair.style.display = ""
	})

	controls.addEventListener("unlock", function () {
		blocker.style.display = "block"
		instructions.style.display = ""
		crosshair.style.display = "none"
	})

	window.addEventListener("resize", () => {
		camera.aspect = window.innerWidth / window.innerHeight
		camera.updateProjectionMatrix()
		renderer.setSize(window.innerWidth, window.innerHeight)
	})

	window.addEventListener("pointerdown", (event: PointerEvent) => {
		toolActive = true
		if (drawingMode == DrawMode.PAINT) {
			lineGeometry = new THREE.BufferGeometry()
			linePositions = []
			lineColors = []
		}
	})

	window.addEventListener("pointerup", (event: PointerEvent) => {
		toolActive = false
		if (drawingMode == DrawMode.PAINT) {
			lineGeometry.setAttribute("position", new THREE.Float32BufferAttribute(linePositions, 3))
			lineGeometry.setAttribute("color", new THREE.Float32BufferAttribute(lineColors, 3))
			const line = new THREE.Line(lineGeometry, lineMaterial)
			lines.set(line.id, line)
			scene.add(line)
		} else if (drawingMode == DrawMode.ERASE) {
			linesToDelete.forEach((lineToDelete) => {
				lines.delete(lineToDelete.id)
				removeObject3D(lineToDelete)
			})
		}
	})

	window.addEventListener("keydown", (event: KeyboardEvent) => {
		switch (event.key) {
			case "w":
				moveForward = true
				break
			case "a":
				moveLeft = true
				break
			case "s":
				moveBackward = true
				break
			case "d":
				moveRight = true
				break
			case " ":
				if (canJump === true) velocity.y += 10
				canJump = false
				break
		}
	})

	window.addEventListener("keyup", (event: KeyboardEvent) => {
		switch (event.key) {
			case "w":
				moveForward = false
				break
			case "a":
				moveLeft = false
				break
			case "s":
				moveBackward = false
				break
			case "d":
				moveRight = false
				break
		}
	})

	window.addEventListener("keydown", (event: KeyboardEvent) => {
		if (!toolActive) {
			if (event.key == "Control") {
				toggleDrawMode()
				const modeText = document.getElementById("drawingMode")
				if (modeText) {
					modeText.innerHTML = "MODE: " + drawingModeString
				}
			} else if (event.key == "Shift") {
				toggleColorPalette()
				const brushColorText = document.getElementById("brushColor")
				if (brushColorText) {
					brushColorText.innerHTML = BRUSH_PALETTE[brushColorIndex].color
					brushColorText.style.color = BRUSH_PALETTE[brushColorIndex].hex
				}
			}
		}
	})

	/******************** ANIMATE LOOP ********************/
	function animate() {
		if (!playing) {
			player.requestPlay()
			playing = true
		}
		if (playing && !player.isPlaying) {
			currentPhraseIndex = 0
			player.requestPlay()
		}

		const currentPosition = player.timer.position
		if (phrases[currentPhraseIndex].endTime < currentPosition && phrases[(currentPhraseIndex + 1) % phrases.length].startTime < currentPosition) {
			currentPhraseIndex = (currentPhraseIndex + 1) % phrases.length
			// console.log(phrases[currentPhraseIndex].text)
		}
		stars.children.forEach((child) => {
			console.log(child)
		})

		const time: number = performance.now()
		stars.rotateY(-0.0001)
		lines.forEach((line) => {
			line.rotateY(-0.0001)
		})

		if (controls.isLocked === true) {
			movement(time)
			starInteractions()
		}
		prevTime = time

		renderer.render(scene, camera)
	}

	function starInteractions() {
		if (drawingMode === DrawMode.PAINT) {
			let geometry = stars.geometry
			const attributes = geometry.attributes

			raycaster.setFromCamera(new THREE.Vector2(), camera)
			const intersects = raycaster.intersectObject(stars, false)

			if (intersects.length > 0) {
				// console.log(intersects[0])
				linePositions.push(intersects[0].point.x, intersects[0].point.y, intersects[0].point.z)
				color.setHex(parseInt(BRUSH_PALETTE[brushColorIndex].hex.substring(1), 16))
				lineColors.push(color.r, color.g, color.b)
			}
		} else if (drawingMode === DrawMode.ERASE) {
			raycaster.setFromCamera(new THREE.Vector2(), camera)
			const intersects = raycaster.intersectObjects(Array.from(lines.values()), false)
			if (intersects.length > 0) {
				// console.log(intersects[0])
				linesToDelete.push(intersects[0].object)
			}
		}
	}

	function movement(time: number) {
		const delta = (time - prevTime) / 1000

		velocity.x -= velocity.x * 10.0 * delta
		velocity.z -= velocity.z * 10.0 * delta

		velocity.y -= 9.8 * 5.0 * delta // 5.0 = mass

		direction.z = Number(moveForward) - Number(moveBackward)
		direction.x = Number(moveRight) - Number(moveLeft)
		direction.normalize() // this ensures consistent movements in all directions

		if (moveForward || moveBackward) velocity.z -= direction.z * SPEED * delta
		if (moveLeft || moveRight) velocity.x -= direction.x * SPEED * delta

		controls.moveRight(-velocity.x * delta)
		controls.moveForward(-velocity.z * delta)

		controls.getObject().position.y += velocity.y * delta

		if (controls.getObject().position.y < 1.5) {
			velocity.y = 0
			controls.getObject().position.y = 1.5
			canJump = true
		}
	}

	/******************** MISC ********************/
	function removeObject3D(object3D: THREE.Object3D) {
		if (!(object3D instanceof THREE.Object3D)) return false

		// for better memory management and performance
		if (object3D.geometry) object3D.geometry.dispose()

		if (object3D.material) {
			if (object3D.material instanceof Array) {
				// for better memory management and performance
				object3D.material.forEach((material) => material.dispose())
			} else {
				// for better memory management and performance
				object3D.material.dispose()
			}
		}
		object3D.removeFromParent() // the parent might be the scene or another Object3D, but it is sure to be removed this way
		return true
	}
}

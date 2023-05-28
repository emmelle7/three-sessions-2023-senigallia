// Planets Gold + Noise
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

let scene
let geometry, groundGeom, goldGeometry
let material, material2, groundMate
let reflectionCube, dispMap
let animation
let onWindowResize
let noise3D
let controls

export function sketch() {
    console.log("Sketch launched")

    const p = {
        // planets 
        goldScale: 15,
        silverScale: 12,
        goldPos: new THREE.Vector3(-11, 0, 7),
        silverPos: new THREE.Vector3(11, 0, 0),
        goldSpeed: 0.5,
        silverSpeed: 0.8,
        silverRotationSpeed: 0.08,
        silverLight: false,
        // view
        lookAtCenter: new THREE.Vector3(0, 0, 0),
        cameraPosition: new THREE.Vector3(40, -5, 30),
        autoRotate: false,
        autoRotateSpeed: -10,
        camera: 45,
        // world
        backgroundColor: 0xff0000,
        floor: -10,
    }

    // other parameters
    let near = 0.2, far = 1000
    let shadowMapWidth = 2048, shadowMapHeight = 2048

    // CAMERA
    let camera = new THREE.PerspectiveCamera(p.camera, window.innerWidth / window.innerHeight, near, far)
    camera.position.copy(p.cameraPosition)
    camera.lookAt(p.lookAtCenter)

    // WINDOW RESIZE
    const onWindowResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight
        camera.updateProjectionMatrix()
        renderer.setSize(window.innerWidth, window.innerHeight)
    }
    window.addEventListener('resize', onWindowResize)

    // CONTROLS
    controls = new OrbitControls(camera, renderer.domElement)
    controls.enablePan = false
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.minDistance = 10
    controls.maxDistance = 25
    controls.maxPolarAngle = Math.PI / 2 + 0.2
    controls.minPolarAngle = Math.PI / 2 - 0.4
    controls.autoRotate = p.autoRotate
    controls.autoRotateSpeed = p.autoRotateSpeed
    controls.target = p.lookAtCenter

    // SCENE
    scene = new THREE.Scene()
    scene.background = new THREE.Color(p.backgroundColor)
    scene.fog = new THREE.Fog(scene.background, 5, 100)
    geometry = new THREE.SphereGeometry(1, 32, 32)

    // silver
    let silver
    material = new THREE.MeshStandardMaterial({
        color: 0xaaaaaa,
        envMap: cubeTextures[1].texture,
        envMapIntensity: 6,
        bumpMap: textures[0].texture,
        bumpScale: .1,
        roughness: 0.3,
        metalness: 1.0,
        fog: true,
    })
    silver = new THREE.Mesh(geometry, material)
    silver.position.x = 6
    silver.position.y = 1
    silver.scale.set(p.silverScale, p.silverScale, p.silverScale)
    silver.castShadow = true
    silver.receiveShadow = false
    scene.add(silver)

    // gold
    let gold
    dispMap = textures[1].texture
    material2 = new THREE.MeshStandardMaterial({
        color: 0xffff00,
        envMap: cubeTextures[1].texture,
        // map: cubeTextures[1].texture,
        envMapIntensity: 3,
        roughness: 0.2,
        metalness: 1.0,
        fog: true,
    })
    gold = new THREE.Mesh(geometry, material2)
    gold.position.y = 1
    gold.position.x = -3
    gold.scale.set(p.goldScale, p.goldScale, p.goldScale)
    gold.castShadow = true
    gold.receiveShadow = true
    scene.add(gold)

    // LIGHTS
    let lightS = new THREE.SpotLight(0x999999, 1, 0, Math.PI / 5, 0.5)
    lightS.position.set(1, 50, 0)
    lightS.target.position.set(0, 0, 0)
    lightS.castShadow = true
    lightS.shadow.camera.near = 5
    lightS.shadow.camera.far = 200
    lightS.shadow.bias = 0.0001
    lightS.shadow.mapSize.width = shadowMapWidth
    lightS.shadow.mapSize.height = shadowMapHeight
    scene.add(lightS)

    const light = new THREE.DirectionalLight(0xffffff, 1)
    light.position.set(-10, 3, 0)
    light.target.position.set(-5, 0, 0)
    // light.castShadow = true
    scene.add(light)
    const light2 = new THREE.DirectionalLight(0xffffff, .4)
    light2.position.set(-10, 3, 0)
    light2.target.position.set(-5, 0, 0)
    light2.castShadow = true
    scene.add(light2)
    const pointLight = new THREE.PointLight(0xffffff, 2)
    pointLight.position.set(20, 20, 20)
    scene.add(pointLight)
    const pointLight2 = new THREE.PointLight(0xffffff, .1)
    pointLight2.position.set(-30, 20, -20)
    scene.add(pointLight2)
    const ambientLight = new THREE.AmbientLight(0xffffff)
    scene.add(ambientLight)

    // let's make a ground
    groundGeom = new THREE.PlaneGeometry(20, 20)
    groundMate = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 1 })
    let ground = new THREE.Mesh(groundGeom, groundMate)
    ground.position.set(0, p.floor, 0)
    ground.rotation.x = - Math.PI / 2
    ground.scale.set(100, 100, 100)
    ground.castShadow = false
    ground.receiveShadow = true
    scene.add(ground)

    // NOISE
    noise3D = NOISE.createNoise3D()
    const t0 = Math.random() * 10

    // ANIMATE
    const animate = () => {
        if (showStats) stats.begin() // XXX

        const t = t0 + performance.now() * 0.0001

        // ANIMATION
        if (gold) {
            const t1 = t * p.goldSpeed
            gold.position.x = p.goldPos.x + noise3D(0, t1, 0) * 2
            gold.position.y = p.goldPos.y + noise3D(t1 + 4, 0, 0) * 1.5
            gold.position.z = p.goldPos.z + noise3D(0, 0, t1 + 8) * .4
        }
        if (silver) {
            const t2 = t * p.silverSpeed + 10
            silver.position.x = p.silverPos.x + noise3D(0, t2, 0) * 2
            silver.position.y = p.silverPos.y + noise3D(t2 + 4, 0, 0) * 1.5
            silver.position.z = p.silverPos.z + noise3D(0, 0, t2 + 8) * .4
            if (p.silverLight) pointLight.position.copy(silver.position)
            silver.rotation.y += noise3D(0, 0, t + 10) * p.silverRotationSpeed
        }
        // ...

        controls.update()
        renderer.render(scene, camera) // RENDER
        if (showStats) stats.end() // XXX

        animation = requestAnimationFrame(animate) // CIAK
    }
    animate()
}

export function dispose() {
    cancelAnimationFrame(animation)
    controls?.dispose()
    geometry?.dispose()
    goldGeometry?.dispose()
    groundGeom?.dispose()
    material?.dispose()
    material2?.dispose()
    groundMate?.dispose()
    reflectionCube?.dispose()
    dispMap?.dispose()
    noise3D = null
    window.removeEventListener('resize', onWindowResize)
}
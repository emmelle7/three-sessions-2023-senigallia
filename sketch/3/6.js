// Marching cubes + texture

import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { MarchingCubes } from 'three/addons/objects/MarchingCubes.js'

let scene
let effect
let groundGeom
let material, groundMate
let animation
let onWindowResize
let controls
let noise3D

export function sketch() {
    console.log("Sketch launched")

    const p = {
        // view
        speed: 0.01,
        noiseMode: true,
        noiseFlat: false,
        // spheres
        spheresNo: 50,
        spheresSize: .4,
        spheresDinamicSize: true,
        // view
        lookAtCenter: new THREE.Vector3(50+Math.random(50), -50, -25),
        cameraPosition: new THREE.Vector3(0, -50, -100-Math.random()*100),
        autoRotate: false,
        autoRotateSpeed: -0.02,
        camera: 45,
        // world
        floor: -300,
    }

    let time = 0
    const clock = new THREE.Clock()

    // CAMERA
    // other parameters
    let near = 0.2, far = 1000
    // let shadowMapWidth = 2048, shadowMapHeight = 2048

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
    // controls.minDistance = 10
    // controls.maxDistance = 25
    controls.maxPolarAngle = Math.PI / 2 + 0.2
    controls.minPolarAngle = Math.PI / 2 - 0.4
    controls.autoRotate = p.autoRotate
    controls.autoRotateSpeed = p.autoRotateSpeed
    controls.target = p.lookAtCenter
    controls.update()

    // SCENE
    scene = new THREE.Scene()
    scene.background = new THREE.Color(0x000000)
    scene.fog = new THREE.Fog(scene.background, 100, 1000)
    material = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        envMap: cubeTextures[5].texture,
        reflectivity: 0,
        transmission: 1,
        roughness: 0.0,
        metalness: 0.2,
        clearcoat: 0.2,
        clearcoatRoughness: 0.0,
        ior: 1.5,
        thickness: 50,
        fog: false,
        side: THREE.DoubleSide
    })
    // effect
    let effectController = {
        speed: p.speed,
        numBlobs: p.spheresNo,
        resolution: 77,
        isolation: 100,
        floor: false,
        wallx: false,
        wallz: false,
        dummy: function () { }
    }
    let resolution = effectController.resolution
    effect = new MarchingCubes(resolution, material, true, true, 100000)
    effect.position.set(0, 0, 0)
    effect.scale.set(100, 100, 100)
    effect.enableUvs = true
    effect.enableColors = false
    scene.add(effect)
    // this controls content of marching cubes voxel field
    noise3D = NOISE.createNoise3D()
    function updateCubes(object, time, numblobs, floor, wallx, wallz) {
        object.reset()
        // fill the field with some metaballs
        const subtract = 12;
        const strength = p.spheresSize//1.2 / ((Math.sqrt(numblobs) - 1) / 4 + 1) // proportional... 
        if (!p.noiseMode) {
            for (let i = 0; i < numblobs; i++) {
                const ballx = Math.sin(i + 1.26 * time * (1.03 + 0.5 * Math.cos(0.21 * i))) * 0.27 + 0.5
                let bally
                if (p.noiseFlat) bally = 0.5
                else bally = Math.abs(Math.cos(i + 1.12 * time * Math.cos(1.22 + 0.1424 * i))) * 0.77 // dip into the floor
                const ballz = Math.cos(i + 1.32 * time * 0.1 * Math.sin((0.92 + 0.53 * i))) * 0.27 + 0.5
                object.addBall(ballx, bally, ballz, strength, subtract)
            }
        } else {
            for (let i = 0; i < numblobs; i++) {
                const ballx = strength + noise3D(time + i, 0, 0) * (1 - strength * 2)
                let bally
                if (p.noiseFlat) bally = 0.5
                else bally = strength + noise3D(0, time + i, 0) * (1 - strength * 2)
                const ballz = strength + noise3D(0, 0, time + i) * (1 - strength * 2)
                object.addBall(ballx, bally, ballz, strength, subtract)
            }
        }
        if (floor) object.addPlaneY(2, 12)
        if (wallz) object.addPlaneZ(2, 12)
        if (wallx) object.addPlaneX(2, 12)
        object.update()
    }

    // LIGHTS
    let lightS = new THREE.SpotLight(0x999999, 1, 0, Math.PI / 5, .5)
    lightS.position.set(0, 50, 0)
    lightS.target.position.set(-25, -25, -25)
    // lightS.castShadow = true
    // lightS.shadow.camera.near = 5
    // lightS.shadow.camera.far = 400
    // lightS.shadow.bias = 0.0001
    // lightS.shadow.mapSize.width = shadowMapWidth
    // lightS.shadow.mapSize.height = shadowMapHeight
    scene.add(lightS)

    const light = new THREE.DirectionalLight(0xffffff, 1)
    light.position.set(-50, 50, 0)
    light.target.position.set(-25, -25, -25)
    // light.castShadow = true
    scene.add(light)
    // const light2 = new THREE.DirectionalLight(0xffffff, .4)
    // light.position.set(-10, 3, 0)
    // light.target.position.set(-5, 0, 0)
    // light.castShadow = true
    // scene.add(light2)
    const pointLight = new THREE.PointLight(0xffffff, 2)
    pointLight.position.set(40, 40, 40)
    scene.add(pointLight)
    const pointLight2 = new THREE.PointLight(0xffffff, .1)
    pointLight2.position.set(-30, 20, -20)
    scene.add(pointLight2)
    // const ambientLight = new THREE.AmbientLight(0xffffff)
    // scene.add(ambientLight)

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

    // ANIMATE
    const animate = () => {
        if (showStats) stats.begin() // XXX
        controls.update()

        // ANIMATION
        const delta = clock.getDelta();
        time += delta * effectController.speed * 0.5;
        // marching cubes
        if (effectController.resolution !== resolution) {
            resolution = effectController.resolution;
            effect.init(Math.floor(resolution));
        }
        if (effectController.isolation !== effect.isolation) {
            effect.isolation = effectController.isolation;
        }
        updateCubes(effect, time, effectController.numBlobs, effectController.floor, effectController.wallx, effectController.wallz);
        // ...
        renderer.render(scene, camera) // RENDER
        if (showStats) stats.end() // XXX
        animation = requestAnimationFrame(animate) // CIAK
    }
    animate()
}

export function dispose() {
    cancelAnimationFrame(animation)
    noise3D = null
    groundGeom?.dispose()
    groundMate?.dispose()
    controls?.dispose()
    material?.dispose()
    window.removeEventListener('resize', onWindowResize)
}

// Marching cubes + texture

import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { MarchingCubes } from 'three/addons/objects/MarchingCubes.js'

import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'

let scene
let effect
let groundGeom
let material, groundMate
let animation
let onWindowResize
let controls
let noise3D
let composer
let renderPass
let bloomPass

export function sketch() {
    console.log("Sketch launched")

    const p = {
        // view
        speed: 0.01,
        noiseMode: true,
        noiseFlat: false,
        // spheres
        spheresNo: 10 + Math.random() * 10,
        spheresSize: .4,
        spheresDinamicSize: true,
        // view
        lookAtCenter: new THREE.Vector3(-25, -25, -25),
        cameraPosition: new THREE.Vector3(0, -25, Math.random() * 75),
        autoRotate: true,
        autoRotateSpeed: -.05,
        camera: 45,
        // world
        floor: -50,
        // bloom
        exposure: -0.5,
        bloomStrength: 1,
        bloomThreshold: .5,
        bloomRadius: .2,
    }

    let time = Math.random() * 100
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
    // scene.fog = new THREE.Fog(scene.background, 100, 1000)

    const uniforms = {
        'fogDensity': { value: 0.0045 },
        'fogColor': { value: new THREE.Vector3(0, 0, 0) },
        'time': { value: 1.0 },
        'uvScale': { value: new THREE.Vector2(3.0, 1.0) },
        'texture1': { value: textures[4].texture },
        'texture2': { value: textures[5].texture }
    }
    uniforms['texture1'].value.wrapS = uniforms['texture1'].value.wrapT = THREE.RepeatWrapping
    uniforms['texture2'].value.wrapS = uniforms['texture2'].value.wrapT = THREE.RepeatWrapping
    material = new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: `uniform vec2 uvScale;
                        varying vec2 vUv;
                        void main() {
                            vUv = uvScale * uv;
                            vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
                            gl_Position = projectionMatrix * mvPosition;
                        }`,
        fragmentShader: `uniform float time;
                            uniform float fogDensity;
                            uniform vec3 fogColor;
                            uniform sampler2D texture1;
                            uniform sampler2D texture2;
                            varying vec2 vUv;
                            void main( void ) {
                                vec2 position = - 1.0 + 2.0 * vUv;
                                vec4 noise = texture2D( texture1, vUv );
                                vec2 T1 = vUv + vec2( 1.5, - 1.5 ) * time * 0.02;
                                vec2 T2 = vUv + vec2( - 0.5, 2.0 ) * time * 0.01;
                                T1.x += noise.x * 2.0;
                                T1.y += noise.y * 2.0;
                                T2.x -= noise.y * 0.2;
                                T2.y += noise.z * 0.2;
                                float p = texture2D( texture1, T1 * 2.0 ).a;
                                vec4 color = texture2D( texture2, T2 * 2.0 );
                                vec4 temp = color * ( vec4( p, p, p, p ) * 2.0 ) + ( color * color - 0.1 );
                                if( temp.r > 1.0 ) { temp.bg += clamp( temp.r - 2.0, 0.0, 100.0 ); }
                                if( temp.g > 1.0 ) { temp.rb += temp.g - 1.0; }
                                if( temp.b > 1.0 ) { temp.rg += temp.b - 1.0; }
                                gl_FragColor = temp;
                                float depth = gl_FragCoord.z / gl_FragCoord.w;
                                const float LOG2 = 1.442695;
                                float fogFactor = exp2( - fogDensity * fogDensity * depth * depth * LOG2 );
                                fogFactor = 1.0 - clamp( fogFactor, 0.0, 1.0 );
                                gl_FragColor = mix( gl_FragColor, vec4( fogColor, gl_FragColor.w ), fogFactor );
                            }`
    })
    material.uniforms['texture1'].value.wrapS = material.uniforms['texture1'].value.wrapT = THREE.RepeatWrapping
    material.uniforms['texture2'].value.wrapS = material.uniforms['texture2'].value.wrapT = THREE.RepeatWrapping

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
    // groundGeom = new THREE.PlaneGeometry(20, 20)
    // groundMate = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 1 })
    // let ground = new THREE.Mesh(groundGeom, groundMate)
    // ground.position.set(0, p.floor, 0)
    // ground.rotation.x = - Math.PI / 2
    // ground.scale.set(100, 100, 100)
    // ground.castShadow = false
    // ground.receiveShadow = true
    // scene.add(ground)

    // POST-PROCESSING
    composer = new EffectComposer(renderer)
    renderPass = new RenderPass(scene, camera)
    composer.addPass(renderPass)
    bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
    bloomPass.threshold = p.bloomThreshold
    bloomPass.strength = p.bloomStrength
    bloomPass.radius = p.bloomRadius
    composer.addPass(bloomPass)

    // ANIMATE
    const animate = () => {
        if (showStats) stats.begin() // XXX
        controls.update()

        // ANIMATION
        const delta = clock.getDelta()
        uniforms['time'].value += 0.7 * delta
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
        composer.render() // POST-PROCESSING
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
    composer?.dispose()
    renderPass?.dispose()
    bloomPass?.dispose()
    window.removeEventListener('resize', onWindowResize)
}

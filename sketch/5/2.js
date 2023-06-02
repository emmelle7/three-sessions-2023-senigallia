// Planets + DiffisionMap + Noise
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { LoopSubdivision } from 'three-subdivide'
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'

let scene
let geometry, groundGeom, parentGeometry
let material, material2, groundMate
let reflectionCube, dispMap
let animation
let onWindowResize
let noise3D
let controls
let composer
let renderPass
let bloomPass

export function sketch() {
    console.log("Sketch launched")

    const p = {
        // planets 
        parentScale: 4,
        childScale: 2,
        parentPos: new THREE.Vector3(-3, 1.5, 0),
        childPos: new THREE.Vector3(6, 1.5, 0),
        parentSpeed: 1,
        childSpeed: 1,
        parentRotationSpeed: 0.002,
        childLight: false,
        // view
        lookAtCenter: new THREE.Vector3(0, 1, 0),
        cameraPosition: new THREE.Vector3(-1.5, -5, -1),
        autoRotate: true,
        autoRotateSpeed: 0.7 + Math.random() * .2,
        camera: 35,
        // world
        floor: -5,
        // bloom
        exposure: -0.5,
        bloomStrength: 1,
        bloomThreshold: .5,
        bloomRadius: .2,
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
    scene.background = new THREE.Color(0x000000)
    scene.fog = new THREE.Fog(scene.background, 5, 100)
    geometry = new THREE.SphereGeometry(1, 32, 32)



    // parent
    const iterations = 4
    parentGeometry = LoopSubdivision.modify(geometry, iterations, {
        split: false,
        uvSmooth: false,
        preserveEdges: false,
        flatOnly: false,
        maxTriangles: 5000
    })
    mergeVertices(parentGeometry)
    let parent
    dispMap = textures[1].texture
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
    material2 = new THREE.ShaderMaterial({
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
    material2.uniforms['texture1'].value.wrapS = material2.uniforms['texture1'].value.wrapT = THREE.RepeatWrapping
    material2.uniforms['texture2'].value.wrapS = material2.uniforms['texture2'].value.wrapT = THREE.RepeatWrapping

    dispMap.wrapS = dispMap.wrapT = THREE.RepeatWrapping
    dispMap.repeat.set(1, 1)
    parent = new THREE.Mesh(parentGeometry, material2)
    parent.position.y = 1
    parent.position.x = -3
    parent.scale.set(p.parentScale, p.parentScale, p.parentScale)
    parent.castShadow = true
    parent.receiveShadow = true
    scene.add(parent)

    // child
    let child
    material = material2
    child = new THREE.Mesh(geometry, material)
    child.position.x = 6
    child.position.y = 1
    child.scale.set(p.childScale, p.childScale, p.childScale)
    child.castShadow = true
    child.receiveShadow = false
    scene.add(child)

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
    // const light2 = new THREE.DirectionalLight(0xffffff, .4)
    // light.position.set(-10, 3, 0)
    // light.target.position.set(-5, 0, 0)
    // light.castShadow = true
    // scene.add(light2)
    const pointLight = new THREE.PointLight(0xffffff, 2)
    pointLight.position.set(20, 20, 20)
    scene.add(pointLight)
    const pointLight2 = new THREE.PointLight(0xffffff, .1)
    pointLight2.position.set(-30, 20, -20)
    scene.add(pointLight2)
    // const ambientLight = new THREE.AmbientLight(0xffffff)
    // scene.add(ambientLight)

    // // let's make a ground
    // groundGeom = new THREE.PlaneGeometry(20, 20)
    // groundMate = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 1 })
    // let ground = new THREE.Mesh(groundGeom, groundMate)
    // ground.position.set(0, p.floor, 0)
    // ground.rotation.x = - Math.PI / 2
    // ground.scale.set(100, 100, 100)
    // ground.castShadow = false
    // ground.receiveShadow = true
    // scene.add(ground)

    // NOISE
    noise3D = NOISE.createNoise3D()
    const t0 = Math.random() * 10
    const clock = new THREE.Clock()

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

        const t = t0 + performance.now() * 0.0001

        const delta = clock.getDelta()
        uniforms['time'].value += 1 * delta

        // ANIMATION
        if (parent) {
            const t1 = t * p.parentSpeed
            parent.position.x = p.parentPos.x + noise3D(0, t1, 0) * .2
            parent.position.y = p.parentPos.y + noise3D(t1 + 4, 0, 0) * .3
            parent.position.z = p.parentPos.z + noise3D(0, 0, t1 + 8) * .1
            parent.rotation.y += noise3D(0, 0, t + 10) * p.parentRotationSpeed
        }
        if (child) {
            const t2 = t * p.childSpeed + 10
            child.position.x = p.childPos.x + noise3D(0, t2, 0) * .5
            child.position.y = p.childPos.y + noise3D(t2 + 4, 0, 0) * 1.5
            child.position.z = p.childPos.z + noise3D(0, 0, t2 + 8) * .4
            if (p.childLight) pointLight.position.copy(child.position)
        }
        // ...

        controls.update()
        renderer.render(scene, camera) // RENDER

        composer.render() // POST-PROCESSING
        if (showStats) stats.end() // XXX

        animation = requestAnimationFrame(animate) // CIAK
    }
    animate()
}

export function dispose() {
    cancelAnimationFrame(animation)
    controls?.dispose()
    geometry?.dispose()
    parentGeometry?.dispose()
    groundGeom?.dispose()
    material?.dispose()
    material2?.dispose()
    groundMate?.dispose()
    reflectionCube?.dispose()
    dispMap?.dispose()
    noise3D = null
    composer?.dispose()
    renderPass?.dispose()
    bloomPass?.dispose()
    window.removeEventListener('resize', onWindowResize)
}
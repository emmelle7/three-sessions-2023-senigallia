// Particles grid + Shader + Wave effect

import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'

let scene
let material
let geometry
let particles
let count = 0
let animation
let onWindowResize
let controls
let composer
let renderPass
let bloomPass

export function sketch() {
    console.log("Sketch launched")

    const p = {
        // toggle
        kind: 'freq1', // wave, freq1, freq2, ...
        scaleVol: false,
        modeY: true,
        // grid
        gridUnit: 5,
        rows: 40,
        columns: 40,
        // unit transformation
        micSensitivity: .1,
        pointMaxWidth: 6,
        pointMinWidth: 4,
        pointMaxY: 40,
        pointGroundY: 0,
        // view
        lookAtCenter: new THREE.Vector3(-2.5, -20, -2.6),
        cameraPosition: new THREE.Vector3(-2.5 + 40, Math.random() * 50 + 100, - Math.random() * 80 - 300),
        // lookAtCenter: new THREE.Vector3(-unit/2, 0, -unit/2),
        // cameraPosition: new THREE.Vector3(-unit/2, 100*, 0),
        autoRotate: true,
        autoRotateSpeed: - 1 + Math.random() * 2,
        camera: 35,
        // bloom
        exposure: 0.5,
        bloomStrength: 2,
        bloomThreshold: .2,
        bloomRadius: .7,
    }

    // other parameters
    let near = .2, far = 1000

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
    controls.autoRotate = p.autoRotate
    controls.autoRotateSpeed = p.autoRotateSpeed
    controls.target = p.lookAtCenter
    controls.update()

    // SCENE
    scene = new THREE.Scene()
    const numParticles = p.columns * p.rows
    const positions = new Float32Array(numParticles * 3)
    const scales = new Float32Array(numParticles)
    const positionsYToBe = new Float32Array(numParticles)
    const scalesToBe = new Float32Array(numParticles)
    let i = 0, j = 0
    for (let ix = 0; ix < p.columns; ix++) {
        for (let iy = 0; iy < p.rows; iy++) {
            positions[i] = ix * p.gridUnit - ((p.columns * p.gridUnit) / 2) // x
            positions[i + 1] = 0 // y
            positionsYToBe[j] = 0 // y To be
            positions[i + 2] = iy * p.gridUnit - ((p.rows * p.gridUnit) / 2) // z
            scales[j] = p.pointMinWidth;
            scalesToBe[j] = p.pointMinWidth // scale to be
            i += 3;
            j++;
        }
    }
    geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('scale', new THREE.BufferAttribute(scales, 1))
    material = new THREE.ShaderMaterial({
        uniforms: {
            color: { value: new THREE.Color(0xffffff) },
        },
        vertexShader: `attribute float scale;
                       void main() {
                           vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
                           gl_PointSize = scale * ( 300.0 / - mvPosition.z );
                           gl_Position = projectionMatrix * mvPosition;
                       }`,
        fragmentShader: `uniform vec3 color;
                         void main() {
                           if ( length( gl_PointCoord - vec2( 0.5, 0.5 ) ) > 0.475 ) discard;
                           gl_FragColor = vec4( color, 1.0 );
                         }`
    })
    particles = new THREE.Points(geometry, material);
    scene.add(particles);

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

        // ANIMATION
        const positions = particles.geometry.attributes.position.array;
        const scales = particles.geometry.attributes.scale.array;
        let i = 0, j = 0
        for (let ix = 0; ix < p.columns; ix++) {
            for (let iy = 0; iy < p.rows; iy++) {
                if (p.kind === 'wave') {
                    positions[i + 1] = (Math.sin((ix + count) * 0.3) * p.pointMaxY) + (Math.sin((iy + count) * 0.5) * p.pointMaxY)
                    scales[j] = (Math.sin((ix + count) * 0.3) + 1) * p.pointMaxWidth + (Math.sin((iy + count) * 0.5) + 1) * p.pointMaxWidth
                } else if (p.kind === 'freq1') {
                    const pointVol = MIC.mapSound(i / 3, numParticles, p.pointGroundY, p.pointMaxY)
                    if (p.modeY) {
                        positionsYToBe[j] = pointVol
                        if (positionsYToBe[j] > positions[i + 1]) {
                            positions[i + 1] += p.micSensitivity
                        } else if (positionsYToBe[j] < positions[i + 1]) {
                            positions[i + 1] -= p.micSensitivity
                        }
                    }
                    if (p.scaleVol) {
                        const pointVolScale = MIC.getHighsVol(p.pointMinWidth, p.pointMaxWidth)
                        scalesToBe[j] = pointVolScale
                        if (scalesToBe[j] > scales[j]) {
                            scales[j] += p.micSensitivity
                        } else if (scalesToBe[j] < scales[j]) {
                            scales[j] -= p.micSensitivity
                        }
                    } else {
                        const pointVolScale = MIC.mapSound(ix, p.columns, p.pointMinWidth, p.pointMaxWidth)
                        scalesToBe[j] = pointVolScale
                        if (scalesToBe[j] > scales[j]) {
                            scales[j] += p.micSensitivity / 3
                        } else if (scalesToBe[j] < scales[j]) {
                            scales[j] -= p.micSensitivity / 3
                        }
                    }
                } else if (p.kind === 'freq2') {
                    const pointVol = MIC.mapSound(ix, p.columns, p.pointGroundY, p.pointMaxY)
                    if (p.modeY) positions[i + 1] = pointVol
                    if (p.scaleVol) {
                        const pointVolScale = MIC.getVol(p.pointMinWidth, p.pointMaxWidth)
                        scales[j] = pointVolScale
                    } else {
                        const pointVolScale = MIC.mapSound(ix, p.columns, p.pointMinWidth, p.pointMaxWidth)
                        scales[j] = pointVolScale
                    }
                }
                i += 3
                j++
            }
        }
        particles.geometry.attributes.position.needsUpdate = true
        particles.geometry.attributes.scale.needsUpdate = true
        count += 0.1

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
    controls.dispose()
    geometry?.dispose()
    material?.dispose()
    composer?.dispose()
    renderPass?.dispose()
    bloomPass?.dispose()
    window.removeEventListener('resize', onWindowResize)
}
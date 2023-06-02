// import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
// import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
// import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'

let scene
let material, material2
let geometry
let animation
let onWindowResize
let slideShow
// let composer
// let renderPass
// let bloomPass
let images = []

export function sketch() {
    console.log("Sketch launched")

    // const p = {
    //     // bloom
    //     exposure: 0.0,
    //     bloomStrength: 0,
    //     bloomThreshold: .7,
    //     bloomRadius: .01,
    // }

    const loadImage = (path, format) => {
        const imageLoader = new THREE.TextureLoader()
        const url = path + format
        images.push(
            imageLoader.load(url, (image) => {
                console.log('loadedImage: ' + image)
            })
        )
    }

    for (let x = 1; x < 46; x++) {
        loadImage(`./assets/coda/img_${x}`, '.jpg')
    }

    const imageDefault = null
    const imageAspect = 1

    // CAMERA
    const camera = new THREE.OrthographicCamera(
        -1, 1, .5, -1, // bounds
        -10, 10
    )
    camera.position.z = 5

    // WINDOW RESIZE
    const onWindowResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight
        camera.updateProjectionMatrix()
        renderer.setSize(window.innerWidth, window.innerHeight)
        const viewportAspect = window.innerWidth / window.innerHeight
        if (imageAspect > viewportAspect) {
            shaderScale.set(imageAspect / viewportAspect, 1)
            shaderScale2.set(imageAspect / viewportAspect, 1)
        } else {
            shaderScale.set(1, viewportAspect / imageAspect)
            shaderScale2.set(1, viewportAspect / imageAspect)
        }
    }
    window.addEventListener('resize', onWindowResize)

    // SCENE
    scene = new THREE.Scene()
    geometry = new THREE.PlaneGeometry(1, 1)
    material = new THREE.ShaderMaterial({
        uniforms: {
            color: { value: new THREE.Color(0xffffff) },
            uTexture: { value: imageDefault },
            scale: { value: new THREE.Vector2(1, 1) }
        },
        vertexShader: `varying vec2 vUv;
                        void main(){
                            vUv = uv;
                            gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
                        }`,
        fragmentShader: `uniform sampler2D uTexture;
                         uniform vec2 scale;
                         varying vec2 vUv;
                         void main(){
                            // SCALE, background size cover
                            vec2 newUV = (vUv - vec2(0.5)) / scale + vec2(0.5);
                            gl_FragColor = texture2D(uTexture,newUV);
                         }`
    })
    material2 = material.clone()
    const shaderScale = material.uniforms.scale.value
    const shaderScale2 = material2.uniforms.scale.value
    slideShow = setInterval(() => {
        material.uniforms.uTexture.value = images[Math.round(Math.random() * images.length)]
        // console.log('image changed random')
    }, 6000)
    slideShow = setInterval(() => {
        material2.uniforms.uTexture.value = images[Math.round(Math.random() * images.length)]
        // console.log('image changed random')
    }, 3000)

    const mesh = new THREE.Mesh(geometry, material)
    const mesh2 = new THREE.Mesh(geometry, material2)
    scene.add(mesh)
    mesh.position.x = -.5
    scene.add(mesh2)
    mesh2.position.x += .5
    onWindowResize()

    // // POST-PROCESSING
    // composer = new EffectComposer(renderer)
    // renderPass = new RenderPass(scene, camera)
    // composer.addPass(renderPass)
    // bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
    // bloomPass.threshold = p.bloomThreshold
    // bloomPass.strength = p.bloomStrength
    // bloomPass.radius = p.bloomRadius
    // composer.addPass(bloomPass)

    // ANIMATE
    const animate = () => {
        if (showStats) stats.begin() // XXX

        // ANIMATION
        // ...
        // ...
        // bloomPass.strength = MIC.getHighsVol(1.5, 5)

        renderer.render(scene, camera) // RENDER
        // composer.render() // POST-PROCESSING
        if (showStats) stats.end() // XXX

        animation = requestAnimationFrame(animate) // CIAK
    }
    animate()
}

export function dispose() {
    cancelAnimationFrame(animation)
    if (slideShow) clearInterval(slideShow)
    geometry?.dispose()
    material?.dispose()
    material2?.dispose()
    if (images?.length) {
        for (let i = 0; i < images.length; i++) {
            images[i].dispose()
        }
        images = []
    }
    // composer?.dispose()
    // renderPass?.dispose()
    // bloomPass?.dispose()
    window.removeEventListener('resize', onWindowResize)
}
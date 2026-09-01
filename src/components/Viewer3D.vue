<template>
  <div ref="container" class="viewer3d"></div>
</template>

<script>
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'

export default {
  name: 'Viewer3D',
  data() {
    return {
      scene: null,
      camera: null,
      renderer: null,
      controls: null,
      animationId: null,
      initialCameraPosition: new THREE.Vector3(4, 3, 6),
    }
  },
  mounted() {
    this.initScene()
    this.buildTransformer()
    this.animate()
    window.addEventListener('resize', this.onWindowResize)
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.onWindowResize)
    cancelAnimationFrame(this.animationId)

    this.controls.dispose()
    this.scene.traverse((object) => {
      if (object.geometry) object.geometry.dispose()
      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach((m) => m.dispose())
        } else {
          object.material.dispose()
        }
      }
    })
    this.renderer.dispose()
    this.$refs.container.removeChild(this.renderer.domElement)
  },
  methods: {
    initScene() {
      const container = this.$refs.container

      this.scene = new THREE.Scene()
      this.scene.background = new THREE.Color(0xf2f2f2)

      this.camera = new THREE.PerspectiveCamera(
        50,
        container.clientWidth / container.clientHeight,
        0.1,
        1000
      )
      this.camera.position.copy(this.initialCameraPosition)

      this.renderer = new THREE.WebGLRenderer({ antialias: true })
      this.renderer.setPixelRatio(window.devicePixelRatio)
      this.renderer.setSize(container.clientWidth, container.clientHeight)
      container.appendChild(this.renderer.domElement)

      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
      this.scene.add(ambientLight)

      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
      directionalLight.position.set(5, 10, 7.5)
      this.scene.add(directionalLight)

      this.controls = new OrbitControls(this.camera, this.renderer.domElement)
      this.controls.target.set(0, 1.5, 0)
      this.controls.enableDamping = true
      this.controls.dampingFactor = 0.08
      this.controls.minDistance = 2
      this.controls.maxDistance = 20
      this.controls.update()
    },

    /**
     * Geometria procedural (poste + tanque + buchas) usada enquanto não há
     * um asset .glb/.gltf real do transformador (ver docs/PASSO_A_PASSO.md, seção 3).
     */
    buildTransformer() {
      const group = new THREE.Group()

      const poleMaterial = new THREE.MeshStandardMaterial({ color: 0x5c4a36, roughness: 0.9 })
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 4, 12), poleMaterial)
      pole.position.y = 2
      group.add(pole)

      const tankMaterial = new THREE.MeshStandardMaterial({ color: 0x008242, metalness: 0.3, roughness: 0.5 })
      const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 1.2, 24), tankMaterial)
      tank.position.y = 3
      group.add(tank)

      const finMaterial = new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.4, roughness: 0.5 })
      const finGeometry = new THREE.BoxGeometry(0.08, 1, 0.3)
      const finCount = 10
      for (let i = 0; i < finCount; i += 1) {
        const angle = (i / finCount) * Math.PI * 2
        const fin = new THREE.Mesh(finGeometry, finMaterial)
        fin.position.set(Math.cos(angle) * 0.65, 3, Math.sin(angle) * 0.65)
        fin.rotation.y = angle
        group.add(fin)
      }

      const bushingMaterial = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.3 })
      const bushingPositions = [-0.3, 0, 0.3]
      bushingPositions.forEach((x) => {
        const bushing = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.6, 12), bushingMaterial)
        bushing.position.set(x, 3.9, 0)
        group.add(bushing)
      })

      const armMaterial = new THREE.MeshStandardMaterial({ color: 0x3d3d3d, roughness: 0.7 })
      const arm = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.08, 0.08), armMaterial)
      arm.position.y = 3.9
      group.add(arm)

      const ground = new THREE.Mesh(
        new THREE.CircleGeometry(6, 32),
        new THREE.MeshStandardMaterial({ color: 0xd9d9d9, roughness: 1 })
      )
      ground.rotation.x = -Math.PI / 2
      group.add(ground)

      this.scene.add(group)
    },

    animate() {
      this.animationId = requestAnimationFrame(this.animate)
      this.controls.update()
      this.renderer.render(this.scene, this.camera)
    },

    onWindowResize() {
      const container = this.$refs.container
      this.camera.aspect = container.clientWidth / container.clientHeight
      this.camera.updateProjectionMatrix()
      this.renderer.setSize(container.clientWidth, container.clientHeight)
    },

    resetCamera() {
      this.camera.position.copy(this.initialCameraPosition)
      this.controls.target.set(0, 1.5, 0)
      this.controls.update()
    },
  },
}
</script>

<style scoped>
.viewer3d {
  width: 100%;
  height: 100%;
}

.viewer3d ::v-deep canvas {
  display: block;
}
</style>

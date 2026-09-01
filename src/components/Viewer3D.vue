<template>
  <div ref="container" class="viewer3d"></div>
</template>

<script>
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'

const TANK_WIDTH = 3.2 // X
const TANK_HEIGHT = 1.2 // Y
const TANK_DEPTH = 1.7 // Z
const BASE_HEIGHT = 0.15
const TANK_CENTER_Y = BASE_HEIGHT + TANK_HEIGHT / 2

export default {
  name: 'Viewer3D',
  data() {
    return {
      scene: null,
      camera: null,
      renderer: null,
      controls: null,
      animationId: null,
      initialCameraPosition: new THREE.Vector3(5.5, 3.6, 6.5),
      cameraTarget: new THREE.Vector3(0, TANK_CENTER_Y + 0.4, 0),
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
        45,
        container.clientWidth / container.clientHeight,
        0.1,
        1000
      )
      this.camera.position.copy(this.initialCameraPosition)

      this.renderer = new THREE.WebGLRenderer({ antialias: true })
      this.renderer.setPixelRatio(window.devicePixelRatio)
      this.renderer.setSize(container.clientWidth, container.clientHeight)
      container.appendChild(this.renderer.domElement)

      const ambientLight = new THREE.AmbientLight(0xffffff, 0.65)
      this.scene.add(ambientLight)

      const keyLight = new THREE.DirectionalLight(0xffffff, 0.75)
      keyLight.position.set(6, 10, 7)
      this.scene.add(keyLight)

      const fillLight = new THREE.DirectionalLight(0xffffff, 0.3)
      fillLight.position.set(-6, 4, -5)
      this.scene.add(fillLight)

      this.controls = new OrbitControls(this.camera, this.renderer.domElement)
      this.controls.target.copy(this.cameraTarget)
      this.controls.enableDamping = true
      this.controls.dampingFactor = 0.08
      this.controls.minDistance = 2.5
      this.controls.maxDistance = 25
      this.controls.maxPolarAngle = Math.PI / 2 - 0.02
      this.controls.update()
    },

    /**
     * Geometria procedural de um transformador de potência (tanque com aletas
     * de radiador, buchas de AT/BT e tanque de expansão/conservador), montada
     * a partir da referência em docs/transformador-de-poder-de-alta-tensão-55054468.webp
     * enquanto não há um asset .glb/.gltf real (ver docs/PASSO_A_PASSO.md, seção 3).
     */
    buildTransformer() {
      const group = new THREE.Group()

      const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xc7ccd1, metalness: 0.4, roughness: 0.45 })
      const finMaterial = new THREE.MeshStandardMaterial({ color: 0xb6bbc0, metalness: 0.45, roughness: 0.4 })
      const darkMetalMaterial = new THREE.MeshStandardMaterial({ color: 0x35383c, metalness: 0.6, roughness: 0.4 })
      const porcelainMaterial = new THREE.MeshStandardMaterial({ color: 0x8a6f5c, roughness: 0.55 })
      const terminalMaterial = new THREE.MeshStandardMaterial({ color: 0xcfd3d6, metalness: 0.8, roughness: 0.25 })

      group.add(this.buildBaseRails(darkMetalMaterial))
      group.add(this.buildTankBody(bodyMaterial))
      group.add(this.buildRadiatorFins(finMaterial))
      group.add(this.buildTopLid(bodyMaterial, darkMetalMaterial))
      group.add(this.buildBushingArray(porcelainMaterial, terminalMaterial, darkMetalMaterial))
      group.add(this.buildConservatorAssembly(bodyMaterial, darkMetalMaterial))
      group.add(this.buildValve(darkMetalMaterial))
      group.add(this.buildWarningSign())

      const ground = new THREE.Mesh(
        new THREE.CircleGeometry(50, 32),
        new THREE.MeshStandardMaterial({ color: 0xd9d9d9, roughness: 1 })
      )
      ground.rotation.x = -Math.PI / 2
      group.add(ground)

      this.scene.add(group)
    },

    buildBaseRails(material) {
      const group = new THREE.Group()
      const railGeometry = new THREE.BoxGeometry(TANK_WIDTH + 0.5, BASE_HEIGHT, 0.22)
      ;[-1, 1].forEach((side) => {
        const rail = new THREE.Mesh(railGeometry, material)
        rail.position.set(0, BASE_HEIGHT / 2, (side * (TANK_DEPTH - 0.3)) / 2)
        group.add(rail)
      })
      return group
    },

    buildTankBody(material) {
      const tank = new THREE.Mesh(
        new THREE.BoxGeometry(TANK_WIDTH, TANK_HEIGHT, TANK_DEPTH),
        material
      )
      tank.position.y = TANK_CENTER_Y
      return tank
    },

    buildRadiatorFins(material) {
      const group = new THREE.Group()
      const finHeight = TANK_HEIGHT * 0.8
      const finY = TANK_CENTER_Y
      const finDepth = 0.16

      const frontCount = 16
      const frontGeometry = new THREE.BoxGeometry(0.045, finHeight, finDepth)
      const frontSpacing = (TANK_WIDTH - 0.3) / frontCount
      for (let i = 0; i < frontCount; i += 1) {
        const fin = new THREE.Mesh(frontGeometry, material)
        fin.position.set(-TANK_WIDTH / 2 + 0.3 + i * frontSpacing, finY, TANK_DEPTH / 2 + finDepth / 2)
        group.add(fin)
      }

      const sideCount = 8
      const sideGeometry = new THREE.BoxGeometry(finDepth, finHeight, 0.09)
      const sideSpacing = (TANK_DEPTH - 0.2) / sideCount
      for (let i = 0; i < sideCount; i += 1) {
        const fin = new THREE.Mesh(sideGeometry, material)
        fin.position.set(-TANK_WIDTH / 2 - finDepth / 2, finY, -TANK_DEPTH / 2 + 0.15 + i * sideSpacing)
        group.add(fin)
      }

      return group
    },

    buildTopLid(bodyMaterial, boltMaterial) {
      const group = new THREE.Group()
      const lidY = BASE_HEIGHT + TANK_HEIGHT

      const lid = new THREE.Mesh(
        new THREE.BoxGeometry(TANK_WIDTH + 0.08, 0.06, TANK_DEPTH + 0.08),
        bodyMaterial
      )
      lid.position.y = lidY + 0.03
      group.add(lid)

      const boltGeometry = new THREE.CylinderGeometry(0.018, 0.018, 0.03, 8)
      const boltsPerSide = 10
      const halfW = TANK_WIDTH / 2
      const halfD = TANK_DEPTH / 2
      for (let i = 0; i < boltsPerSide; i += 1) {
        const t = i / (boltsPerSide - 1)
        const x = -halfW + t * TANK_WIDTH
        ;[-halfD, halfD].forEach((z) => {
          const bolt = new THREE.Mesh(boltGeometry, boltMaterial)
          bolt.position.set(x, lidY + 0.07, z)
          group.add(bolt)
        })
      }

      return group
    },

    /**
     * Perfil de uma bucha de porcelana (isolador) revolvido em torno do eixo Y,
     * simulando os discos ("saias") empilhados vistos na imagem de referência.
     */
    buildBushing(height, shedCount, shaftRadius, shedRadius, porcelainMaterial, terminalMaterial) {
      const group = new THREE.Group()
      const stepY = height / shedCount
      const points = [new THREE.Vector2(shaftRadius * 0.6, 0)]
      for (let i = 0; i < shedCount; i += 1) {
        const yBase = i * stepY
        points.push(new THREE.Vector2(shaftRadius, yBase))
        points.push(new THREE.Vector2(shedRadius, yBase + stepY * 0.22))
        points.push(new THREE.Vector2(shedRadius, yBase + stepY * 0.34))
        points.push(new THREE.Vector2(shaftRadius, yBase + stepY * 0.5))
      }
      points.push(new THREE.Vector2(shaftRadius, height))

      const lathe = new THREE.Mesh(new THREE.LatheGeometry(points, 16), porcelainMaterial)
      group.add(lathe)

      const cap = new THREE.Mesh(
        new THREE.CylinderGeometry(shaftRadius * 1.1, shaftRadius * 1.1, height * 0.08, 12),
        terminalMaterial
      )
      cap.position.y = height + (height * 0.08) / 2
      group.add(cap)

      const lug = new THREE.Mesh(new THREE.TorusGeometry(shaftRadius * 0.9, shaftRadius * 0.25, 8, 16), terminalMaterial)
      lug.position.y = height + height * 0.08
      lug.rotation.x = Math.PI / 2
      group.add(lug)

      return group
    },

    buildBushingArray(porcelainMaterial, terminalMaterial, clampMaterial) {
      const group = new THREE.Group()
      const lidY = BASE_HEIGHT + TANK_HEIGHT + 0.06

      const hvXs = [-0.95, 0, 0.95]
      const lvXs = [-0.75, 0, 0.75]
      const hvZ = -0.35
      const lvZ = 0.25

      hvXs.forEach((x, i) => {
        const hv = this.buildBushing(1.0, 7, 0.055, 0.16, porcelainMaterial, terminalMaterial)
        hv.position.set(x, lidY, hvZ)
        group.add(hv)

        const lv = this.buildBushing(0.55, 5, 0.05, 0.13, porcelainMaterial, terminalMaterial)
        lv.position.set(lvXs[i], lidY, lvZ)
        group.add(lv)

        const clamp = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.07), clampMaterial)
        clamp.position.set((x + lvXs[i]) / 2, lidY + 0.4, (hvZ + lvZ) / 2)
        clamp.rotation.y = Math.PI / 4
        group.add(clamp)
      })

      return group
    },

    buildConservatorAssembly(bodyMaterial, darkMetalMaterial) {
      const group = new THREE.Group()
      const radius = 0.32
      const length = 1.5
      const supportX = TANK_WIDTH / 2 - 0.4
      const conservatorY = BASE_HEIGHT + TANK_HEIGHT + 0.95
      const conservatorZ = 0.15

      const support = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, conservatorY - (BASE_HEIGHT + TANK_HEIGHT), 0.3),
        darkMetalMaterial
      )
      support.position.set(supportX, (BASE_HEIGHT + TANK_HEIGHT + conservatorY) / 2, conservatorZ)
      group.add(support)

      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 8), darkMetalMaterial)
      pipe.position.set(supportX, BASE_HEIGHT + TANK_HEIGHT + 0.25, TANK_DEPTH / 2 - 0.05)
      pipe.rotation.z = Math.PI / 10
      group.add(pipe)

      const conservator = new THREE.Group()
      const body = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 24), bodyMaterial)
      conservator.add(body)

      const cap = new THREE.Mesh(new THREE.CylinderGeometry(radius * 1.06, radius * 1.06, 0.05, 24), bodyMaterial)
      cap.position.y = length / 2
      conservator.add(cap)

      const boltGeometry = new THREE.CylinderGeometry(0.018, 0.018, 0.03, 8)
      const boltCount = 14
      for (let i = 0; i < boltCount; i += 1) {
        const angle = (i / boltCount) * Math.PI * 2
        const bolt = new THREE.Mesh(boltGeometry, darkMetalMaterial)
        bolt.position.set(Math.cos(angle) * radius * 0.9, length / 2 + 0.03, Math.sin(angle) * radius * 0.9)
        conservator.add(bolt)
      }

      const seam = new THREE.Mesh(new THREE.BoxGeometry(radius * 0.18, length * 0.75, 0.03), darkMetalMaterial)
      seam.position.set(0, 0, radius * 0.97)
      conservator.add(seam)

      conservator.rotation.z = -Math.PI / 2
      conservator.position.set(supportX + 0.35, conservatorY, conservatorZ)
      group.add(conservator)

      return group
    },

    buildValve(material) {
      const group = new THREE.Group()
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.18, 10), material)
      body.rotation.z = Math.PI / 2
      body.position.set(-TANK_WIDTH / 2 - 0.05, BASE_HEIGHT + 0.18, TANK_DEPTH / 2 - 0.15)
      group.add(body)

      const handle = new THREE.Mesh(
        new THREE.BoxGeometry(0.03, 0.14, 0.03),
        new THREE.MeshStandardMaterial({ color: 0xb0332b, metalness: 0.3, roughness: 0.5 })
      )
      handle.position.set(-TANK_WIDTH / 2 - 0.14, BASE_HEIGHT + 0.18, TANK_DEPTH / 2 - 0.15)
      group.add(handle)

      return group
    },

    buildWarningSign() {
      const sign = new THREE.Mesh(
        new THREE.PlaneGeometry(0.18, 0.18),
        new THREE.MeshStandardMaterial({ color: 0xf4c430, side: THREE.DoubleSide })
      )
      sign.position.set(TANK_WIDTH / 2 - 0.3, BASE_HEIGHT + TANK_HEIGHT * 0.35, TANK_DEPTH / 2 + 0.01)
      return sign
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
      this.controls.target.copy(this.cameraTarget)
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

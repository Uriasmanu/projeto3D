<template>
  <div ref="container" class="viewer3d"></div>
</template>

<script>
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'

const TANK_WIDTH = 3.2 // X
const TANK_HEIGHT = 1.8 // Y
const TANK_DEPTH = 1.7 // Z
const BASE_HEIGHT = 0.15
const TANK_CENTER_Y = BASE_HEIGHT + TANK_HEIGHT / 2
// espessura da tampa e o quanto ela sobra do tanque em X/Z. Buchas, vigas e o
// conjunto do conservador se apoiam em BASE_HEIGHT + TANK_HEIGHT + LID_HEIGHT,
// entao engrossar a tampa sobe tudo o que fica em cima dela.
const LID_HEIGHT = 0.1
const LID_OVERHANG = 0.16
// quanto as maos francesas da face direita descem a partir do topo da tampa
const BRACKET_DROP = 0.42
// nome do filho que recebe o realce sozinho, quando a peca tem estrutura de apoio
const HIGHLIGHT_TARGET = 'highlight'

export default {
  name: 'Viewer3D',
  data() {
    return {
      scene: null,
      camera: null,
      renderer: null,
      controls: null,
      animationId: null,
      initialCameraPosition: new THREE.Vector3(4.7, 3.1, 5.6),
      cameraTarget: new THREE.Vector3(0, TANK_CENTER_Y + 0.4, 0),
      // registro das peças: { id, object, anchor } — usado para projetar a
      // posição de cada peça na tela e ligar os cards por linhas de chamada
      parts: [],
      canvasRect: null,
      lastAnchors: '',
      highlightMaterials: new Map(),
      highlightedId: null,
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
    this.clearHighlight()
    this.highlightMaterials.forEach((material) => material.dispose())
    this.highlightMaterials.clear()
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
      // tampa um tom acima do corpo, para o relevo dela se separar do tanque
      const lidMaterial = new THREE.MeshStandardMaterial({ color: 0xd7dbdf, metalness: 0.4, roughness: 0.45 })
      const porcelainMaterial = new THREE.MeshStandardMaterial({ color: 0x8a6f5c, roughness: 0.55 })
      const terminalMaterial = new THREE.MeshStandardMaterial({ color: 0xcfd3d6, metalness: 0.8, roughness: 0.25 })
      // metal da valvula: um tom acima do corpo. Metalness baixo de proposito —
      // sem environment map, metalness alto renderiza escuro demais.
      const valveMaterial = new THREE.MeshStandardMaterial({ color: 0xd9dde1, metalness: 0.35, roughness: 0.4 })

      /*
       * O ponto de chamada de cada peça é o centro da sua caixa envolvente. Em
       * peças grandes e concêntricas (tanque, radiadores e tampa compartilham
       * praticamente o mesmo centro) esse ponto é deslocado para uma região
       * característica da peça, senão os marcadores se sobrepõem na tela.
       */
      const register = (id, object, offset) => {
        object.name = id
        group.add(object)
        this.parts.push({ id, object, offset: offset || null, anchor: new THREE.Vector3() })
      }

      register('base', this.buildBaseRails(bodyMaterial))
      register('tanque', this.buildTankBody(bodyMaterial),
        new THREE.Vector3(TANK_WIDTH * 0.3, -TANK_HEIGHT * 0.15, TANK_DEPTH * 0.5))
      register('radiadores', this.buildRadiatorFins(finMaterial),
        new THREE.Vector3(-TANK_WIDTH * 0.42, 0, TANK_DEPTH * 0.35))
      register('tampa', this.buildTopLid(lidMaterial),
        new THREE.Vector3(TANK_WIDTH * 0.3, 0, -TANK_DEPTH * 0.25))
      register('buchas', this.buildBushingArray(porcelainMaterial, terminalMaterial),
        new THREE.Vector3(-TANK_WIDTH * 0.2, 0, 0))
      register('conservador', this.buildConservatorAssembly(bodyMaterial),
        new THREE.Vector3(TANK_WIDTH * 0.11, TANK_HEIGHT * 0.15, 0))
      register('valvula', this.buildValve(valveMaterial))

      const ground = new THREE.Mesh(
        new THREE.CircleGeometry(50, 32),
        new THREE.MeshStandardMaterial({ color: 0xd9d9d9, roughness: 1 })
      )
      ground.rotation.x = -Math.PI / 2
      group.add(ground)

      this.scene.add(group)

      // as matrizes precisam estar atualizadas antes de medir a caixa de cada peça
      this.scene.updateMatrixWorld(true)
      const box = new THREE.Box3()
      this.parts.forEach((part) => {
        box.setFromObject(part.object)
        box.getCenter(part.anchor)
        if (part.offset) part.anchor.add(part.offset)
      })
    },

    /**
     * Duas vigas do skid atravessando o tanque no sentido frente/fundo (eixo Z),
     * recuadas das pontas e sobrando para fora das duas faces, como na imagem
     * de referência. Usam o cinza do corpo — na referência o skid é pintado
     * junto com o tanque, não é metal escuro.
     */
    buildBaseRails(material) {
      const group = new THREE.Group()
      const railGeometry = new THREE.BoxGeometry(0.22, BASE_HEIGHT, TANK_DEPTH + 0.7)
      ;[-1, 1].forEach((side) => {
        const rail = new THREE.Mesh(railGeometry, material)
        rail.position.set(side * TANK_WIDTH * 0.3, BASE_HEIGHT / 2, 0)
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
      /*
       * Aletas de altura cheia: as maos francesas ficam fora da faixa de Z que
       * elas ocupam, entao nao ha risco de uma atravessar a outra. Todas tem a
       * mesma secao nas quatro faces: finThickness por finDepth de saliencia.
       */
      const finHeight = TANK_HEIGHT * 0.8
      const finY = TANK_CENTER_Y
      const finDepth = 0.22
      const finThickness = 0.035

      /*
       * Barras coletoras: uma no topo e outra na base de cada fileira, ligando
       * a ponta de fora de todas as aletas daquela face. Ficam so na aresta
       * externa (headerSize de secao, recuadas meia secao para nao passar da
       * ponta), entao os vaos entre as aletas continuam vazados.
       */
      const headerSize = 0.022
      const headerYs = [
        finY - finHeight / 2 + headerSize / 2,
        finY + finHeight / 2 - headerSize / 2,
      ]

      // faces longas (frente e fundo): o sinal de `face` espelha o Z
      const frontCount = 16
      const frontGeometry = new THREE.BoxGeometry(finThickness, finHeight, finDepth)
      const frontSpacing = (TANK_WIDTH - 0.3) / frontCount
      ;[-1, 1].forEach((face) => {
        for (let i = 0; i < frontCount; i += 1) {
          const fin = new THREE.Mesh(frontGeometry, material)
          fin.position.set(
            -TANK_WIDTH / 2 + 0.3 + i * frontSpacing,
            finY,
            face * (TANK_DEPTH / 2 + finDepth / 2)
          )
          group.add(fin)
        }

        const firstX = -TANK_WIDTH / 2 + 0.3
        const lastX = firstX + (frontCount - 1) * frontSpacing
        const frontHeaderGeometry = new THREE.BoxGeometry(
          lastX - firstX + finThickness,
          headerSize,
          headerSize
        )
        headerYs.forEach((y) => {
          const header = new THREE.Mesh(frontHeaderGeometry, material)
          header.position.set(
            (firstX + lastX) / 2,
            y,
            face * (TANK_DEPTH / 2 + finDepth - headerSize / 2)
          )
          group.add(header)
        })
      })

      // faces curtas (esquerda e direita): o sinal de `face` espelha o X
      const sideCount = 8
      const sideGeometry = new THREE.BoxGeometry(finDepth, finHeight, finThickness)
      const sideSpacing = (TANK_DEPTH - 0.2) / sideCount
      ;[-1, 1].forEach((face) => {
        for (let i = 0; i < sideCount; i += 1) {
          const fin = new THREE.Mesh(sideGeometry, material)
          fin.position.set(
            face * (TANK_WIDTH / 2 + finDepth / 2),
            finY,
            -TANK_DEPTH / 2 + 0.15 + i * sideSpacing
          )
          group.add(fin)
        }

        const firstZ = -TANK_DEPTH / 2 + 0.15
        const lastZ = firstZ + (sideCount - 1) * sideSpacing
        const sideHeaderGeometry = new THREE.BoxGeometry(
          headerSize,
          headerSize,
          lastZ - firstZ + finThickness
        )
        headerYs.forEach((y) => {
          const header = new THREE.Mesh(sideHeaderGeometry, material)
          header.position.set(
            face * (TANK_WIDTH / 2 + finDepth - headerSize / 2),
            y,
            (firstZ + lastZ) / 2
          )
          group.add(header)
        })
      })

      return group
    },

    buildTopLid(bodyMaterial) {
      const group = new THREE.Group()
      const lidY = BASE_HEIGHT + TANK_HEIGHT

      const lid = new THREE.Mesh(
        new THREE.BoxGeometry(TANK_WIDTH + LID_OVERHANG, LID_HEIGHT, TANK_DEPTH + LID_OVERHANG),
        bodyMaterial
      )
      lid.position.y = lidY + LID_HEIGHT / 2
      group.add(lid)

      /*
       * Parafusos nas quatro bordas. Os das laterais curtas usam o mesmo passo
       * das bordas longas e pulam o primeiro e o ultimo, senao repetiriam os
       * parafusos de canto que os lados longos ja colocaram.
       */
      const boltGeometry = new THREE.CylinderGeometry(0.018, 0.018, 0.03, 8)
      const boltsPerSide = 10
      const halfW = TANK_WIDTH / 2
      const halfD = TANK_DEPTH / 2
      const boltY = lidY + LID_HEIGHT + 0.01
      const boltStep = TANK_WIDTH / (boltsPerSide - 1)
      const boltsPerEnd = Math.round(TANK_DEPTH / boltStep) + 1

      for (let i = 1; i < boltsPerEnd - 1; i += 1) {
        const z = -halfD + (i / (boltsPerEnd - 1)) * TANK_DEPTH
        ;[-halfW, halfW].forEach((x) => {
          const bolt = new THREE.Mesh(boltGeometry, bodyMaterial)
          bolt.position.set(x, boltY, z)
          group.add(bolt)
        })
      }

      for (let i = 0; i < boltsPerSide; i += 1) {
        const t = i / (boltsPerSide - 1)
        const x = -halfW + t * TANK_WIDTH
        ;[-halfD, halfD].forEach((z) => {
          const bolt = new THREE.Mesh(boltGeometry, bodyMaterial)
          bolt.position.set(x, boltY, z)
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

    buildBushingArray(porcelainMaterial, terminalMaterial) {
      const group = new THREE.Group()
      const lidY = BASE_HEIGHT + TANK_HEIGHT + LID_HEIGHT

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
      })

      return group
    },

    buildConservatorAssembly(bodyMaterial) {
      const group = new THREE.Group()
      const radius = 0.35
      const beamWidth = 0.3
      /*
       * As vigas — e com elas as chapas verticais e as maos francesas — ficam
       * encostadas na borda da tampa. Assim passam alem da ultima aleta do
       * radiador e nenhuma das duas pecas atravessa a outra.
       */
      const beamZ = TANK_DEPTH / 2 - beamWidth / 2 + LID_OVERHANG / 2
      // o cilindro tem que passar das duas chapas para parecer sustentado
      const length = beamZ * 2 + 0.34
      /*
       * Deslocamento do conjunto (chapa de base, flange, tubo e cilindro) para
       * a direita. supportX alimenta as tres primeiras e conservatorX deriva
       * dele, entao mexer aqui move tudo junto.
       */
      const assemblyShiftX = 0.24
      const supportX = TANK_WIDTH / 2 - 0.4 + assemblyShiftX
      const conservatorY = BASE_HEIGHT + TANK_HEIGHT + 0.75
      const conservatorZ = 0

      // centro do cilindro deitado — destino do tubo de ligacao
      const conservatorX = supportX + 0.35

      /*
       * Tubo de ligacao tanque -> conservador. A curva sobe da tampa e se
       * inclina ate o centro do cilindro; TubeGeometry a extruda como um duto
       * de secao circular, dando o cotovelo arredondado da referencia.
       * O ultimo ponto entra um pouco no cilindro para nao aparecer emenda.
       */
      const pipeCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(supportX, BASE_HEIGHT + TANK_HEIGHT + LID_HEIGHT, conservatorZ),
        new THREE.Vector3(supportX, conservatorY - 0.55, conservatorZ),
        new THREE.Vector3(conservatorX - 0.12, conservatorY - 0.35, conservatorZ),
        new THREE.Vector3(conservatorX, conservatorY - radius + 0.06, conservatorZ),
      ])
      const pipe = new THREE.Mesh(
        new THREE.TubeGeometry(pipeCurve, 32, 0.075, 12, false),
        bodyMaterial
      )
      group.add(pipe)

      /*
       * Acabamento do pe do tubo, empilhado sobre a tampa: chapa quadrada
       * rente a tampa, flange circular achatada em cima dela e a coroa de
       * parafusos da flange.
       */
      const lidTop = BASE_HEIGHT + TANK_HEIGHT + LID_HEIGHT

      const plateSize = 0.44
      const plateHeight = 0.08
      const basePlate = new THREE.Mesh(
        new THREE.BoxGeometry(plateSize, plateHeight, plateSize),
        bodyMaterial
      )
      basePlate.position.set(supportX, lidTop + plateHeight / 2, conservatorZ)
      group.add(basePlate)

      /*
       * Duas vigas rentes a tampa, uma de cada lado da chapa quadrada e cada
       * uma junto a sua borda da tampa, correndo no eixo X ate a ponta direita
       * do transformador. Na extremidade esquerda de cada viga vao 4 parafusos
       * em 2x2 — o desenho da face 4 do dado.
       */
      const beamHeight = 0.04
      // deslocamento do par de vigas no eixo X — sobe este valor para leva-las
      // mais para a direita; a altura nao muda, seguem rentes a tampa
      const beamShiftX = 0.25
      const beamStartX = TANK_WIDTH * 0.30 + beamShiftX
      const beamEndX = TANK_WIDTH / 2 + 0.20 + beamShiftX
      const beamLength = beamEndX - beamStartX
      const beamBoltGeometry = new THREE.CylinderGeometry(0.014, 0.014, 0.018, 8)
      const boltSpreadX = 0.16
      const boltSpreadZ = beamWidth * 0.45

      const boltCenterX = beamStartX + 0.16

      /*
       * Chapa vertical em pe sobre cada viga: vai do fim dos parafusos ate a
       * ponta da viga e sobe do topo dela ate a altura do CENTRO do cilindro.
       * Assim entra por baixo do conservador e para no meio dele, sem furar o
       * topo — a leitura e de duas chapas segurando o cilindro.
       */
      const braceThickness = 0.06
      const braceStartX = boltCenterX + boltSpreadX / 0.8
      const braceLength = beamEndX - braceStartX
      const braceBottomY = lidTop + beamHeight
      const braceHeight = conservatorY - braceBottomY

      ;[-1, 1].forEach((side) => {
        const z = side * beamZ

        const beam = new THREE.Mesh(
          new THREE.BoxGeometry(beamLength, beamHeight, beamWidth),
          bodyMaterial
        )
        beam.position.set((beamStartX + beamEndX) / 2, lidTop + beamHeight / 2, z)
        group.add(beam)

        ;[-1, 1].forEach((dx) => {
          ;[-1, 1].forEach((dz) => {
            const bolt = new THREE.Mesh(beamBoltGeometry, bodyMaterial)
            bolt.position.set(
              boltCenterX + (dx * boltSpreadX) / 2,
              lidTop + beamHeight + 0.009,
              z + (dz * boltSpreadZ) / 2
            )
            group.add(bolt)
          })
        })

        const brace = new THREE.Mesh(
          new THREE.BoxGeometry(braceLength, braceHeight, braceThickness),
          bodyMaterial
        )
        brace.position.set(
          (braceStartX + beamEndX) / 2,
          braceBottomY + braceHeight / 2,
          z
        )
        group.add(brace)
      })

      /*
       * Duas maos francesas na face direita do tanque, uma sob cada viga.
       * Triangulo retangulo com o canto reto no alto: cateto horizontal
       * correndo por baixo do balanco da viga ate a ponta dela, cateto
       * vertical descendo colado na face, hipotenusa fechando os dois.
       * O Shape e desenhado no plano XY e o ExtrudeGeometry lhe da a
       * espessura em Z, a mesma das chapas.
       */
      const cornerOut = beamEndX - TANK_WIDTH / 2
      const cornerShape = new THREE.Shape()
      cornerShape.moveTo(0, 0)
      cornerShape.lineTo(cornerOut, 0)
      cornerShape.lineTo(0, -BRACKET_DROP)
      cornerShape.closePath()
      const cornerGeometry = new THREE.ExtrudeGeometry(cornerShape, {
        depth: braceThickness,
        bevelEnabled: false,
      })

      ;[-1, 1].forEach((side) => {
        const corner = new THREE.Mesh(cornerGeometry, bodyMaterial)
        corner.position.set(
          TANK_WIDTH / 2,
          lidTop,
          side * beamZ - braceThickness / 2
        )
        group.add(corner)
      })

      const flangeHeight = 0.03
      const flangeRadius = 0.13
      const flange = new THREE.Mesh(
        new THREE.CylinderGeometry(flangeRadius, flangeRadius, flangeHeight, 20),
        bodyMaterial
      )
      const flangeY = lidTop + plateHeight + flangeHeight / 2
      flange.position.set(supportX, flangeY, conservatorZ)
      group.add(flange)

      const flangeBoltGeometry = new THREE.CylinderGeometry(0.014, 0.014, 0.018, 8)
      const flangeBoltCount = 8
      for (let i = 0; i < flangeBoltCount; i += 1) {
        const angle = (i / flangeBoltCount) * Math.PI * 2
        const bolt = new THREE.Mesh(flangeBoltGeometry, bodyMaterial)
        bolt.position.set(
          supportX + Math.cos(angle) * flangeRadius * 0.72,
          flangeY + flangeHeight / 2 + 0.009,
          conservatorZ + Math.sin(angle) * flangeRadius * 0.72
        )
        group.add(bolt)
      }

      const conservator = new THREE.Group()
      conservator.name = HIGHLIGHT_TARGET
      const body = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 24), bodyMaterial)
      conservator.add(body)

      /*
       * As duas extremidades sao iguais: tampa circular aparafusada em cada
       * ponta do cilindro, espelhadas pelo sinal de `end`.
       */
      const capGeometry = new THREE.CylinderGeometry(radius * 1.06, radius * 1.06, 0.05, 24)
      const boltGeometry = new THREE.CylinderGeometry(0.018, 0.018, 0.03, 8)
      const boltCount = 14

      ;[-1, 1].forEach((end) => {
        const cap = new THREE.Mesh(capGeometry, bodyMaterial)
        cap.position.y = (end * length) / 2
        conservator.add(cap)

        for (let i = 0; i < boltCount; i += 1) {
          const angle = (i / boltCount) * Math.PI * 2
          const bolt = new THREE.Mesh(boltGeometry, bodyMaterial)
          bolt.position.set(
            Math.cos(angle) * radius * 0.9,
            (end * (length + 0.06)) / 2,
            Math.sin(angle) * radius * 0.9
          )
          conservator.add(bolt)
        }
      })

      /*
       * >>> ROTAÇÃO DO CONSERVADOR DE ÓLEO <<<
       * O cilindro nasce em pé (CylinderGeometry cresce no eixo Y). Girar -90°
       * em X deita o grupo inteiro (corpo, tampas e parafusos) sobre o eixo Z.
       * Para mudar a orientação, altere a linha abaixo:
       *   rotation.x = -Math.PI / 2  -> deitado no eixo Z (atual)
       *   rotation.z = -Math.PI / 2  -> deitado no eixo X
       *   remover a linha            -> volta a ficar em pé no eixo Y
       */
      conservator.rotation.x = -Math.PI / 2
      conservator.position.set(conservatorX, conservatorY, conservatorZ)
      group.add(conservator)

      return group
    },

    /**
     * Cano de dreno saindo da face esquerda, com corpo de valvula no meio e
     * volante vermelho de raios EM CIMA, girando em torno de uma haste
     * vertical — como uma valvula gaveta de verdade. O ponto de saida fica
     * alem da ultima aleta em Z, entao o conjunto nao cruza com o radiador.
     */
    buildValve(metalMaterial) {
      const group = new THREE.Group()
      const redMaterial = new THREE.MeshStandardMaterial({
        color: 0xb0332b,
        metalness: 0.3,
        roughness: 0.5,
      })

      const valveX = -TANK_WIDTH / 2 - 0.11
      const valveY = BASE_HEIGHT + 0.18
      const valveZ = TANK_DEPTH / 2 - 0.15
      const wheelRadius = 0.09

      // o cano corre em X: as pecas nascem com o eixo em Y e sao deitadas
      const lieAlongX = (mesh) => {
        mesh.rotation.z = Math.PI / 2
        return mesh
      }

      const pipe = lieAlongX(
        new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.24, 12), metalMaterial)
      )
      pipe.position.set(valveX, valveY, valveZ)
      group.add(pipe)

      const flange = lieAlongX(
        new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.03, 16), metalMaterial)
      )
      flange.position.set(-TANK_WIDTH / 2 - 0.015, valveY, valveZ)
      group.add(flange)

      const valveBody = lieAlongX(
        new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.1, 16), metalMaterial)
      )
      valveBody.position.set(valveX, valveY, valveZ)
      group.add(valveBody)

      // haste vertical ligando o corpo ao volante
      const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.018, 0.018, 0.12, 8),
        metalMaterial
      )
      stem.position.set(valveX, valveY + 0.12, valveZ)
      group.add(stem)

      /*
       * O volante e montado no plano XY (o Torus ja nasce assim) e depois o
       * grupo inteiro e deitado 90 graus, o que poe aro, cubo e raios na
       * horizontal de uma vez, sem ter que girar cada raio separadamente.
       */
      const wheel = new THREE.Group()
      wheel.add(new THREE.Mesh(new THREE.TorusGeometry(wheelRadius, 0.013, 8, 24), redMaterial))

      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.03, 12), redMaterial)
      hub.rotation.x = Math.PI / 2
      wheel.add(hub)

      const spokeGeometry = new THREE.CylinderGeometry(0.007, 0.007, wheelRadius * 2, 6)
      for (let i = 0; i < 4; i += 1) {
        const spoke = new THREE.Mesh(spokeGeometry, redMaterial)
        spoke.rotation.z = (i / 4) * Math.PI
        wheel.add(spoke)
      }

      wheel.rotation.x = -Math.PI / 2
      wheel.position.set(valveX, valveY + 0.19, valveZ)
      group.add(wheel)

      return group
    },

    animate() {
      this.animationId = requestAnimationFrame(this.animate)
      this.controls.update()
      this.renderer.render(this.scene, this.camera)
      this.emitAnchors()
    },

    /**
     * Projeta o centro de cada peça para coordenadas de tela (relativas à
     * viewport) e avisa o pai, que usa esses pontos como destino das linhas de
     * chamada dos cards. Só emite quando algo muda de fato, para não forçar
     * re-render do SVG a 60fps com a cena parada.
     */
    emitAnchors() {
      if (!this.parts.length) return
      if (!this.canvasRect) this.canvasRect = this.$refs.container.getBoundingClientRect()

      const rect = this.canvasRect
      const projected = new THREE.Vector3()
      const anchors = this.parts.map((part) => {
        projected.copy(part.anchor).project(this.camera)
        return {
          id: part.id,
          x: Math.round((projected.x * 0.5 + 0.5) * rect.width + rect.left),
          y: Math.round((-projected.y * 0.5 + 0.5) * rect.height + rect.top),
          visible: projected.z < 1,
        }
      })

      const signature = JSON.stringify(anchors)
      if (signature === this.lastAnchors) return
      this.lastAnchors = signature
      this.$emit('anchors', anchors)
    },

    /** Realça uma peça tingindo os materiais dela com a cor de destaque. */
    highlightPart(id) {
      if (this.highlightedId === id) return
      this.clearHighlight()
      const part = this.parts.find((item) => item.id === id)
      if (!part) return

      /*
       * Peca composta pode marcar o filho que representa o "corpo" dela com o
       * nome HIGHLIGHT_TARGET; so ele acende. Sem essa marca, acende o grupo
       * inteiro, que e o caso das demais pecas.
       */
      const target = part.object.getObjectByName(HIGHLIGHT_TARGET) || part.object
      target.traverse((object) => {
        if (!object.isMesh) return
        object.userData.baseMaterial = object.material
        object.material = this.getHighlightMaterial(object.material)
      })
      this.highlightedId = id
    },

    clearHighlight() {
      if (!this.highlightedId) return
      const part = this.parts.find((item) => item.id === this.highlightedId)
      if (part) {
        part.object.traverse((object) => {
          if (object.userData.baseMaterial) {
            object.material = object.userData.baseMaterial
            delete object.userData.baseMaterial
          }
        })
      }
      this.highlightedId = null
    },

    /** Clone do material original com emissivo coral (--color-accent). */
    getHighlightMaterial(baseMaterial) {
      if (!this.highlightMaterials.has(baseMaterial)) {
        const highlighted = baseMaterial.clone()
        highlighted.emissive = new THREE.Color(0xf47a57)
        highlighted.emissiveIntensity = 0.38
        this.highlightMaterials.set(baseMaterial, highlighted)
      }
      return this.highlightMaterials.get(baseMaterial)
    },

    onWindowResize() {
      const container = this.$refs.container
      this.camera.aspect = container.clientWidth / container.clientHeight
      this.camera.updateProjectionMatrix()
      this.renderer.setSize(container.clientWidth, container.clientHeight)
      this.canvasRect = container.getBoundingClientRect()
      this.lastAnchors = ''
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

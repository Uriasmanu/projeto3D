<template>
  <div ref="container" class="viewer3d"></div>
</template>

<script>
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { TRANSFORMER_MODELS } from '../models/transformers'

/*
 * Cotas que NAO vem da especificacao do modelo.
 *
 * Sao proporcoes tiradas do transformador de referencia (tanque de
 * 3,2 x 1,8 x 1,7 m) e reaplicadas as tres variantes, para que todas mantenham
 * a mesma linguagem construtiva ao mudar de porte. Detalhe pequeno de metal
 * (parafuso, cordao de solda, secao de aleta) fica em cota ABSOLUTA de
 * proposito: um transformador maior tem, de verdade, proporcionalmente mais
 * parafusos e mais aletas, e nao parafusos maiores.
 */
const BASE_HEIGHT_RATIO = 0.0833
const LID_HEIGHT_RATIO = 0.0556
const LID_OVERHANG_RATIO = 0.05
// quanto as maos francesas da face direita descem a partir do topo da tampa
const BRACKET_DROP_RATIO = 0.2333
// passo entre parafusos da tampa: fixo, entao tanque maior recebe mais deles
const LID_BOLT_PITCH = 0.356

/*
 * Raio da esfera de referencia do palco. Toda variante e centrada em X/Z,
 * apoiada em y = 0 e reescalada para que sua esfera envolvente meca isto — e o
 * que faz o modelo selecionado se encaixar sempre da mesma forma, como se
 * fosse o unico da cena.
 *
 * A normalizacao e pela esfera, e nao pela maior aresta da caixa: a esfera nao
 * depende do angulo da camera, entao as tres variantes ocupam a mesma area na
 * tela em qualquer posicao da orbita. Normalizar pela maior aresta deixava o
 * equipamento mais fundo (o compacto) 15% mais largo em tela que os outros.
 *
 * O valor e o raio real da variante de referencia, entao ela fica em escala
 * 1:1 e o enquadramento da camera abaixo continua valendo.
 */
const FRAME_RADIUS = 2.81

/*
 * Carrossel de modelos, no estilo das telas de selecao de personagem: as
 * variantes ficam distribuidas em partes iguais de um circulo invisivel e o
 * anel gira para trazer a escolhida para a frente. O modelo nao roda no
 * proprio eixo — ele TRANSLADA pelo arco, sempre com a mesma face para a
 * camera (ver setCarouselAngle).
 *
 * Sobre o raio: a camera padrao olha o anel de apenas ~13 graus de elevacao,
 * quase de perfil, entao NAO existe raio que jogue as duas posicoes vizinhas
 * para fora do quadro — uma delas cai sempre perto do eixo da camera, atras da
 * posicao da frente (medido: 4,4 graus a raio 3,4 e 6,4 graus a raio 6,0). O
 * que o raio controla e a distancia dela: em 4,6 a vizinha de tras fica a 15 m
 * contra 8 m da da frente, ou seja, com metade do tamanho aparente e ja
 * pegando neblina — le-se como "outra unidade mais atras no anel", que e o
 * comportamento correto de um carrossel visto de baixo. Subir a camera faria o
 * circulo aparecer como elipse e o arco ficar obvio, mas mudaria o
 * enquadramento do modelo, entao fica como esta.
 */
const CAROUSEL_RADIUS = 4.6
const CAROUSEL_DURATION = 820
const TAU = Math.PI * 2

// paleta do ambiente: ceu palido no alto, neblina cinza-azulada no horizonte e
// piso de concreto. A cor da neblina e a mesma do fim do degrade, para o chao
// se dissolver no fundo em vez de terminar na borda do disco.
const SKY_TOP = '#e6ecf1'
const SKY_HORIZON = '#bcc6ce'
const FOG_COLOR = 0xbcc6ce
const GROUND_COLOR = 0x8d9399
// nome do filho que recebe o realce sozinho, quando a peca tem estrutura de apoio
const HIGHLIGHT_TARGET = 'highlight'

/*
 * Escala do termometro de oleo soldado na tampa do conservador: varredura de
 * 270 graus, do canto inferior esquerdo ao inferior direito do mostrador.
 * Os angulos estao em coordenadas de canvas 2D (0 = direita, sentido
 * horario), porque a escala e desenhada em canvas e virada textura.
 */
const GAUGE_START_ANGLE = Math.PI * 0.75
const GAUGE_SWEEP = Math.PI * 1.5
const GAUGE_MAX_TEMP = 120
// acima deste valor a faixa do mostrador fica vermelha
const GAUGE_ALARM_TEMP = 95
// leitura que o ponteiro indica na cena
const GAUGE_READING = 62
// raio do mostrador com que buildOilThermometer desenha; o conjunto e
// reescalado no ponto de montagem para acompanhar o conservador de cada modelo
const GAUGE_DIAL_RADIUS = 0.11
const GAUGE_REFERENCE_CONSERVATOR_RADIUS = 0.35
const gaugeAngle = (temp) => GAUGE_START_ANGLE + (temp / GAUGE_MAX_TEMP) * GAUGE_SWEEP

/**
 * Cotas derivadas do tanque, calculadas uma vez por modelo e repassadas a
 * todos os construtores de peca.
 */
const tankDims = (spec) => {
  const { width, height, depth } = spec.tank
  const baseHeight = height * BASE_HEIGHT_RATIO
  const lidHeight = height * LID_HEIGHT_RATIO
  return {
    width,
    height,
    depth,
    baseHeight,
    lidHeight,
    lidOverhang: width * LID_OVERHANG_RATIO,
    tankCenterY: baseHeight + height / 2,
    // topo do tanque (onde a tampa se apoia) e topo da tampa (onde tudo o mais
    // se apoia): engrossar a tampa sobe buchas, vigas e conservador junto
    lidY: baseHeight + height,
    lidTop: baseHeight + height + lidHeight,
    bracketDrop: height * BRACKET_DROP_RATIO,
  }
}

// aceleracao e desaceleracao suaves, como um anel que ganha e perde inercia
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

/*
 * Menor giro que leva de um angulo a outro, em (-180, 180]. Sem isso, ir da
 * primeira variante para a ultima daria quase uma volta inteira no sentido
 * longo, em vez de um passo curto para o outro lado.
 */
const shortestTurn = (from, to) => {
  const delta = (((to - from) % TAU) + TAU) % TAU
  return delta > Math.PI ? delta - TAU : delta
}

export default {
  name: 'Viewer3D',
  props: {
    /** id da variante em TRANSFORMER_MODELS que deve estar em cena. */
    modelId: {
      type: String,
      required: true,
    },
  },
  /*
   * O estado 3D vive em propriedades de instancia, e nao em `data()`: o
   * template nao tem nenhum binding, e deixar o Vue observar centenas de
   * objetos do Three (malhas, geometrias, matrizes) so gastaria memoria e
   * tempo de inicializacao.
   */
  created() {
    this.scene = null
    this.camera = null
    this.renderer = null
    this.controls = null
    // anel do carrossel e um grupo por posicao dele (ver layoutCarousel)
    this.carousel = null
    this.slots = []
    this.animationId = null
    this.initialCameraPosition = new THREE.Vector3(4.7, 3.1, 5.6)
    this.cameraTarget = new THREE.Vector3(0, FRAME_RADIUS * 0.516, 0)
    /*
     * Uma entrada por variante: { id, group, parts }. `parts` e o registro das
     * pecas com card — { id, object, offset, anchor } — usado para projetar a
     * posicao de cada peca na tela e ligar os cards por linhas de chamada.
     */
    this.models = []
    // -1 = nenhuma variante em cena ainda; assim o primeiro selectModel da
    // montagem nao e descartado como "ja e esse o modelo ativo"
    this.activeIndex = -1
    // estado do giro do carrossel, ou null quando parado
    this.spin = null
    this.canvasSize = { width: 0, height: 0 }
    this.lastAnchors = ''
    this.materials = null
    this.backgroundTexture = null
    this.gaugeFaceTexture = null
    this.highlightMaterials = new Map()
    this.highlightedId = null
  },
  watch: {
    modelId(id) {
      this.selectModel(id, { animate: true })
    },
  },
  mounted() {
    this.initScene()
    this.buildModels()
    this.selectModel(this.modelId, { animate: false })
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
    if (this.backgroundTexture) this.backgroundTexture.dispose()
    if (this.gaugeFaceTexture) this.gaugeFaceTexture.dispose()
    this.renderer.dispose()
    this.$refs.container.removeChild(this.renderer.domElement)
  },
  methods: {
    /**
     * Degrade vertical usado como fundo. Um canvas de 2x256 basta: a textura e
     * esticada na tela inteira e a interpolacao bilinear suaviza o resto.
     */
    createSkyTexture() {
      const canvas = document.createElement('canvas')
      canvas.width = 2
      canvas.height = 256

      const context = canvas.getContext('2d')
      const gradient = context.createLinearGradient(0, 0, 0, canvas.height)
      gradient.addColorStop(0, SKY_TOP)
      gradient.addColorStop(1, SKY_HORIZON)
      context.fillStyle = gradient
      context.fillRect(0, 0, canvas.width, canvas.height)

      return new THREE.CanvasTexture(canvas)
    },

    initScene() {
      const container = this.$refs.container

      this.scene = new THREE.Scene()
      this.backgroundTexture = this.createSkyTexture()
      this.scene.background = this.backgroundTexture
      // a neblina comeca depois do equipamento, entao so afeta o piso distante
      this.scene.fog = new THREE.Fog(FOG_COLOR, 12, 46)

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

      /*
       * O canvas e o conteudo principal da pagina, entao precisa de nome
       * acessivel. O tabIndex o poe na ordem de tabulacao, o que tambem
       * habilita o `keydown` que o OrbitControls usa para o pan pelas setas.
       */
      const canvas = this.renderer.domElement
      canvas.setAttribute('role', 'img')
      canvas.setAttribute(
        'aria-label',
        'Modelo 3D interativo de um transformador elétrico. ' +
          'Arraste para girar, use a rolagem para aproximar e as setas do teclado para deslocar.'
      )
      canvas.tabIndex = 0
      container.appendChild(canvas)

      this.canvasSize = { width: container.clientWidth, height: container.clientHeight }

      const ambientLight = new THREE.AmbientLight(0xffffff, 0.65)
      this.scene.add(ambientLight)

      const keyLight = new THREE.DirectionalLight(0xffffff, 0.75)
      keyLight.position.set(6, 10, 7)
      this.scene.add(keyLight)

      const fillLight = new THREE.DirectionalLight(0xffffff, 0.3)
      fillLight.position.set(-6, 4, -5)
      this.scene.add(fillLight)

      // o piso fica FORA do carrossel: entrasse nele, a caixa envolvente de
      // cada modelo passaria a ser o disco de 50 m e a normalizacao morreria —
      // e ainda giraria junto com o anel
      const ground = new THREE.Mesh(
        new THREE.CircleGeometry(50, 32),
        new THREE.MeshStandardMaterial({ color: GROUND_COLOR, roughness: 1 })
      )
      ground.rotation.x = -Math.PI / 2
      this.scene.add(ground)

      /*
       * Anel do carrossel: e ele que gira na troca de modelo, levando as
       * variantes pelo arco. Nasce na origem e so vai para o lugar em
       * layoutCarousel, depois que as caixas dos modelos forem medidas.
       */
      this.carousel = new THREE.Group()
      this.scene.add(this.carousel)

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
     * Materiais compartilhados pelas tres variantes. Instanciar um unico
     * conjunto evita trocas de material redundantes no render e mantem o cache
     * de realce (indexado pelo material base) com uma entrada por acabamento,
     * e nao uma por modelo.
     */
    createMaterials() {
      return {
        body: new THREE.MeshStandardMaterial({ color: 0xc7ccd1, metalness: 0.4, roughness: 0.45 }),
        fin: new THREE.MeshStandardMaterial({ color: 0xb6bbc0, metalness: 0.45, roughness: 0.4 }),
        // tampa um tom acima do corpo, para o relevo dela se separar do tanque
        lid: new THREE.MeshStandardMaterial({ color: 0xd7dbdf, metalness: 0.4, roughness: 0.45 }),
        porcelain: new THREE.MeshStandardMaterial({ color: 0x8a6f5c, roughness: 0.55 }),
        terminal: new THREE.MeshStandardMaterial({ color: 0xcfd3d6, metalness: 0.8, roughness: 0.25 }),
        // metal da valvula: um tom acima do corpo. Metalness baixo de proposito —
        // sem environment map, metalness alto renderiza escuro demais.
        valve: new THREE.MeshStandardMaterial({ color: 0xd9dde1, metalness: 0.35, roughness: 0.4 }),
      }
    },

    /**
     * Constroi as tres variantes, cada uma dentro do seu grupo de posicao do
     * carrossel, todas invisiveis; selectModel acende uma.
     *
     * A ordem importa: medir e normalizar acontece com os grupos de posicao
     * ainda na origem, onde o referencial de cada modelo coincide com o do
     * mundo. Só depois o anel e as posições vão para o círculo.
     */
    buildModels() {
      this.materials = this.createMaterials()
      // escala do termometro de oleo, consumida por buildOilThermometer
      this.gaugeFaceTexture = this.createGaugeFaceTexture()

      this.models = TRANSFORMER_MODELS.map((spec) => {
        const model = this.buildModel(spec)
        model.group.visible = false

        const slot = new THREE.Group()
        slot.add(model.group)
        this.slots.push(slot)
        this.carousel.add(slot)

        return model
      })

      // as matrizes precisam estar atualizadas antes de medir as caixas
      this.scene.updateMatrixWorld(true)
      this.models.forEach((model) => this.normalizeModel(model))
      this.layoutCarousel()
    },

    /** Ângulo da posição `index` no círculo, medido da frente do carrossel. */
    slotAngle(index) {
      return (index / this.models.length) * TAU
    },

    /** Rotação do anel que traz a posição `index` para a frente. */
    carouselAngleFor(index) {
      return -this.slotAngle(index)
    },

    /**
     * Distribui as variantes em partes iguais de um círculo invisível de raio
     * CAROUSEL_RADIUS e recua o anel inteiro em Z pelo mesmo raio.
     *
     * Essa combinação é o que garante o encaixe: com o anel girado em
     * `-slotAngle(i)`, a posição `i` cai exatamente na origem do mundo — o
     * mesmo lugar que o modelo teria se fosse o único da cena. A orientação
     * quem cuida é `setCarouselAngle`.
     */
    layoutCarousel() {
      this.carousel.position.set(0, 0, -CAROUSEL_RADIUS)
      this.slots.forEach((slot, index) => {
        const angle = this.slotAngle(index)
        slot.position.set(
          Math.sin(angle) * CAROUSEL_RADIUS,
          0,
          Math.cos(angle) * CAROUSEL_RADIUS
        )
      })
      this.setCarouselAngle(0)
    },

    /**
     * Gira o anel e CONTRA-GIRA cada posição pelo mesmo ângulo, de modo que a
     * rotação de cada modelo no mundo seja sempre zero.
     *
     * É esta contra-rotação que faz o movimento ser de carrossel: o modelo
     * herda do anel apenas a POSIÇÃO, então translada pelo arco mantendo
     * sempre a mesma face para a câmera. Sem ela, a rotação no mundo seria
     * `ângulo do anel + ângulo da posição` e o equipamento giraria em torno de
     * si mesmo durante a troca — e, como ele parte exatamente da origem (onde
     * a câmera está mirando), o que se via era um pião girando parado, com o
     * deslocamento pelo arco quase imperceptível.
     *
     * O contra-giro é o mesmo para todas as posições, então todas as variantes
     * ficam sempre de frente, inclusive as que estão no fundo do anel.
     */
    setCarouselAngle(angle) {
      this.carousel.rotation.y = angle
      this.slots.forEach((slot) => {
        slot.rotation.y = -angle
      })
    },

    /**
     * Geometria procedural de um transformador (tanque com aletas de radiador,
     * buchas de AT/BT e tanque de expansão/conservador), montada a partir da
     * referência em docs/transformador-de-poder-de-alta-tensão-55054468.webp
     * enquanto não há um asset .glb/.gltf real (ver docs/PASSO_A_PASSO.md,
     * seção 3). As cotas vêm da especificação em src/models/transformers.js.
     */
    buildModel(spec) {
      const group = new THREE.Group()
      const dims = tankDims(spec)
      const m = this.materials
      const parts = []

      /*
       * O ponto de chamada de cada peça é o centro da sua caixa envolvente. Em
       * peças grandes e concêntricas (tanque, radiadores e tampa compartilham
       * praticamente o mesmo centro) esse ponto é deslocado para uma região
       * característica da peça, senão os marcadores se sobrepõem na tela. O
       * deslocamento é proporcional ao tanque, então vale nas três variantes.
       */
      const register = (id, object, offset) => {
        object.name = id
        group.add(object)
        parts.push({ id, object, offset: offset || null, anchor: new THREE.Vector3() })
      }

      register('base', this.buildBaseRails(dims, m.body))
      register('tanque', this.buildTankBody(dims, m.body),
        new THREE.Vector3(dims.width * 0.3, -dims.height * 0.15, dims.depth * 0.5))
      register('radiadores', this.buildRadiatorFins(dims, spec, m.fin),
        new THREE.Vector3(-dims.width * 0.42, 0, dims.depth * 0.35))
      register('tampa', this.buildTopLid(dims, m.lid),
        new THREE.Vector3(dims.width * 0.3, 0, -dims.depth * 0.25))
      register('buchas', this.buildBushingArray(dims, spec, m.porcelain, m.terminal),
        new THREE.Vector3(-dims.width * 0.2, 0, 0))
      register('conservador', this.buildConservatorAssembly(dims, spec, m.body),
        new THREE.Vector3(dims.width * 0.11, dims.height * 0.15, 0))
      register('valvula', this.buildValve(dims, m.valve))

      return { id: spec.id, group, parts }
    },

    /**
     * Encaixa a variante na esfera de referência do palco: centrada em X/Z,
     * apoiada em y = 0 e reescalada para que sua esfera envolvente tenha raio
     * FRAME_RADIUS. É o que faz qualquer modelo selecionado ocupar exatamente
     * o mesmo espaço, como se fosse o único da cena — um equipamento baixo e
     * largo e outro alto e estreito subtendem a mesma área na tela, de
     * qualquer ponto da órbita.
     *
     * As âncoras das peças são medidas ANTES (com o grupo ainda em
     * transformação identidade) e depois levadas para o referencial da posição
     * do carrossel pela matriz do grupo, senão o deslocamento característico
     * de cada peça — que está em cotas do tanque — sairia fora de escala.
     */
    normalizeModel(model) {
      const box = new THREE.Box3().setFromObject(model.group)
      const center = box.getCenter(new THREE.Vector3())
      const sphere = box.getBoundingSphere(new THREE.Sphere())
      const scale = FRAME_RADIUS / sphere.radius

      const partBox = new THREE.Box3()
      model.parts.forEach((part) => {
        partBox.setFromObject(part.object)
        partBox.getCenter(part.anchor)
        if (part.offset) part.anchor.add(part.offset)
      })

      model.group.scale.setScalar(scale)
      model.group.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale)
      model.group.updateMatrixWorld(true)

      model.parts.forEach((part) => part.anchor.applyMatrix4(model.group.matrix))
    },

    /**
     * Duas vigas do skid atravessando o tanque no sentido frente/fundo (eixo Z),
     * recuadas das pontas e sobrando para fora das duas faces, como na imagem
     * de referência. Usam o cinza do corpo — na referência o skid é pintado
     * junto com o tanque, não é metal escuro.
     */
    buildBaseRails(dims, material) {
      const group = new THREE.Group()
      const railGeometry = new THREE.BoxGeometry(0.22, dims.baseHeight, dims.depth + 0.7)
      ;[-1, 1].forEach((side) => {
        const rail = new THREE.Mesh(railGeometry, material)
        rail.position.set(side * dims.width * 0.3, dims.baseHeight / 2, 0)
        group.add(rail)
      })
      return group
    },

    buildTankBody(dims, material) {
      const tank = new THREE.Mesh(
        new THREE.BoxGeometry(dims.width, dims.height, dims.depth),
        material
      )
      tank.position.y = dims.tankCenterY
      return tank
    },

    buildRadiatorFins(dims, spec, material) {
      const group = new THREE.Group()
      /*
       * Aletas de altura cheia: as maos francesas ficam fora da faixa de Z que
       * elas ocupam, entao nao ha risco de uma atravessar a outra. Todas tem a
       * mesma secao nas quatro faces: finThickness por finDepth de saliencia.
       */
      const finHeight = dims.height * 0.8
      const finY = dims.tankCenterY
      const finDepth = spec.fins.depth
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
      const frontCount = spec.fins.front
      const frontGeometry = new THREE.BoxGeometry(finThickness, finHeight, finDepth)
      const frontSpacing = (dims.width - 0.3) / frontCount
      ;[-1, 1].forEach((face) => {
        for (let i = 0; i < frontCount; i += 1) {
          const fin = new THREE.Mesh(frontGeometry, material)
          fin.position.set(
            -dims.width / 2 + 0.3 + i * frontSpacing,
            finY,
            face * (dims.depth / 2 + finDepth / 2)
          )
          group.add(fin)
        }

        const firstX = -dims.width / 2 + 0.3
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
            face * (dims.depth / 2 + finDepth - headerSize / 2)
          )
          group.add(header)
        })
      })

      // faces curtas (esquerda e direita): o sinal de `face` espelha o X.
      // `side: 0` na especificacao deixa essas faces lisas.
      const sideCount = spec.fins.side
      if (!sideCount) return group

      const sideGeometry = new THREE.BoxGeometry(finDepth, finHeight, finThickness)
      const sideSpacing = (dims.depth - 0.2) / sideCount
      ;[-1, 1].forEach((face) => {
        for (let i = 0; i < sideCount; i += 1) {
          const fin = new THREE.Mesh(sideGeometry, material)
          fin.position.set(
            face * (dims.width / 2 + finDepth / 2),
            finY,
            -dims.depth / 2 + 0.15 + i * sideSpacing
          )
          group.add(fin)
        }

        const firstZ = -dims.depth / 2 + 0.15
        const lastZ = firstZ + (sideCount - 1) * sideSpacing
        const sideHeaderGeometry = new THREE.BoxGeometry(
          headerSize,
          headerSize,
          lastZ - firstZ + finThickness
        )
        headerYs.forEach((y) => {
          const header = new THREE.Mesh(sideHeaderGeometry, material)
          header.position.set(
            face * (dims.width / 2 + finDepth - headerSize / 2),
            y,
            (firstZ + lastZ) / 2
          )
          group.add(header)
        })
      })

      return group
    },

    buildTopLid(dims, bodyMaterial) {
      const group = new THREE.Group()

      const lid = new THREE.Mesh(
        new THREE.BoxGeometry(
          dims.width + dims.lidOverhang,
          dims.lidHeight,
          dims.depth + dims.lidOverhang
        ),
        bodyMaterial
      )
      lid.position.y = dims.lidY + dims.lidHeight / 2
      group.add(lid)

      /*
       * Parafusos nas quatro bordas, em passo constante — tanque mais largo
       * recebe mais deles. Os das laterais curtas usam o mesmo passo das
       * bordas longas e pulam o primeiro e o ultimo, senao repetiriam os
       * parafusos de canto que os lados longos ja colocaram.
       */
      const boltGeometry = new THREE.CylinderGeometry(0.018, 0.018, 0.03, 8)
      const boltsPerSide = Math.max(6, Math.round(dims.width / LID_BOLT_PITCH) + 1)
      const halfW = dims.width / 2
      const halfD = dims.depth / 2
      const boltY = dims.lidY + dims.lidHeight + 0.01
      const boltStep = dims.width / (boltsPerSide - 1)
      const boltsPerEnd = Math.round(dims.depth / boltStep) + 1

      for (let i = 1; i < boltsPerEnd - 1; i += 1) {
        const z = -halfD + (i / (boltsPerEnd - 1)) * dims.depth
        ;[-halfW, halfW].forEach((x) => {
          const bolt = new THREE.Mesh(boltGeometry, bodyMaterial)
          bolt.position.set(x, boltY, z)
          group.add(bolt)
        })
      }

      for (let i = 0; i < boltsPerSide; i += 1) {
        const t = i / (boltsPerSide - 1)
        const x = -halfW + t * dims.width
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

    /**
     * Fileira de alta tensão atrás e de baixa tensão à frente, uma bucha de
     * cada por fase. As fases são distribuídas simetricamente em torno de
     * x = 0 com o passo da especificação, então a mesma conta serve para o
     * trifásico (3 buchas por fileira) e para o monofásico (2).
     */
    buildBushingArray(dims, spec, porcelainMaterial, terminalMaterial) {
      const group = new THREE.Group()
      const { phases, hv, lv } = spec.bushings
      const hvZ = -dims.depth * 0.206
      const lvZ = dims.depth * 0.147

      const offsetFor = (index, step) => (index - (phases - 1) / 2) * step

      for (let i = 0; i < phases; i += 1) {
        const high = this.buildBushing(
          hv.height, hv.sheds, hv.shaftRadius, hv.shedRadius, porcelainMaterial, terminalMaterial
        )
        high.position.set(offsetFor(i, hv.step), dims.lidTop, hvZ)
        group.add(high)

        const low = this.buildBushing(
          lv.height, lv.sheds, lv.shaftRadius, lv.shedRadius, porcelainMaterial, terminalMaterial
        )
        low.position.set(offsetFor(i, lv.step), dims.lidTop, lvZ)
        group.add(low)
      }

      return group
    },

    buildConservatorAssembly(dims, spec, bodyMaterial) {
      const group = new THREE.Group()
      const radius = spec.conservator.radius
      const beamWidth = 0.3
      /*
       * As vigas — e com elas as chapas verticais e as maos francesas — ficam
       * encostadas na borda da tampa. Assim passam alem da ultima aleta do
       * radiador e nenhuma das duas pecas atravessa a outra.
       */
      const beamZ = dims.depth / 2 - beamWidth / 2 + dims.lidOverhang / 2
      // o cilindro tem que passar das duas chapas para parecer sustentado
      const length = beamZ * 2 + 0.34
      /*
       * Deslocamento do conjunto (chapa de base, flange, tubo e cilindro) para
       * a direita. supportX alimenta as tres primeiras e conservatorX deriva
       * dele, entao mexer aqui move tudo junto.
       */
      const assemblyShiftX = 0.24
      const supportX = dims.width / 2 - 0.4 + assemblyShiftX
      const lidTop = dims.lidTop
      // folga entre o topo da tampa e a barriga do cilindro
      const conservatorClearance = 0.3
      const conservatorY = lidTop + radius + conservatorClearance
      const conservatorZ = 0

      // centro do cilindro deitado — destino do tubo de ligacao
      const conservatorX = supportX + radius

      /*
       * Tubo de ligacao tanque -> conservador. A curva sobe da tampa e se
       * inclina ate o centro do cilindro; TubeGeometry a extruda como um duto
       * de secao circular, dando o cotovelo arredondado da referencia. Os
       * pontos intermediarios sao cotados a partir da barriga do cilindro
       * (conservatorY - radius), que fica sempre conservatorClearance acima da
       * tampa — assim a curva continua monotona em qualquer variante. O ultimo
       * ponto entra um pouco no cilindro para nao aparecer emenda.
       */
      const pipeCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(supportX, lidTop, conservatorZ),
        new THREE.Vector3(supportX, conservatorY - radius - 0.2, conservatorZ),
        new THREE.Vector3(conservatorX - 0.12, conservatorY - radius, conservatorZ),
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
      const beamStartX = dims.width * 0.30 + beamShiftX
      const beamEndX = dims.width / 2 + 0.20 + beamShiftX
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
      const cornerOut = beamEndX - dims.width / 2
      const cornerShape = new THREE.Shape()
      cornerShape.moveTo(0, 0)
      cornerShape.lineTo(cornerOut, 0)
      cornerShape.lineTo(0, -dims.bracketDrop)
      cornerShape.closePath()
      const cornerGeometry = new THREE.ExtrudeGeometry(cornerShape, {
        depth: braceThickness,
        bevelEnabled: false,
      })

      ;[-1, 1].forEach((side) => {
        const corner = new THREE.Mesh(cornerGeometry, bodyMaterial)
        corner.position.set(
          dims.width / 2,
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
      const capThickness = 0.05
      const capGeometry = new THREE.CylinderGeometry(radius * 1.06, radius * 1.06, capThickness, 24)
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
       * Termometro de oleo soldado no CENTRO da tampa da frente. Entra como
       * filho do conservador para acompanhar qualquer mudanca de posicao ou de
       * rotacao do cilindro.
       *
       * A tampa da frente e a de `end === -1`, em y local negativo: com o
       * grupo deitado -90 graus em X, o -Y local aponta para o +Z do mundo, ou
       * seja, a face virada para a camera. Girar o termometro +90 graus em X
       * poe o mostrador olhando para fora dessa face e mantem o topo da escala
       * para cima (as duas rotacoes se cancelam no mundo).
       *
       * O mostrador e desenhado sempre no tamanho da variante de referencia; a
       * escala aqui o faz acompanhar o diametro do conservador de cada modelo,
       * sem mexer no plano de contato (a chapa nasce em z = 0).
       */
      const thermometer = this.buildOilThermometer(bodyMaterial)
      thermometer.rotation.x = Math.PI / 2
      thermometer.position.y = -(length / 2 + capThickness / 2)
      thermometer.scale.setScalar(radius / GAUGE_REFERENCE_CONSERVATOR_RADIUS)
      conservator.add(thermometer)

      /*
       * >>> ROTAÇÃO DO CONSERVADOR DE ÓLEO <<<
       * O cilindro nasce em pé (CylinderGeometry cresce no eixo Y). Girar -90°
       * em X deita o grupo inteiro (corpo, tampas e parafusos) sobre o eixo Z.
       * Para mudar a orientação, altere a linha abaixo:
       *   rotation.x = -Math.PI / 2  -> deitado no eixo Z (atual)
       *   rotation.z = -Math.PI / 2  -> deitado no eixo X
       *   remover a linha            -> volta a ficar em pé no eixo Y
       * O termômetro é filho do grupo e acompanha a mudança, mas o `rotation.x`
       * dele (logo acima) é o que mantém o topo da escala para cima — trocar a
       * rotação daqui exige recalcular a de lá.
       */
      conservator.rotation.x = -Math.PI / 2
      conservator.position.set(conservatorX, conservatorY, conservatorZ)
      group.add(conservator)

      return group
    },

    /**
     * Mostrador do termometro de oleo desenhado em canvas 2D e aplicado como
     * textura no disco do relogio: escala de 0 a GAUGE_MAX_TEMP graus, faixa
     * verde na regiao normal de operacao e vermelha acima do alarme.
     *
     * Desenhar a escala em canvas em vez de modelar tracos e numeros em
     * geometria mantem o mostrador legivel com uma unica malha. A textura e
     * unica e compartilhada pelos termometros das tres variantes.
     */
    createGaugeFaceTexture() {
      const size = 512
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size

      const ctx = canvas.getContext('2d')
      // o centro do canvas e tambem o centro do mostrador e do eixo do ponteiro
      const c = size / 2
      const pointAt = (angle, radius) => [c + Math.cos(angle) * radius, c + Math.sin(angle) * radius]

      // fundo creme do mostrador, do tipo esmaltado
      ctx.fillStyle = '#F7F5F0'
      ctx.beginPath()
      ctx.arc(c, c, c, 0, Math.PI * 2)
      ctx.fill()

      // faixas de operacao: verde ate o alarme, vermelha dali para cima
      ctx.lineWidth = c * 0.075
      ;[
        { from: 0, to: GAUGE_ALARM_TEMP, color: '#008242' },
        { from: GAUGE_ALARM_TEMP, to: GAUGE_MAX_TEMP, color: '#B0332B' },
      ].forEach((band) => {
        ctx.strokeStyle = band.color
        ctx.beginPath()
        ctx.arc(c, c, c * 0.82, gaugeAngle(band.from), gaugeAngle(band.to))
        ctx.stroke()
      })

      // tracos a cada 10 graus; os multiplos de 20 sao mais longos e numerados
      ctx.strokeStyle = '#1F1F1F'
      ctx.fillStyle = '#1F1F1F'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      for (let temp = 0; temp <= GAUGE_MAX_TEMP; temp += 10) {
        const major = temp % 20 === 0
        const angle = gaugeAngle(temp)
        const outer = c * 0.72
        const inner = outer - c * (major ? 0.13 : 0.07)

        ctx.lineWidth = c * (major ? 0.024 : 0.014)
        ctx.beginPath()
        ctx.moveTo.apply(ctx, pointAt(angle, inner))
        ctx.lineTo.apply(ctx, pointAt(angle, outer))
        ctx.stroke()

        if (!major) continue
        ctx.font = '600 ' + Math.round(c * 0.15) + 'px Inter, Arial, sans-serif'
        ctx.fillText.apply(ctx, [String(temp)].concat(pointAt(angle, c * 0.45)))
      }

      // legenda: unidade e grandeza medida, na abertura de baixo do mostrador
      ctx.font = '700 ' + Math.round(c * 0.14) + 'px Inter, Arial, sans-serif'
      ctx.fillText('°C', c, c * 1.24)
      ctx.fillStyle = '#3D3D3D'
      ctx.font = '600 ' + Math.round(c * 0.1) + 'px Inter, Arial, sans-serif'
      ctx.fillText('ÓLEO', c, c * 1.52)

      const texture = new THREE.CanvasTexture(canvas)
      /*
       * A face fica de esguelha na camera inicial, e sem filtragem
       * anisotropica os numeros viram borrao nesse angulo.
       */
      texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy()
      return texture
    },

    /**
     * Termometro de oleo: mostrador redondo soldado na tampa do conservador.
     * O cordao de solda (o torus rente a chapa) mais a chapa de base na mesma
     * tinta do tanque sao o que da a leitura de peca soldada, e nao apenas
     * apoiada.
     *
     * O grupo nasce com o eixo em +Z (mostrador virado para +Z, topo da escala
     * em +Y) e as pecas empilhadas em Z a partir de z = 0, o plano de contato
     * com a chapa. Quem monta gira e reescala o conjunto inteiro para a face
     * escolhida.
     */
    buildOilThermometer(bodyMaterial) {
      const group = new THREE.Group()

      // CylinderGeometry cresce em Y; aqui as pecas sao empilhadas em Z
      const alongZ = (mesh) => {
        mesh.rotation.x = Math.PI / 2
        return mesh
      }

      // cordao de solda: fosco e mais escuro que a tinta, como metal queimado
      const weldMaterial = new THREE.MeshStandardMaterial({ color: 0xa2a8ad, metalness: 0.3, roughness: 0.85 })
      const caseMaterial = new THREE.MeshStandardMaterial({ color: 0x9aa1a7, metalness: 0.6, roughness: 0.3 })
      const faceMaterial = new THREE.MeshStandardMaterial({ map: this.gaugeFaceTexture, roughness: 0.8 })
      const glassMaterial = new THREE.MeshStandardMaterial({
        color: 0xeaf1f6,
        metalness: 0.1,
        roughness: 0.06,
        transparent: true,
        opacity: 0.22,
      })
      const needleMaterial = new THREE.MeshStandardMaterial({ color: 0x1f1f1f, roughness: 0.45 })

      const dialRadius = GAUGE_DIAL_RADIUS
      const padRadius = dialRadius + 0.022
      const padHeight = 0.022
      const caseHeight = 0.05
      // topo da caixa: onde mostrador, ponteiro, aro e vidro se empilham
      const caseTop = padHeight + caseHeight

      const pad = alongZ(
        new THREE.Mesh(new THREE.CylinderGeometry(padRadius, padRadius, padHeight, 24), bodyMaterial)
      )
      pad.position.z = padHeight / 2
      group.add(pad)

      // metade do cordao fica dentro da chapa, o que deixa so o filete a mostra
      const weld = new THREE.Mesh(new THREE.TorusGeometry(padRadius, 0.014, 8, 28), weldMaterial)
      weld.position.z = 0.006
      group.add(weld)

      const body = alongZ(
        new THREE.Mesh(new THREE.CylinderGeometry(dialRadius, dialRadius, caseHeight, 24), caseMaterial)
      )
      body.position.z = padHeight + caseHeight / 2
      group.add(body)

      const face = new THREE.Mesh(new THREE.CircleGeometry(dialRadius * 0.93, 32), faceMaterial)
      face.position.z = caseTop - 0.001
      group.add(face)

      /*
       * Ponteiro: nasce apontando para +Y e gira em torno de Z. A escala foi
       * desenhada em angulo de canvas (Y para baixo, sentido horario), e a
       * conversao para o angulo deste grupo e -(angulo + 90 graus).
       */
      const needle = new THREE.Group()
      const needleLength = dialRadius * 0.66
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.008, needleLength, 0.004), needleMaterial)
      blade.position.y = needleLength / 2
      needle.add(blade)
      // contrapeso do outro lado do eixo, como em ponteiro de manometro
      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.026, 0.004), needleMaterial)
      tail.position.y = -0.013
      needle.add(tail)
      needle.position.z = caseTop + 0.003
      needle.rotation.z = -(gaugeAngle(GAUGE_READING) + Math.PI / 2)
      group.add(needle)

      const hub = alongZ(
        new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.012, 12), needleMaterial)
      )
      hub.position.z = caseTop + 0.006
      group.add(hub)

      const bezel = new THREE.Mesh(new THREE.TorusGeometry(dialRadius * 0.96, 0.011, 8, 28), caseMaterial)
      bezel.position.z = caseTop + 0.002
      group.add(bezel)

      // vidro por ultimo: transparente, entao e desenhado depois dos opacos
      const glass = new THREE.Mesh(new THREE.CircleGeometry(dialRadius * 0.93, 32), glassMaterial)
      glass.position.z = caseTop + 0.009
      group.add(glass)

      return group
    },

    /**
     * Cano de dreno saindo da face esquerda, com corpo de valvula no meio e
     * volante vermelho de raios EM CIMA, girando em torno de uma haste
     * vertical — como uma valvula gaveta de verdade. O ponto de saida fica
     * alem da ultima aleta em Z, entao o conjunto nao cruza com o radiador.
     */
    buildValve(dims, metalMaterial) {
      const group = new THREE.Group()
      const redMaterial = new THREE.MeshStandardMaterial({
        color: 0xb0332b,
        metalness: 0.3,
        roughness: 0.5,
      })

      const valveX = -dims.width / 2 - 0.11
      const valveY = dims.baseHeight + 0.18
      const valveZ = dims.depth / 2 - 0.15
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
      flange.position.set(-dims.width / 2 - 0.015, valveY, valveZ)
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

    /**
     * Põe uma variante em cena. Com `animate`, o anel do carrossel gira pelo
     * caminho mais curto até trazer a variante escolhida à frente: a que sai
     * percorre o arco para um lado e sai de quadro, a que entra chega pelo
     * outro. Nenhuma das duas gira em torno de si — as duas só deslizam pelo
     * arco. Sem animação (na montagem, ou com `prefers-reduced-motion`), o
     * anel salta direto para a posição final.
     *
     * Durante o giro as DUAS variantes envolvidas ficam visíveis — é o que
     * torna o movimento do anel legível; a terceira permanece apagada. Parado,
     * só a selecionada continua em cena.
     *
     * O realce é sempre limpo ANTES da troca: os materiais tingidos pertencem
     * ao modelo que está saindo e, depois de trocar, não haveria mais como
     * encontrá-los para destingir.
     */
    selectModel(id, { animate } = {}) {
      const index = this.models.findIndex((model) => model.id === id)
      if (index < 0 || index === this.activeIndex) return

      this.clearHighlight()
      // troca pedida no meio de outra: conclui a anterior antes de comecar
      if (this.spin) this.finishSpin()

      const reduceMotion =
        window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches

      if (!animate || reduceMotion) {
        this.setCarouselAngle(this.carouselAngleFor(index))
        this.setActive(index)
        this.showModels([index])
        return
      }

      const fromAngle = this.carousel.rotation.y
      this.spin = {
        from: this.activeIndex,
        to: index,
        fromAngle,
        delta: shortestTurn(fromAngle, this.carouselAngleFor(index)),
        startedAt: performance.now(),
      }
      /*
       * O modelo ativo passa a ser o escolhido desde o inicio do giro: e ele
       * quem responde pelos cards e pelo realce quando o anel parar, e
       * emitAnchors nao emite nada enquanto o giro acontece.
       */
      this.setActive(index)
      this.showModels([this.spin.from, index])
      this.$emit('switching', true)
    },

    /** Variante que responde pelos cards, pelo realce e pelas âncoras. */
    setActive(index) {
      this.activeIndex = index
      // as ancoras da variante anterior nao valem mais para os cards
      this.lastAnchors = ''
    },

    /** Só as variantes destes índices ficam em cena; as outras somem. */
    showModels(indices) {
      this.models.forEach((model, i) => {
        model.group.visible = indices.indexOf(i) >= 0
      })
    },

    /** Encerra o giro no estado final, sem esperar o resto do arco. */
    finishSpin() {
      const spin = this.spin
      this.spin = null
      if (!spin) return

      // angulo exato da posicao de destino, para o encaixe nao acumular erro
      this.setCarouselAngle(this.carouselAngleFor(spin.to))
      this.setActive(spin.to)
      this.showModels([spin.to])
      this.$emit('switching', false)
    },

    /** Avança um quadro do giro do carrossel. */
    updateCarousel() {
      const spin = this.spin
      if (!spin) return

      const t = Math.min(1, (performance.now() - spin.startedAt) / CAROUSEL_DURATION)
      if (t >= 1) {
        this.finishSpin()
        return
      }

      this.setCarouselAngle(spin.fromAngle + spin.delta * easeInOut(t))
    },

    animate() {
      this.animationId = requestAnimationFrame(this.animate)
      this.updateCarousel()
      this.controls.update()
      this.renderer.render(this.scene, this.camera)
      this.emitAnchors()
    },

    /**
     * Projeta o centro de cada peça da variante ativa para coordenadas de
     * pixel DENTRO do canvas e avisa o pai, que soma o deslocamento do palco e
     * usa esses pontos como destino das linhas de chamada dos cards.
     * Coordenadas relativas ao canvas (e não à viewport) não mudam quando a
     * página rola, o que mantém os marcadores no lugar no layout empilhado de
     * tablet.
     *
     * Só emite quando algo muda de fato, para não forçar re-render do SVG a
     * 60fps com a cena parada — e não emite nada enquanto o carrossel gira, em
     * que as peças varreriam a tela inteira sem informar nada.
     */
    emitAnchors() {
      if (this.spin) return

      const model = this.models[this.activeIndex]
      if (!model || !model.parts.length) return

      /*
       * As ancoras estao no referencial da posicao do carrossel. Parado, a
       * posicao da frente e o anel se cancelam exatamente (ver
       * layoutCarousel), entao esse referencial e o do mundo. Enquanto gira
       * nao chegamos aqui.
       */
      const { width, height } = this.canvasSize
      const projected = new THREE.Vector3()
      const anchors = model.parts.map((part) => {
        projected.copy(part.anchor).project(this.camera)
        return {
          id: part.id,
          x: Math.round((projected.x * 0.5 + 0.5) * width),
          y: Math.round((-projected.y * 0.5 + 0.5) * height),
          visible: projected.z < 1,
        }
      })

      const signature = JSON.stringify(anchors)
      if (signature === this.lastAnchors) return
      this.lastAnchors = signature
      this.$emit('anchors', anchors)
    },

    /** Realça uma peça da variante ativa tingindo os materiais dela. */
    highlightPart(id) {
      if (this.highlightedId === id) return
      this.clearHighlight()

      const model = this.models[this.activeIndex]
      const part = model && model.parts.find((item) => item.id === id)
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
      const model = this.models[this.activeIndex]
      const part = model && model.parts.find((item) => item.id === this.highlightedId)
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
      const width = container.clientWidth
      const height = container.clientHeight
      // o palco pode estar oculto (celular) — dividir por zero quebra a matriz
      if (!width || !height) return

      this.camera.aspect = width / height
      this.camera.updateProjectionMatrix()
      this.renderer.setSize(width, height)
      this.canvasSize = { width, height }
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
  /*
   * Em tablet, sem isso o navegador pode roubar o gesto para rolar a página no
   * meio de uma rotação do modelo.
   */
  touch-action: none;
  outline: none;
}

.viewer3d ::v-deep canvas:focus-visible {
  outline: 2px solid var(--color-action-primary);
  outline-offset: -2px;
}
</style>

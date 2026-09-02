<template>
  <div id="app-shell">
    <header class="app-header">
      <h1 class="app-title">Visualizador 3D — Transformador Elétrico</h1>

      <div v-if="supported" class="app-header__actions">
        <label class="field">
          <span class="field__label">Modelo</span>
          <select v-model="modelId" class="field__control">
            <option v-for="option in models" :key="option.id" :value="option.id">
              {{ option.label }}
            </option>
          </select>
        </label>

        <button type="button" class="btn-primary" @click="resetCamera">
          Resetar câmera
        </button>
      </div>
    </header>

    <main v-if="supported" ref="dashboard" class="dashboard">
      <div
        v-for="side in ['left', 'right']"
        :key="side"
        class="card-column"
        :class="`card-column--${side}`"
      >
        <article
          v-for="part in partsBySide(side)"
          :key="part.id"
          :ref="`card-${part.id}`"
          class="part-card"
          :class="{ 'is-active': part.id === activeId, 'is-pinned': part.id === pinnedId }"
          role="button"
          tabindex="0"
          :aria-label="`Peça ${indexOf(part.id)}: destacar ${part.label} no modelo 3D`"
          :aria-pressed="part.id === pinnedId ? 'true' : 'false'"
          :aria-describedby="`part-desc-${part.id}`"
          @click="togglePin(part.id)"
          @keydown.enter.prevent="togglePin(part.id)"
          @keydown.space.prevent="togglePin(part.id)"
          @keydown.esc="pinnedId = null"
          @mouseenter="hover(part.id)"
          @mouseleave="unhover(part.id)"
          @focus="hover(part.id)"
          @blur="unhover(part.id)"
        >
          <span class="part-card__index" aria-hidden="true">{{ indexOf(part.id) }}</span>
          <h2 class="part-card__title">{{ part.label }}</h2>
          <p :id="`part-desc-${part.id}`" class="part-card__description">
            {{ part.description }}
          </p>
          <span class="part-card__detail">{{ part.detail }}</span>
        </article>
      </div>

      <div ref="stage" class="stage">
        <Viewer3D
          ref="viewer"
          :model-id="modelId"
          @anchors="onAnchors"
          @switching="switching = $event"
        />
        <p class="stage__model">
          <span class="stage__model-name">{{ model.label }}</span>
          <span class="stage__model-caption">{{ model.caption }}</span>
        </p>
        <p class="stage__hint">
          Arraste para girar · Rolagem ou pinça para aproximar · Selecione um card para destacar
        </p>
      </div>

      <svg
        class="callouts"
        :class="{ 'is-hidden': switching }"
        :width="size.width"
        :height="size.height"
        aria-hidden="true"
        focusable="false"
      >
        <g
          v-for="callout in callouts"
          :key="callout.id"
          class="callout"
          :class="{ 'is-active': callout.id === activeId }"
        >
          <path v-if="callout.path" class="callout__line" :d="callout.path" />
          <circle class="callout__dot" :cx="callout.target.x" :cy="callout.target.y" r="11" />
          <text class="callout__label" :x="callout.target.x" :y="callout.target.y">
            {{ callout.index }}
          </text>
        </g>
      </svg>
    </main>

    <div v-else class="screen-guard">
      <h2 class="screen-guard__title">Tela pequena para esta visualização</h2>
      <p class="screen-guard__text">
        O modelo 3D e os cards das peças precisam de espaço para serem lidos ao
        mesmo tempo. Abra esta página em um tablet, notebook ou monitor — a
        largura mínima é de {{ minWidth }}&nbsp;px.
      </p>
    </div>
  </div>
</template>

<script>
import Viewer3D from './components/Viewer3D.vue'
import { TRANSFORMER_PARTS } from './models/parts'
import { TRANSFORMER_MODELS, DEFAULT_MODEL_ID } from './models/transformers'

/*
 * Faixas de tela atendidas (os mesmos valores estão nas media queries do
 * <style>; mudar um lado exige mudar o outro):
 *
 *   < 768px            celular — fora do escopo, entra o aviso de tela pequena
 *   768px a 1023px     tablet retrato — modelo em cima, cards em grade abaixo
 *   >= 1024px          tablet paisagem e acima — cards nas laterais com linhas
 *
 * As duas larguras são lidas por matchMedia em vez de comparadas contra a
 * largura medida do container: assim o JS e o CSS trocam de layout no mesmo
 * ponto, sem depender da presença de barra de rolagem.
 */
const MIN_WIDTH = 768
const CALLOUT_MIN_WIDTH = 1024

// comprimento do trecho horizontal que a linha de chamada faz ao sair do card
const CALLOUT_STUB = 18

export default {
  name: 'App',
  components: { Viewer3D },
  data() {
    return {
      models: TRANSFORMER_MODELS,
      modelId: DEFAULT_MODEL_ID,
      // true enquanto o viewer gira para trocar de modelo
      switching: false,
      minWidth: MIN_WIDTH,
      anchors: [],
      cardPoints: {},
      size: { width: 0, height: 0 },
      stage: { x: 0, y: 0, width: 0, height: 0 },
      supported: true,
      linked: true,
      // peça sob o cursor/foco (destaque temporário) e peça fixada por clique
      hoverId: null,
      pinnedId: null,
    }
  },
  computed: {
    /** Especificação da variante selecionada no select. */
    model() {
      return this.models.find((option) => option.id === this.modelId) || this.models[0]
    },

    /*
     * Cards da variante selecionada: label e descrição são físicas e valem
     * para as três, mas o `detail` (contagens e cotas) vem do modelo.
     */
    parts() {
      const details = this.model.details || {}
      return TRANSFORMER_PARTS.map((part) => ({
        ...part,
        detail: details[part.id] || part.detail,
      }))
    },

    /*
     * O passar do mouse ganha do card fixado, para permitir espiar outra peça
     * sem perder a fixação: ao sair do card, o destaque volta para a fixada.
     */
    activeId() {
      return this.hoverId || this.pinnedId
    },

    /**
     * Marcador numerado sobre cada peça e, quando há largura para as colunas
     * laterais, a linha que liga o card ao marcador. O traçado sai na
     * horizontal do card e depois segue reto até a peça.
     *
     * No layout empilhado os marcadores continuam sendo desenhados sem linha:
     * são eles que mantêm a ligação entre o número do card e a peça no modelo.
     */
    callouts() {
      return this.anchors.reduce((list, anchor) => {
        const card = this.cardPoints[anchor.id]
        if (!card || !anchor.visible) return list
        // peça projetada fora do canvas (câmera muito próxima) não recebe marcador
        if (anchor.x < 0 || anchor.x > this.stage.width) return list
        if (anchor.y < 0 || anchor.y > this.stage.height) return list

        const target = { x: anchor.x + this.stage.x, y: anchor.y + this.stage.y }
        const stub = card.side === 'left' ? CALLOUT_STUB : -CALLOUT_STUB

        list.push({
          id: anchor.id,
          index: this.indexOf(anchor.id),
          target,
          path: this.linked
            ? `M ${card.x} ${card.y} H ${card.x + stub} L ${target.x} ${target.y}`
            : null,
        })
        return list
      }, [])
    },
  },
  watch: {
    /*
     * Trocar de modelo invalida o destaque (a peça realçada pertence ao modelo
     * que está saindo) e muda a altura dos cards, porque o texto de detalhe é
     * outro — daí a remedição dos pontos de saída das linhas de chamada.
     */
    modelId() {
      this.hoverId = null
      this.pinnedId = null
      this.$nextTick(this.measure)
    },

    activeId(id) {
      const viewer = this.$refs.viewer
      if (!viewer) return
      if (id) viewer.highlightPart(id)
      else viewer.clearHighlight()
    },
  },
  mounted() {
    this.supportedQuery = window.matchMedia(`(min-width: ${MIN_WIDTH}px)`)
    this.linkedQuery = window.matchMedia(`(min-width: ${CALLOUT_MIN_WIDTH}px)`)

    this.refresh()
    window.addEventListener('resize', this.refresh)
    // iPad não dispara `resize` de forma confiável ao virar a tela
    window.addEventListener('orientationchange', this.refresh)
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.refresh)
    window.removeEventListener('orientationchange', this.refresh)
  },
  methods: {
    partsBySide(side) {
      return this.parts.filter((part) => part.side === side)
    },

    indexOf(id) {
      return this.parts.findIndex((part) => part.id === id) + 1
    },

    onAnchors(anchors) {
      this.anchors = anchors
    },

    /** Relê a faixa de tela atual e remede o layout depois do reflow. */
    refresh() {
      this.supported = this.supportedQuery.matches
      this.linked = this.linkedQuery.matches
      this.$nextTick(this.measure)
    },

    /**
     * Mede o container, o palco e o ponto de saída da linha em cada card.
     *
     * Tudo aqui é `offsetLeft`/`offsetTop`, relativos ao `.dashboard` (o único
     * ancestral posicionado) — a mesma origem do SVG sobreposto. Diferente de
     * `getBoundingClientRect()`, esses valores não mudam quando a página rola,
     * então o layout empilhado de tablet não precisa remedir a cada rolagem.
     */
    measure() {
      const dashboard = this.$refs.dashboard
      const stage = this.$refs.stage
      if (!dashboard || !stage) return

      this.size = { width: dashboard.clientWidth, height: dashboard.clientHeight }
      this.stage = {
        x: stage.offsetLeft,
        y: stage.offsetTop,
        width: stage.offsetWidth,
        height: stage.offsetHeight,
      }

      const points = {}
      this.parts.forEach((part) => {
        const element = this.$refs[`card-${part.id}`]
        const node = Array.isArray(element) ? element[0] : element
        if (!node) return
        points[part.id] = {
          side: part.side,
          x: part.side === 'left' ? node.offsetLeft + node.offsetWidth : node.offsetLeft,
          y: node.offsetTop + node.offsetHeight / 2,
        }
      })
      this.cardPoints = points
    },

    hover(id) {
      this.hoverId = id
    },

    unhover(id) {
      if (this.hoverId !== id) return
      this.hoverId = null
    },

    /**
     * Fixa (ou solta) o destaque de uma peça. É o caminho de toque: em tablet
     * não existe `mouseenter`, então sem isso os cards não destacariam nada.
     */
    togglePin(id) {
      this.pinnedId = this.pinnedId === id ? null : id
      // o cursor ainda está sobre o card; sem limpar, o hover mascararia a soltura
      this.hoverId = null
    },

    resetCamera() {
      if (this.$refs.viewer) this.$refs.viewer.resetCamera()
    },
  },
}
</script>

<style>
#app-shell {
  display: flex;
  flex-direction: column;
  height: 100vh;
  /* em tablet a barra do navegador some ao rolar; dvh acompanha, vh não */
  height: 100dvh;
  width: 100%;
}

/* ------------------------------------------------------------------ header */

.app-header {
  flex: none;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 16px;
  padding: 10px clamp(16px, 2.2vw, 28px);
  background-color: var(--color-bg-default);
  border-bottom: 1px solid var(--color-border);
}

.app-title {
  margin: 0;
  /* encolhe em tablet retrato para caber ao lado do botão sem quebrar linha */
  font-size: clamp(15px, 1.5vw, var(--text-h3-size));
  line-height: 1.3;
  font-weight: 600;
  color: var(--green-800);
}

.app-header__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
}

.field {
  display: flex;
  align-items: center;
  gap: 8px;
}

.field__label {
  font-size: var(--text-caption-size);
  font-weight: 600;
  line-height: 1.3;
  color: var(--color-text-secondary);
}

/*
 * `<select>` nativo de propósito: em tablet ele abre o seletor do sistema, com
 * alvos de toque e rolagem que nenhum dropdown improvisado igualaria. Por isso
 * também não escondemos a seta padrão — é a affordance que o usuário conhece.
 */
.field__control {
  /* 44px é o alvo de toque mínimo confortável em tablet */
  min-height: 44px;
  max-width: 16rem;
  font-family: var(--font-family-base);
  font-size: var(--text-small-size);
  font-weight: 500;
  line-height: 1.3;
  color: var(--color-text-primary);
  /* gray-500 e não gray-300: contorno de campo precisa de 3:1 contra o fundo */
  border: 1px solid var(--gray-500);
  border-radius: 6px;
  background-color: var(--white);
  padding: 8px 10px;
  cursor: pointer;
}

.field__control:hover {
  border-color: var(--color-action-primary);
}

.field__control:focus-visible {
  outline: 2px solid var(--color-action-primary);
  outline-offset: 2px;
}

.btn-primary {
  /* 44px é o alvo de toque mínimo confortável em tablet */
  min-height: 44px;
  font-family: var(--font-family-base);
  font-size: var(--text-button-size);
  font-weight: 600;
  line-height: 1;
  color: var(--white);
  background-color: var(--color-action-primary);
  border: none;
  border-radius: 6px;
  padding: 10px 18px;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.btn-primary:hover {
  background-color: var(--color-action-primary-hover);
}

.btn-primary:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

/* --------------------------------------------------------------- dashboard */

/*
 * Layout base = tablet retrato: modelo em cima, cards em grade de 2 colunas
 * abaixo. As colunas laterais entram só a partir de CALLOUT_MIN_WIDTH.
 */
.dashboard {
  position: relative;
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: minmax(300px, 1fr) auto auto;
  gap: 16px;
  padding: 16px clamp(16px, 2.2vw, 28px);
  background-color: var(--color-bg-canvas);
  overflow-x: hidden;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.stage {
  position: relative;
  grid-column: 1;
  grid-row: 1;
  min-width: 0;
  min-height: 300px;
  border-radius: 10px;
  overflow: hidden;
}

/*
 * Crachá do modelo em cena. Repete o nome do select de propósito: no layout
 * empilhado de tablet o header sai de vista ao rolar, e o crachá ainda carrega
 * as cotas e o número de fases, que o select não mostra.
 */
.stage__model {
  position: absolute;
  top: 10px;
  left: 10px;
  max-width: calc(100% - 20px);
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-left: 3px solid var(--color-action-primary);
  border-radius: 8px;
  background-color: rgba(255, 255, 255, 0.9);
  /* não pode roubar o gesto de rotação do OrbitControls */
  pointer-events: none;
}

.stage__model-name {
  font-size: var(--text-small-size);
  font-weight: 600;
  line-height: 1.3;
  color: var(--green-800);
}

.stage__model-caption {
  font-size: var(--text-caption-size);
  line-height: 1.3;
  color: var(--color-text-secondary);
}

.stage__hint {
  position: absolute;
  left: 10px;
  bottom: 10px;
  max-width: calc(100% - 20px);
  margin: 0;
  padding: 6px 12px;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  background-color: rgba(255, 255, 255, 0.88);
  font-size: var(--text-caption-size);
  line-height: 1.3;
  color: var(--color-text-secondary);
  /* não pode roubar o gesto de rotação do OrbitControls */
  pointer-events: none;
}

.card-column {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-content: start;
  gap: 12px;
  grid-column: 1;
}

.card-column--left {
  grid-row: 2;
}

.card-column--right {
  grid-row: 3;
}

/* ------------------------------------------------------------------- cards */

.part-card {
  position: relative;
  background-color: var(--white);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 12px 14px 12px 34px;
  cursor: pointer;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
}

.part-card:focus {
  outline: none;
}

/*
 * Substitui o outline removido acima: sem isso quem navega por teclado perde
 * completamente a referência de onde está (WCAG 2.4.7).
 */
.part-card:focus-visible {
  outline: 2px solid var(--color-action-primary);
  outline-offset: 2px;
}

.part-card.is-active {
  border-color: var(--color-accent);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
  transform: translateY(-1px);
}

/* marca de "destaque fixado", que sobrevive ao cursor sair do card */
.part-card.is-pinned::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 3px;
  border-radius: 10px 0 0 10px;
  background-color: var(--color-accent);
}

.part-card__index {
  position: absolute;
  top: 12px;
  left: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background-color: var(--color-action-primary);
  color: var(--white);
  font-size: var(--text-caption-size);
  font-weight: 600;
  line-height: 1;
}

.part-card.is-active .part-card__index {
  background-color: var(--color-accent-hover);
}

.part-card__title {
  margin: 0 0 4px;
  font-size: var(--text-small-size);
  font-weight: 600;
  line-height: 1.4;
  color: var(--color-text-primary);
}

.part-card__description {
  margin: 0 0 6px;
  font-size: var(--text-caption-size);
  line-height: 1.45;
  color: var(--color-text-secondary);
}

.part-card__detail {
  font-size: var(--text-caption-size);
  font-weight: 500;
  line-height: 1.3;
  color: var(--green-800);
}

/* ---------------------------------------------------------------- callouts */

/* o SVG cobre o dashboard inteiro, mas não intercepta o mouse do OrbitControls */
.callouts {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  transition: opacity 0.2s ease;
}

/*
 * Durante o giro de troca de modelo as peças varreriam a tela inteira; some
 * com as chamadas e volta com elas já no lugar. O viewer, do seu lado, para de
 * emitir âncoras enquanto gira.
 */
.callouts.is-hidden {
  opacity: 0;
}

/*
 * gray-600 e não gray-300: a linha passa tanto pelo fundo cinza-claro do
 * painel quanto pelo céu do canvas, e precisa dos 3:1 de contraste que a
 * WCAG pede para elemento gráfico significativo nos dois.
 */
.callout__line {
  fill: none;
  stroke: var(--gray-600);
  stroke-width: 1.25;
}

.callout__dot {
  fill: var(--white);
  stroke: var(--color-action-primary);
  stroke-width: 1.5;
}

.callout__label {
  fill: var(--color-action-primary);
  font-family: var(--font-family-base);
  font-size: var(--text-caption-size);
  font-weight: 600;
  text-anchor: middle;
  dominant-baseline: central;
}

.callout.is-active .callout__line {
  stroke: var(--color-accent-hover);
  stroke-width: 2.5;
}

/*
 * coral-700 no marcador ativo, não coral-500: branco sobre coral-500 não
 * atinge AA, e é a própria regra de uso da paleta em docs/requisitos.md.
 */
.callout.is-active .callout__dot {
  fill: var(--color-accent-hover);
  stroke: var(--color-accent-hover);
}

.callout.is-active .callout__label {
  fill: var(--white);
}

/* ------------------------------------------------------- aviso de celular */

.screen-guard {
  flex: 1;
  padding: 24px clamp(16px, 5vw, 32px);
  background-color: var(--color-bg-canvas);
}

.screen-guard__title {
  margin: 0 0 8px;
  font-size: var(--text-h3-size);
  font-weight: 600;
  line-height: 1.3;
  color: var(--color-text-primary);
}

.screen-guard__text {
  margin: 0;
  max-width: 46ch;
  font-size: var(--text-small-size);
  line-height: 1.5;
  color: var(--color-text-secondary);
}

/* ------------------------------------------------------------ breakpoints */

/* tablet paisagem e acima: cards nas laterais, ligados por linhas de chamada */
@media (min-width: 1024px) {
  .dashboard {
    grid-template-columns: minmax(200px, 1fr) minmax(0, 2.4fr) minmax(200px, 1fr);
    grid-template-rows: minmax(0, 1fr);
    overflow: hidden;
  }

  .card-column {
    display: flex;
    flex-direction: column;
    /*
     * space-evenly e não space-between: encostar os cards no topo e no fundo
     * da coluna deixava as linhas de chamada quase verticais nas telas altas.
     */
    justify-content: space-evenly;
    min-height: 0;
    grid-row: 1;
  }

  .card-column--left {
    grid-column: 1;
  }

  .card-column--right {
    grid-column: 3;
  }

  .stage {
    grid-column: 2;
    grid-row: 1;
    /* a linha 1fr ja ocupa a altura toda; o min-height do empilhado so
       arriscaria estourar o dashboard em telas muito baixas */
    min-height: 0;
  }
}

@media (min-width: 1280px) {
  .dashboard {
    grid-template-columns: minmax(240px, 1fr) minmax(0, 2.2fr) minmax(240px, 1fr);
    gap: 20px;
    padding: 20px clamp(20px, 2.2vw, 32px);
  }
}

/* tablet paisagem tem pouca altura: a dica ocuparia espaço útil do modelo */
@media (max-height: 560px) {
  .stage__hint {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .part-card,
  .btn-primary,
  .callouts {
    transition: none;
  }

  .part-card.is-active {
    transform: none;
  }
}
</style>

<template>
  <div id="app-shell">
    <header class="app-header">
      <h1 class="app-title">Visualizador 3D — Transformador Elétrico</h1>
      <button type="button" class="btn-primary" @click="resetCamera">
        Resetar câmera
      </button>
    </header>

    <main ref="dashboard" class="dashboard">
      <section
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
          :class="{ 'is-active': part.id === activeId }"
          tabindex="0"
          @mouseenter="activate(part.id)"
          @mouseleave="deactivate(part.id)"
          @focus="activate(part.id)"
          @blur="deactivate(part.id)"
        >
          <span class="part-card__index">{{ indexOf(part.id) }}</span>
          <h2 class="part-card__title">{{ part.label }}</h2>
          <p class="part-card__description">{{ part.description }}</p>
          <span class="part-card__detail">{{ part.detail }}</span>
        </article>
      </section>

      <div class="stage">
        <Viewer3D ref="viewer" @anchors="onAnchors" />
      </div>

      <svg class="links" :width="size.width" :height="size.height" aria-hidden="true">
        <g v-for="link in links" :key="link.id" :class="{ 'is-active': link.id === activeId }">
          <path class="links__line" :d="link.path" />
          <circle class="links__dot" :cx="link.target.x" :cy="link.target.y" r="11" />
          <text class="links__label" :x="link.target.x" :y="link.target.y">{{ link.index }}</text>
        </g>
      </svg>
    </main>
  </div>
</template>

<script>
import Viewer3D from './components/Viewer3D.vue'
import { TRANSFORMER_PARTS } from './models/parts'

// abaixo dessa largura os cards passam a empilhar e as linhas somem
const LINKS_MIN_WIDTH = 1080

export default {
  name: 'App',
  components: { Viewer3D },
  data() {
    return {
      parts: TRANSFORMER_PARTS,
      anchors: [],
      cardPoints: {},
      size: { width: 0, height: 0 },
      origin: { x: 0, y: 0 },
      activeId: null,
    }
  },
  computed: {
    /**
     * Une o ponto de saída de cada card ao ponto da peça projetado na tela.
     * O traçado sai na horizontal do card e depois segue reto até a peça.
     */
    links() {
      if (this.size.width < LINKS_MIN_WIDTH) return []

      return this.anchors.reduce((list, anchor) => {
        const card = this.cardPoints[anchor.id]
        if (!card || !anchor.visible) return list

        const target = { x: anchor.x - this.origin.x, y: anchor.y - this.origin.y }
        const stub = card.side === 'left' ? 18 : -18
        list.push({
          id: anchor.id,
          index: this.indexOf(anchor.id),
          target,
          path: `M ${card.x} ${card.y} H ${card.x + stub} L ${target.x} ${target.y}`,
        })
        return list
      }, [])
    },
  },
  mounted() {
    this.measure()
    window.addEventListener('resize', this.measure)
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.measure)
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

    /** Mede o container e o ponto de saída da linha em cada card. */
    measure() {
      const dashboard = this.$refs.dashboard
      if (!dashboard) return

      const rect = dashboard.getBoundingClientRect()
      this.size = { width: rect.width, height: rect.height }
      this.origin = { x: rect.left, y: rect.top }

      const points = {}
      this.parts.forEach((part) => {
        const element = this.$refs[`card-${part.id}`]
        const node = Array.isArray(element) ? element[0] : element
        if (!node) return
        const cardRect = node.getBoundingClientRect()
        points[part.id] = {
          side: part.side,
          x: (part.side === 'left' ? cardRect.right : cardRect.left) - rect.left,
          y: cardRect.top + cardRect.height / 2 - rect.top,
        }
      })
      this.cardPoints = points
    },

    activate(id) {
      this.activeId = id
      this.$refs.viewer.highlightPart(id)
    },

    deactivate(id) {
      if (this.activeId !== id) return
      this.activeId = null
      this.$refs.viewer.clearHighlight()
    },

    resetCamera() {
      this.$refs.viewer.resetCamera()
    },
  },
}
</script>

<style>
#app-shell {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
}

.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 20px;
  background-color: var(--color-bg-default);
  border-bottom: 1px solid var(--color-border);
}

.app-title {
  margin: 0;
  font-size: var(--text-h3-size);
  font-weight: 600;
  color: var(--green-800);
}

.dashboard {
  position: relative;
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(220px, 1fr) minmax(0, 2.2fr) minmax(220px, 1fr);
  gap: 20px;
  padding: 20px;
  background-color: var(--color-bg-canvas);
  overflow: hidden;
}

.card-column {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 12px;
  min-height: 0;
}

/* o stage fica entre as duas colunas, independente da ordem no template */
.card-column--left {
  grid-column: 1;
}

.card-column--right {
  grid-column: 3;
}

.stage {
  position: relative;
  grid-column: 2;
  grid-row: 1;
  min-width: 0;
  border-radius: 10px;
  overflow: hidden;
}

.part-card {
  position: relative;
  background-color: var(--white);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 12px 14px 12px 34px;
  cursor: default;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
}

.part-card:focus {
  outline: none;
}

.part-card.is-active {
  border-color: var(--color-accent);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
  transform: translateY(-1px);
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
  background-color: var(--color-accent);
}

.part-card__title {
  margin: 0 0 4px;
  font-size: var(--text-small-size);
  font-weight: 600;
  color: var(--color-text-primary);
}

.part-card__description {
  margin: 0 0 6px;
  font-size: var(--text-caption-size);
  line-height: 1.4;
  color: var(--color-text-secondary);
}

.part-card__detail {
  font-size: var(--text-caption-size);
  font-weight: 500;
  color: var(--green-800);
}

/* o SVG cobre o dashboard inteiro, mas não intercepta o mouse do OrbitControls */
.links {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
}

.links__line {
  fill: none;
  stroke: var(--gray-300);
  stroke-width: 1.5;
}

.links__dot {
  fill: var(--white);
  stroke: var(--color-action-primary);
  stroke-width: 1.5;
}

.links__label {
  fill: var(--color-action-primary);
  font-family: var(--font-family-base);
  font-size: var(--text-caption-size);
  font-weight: 600;
  text-anchor: middle;
  dominant-baseline: central;
}

.links .is-active .links__line {
  stroke: var(--color-accent);
  stroke-width: 2.5;
}

.links .is-active .links__dot {
  fill: var(--color-accent);
  stroke: var(--color-accent);
}

.links .is-active .links__label {
  fill: var(--white);
}

.btn-primary {
  font-family: var(--font-family-base);
  font-size: var(--text-button-size);
  font-weight: 600;
  color: var(--white);
  background-color: var(--color-action-primary);
  border: none;
  border-radius: 6px;
  padding: 8px 16px;
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

@media (max-width: 1079px) {
  .dashboard {
    grid-template-columns: 1fr;
    grid-template-rows: minmax(280px, 1fr) auto;
    overflow-y: auto;
  }

  .stage {
    grid-column: 1;
    grid-row: 1;
    min-height: 280px;
  }

  .card-column {
    display: grid;
    grid-column: 1;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    align-content: start;
    justify-content: initial;
    /* empilhado, a coluna cresce com o conteúdo em vez de transbordar a célula */
    min-height: auto;
  }
}
</style>

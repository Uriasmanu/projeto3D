<template>
  <div id="app-shell">
    <header class="app-header">
      <h1 class="app-title">Visualizador 3D — Transformador Elétrico</h1>
      <button type="button" class="btn-primary" @click="resetCamera">
        Resetar câmera
      </button>
    </header>
    <main class="app-viewer">
      <Viewer3D ref="viewer" />
    </main>
  </div>
</template>

<script>
import Viewer3D from './components/Viewer3D.vue'

export default {
  name: 'App',
  components: { Viewer3D },
  methods: {
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

.app-viewer {
  flex: 1;
  min-height: 0;
  background-color: var(--color-bg-canvas);
}
</style>

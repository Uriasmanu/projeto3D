# Passo a Passo: Visualizador 3D de Transformador Elétrico

> Roteiro de execução baseado em [spec..md](./spec..md). Marque cada item conforme for concluído.

## 0. Pré-requisitos

- [ ] Instalar **Node.js 14.x** (usar `nvm`/`nvm-windows` para isolar da versão global, já que é EOL).
- [ ] Instalar **npm** compatível com Node 14 (vem junto, geralmente npm 6.x).
- [ ] Instalar **Vue CLI 4.x** globalmente: `npm install -g @vue/cli@4`.
- [ ] Confirmar versões:
  ```bash
  node -v   # deve reportar v14.x
  npm -v
  vue --version
  ```
- [ ] Ter um modelo 3D do transformador em `.glb`/`.gltf` (ou definir que a geometria será construída manualmente em Three.js — ver seção 4).

## 1. Criar o projeto base

- [ ] Gerar o projeto com Vue CLI (preset padrão, Vue 2, sem TypeScript):
  ```bash
  vue create transformador-3d
  ```
- [ ] Mover/ajustar os arquivos gerados para a raiz do repositório atual (`c:\git\projeto3D`), ou usar a pasta gerada como raiz do projeto, conforme a estrutura definida na spec.
- [ ] Confirmar que a estrutura de pastas bate com a seção 4 da spec:
  ```
  transformador-3d/
  ├── public/index.html
  ├── src/assets/models/transformador.glb
  ├── src/components/Viewer3D.vue
  ├── src/App.vue
  ├── src/main.js
  ├── package.json
  ├── vue.config.js
  └── README.md
  ```

## 2. Configurar dependências

- [ ] Ajustar `package.json` para refletir exatamente a seção 5 da spec (`engines.node: 14.x`, `vue ^2.6.14`, `three ^0.128.0`, `@vue/cli-service ^4.5.0`, `vue-template-compiler ^2.6.14`).
- [ ] Instalar dependências:
  ```bash
  npm install
  ```
- [ ] Instalar o Three.js na versão fixada:
  ```bash
  npm install three@0.128.0
  ```

## 3. Preparar o modelo 3D

- [ ] Obter/gerar o arquivo `transformador.glb` (modelagem em Blender, download de asset licenciado, ou exportação de outra ferramenta CAD/3D).
- [ ] Otimizar o modelo (reduzir polígonos, compactar texturas) para carregamento rápido no navegador.
- [ ] Colocar o arquivo em `src/assets/models/transformador.glb`.
- [ ] Caso não haja modelo pronto, definir como fallback uma geometria simples construída via `THREE.BoxGeometry`/`THREE.CylinderGeometry` para representar o transformador (poste, tanque, buchas), documentando isso no README.

## 4. Implementar o componente `Viewer3D.vue`

- [ ] Criar `src/components/Viewer3D.vue` com:
  - [ ] `<canvas>` (ou `<div>` de montagem) ocupando 100% do container.
  - [ ] Setup de cena (`THREE.Scene`), câmera (`THREE.PerspectiveCamera`) e renderer (`THREE.WebGLRenderer`).
  - [ ] Iluminação: `THREE.AmbientLight` + `THREE.DirectionalLight`.
  - [ ] Carregamento do modelo via `GLTFLoader` (import de `three/examples/jsm/loaders/GLTFLoader`).
  - [ ] `OrbitControls` (`three/examples/jsm/controls/OrbitControls`) habilitando rotação, zoom (scroll) e pan (botão direito/dois dedos).
  - [ ] Loop de renderização (`requestAnimationFrame`) chamando `controls.update()` e `renderer.render()`.
  - [ ] Listener de `resize` da janela ajustando `camera.aspect`, `camera.updateProjectionMatrix()` e `renderer.setSize()`.
  - [ ] Limpeza no `beforeDestroy`/`unmounted` (remover listeners, dispose de geometria/materiais/renderer) para evitar memory leaks.

## 5. Integrar no app

- [ ] Importar e usar `<Viewer3D />` em `src/App.vue`.
- [ ] Garantir no `main.js` que o Vue está inicializado corretamente (`new Vue({ render: h => h(App) }).$mount('#app')`).
- [ ] Ajustar `public/index.html` (título da página, meta viewport para responsividade).
- [ ] Ajustar CSS global para o canvas/container ocupar `100vw`/`100vh` sem overflow.

## 6. Rodar e testar localmente

- [ ] Rodar em modo desenvolvimento:
  ```bash
  npm run serve
  ```
- [ ] Verificar no navegador:
  - [ ] O modelo carrega sem erros no console.
  - [ ] Rotação com arraste do mouse funciona.
  - [ ] Zoom com scroll funciona.
  - [ ] Pan com botão direito (ou dois dedos no touch) funciona.
  - [ ] Redimensionar a janela do navegador ajusta a cena corretamente.
- [ ] Testar em pelo menos dois navegadores (ex.: Chrome e Firefox/Edge).
- [ ] Testar em um dispositivo touch (tablet/celular ou emulação no DevTools), se for requisito.

## 7. Build de produção

- [ ] Gerar build:
  ```bash
  npm run build
  ```
- [ ] Validar que a pasta `dist/` é gerada sem erros/warnings críticos.
- [ ] Servir o build localmente (ex.: `npx serve dist`) e repetir os testes da seção 6.

## 8. Documentação

- [ ] Preencher `README.md` com:
  - [ ] Descrição do projeto.
  - [ ] Pré-requisitos (Node 14, etc.) e aviso sobre EOL.
  - [ ] Comandos de instalação, desenvolvimento e build.
  - [ ] Instruções de uso (controles de mouse/touch).
  - [ ] Origem/licença do modelo 3D utilizado.

## 9. Checklist final (Critérios de Aceite da spec)

- [ ] Projeto inicia sem erros com `npm run serve` usando Node 14.
- [ ] Modelo 3D do transformador é carregado e exibido corretamente na tela.
- [ ] É possível rotacionar, dar zoom e fazer pan no modelo via mouse/touch.
- [ ] A cena se redimensiona corretamente ao alterar o tamanho da janela do navegador.
- [ ] Nenhum erro é exibido no console do navegador durante o uso normal.

## 10. Próximos passos (opcional, fora do escopo atual)

- [ ] Adicionar labels/hotspots interativos nas partes do transformador (educacional).
- [ ] Adicionar modo de apresentação (auto-rotação, tour guiado).
- [ ] Migrar para versões suportadas (Vue 3 + Vite + Node LTS) quando o EOL de Node 14/Vue 2 se tornar um risco real.

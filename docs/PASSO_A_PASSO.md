# Passo a Passo: Visualizador 3D de Transformador Elétrico

> Roteiro de execução baseado em [spec.md](./spec.md) e [requisitos.md](./requisitos.md)
> (paleta de cores e tipografia). Marque cada item conforme for concluído.

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
  ├── src/assets/styles/tokens.css
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

## 5. Aplicar identidade visual (paleta e tipografia)

- [ ] Criar `src/assets/styles/tokens.css` com as variáveis CSS definidas em
  [requisitos.md](./requisitos.md#3-aplicação-de-exemplo-tokens-css) (cores verde/coral/
  cinza e `--font-family-base`).
- [ ] Adicionar no `public/index.html` o link do Google Fonts para a fonte **Inter**
  (ou incluir os arquivos da fonte em `public/fonts/` para self-host, se exigido
  offline):
  ```html
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  ```
- [ ] Importar `tokens.css` globalmente (em `src/main.js` ou `App.vue`).
- [ ] Aplicar `var(--font-family-base)` como `font-family` padrão do `body`/`#app`.
- [ ] Estilizar o header/título da aplicação e eventuais botões de controle usando
  os tokens semânticos (`--color-action-primary`, `--color-text-primary` etc.),
  evitando cores/fontes soltas fora da paleta.
- [ ] Conferir contraste de texto sobre os fundos usados (ver regras de acessibilidade
  na seção 1.6 de requisitos.md — coral não deve ser usado como cor de texto corrido).

## 6. Integrar no app

- [ ] Importar e usar `<Viewer3D />` em `src/App.vue`.
- [ ] Garantir no `main.js` que o Vue está inicializado corretamente (`new Vue({ render: h => h(App) }).$mount('#app')`).
- [ ] Ajustar `public/index.html` (título da página, meta viewport para responsividade).
- [ ] Ajustar CSS global para o canvas/container ocupar `100vw`/`100vh` sem overflow.

## 7. Rodar e testar localmente

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
  - [ ] A fonte Inter carrega corretamente (verificar aba Network/Fonts do DevTools).
  - [ ] As cores da UI batem com os tokens de requisitos.md (sem cores hardcoded fora da paleta).
- [ ] Testar em pelo menos dois navegadores (ex.: Chrome e Firefox/Edge).
- [ ] Testar em um dispositivo touch (tablet/celular ou emulação no DevTools), se for requisito.

## 8. Build de produção

- [ ] Gerar build:
  ```bash
  npm run build
  ```
- [ ] Validar que a pasta `dist/` é gerada sem erros/warnings críticos.
- [ ] Servir o build localmente (ex.: `npx serve dist`) e repetir os testes da seção 7.

## 9. Documentação

- [ ] Preencher `README.md` com:
  - [ ] Descrição do projeto.
  - [ ] Pré-requisitos (Node 14, etc.) e aviso sobre EOL.
  - [ ] Comandos de instalação, desenvolvimento e build.
  - [ ] Instruções de uso (controles de mouse/touch).
  - [ ] Origem/licença do modelo 3D utilizado.
  - [ ] Referência à paleta/tipografia definidas em requisitos.md.

## 10. Checklist final (Critérios de Aceite da spec)

- [ ] Projeto inicia sem erros com `npm run serve` usando Node 14.
- [ ] Modelo 3D do transformador é carregado e exibido corretamente na tela.
- [ ] É possível rotacionar, dar zoom e fazer pan no modelo via mouse/touch.
- [ ] A cena se redimensiona corretamente ao alterar o tamanho da janela do navegador.
- [ ] Nenhum erro é exibido no console do navegador durante o uso normal.
- [ ] A UI usa exclusivamente as cores/tokens definidos em requisitos.md.
- [ ] A fonte Inter é carregada e aplicada em todos os textos da interface.

## 11. Próximos passos (opcional, fora do escopo atual)

- [ ] Adicionar labels/hotspots interativos nas partes do transformador (educacional).
- [ ] Adicionar modo de apresentação (auto-rotação, tour guiado).
- [ ] Migrar para versões suportadas (Vue 3 + Vite + Node LTS) quando o EOL de Node 14/Vue 2 se tornar um risco real.

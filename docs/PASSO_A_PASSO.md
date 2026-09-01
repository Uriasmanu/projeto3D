# Passo a Passo: Visualizador 3D de Transformador Elétrico

> Roteiro de execução baseado em [spec.md](./spec.md) e [requisitos.md](./requisitos.md)
> (paleta de cores e tipografia). Marque cada item conforme for concluído.

## 0. Pré-requisitos

- [x] Instalar **Node.js 14.x** — já disponível no ambiente (`v14.21.3`).
- [x] Instalar **npm** compatível com Node 14 — já disponível (`6.14.18`).
- [x] ~~Instalar Vue CLI 4.x globalmente~~ — não foi necessário: o projeto usa
  `@vue/cli-service` como devDependency local e os scripts `npm run serve`/`npm run build`,
  sem depender do `vue` global.
- [x] Confirmar versões (`node -v`, `npm -v`).
- [x] Definido: **sem** modelo `.glb` real disponível ainda — implementada geometria
  procedural via Three.js como fallback (ver seção 3 e seção 4).

## 1. Criar o projeto base

- [x] ~~Gerar via `vue create`~~ — o scaffold foi montado manualmente (`package.json`,
  `babel.config.js`, `vue.config.js`, `public/index.html`, `src/`), diretamente na
  raiz do repositório, já que `vue create` exige um diretório vazio e prompts
  interativos incompatíveis com execução não interativa.
- [x] Projeto criado diretamente na raiz do repositório (`c:\git\projeto3D`), sem
  pasta `transformador-3d/` aninhada.
- [x] Confirmar que a estrutura de pastas bate com a seção 4 da spec:
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

- [x] Ajustar `package.json` para refletir exatamente a seção 5 da spec (`engines.node: 14.x`, `vue ^2.6.14`, `three ^0.128.0`, `@vue/cli-service ^4.5.0`, `vue-template-compiler ^2.6.14`). Adicionado também `@vue/cli-plugin-babel` (necessário para o `babel.config.js`).
- [x] Instalar dependências (`npm install` — 1374 pacotes, sem erros de resolução).
- [x] Three.js instalado na versão fixada: `three@0.128.0` (confirmado em `node_modules/three/package.json`).

## 3. Preparar o modelo 3D

- [ ] Obter/gerar o arquivo `transformador.glb` real (modelagem em Blender, asset licenciado ou exportação CAD) — **pendente**, fora do escopo desta implementação.
- [ ] Otimizar/colocar o modelo em `src/assets/models/transformador.glb` — pendente, depende do item acima.
- [x] Fallback implementado e refinado com base na referência fotográfica
  [`docs/transformador-de-poder-de-alta-tensão-55054468.webp`](./transformador-de-poder-de-alta-tensão-55054468.webp):
  geometria procedural (`THREE.BoxGeometry`/`THREE.LatheGeometry`/`THREE.CylinderGeometry`
  etc.) representando tanque com aletas de radiador, buchas de AT/BT empilhadas,
  tanque de expansão com tampa aparafusada, trilhos de base e válvula, em
  `buildTransformer()` (`src/components/Viewer3D.vue`), documentado no README.

## 4. Implementar o componente `Viewer3D.vue`

- [x] Criado `src/components/Viewer3D.vue` com:
  - [x] `<div>` de montagem ocupando 100% do container (canvas do WebGLRenderer é anexado dinamicamente).
  - [x] Setup de cena (`THREE.Scene`), câmera (`THREE.PerspectiveCamera`) e renderer (`THREE.WebGLRenderer`).
  - [x] Iluminação: `THREE.AmbientLight` + `THREE.DirectionalLight`.
  - [ ] Carregamento via `GLTFLoader` — não implementado ainda; hoje a cena é montada via geometria procedural (ver seção 3). Ponto de extensão para quando houver um `.glb` real.
  - [x] `OrbitControls` (`three/examples/jsm/controls/OrbitControls`) habilitando rotação, zoom (scroll) e pan (botão direito/dois dedos), com damping.
  - [x] Loop de renderização (`requestAnimationFrame`) chamando `controls.update()` e `renderer.render()`.
  - [x] Listener de `resize` da janela ajustando `camera.aspect`, `camera.updateProjectionMatrix()` e `renderer.setSize()`.
  - [x] Limpeza no `beforeDestroy` (remove listener, `dispose()` de geometrias/materiais/controls/renderer, remove o canvas do DOM).
  - [x] Método `resetCamera()` exposto, usado pelo botão "Resetar câmera" no header (`App.vue`).

## 5. Aplicar identidade visual (paleta e tipografia)

- [x] Criado `src/assets/styles/tokens.css` com as variáveis CSS definidas em
  [requisitos.md](./requisitos.md#3-aplicação-de-exemplo-tokens-css) (cores verde/coral/
  cinza e `--font-family-base`).
- [x] Adicionado no `public/index.html` o link do Google Fonts para a fonte **Inter**.
- [x] `tokens.css` importado globalmente em `src/main.js`.
- [x] `var(--font-family-base)` aplicado como `font-family` padrão do `body`.
- [x] Header/título e botão "Resetar câmera" estilizados com os tokens semânticos
  (`--color-action-primary`, `--green-800`, `--color-text-primary` etc.) em `App.vue`.
- [x] Coral não é usado como cor de texto em nenhum componente (regra seguida por
  não ter sido necessário nenhum elemento de destaque/alerta nesta primeira versão).
  Contraste verde/branco no botão primário e no header não foi medido com ferramenta
  de acessibilidade — **verificação visual em navegador ainda pendente** (ver seção 7).

## 6. Integrar no app

- [x] `<Viewer3D />` importado e usado em `src/App.vue`, dentro de um header +
  área de conteúdo (`<main>`).
- [x] `main.js` inicializa o Vue corretamente (`new Vue({ render: h => h(App) }).$mount('#app')`).
- [x] `public/index.html` ajustado (título, meta viewport, fonte).
- [x] CSS global (`tokens.css`) ajusta `html/body/#app` para `100%`/sem margin;
  `App.vue` usa `100vh`/`100vw` no shell e `flex: 1` na área do viewer.

## 7. Rodar e testar localmente

- [x] Rodado em modo desenvolvimento (`npm run serve`): compilou com sucesso
  (`Compiled successfully`) e respondeu `HTTP 200` em `http://localhost:8080/`.
- [x] Verificação visual feita via Chrome headless (Puppeteer, dependência
  temporária removida após o teste) com screenshots comparados à referência:
  - [x] O modelo carrega sem erros no console (nenhuma mensagem `error`/`pageerror`;
    o único evento fora do padrão foi um `WebGL context lost/restored` causado
    pelo próprio hot-reload do webpack durante o teste, não pelo app).
  - [x] Rotação com arraste do mouse funciona (`OrbitControls` testado via
    `mouse.down/move/up`; screenshot confirma o modelo rotacionado).
  - [ ] Zoom com scroll — implementado (`OrbitControls` padrão), não exercitado
    no teste automatizado (Puppeteer não simulou wheel). Pendente checar manualmente.
  - [ ] Pan com botão direito/dois dedos — implementado, não exercitado no teste
    automatizado. Pendente checar manualmente.
  - [ ] Redimensionar a janela do navegador — listener implementado
    (`onWindowResize`), não exercitado no teste automatizado.
  - [x] A fonte Inter está referenciada e o header renderiza com a tipografia
    esperada nos screenshots.
  - [x] Cores da UI (header verde, botão primário) conferem visualmente com os
    tokens de requisitos.md nos screenshots.
- [ ] Testar em pelo menos dois navegadores (só Chrome foi testado neste ambiente).
- [ ] Testar em um dispositivo touch (tablet/celular ou emulação no DevTools), se for requisito.

## 8. Build de produção

- [x] Build gerado (`npm run build`): concluído com sucesso, apenas warnings de
  tamanho de bundle (esperado, `three.js` é grande — `chunk-vendors.js` ~647 KiB).
- [x] Pasta `dist/` gerada sem erros.
- [ ] Servir o build localmente (`npx serve dist`) e repetir os testes visuais da seção 7 — pendente (mesma limitação de ambiente).

## 9. Documentação

- [x] `README.md` preenchido com:
  - [x] Descrição do projeto.
  - [x] Pré-requisitos (Node 14, etc.) e aviso sobre EOL.
  - [x] Comandos de instalação, desenvolvimento e build.
  - [x] Instruções de uso (controles de mouse/touch).
  - [x] Nota sobre ausência do modelo `.glb` real e uso do fallback procedural.
  - [x] Referência à paleta/tipografia definidas em requisitos.md.

## 10. Checklist final (Critérios de Aceite da spec)

- [x] Projeto inicia sem erros com `npm run serve` usando Node 14 (confirmado: compilação e resposta HTTP 200).
- [x] Um modelo 3D do transformador é carregado e exibido na tela — geometria procedural modelada a partir da foto de referência (**ainda não é o asset `.glb` real**, ver seção 3), confirmado visualmente via screenshot.
- [x] Rotação confirmada visualmente (screenshot antes/depois do arraste). Zoom (scroll) e pan (botão direito/touch) estão implementados via `OrbitControls` mas **não foram exercitados no teste automatizado** — pendente checagem manual.
- [ ] A cena se redimensiona corretamente ao alterar o tamanho da janela do navegador — listener implementado, **não exercitado no teste automatizado**.
- [x] Nenhum erro é exibido no console durante o carregamento/interação testados (só um `context lost/restored` do próprio hot-reload do dev server, não do app).
- [x] A UI usa exclusivamente as cores/tokens definidos em requisitos.md (revisão de código + conferência visual nos screenshots).
- [x] A fonte Inter está referenciada via Google Fonts e renderiza no header, confirmado nos screenshots.

> **Ação recomendada:** abrir `npm run serve` em um navegador local e checar manualmente zoom (scroll), pan (botão direito/touch) e redimensionamento da janela — únicos itens ainda não exercitados em teste automatizado.

## 11. Próximos passos (opcional, fora do escopo atual)

- [ ] Adicionar labels/hotspots interativos nas partes do transformador (educacional).
- [ ] Adicionar modo de apresentação (auto-rotação, tour guiado).
- [ ] Migrar para versões suportadas (Vue 3 + Vite + Node LTS) quando o EOL de Node 14/Vue 2 se tornar um risco real.

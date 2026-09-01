# Transformador 3D

Visualizador 3D interativo de um transformador elétrico (tipo poste/subestação),
renderizado no navegador com Vue 2 + Three.js. Uso: apresentação, treinamento
ou documentação técnica.

Especificação completa em [docs/spec.md](./docs/spec.md), roteiro de execução em
[docs/PASSO_A_PASSO.md](./docs/PASSO_A_PASSO.md) e identidade visual (paleta de
cores e tipografia) em [docs/requisitos.md](./docs/requisitos.md).

## Pré-requisitos

- **Node.js 14.x** — obrigatório: o projeto usa Vue CLI 4 / webpack 4, que não são
  compatíveis com versões mais novas do Node. Node 14 está fora do ciclo de suporte
  oficial (EOL); use `nvm`/`nvm-windows` para isolar essa versão do restante do sistema.
- npm 6.x (instalado junto com o Node 14).

## Instalação e execução

```bash
# instalar dependências
npm install

# rodar em modo desenvolvimento (http://localhost:8080)
npm run serve

# gerar build de produção (pasta dist/)
npm run build
```

## Uso

- **Rotação:** clique e arraste com o botão esquerdo do mouse (ou um dedo no touch).
- **Zoom:** scroll do mouse (ou pinça no touch).
- **Pan:** clique e arraste com o botão direito do mouse (ou dois dedos no touch).
- **Resetar câmera:** botão no header da página.

## Modelo 3D

Ainda não há um asset `.glb`/`.gltf` do transformador. Enquanto isso, o componente
[`Viewer3D.vue`](./src/components/Viewer3D.vue) renderiza uma geometria procedural
construída com primitivas do Three.js (poste, tanque, aletas de refrigeração e
buchas), representando um transformador de poste. Ao obter um modelo `.glb` real,
substitua essa geometria por um carregamento via `GLTFLoader` a partir de
`src/assets/models/transformador.glb`.

## Identidade visual

Cores e tipografia seguem os tokens definidos em
[docs/requisitos.md](./docs/requisitos.md) e centralizados em
[`src/assets/styles/tokens.css`](./src/assets/styles/tokens.css) (verde `#008242`
como cor primária, coral `#F47A57` como destaque, base neutra em branco/cinza/preto,
fonte **Inter**).

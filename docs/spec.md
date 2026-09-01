# Spec: Visualizador 3D de Transformador Elétrico

## 1. Visão Geral

Projeto de software com o objetivo de renderizar, em um navegador web, um modelo 3D
interativo de um transformador elétrico (tipo poste/subestação). O usuário poderá
visualizar o modelo de diferentes ângulos, aplicando zoom e rotação, para fins de
apresentação, treinamento ou documentação técnica.

## 2. Stack Tecnológica

| Camada        | Tecnologia            | Versão      |
|---------------|------------------------|-------------|
| Frontend      | Vue.js                 | 2.x (2018)  |
| Runtime       | Node.js                | 14.x        |
| Biblioteca 3D | Three.js               | compatível com Node 14 / Vue 2 |
| Build Tool    | Vue CLI (webpack)       | 4.x         |

> **Observação:** Node 14 e Vue 2 estão fora do ciclo de suporte oficial (EOL).
> Recomenda-se usá-los apenas se for um requisito fixo do ambiente do projeto.

## 3. Funcionalidade Principal

- Carregar e renderizar um modelo 3D de um transformador elétrico (formato `.glb`/`.gltf`
  ou geometria construída via Three.js).
- Interação básica via `OrbitControls`:
  - Rotação (arrastar com o mouse)
  - Zoom (scroll)
  - Pan (arrastar com botão direito ou dois dedos)
- Iluminação básica de cena (luz ambiente + luz direcional).
- Responsividade: o canvas 3D deve se ajustar ao redimensionar a janela.
- Interface (header/título, textos e eventuais botões de controle como "resetar
  câmera") seguindo a identidade visual definida em [requisitos.md](./requisitos.md)
  (paleta de cores e tipografia).

## 4. Estrutura de Pastas

```
transformador-3d/
├── public/
│   └── index.html
├── src/
│   ├── assets/
│   │   ├── models/
│   │   │   └── transformador.glb
│   │   └── styles/
│   │       └── tokens.css
│   ├── components/
│   │   └── Viewer3D.vue
│   ├── App.vue
│   └── main.js
├── package.json
├── vue.config.js
└── README.md
```

> `styles/tokens.css` contém as variáveis de cor e tipografia definidas em
> [requisitos.md](./requisitos.md) (seção 3, "Aplicação de exemplo").

## 5. Dependências (package.json)

```json
{
  "name": "transformador-3d",
  "version": "1.0.0",
  "engines": {
    "node": "14.x"
  },
  "dependencies": {
    "vue": "^2.6.14",
    "three": "^0.128.0"
  },
  "devDependencies": {
    "@vue/cli-service": "^4.5.0",
    "vue-template-compiler": "^2.6.14"
  },
  "scripts": {
    "serve": "vue-cli-service serve",
    "build": "vue-cli-service build"
  }
}
```

## 6. Passos de Instalação e Execução

```bash
# instalar dependências
npm install

# rodar em modo desenvolvimento
npm run serve

# gerar build de produção
npm run build
```

## 7. Identidade Visual e UI

A interface (elementos ao redor do canvas 3D: header, textos, botões de controle)
deve seguir a paleta de cores e a tipografia definidas em
[requisitos.md](./requisitos.md):

- **Paleta:** verde `#008242` (cor primária/ação), coral `#F47A57` (destaque, uso
  moderado), branco/cinza/preto como base neutra.
- **Tipografia:** família **Inter** (Google Fonts ou self-host), com a escala de
  tamanhos/pesos definida em requisitos.md.
- Os valores devem ser centralizados como tokens CSS (`src/assets/styles/tokens.css`)
  e reutilizados nos componentes, evitando cores/fontes "soltas" no código.

## 8. Critérios de Aceite

- [ ] O projeto inicia sem erros com `npm run serve` usando Node 14.
- [ ] O modelo 3D do transformador é carregado e exibido corretamente na tela.
- [ ] É possível rotacionar, dar zoom e fazer pan no modelo via mouse/touch.
- [ ] A cena se redimensiona corretamente ao alterar o tamanho da janela do navegador.
- [ ] Nenhum erro é exibido no console do navegador durante o uso normal.
- [ ] A UI usa exclusivamente as cores/tokens definidos em requisitos.md (sem cores
      hardcoded fora da paleta).
- [ ] A fonte Inter é carregada corretamente e aplicada em todos os textos da interface.
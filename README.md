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
- **Pan:** clique e arraste com o botão direito do mouse (ou dois dedos no touch);
  pelo teclado, foque o canvas com `Tab` e use as setas.
- **Resetar câmera:** botão no header da página.
- **Trocar de modelo:** select no header. As variantes ficam distribuídas em
  partes iguais de um círculo invisível e o anel gira, pelo caminho mais curto,
  até trazer a escolhida para a frente — como um carrossel de seleção de
  personagem. O equipamento não roda no próprio eixo: ele percorre o arco.
  Durante o giro as duas variantes envolvidas ficam visíveis (é o que torna o
  movimento do anel legível); parado, só a selecionada fica em cena.
- **Cards das peças:** o transformador fica no centro do dashboard e cada peça tem
  um card ligado a ela por uma linha de chamada numerada, que acompanha o modelo
  enquanto a câmera gira. Passar o mouse (ou dar foco pelo teclado) em um card
  realça a peça no 3D com a cor de destaque; **clicar ou tocar** no card fixa esse
  destaque (clicar de novo, ou `Esc`, solta) — é o caminho de uso em tablet, onde
  não existe hover. As peças e seus textos ficam em
  [`src/models/parts.js`](./src/models/parts.js).

## Tamanhos de tela

A página é dimensionada para **tablet em diante**; celular está fora do escopo.
As faixas estão declaradas em [`src/App.vue`](./src/App.vue) (constantes
`MIN_WIDTH`/`CALLOUT_MIN_WIDTH` no `<script>` e as media queries equivalentes no
`<style>` — os dois lados precisam ser alterados juntos):

| Largura        | Layout                                                            |
|----------------|-------------------------------------------------------------------|
| `< 768px`      | celular: entra um aviso de tela pequena e o viewer não é montado  |
| `768–1023px`   | tablet retrato: modelo em cima, cards em grade de 2 colunas abaixo; os marcadores numerados continuam sobre o modelo, sem as linhas |
| `>= 1024px`    | tablet paisagem e acima: cards nas duas laterais, ligados por linhas de chamada |
| `>= 1280px`    | mesmo layout, com colunas e respiros maiores                      |

Notas de acessibilidade: os cards são `role="button"` com `aria-pressed`, foco
visível via `:focus-visible` e alvos de toque de no mínimo 44px; o canvas tem
nome acessível e entra na ordem de tabulação; as animações respeitam
`prefers-reduced-motion`.

## Modelos

São três variantes, especificadas em
[`src/models/transformers.js`](./src/models/transformers.js):

| Modelo                     | Tanque (m)        | Fases | Radiador                        |
|----------------------------|-------------------|-------|---------------------------------|
| Potência — trifásico       | 3,2 × 1,8 × 1,7   | 3     | 16 aletas/face longa + 8/curta  |
| Distribuição — monofásico  | 2,0 × 1,6 × 1,3   | 1     | 10 aletas, só nas faces longas  |
| Força — grande porte       | 4,2 × 2,2 × 2,0   | 3     | 22 aletas/face longa + 11/curta |

Cada item do arquivo é só cotas e contagens — nenhuma geometria. O `Viewer3D`
constrói as três com os mesmos construtores de peça, então todas compartilham a
mesma linguagem construtiva e diferem em proporção, porte e nível de detalhe.
Detalhe pequeno de metal (parafuso, cordão de solda, seção de aleta) fica em
cota **absoluta** de propósito: um transformador maior tem, de verdade,
proporcionalmente mais parafusos e mais aletas, e não parafusos maiores.

### Encaixe no palco

As cotas na especificação são as reais de cada equipamento, mas o modelo em cena
é normalizado antes de aparecer (`normalizeModel`): centrado em X/Z, apoiado em
`y = 0` e reescalado para que sua **esfera envolvente** tenha o raio de
`FRAME_RADIUS`. Assim o modelo selecionado ocupa sempre o mesmo espaço, como se
fosse o único da cena, e a diferença entre as variantes aparece como diferença
de proporção — não de tamanho na tela.

O carrossel preserva esse encaixe por construção (`layoutCarousel`): o anel é
recuado em Z pelo próprio raio e cada posição `i` é colocada no ângulo
`slotAngle(i)` do círculo. Com o anel na rotação `-slotAngle(i)`, a posição `i`
cai **exatamente** na origem do mundo — o mesmo lugar de um modelo sozinho na
cena. No fim do giro a rotação do anel é fixada no ângulo exato da posição de
destino, para o encaixe não acumular erro de interpolação.

### Translação, não rotação (`setCarouselAngle`)

Girar o anel não basta: se cada posição mantivesse uma rotação própria fixa, a
rotação do modelo no mundo seria `ângulo do anel + ângulo da posição`, que varia
durante a troca — o equipamento giraria em torno de si mesmo. E como ele parte
exatamente da origem, que é para onde a câmera aponta, o efeito visual era de um
**pião girando parado**, com o deslocamento pelo arco quase imperceptível.

Por isso `setCarouselAngle` gira o anel e **contra-gira** todas as posições pelo
mesmo ângulo. O modelo herda do anel apenas a *posição*: translada pelo arco
mantendo sempre a mesma face para a câmera, como os itens de um carrossel de
seleção. O contra-giro é igual para todas as posições, então nenhuma variante
aparece de lado, nem as que estão no fundo do anel.

Há um teste de regressão para exatamente isso: mede a rotação no mundo de cada
modelo quadro a quadro durante a troca e exige zero. Com um controle negativo
que reproduz o comportamento antigo, o giro no próprio eixo chegava a 177,4°;
com a contra-rotação é 0,0° nos 51 quadros do arco.

Um detalhe de enquadramento: a câmera padrão olha o anel de apenas ~13° de
elevação, quase de perfil. Nessa altura **não existe raio** que jogue as duas
posições vizinhas para fora do quadro — uma delas cai sempre perto do eixo da
câmera, atrás da posição da frente. O raio (`CAROUSEL_RADIUS`) controla a
distância dela: em 4,6 m a vizinha de trás fica a ~15 m da câmera contra ~8 m da
da frente, ou seja, com metade do tamanho aparente e já pegando neblina — lê-se
como outra unidade mais atrás no anel, que é o comportamento correto de um
carrossel visto de baixo. Subir a câmera faria o círculo aparecer como elipse e
o arco ficar mais óbvio, ao custo de mudar o enquadramento do modelo.

A normalização é pela esfera, e não pela maior aresta da caixa: a esfera não
depende do ângulo da câmera, então as três ocupam a mesma área em tela de
qualquer ponto da órbita (com a maior aresta, o equipamento mais fundo ficava
15% mais largo que os outros). O raio escolhido é o da variante de referência,
que por isso fica em escala 1:1.

## Geometria

Ainda não há um asset `.glb`/`.gltf` do transformador. Enquanto isso, o componente
[`Viewer3D.vue`](./src/components/Viewer3D.vue) renderiza uma geometria procedural
construída com primitivas do Three.js, modelada com base na referência
[`docs/transformador-de-poder-de-alta-tensão-55054468.webp`](./docs/transformador-de-poder-de-alta-tensão-55054468.webp):
tanque retangular com aletas de radiador corrugadas, tampa aparafusada, duas
fileiras de buchas de porcelana (3 de alta tensão à frente + 3 de baixa tensão
atrás, com conectores entre pares), tanque de expansão/conservador cilíndrico
com tampa aparafusada montado sobre um suporte, termômetro de óleo soldado no
centro da tampa frontal do conservador (mostrador de 0 a 120 °C desenhado em
canvas e aplicado como textura, com faixa de alarme em vermelho acima de 95 °C),
trilhos de base e válvula de dreno. Ao obter um modelo `.glb` real, substitua essa geometria por um
carregamento via `GLTFLoader` a partir de `src/assets/models/transformador.glb`.

## Identidade visual

Cores e tipografia seguem os tokens definidos em
[docs/requisitos.md](./docs/requisitos.md) e centralizados em
[`src/assets/styles/tokens.css`](./src/assets/styles/tokens.css) (verde `#008242`
como cor primária, coral `#F47A57` como destaque, base neutra em branco/cinza/preto,
fonte **Inter**).

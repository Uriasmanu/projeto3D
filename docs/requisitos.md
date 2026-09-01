# Requisitos Visuais: Identidade e UI

> Complementa [spec.md](./spec.md). Define a paleta de cores e a tipografia a serem
> usadas na interface (chrome ao redor do canvas 3D: header, botões, labels, painéis
> de controle etc.), mantendo o canvas 3D como elemento neutro de fundo.

## 1. Paleta de Cores

### 1.1 Cores-base

| Papel              | Cor         | Hex       |
|--------------------|-------------|-----------|
| Primária           | Verde       | `#008242` |
| Secundária/Destaque| Coral       | `#F47A57` |
| Neutro claro       | Branco      | `#FFFFFF` |
| Neutro escuro      | Preto       | `#000000` |
| Neutro intermediário| Cinza      | escala abaixo |

### 1.2 Escala do Verde (`#008242`)

| Token         | Hex       | Uso sugerido                          |
|---------------|-----------|----------------------------------------|
| `green-50`    | `#E6F3EC` | fundo de destaque suave, hover sutil   |
| `green-100`   | `#BFE0D0` | bordas, estados desabilitados          |
| `green-300`   | `#80C1A1` | ícones secundários, indicadores        |
| `green-500`   | `#40A171` | elementos de apoio                     |
| `green-600`   | `#008242` | **cor primária** — botões, header, links, foco |
| `green-700`   | `#006F38` | hover/active de botão primário         |
| `green-800`   | `#005B2E` | texto sobre fundo claro, estado pressed|

### 1.3 Escala do Coral (`#F47A57`)

| Token        | Hex       | Uso sugerido                                   |
|--------------|-----------|--------------------------------------------------|
| `coral-50`   | `#FDEBE6` | fundo de alerta/aviso leve                       |
| `coral-100`  | `#FBCABC` | badges, tags informativas                        |
| `coral-300`  | `#F7A289` | hover de elementos secundários                   |
| `coral-500`  | `#F47A57` | **cor de destaque/CTA secundário** — usar com moderação (ações de atenção, hotspots, badges) |
| `coral-700`  | `#CF684A` | hover/active sobre coral                         |
| `coral-800`  | `#AB553D` | texto sobre fundo coral claro                    |

### 1.4 Escala de Cinza

| Token        | Hex       | Uso sugerido                                  |
|--------------|-----------|-------------------------------------------------|
| `gray-50`    | `#F2F2F2` | fundo de página / painéis claros                |
| `gray-100`   | `#D9D9D9` | divisores, bordas leves                         |
| `gray-300`   | `#B3B3B3` | bordas de inputs, placeholders                  |
| `gray-500`   | `#8C8C8C` | texto secundário, ícones inativos               |
| `gray-600`   | `#666666` | texto de apoio sobre fundo claro                |
| `gray-800`   | `#3D3D3D` | texto principal sobre fundo claro               |
| `gray-900`   | `#1F1F1F` | fundo escuro (modo dark / overlay do viewer 3D) |
| `black`      | `#000000` | texto de máximo contraste, usar com parcimônia  |

### 1.5 Papéis de uso (design tokens)

| Token semântico       | Valor         | Aplicação                                    |
|------------------------|---------------|-----------------------------------------------|
| `color-bg-default`     | `#FFFFFF`     | fundo geral da aplicação                      |
| `color-bg-canvas`      | `gray-50`/`gray-900` | fundo atrás do canvas 3D (claro ou escuro conforme tema) |
| `color-bg-surface`     | `#FFFFFF`     | cards, painéis, modais                        |
| `color-text-primary`   | `gray-800`    | texto principal                               |
| `color-text-secondary` | `gray-600`    | texto de apoio, legendas                      |
| `color-border`         | `gray-100`    | divisores e bordas neutras                    |
| `color-action-primary` | `green-600`   | botões primários, links, foco, estado ativo   |
| `color-action-primary-hover` | `green-700` | hover/active do botão primário          |
| `color-accent`         | `coral-500`   | CTA secundário, hotspots no modelo, alertas leves |
| `color-accent-hover`   | `coral-700`   | hover/active do accent                        |

### 1.6 Regras de uso

- **Verde (`#008242`)** é a cor de identidade principal: usar em header/logo, botão
  primário (ex.: "Resetar câmera", "Tela cheia"), estados de foco e links.
- **Coral (`#F47A57`)** é cor de destaque e deve ser usada com moderação — reservada
  para chamadas de atenção pontuais (hotspots interativos no modelo, badges, ícones
  de alerta). Evitar grandes áreas sólidas em coral.
- **Branco/cinza/preto** compõem a base neutra: fundo, texto e hierarquia visual.
  Preto puro (`#000000`) só em texto de alto contraste ou ícones; preferir `gray-800`
  para blocos grandes de texto (menos duro visualmente).
- **Contraste (acessibilidade):** `green-600` sobre branco e branco sobre `green-600`
  atendem WCAG AA para texto; `coral-500` sobre branco **não** atende AA para texto
  pequeno — usar coral apenas para elementos gráficos/ícones ou combinar com texto
  em `coral-800`/preto.
- **Modo escuro (opcional):** usar `gray-900` como fundo, `gray-50`/branco como texto,
  manter `green-500`/`green-300` para ações (mais legível sobre fundo escuro que o
  `green-600`).

## 2. Tipografia

### 2.1 Família tipográfica

| Uso              | Fonte                                   | Fallback                        |
|-------------------|------------------------------------------|----------------------------------|
| Texto de interface (padrão) | **Inter**                     | `-apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif` |
| Números/dados técnicos (opcional) | **Inter** (mesma família, uso de `tabular-nums`) | mesmo fallback acima |

> Justificativa: Inter é gratuita (Google Fonts / self-host), tem excelente
> legibilidade em telas e ampla variação de pesos, adequada tanto para textos
> técnicos (treinamento/documentação) quanto para UI de produto.

### 2.2 Escala tipográfica

| Token       | Tamanho | Peso | Line-height | Uso                              |
|-------------|---------|------|-------------|-----------------------------------|
| `text-h1`   | 32px    | 700  | 1.2         | Título principal da página        |
| `text-h2`   | 24px    | 600  | 1.25        | Títulos de seção / painéis        |
| `text-h3`   | 18px    | 600  | 1.3         | Subtítulos, títulos de card       |
| `text-body` | 16px    | 400  | 1.5         | Texto padrão de interface         |
| `text-small`| 14px    | 400  | 1.4         | Texto de apoio, legendas, labels  |
| `text-caption` | 12px | 500  | 1.3         | Tags, badges, metadados           |
| `text-button`  | 14px | 600  | 1           | Texto de botões                   |

### 2.3 Diretrizes de aplicação

- Cor de texto padrão: `color-text-primary` (`gray-800`) sobre fundo claro.
- Títulos (`h1`/`h2`) podem usar `green-800` quando precisarem reforçar a identidade
  de marca (ex.: título do header).
- Nunca usar coral como cor de texto corrido — apenas em `text-caption`/badges,
  em `coral-800` sobre fundo claro ou branco sobre `coral-700`.
- Manter no mínimo 1 peso de reserva (600) para estados de ênfase, evitando itálico
  (baixa legibilidade em telas de baixa resolução, comum em contexto industrial/treinamento).

## 3. Aplicação de exemplo (tokens CSS)

```css
:root {
  /* Verde */
  --green-50: #E6F3EC;
  --green-100: #BFE0D0;
  --green-300: #80C1A1;
  --green-500: #40A171;
  --green-600: #008242; /* primária */
  --green-700: #006F38;
  --green-800: #005B2E;

  /* Coral */
  --coral-50: #FDEBE6;
  --coral-100: #FBCABC;
  --coral-300: #F7A289;
  --coral-500: #F47A57; /* destaque */
  --coral-700: #CF684A;
  --coral-800: #AB553D;

  /* Neutros */
  --white: #FFFFFF;
  --gray-50: #F2F2F2;
  --gray-100: #D9D9D9;
  --gray-300: #B3B3B3;
  --gray-500: #8C8C8C;
  --gray-600: #666666;
  --gray-800: #3D3D3D;
  --gray-900: #1F1F1F;
  --black: #000000;

  /* Tokens semânticos */
  --color-bg-default: var(--white);
  --color-bg-canvas: var(--gray-50);
  --color-text-primary: var(--gray-800);
  --color-text-secondary: var(--gray-600);
  --color-border: var(--gray-100);
  --color-action-primary: var(--green-600);
  --color-action-primary-hover: var(--green-700);
  --color-accent: var(--coral-500);
  --color-accent-hover: var(--coral-700);

  /* Tipografia */
  --font-family-base: 'Inter', -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
}
```

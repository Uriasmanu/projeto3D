/**
 * Variantes de transformador oferecidas no select do dashboard.
 *
 * Cada item é uma *especificação*: só cotas e contagens, sem geometria. O
 * Viewer3D constrói as três a partir daqui com os mesmos construtores de peça,
 * então todas compartilham a mesma linguagem construtiva (tanque retangular,
 * aletas de radiador, buchas de AT/BT, conservador com termômetro de óleo,
 * válvula de dreno) e diferem em proporção, porte e nível de detalhe.
 *
 * As cotas estão em metros e são as REAIS de cada equipamento — o Viewer3D
 * normaliza cada modelo para a mesma caixa de referência antes de exibir, de
 * modo que o selecionado sempre ocupe o mesmo espaço no palco. É por isso que
 * a diferença entre eles aparece como diferença de *proporção* e de densidade
 * de detalhe, e não de tamanho na tela.
 *
 * `details` sobrescreve, por peça, o campo `detail` dos cards em parts.js: a
 * descrição física é a mesma nas três variantes, mas os números não.
 */
export const TRANSFORMER_MODELS = [
  {
    id: 'potencia',
    label: 'Potência — trifásico',
    caption: 'Subestação · tanque 3,2 × 1,8 × 1,7 m · 3 fases',
    tank: { width: 3.2, height: 1.8, depth: 1.7 },
    // `side: 0` desliga as aletas das faces curtas
    fins: { front: 16, side: 8, depth: 0.22 },
    bushings: {
      phases: 3,
      // `step` é a distância entre fases, no eixo X
      hv: { height: 1.0, sheds: 7, shaftRadius: 0.055, shedRadius: 0.16, step: 0.95 },
      lv: { height: 0.55, sheds: 5, shaftRadius: 0.05, shedRadius: 0.13, step: 0.75 },
    },
    conservator: { radius: 0.35 },
    details: {
      buchas: '3 de alta + 3 de baixa tensão',
      radiadores: '16 aletas por face longa + 8 por face curta',
      conservador: 'cilindro de 0,70 m com termômetro de óleo',
      tanque: 'aço pintado · 3,2 × 1,8 × 1,7 m',
    },
  },
  {
    id: 'distribuicao',
    label: 'Distribuição — monofásico',
    caption: 'Rede de distribuição · tanque 2,0 × 1,6 × 1,3 m · 1 fase',
    tank: { width: 2.0, height: 1.6, depth: 1.3 },
    // parede corrugada só nas faces longas, como nos transformadores de poste
    fins: { front: 10, side: 0, depth: 0.2 },
    bushings: {
      phases: 2,
      hv: { height: 0.7, sheds: 5, shaftRadius: 0.05, shedRadius: 0.14, step: 0.8 },
      lv: { height: 0.4, sheds: 4, shaftRadius: 0.045, shedRadius: 0.115, step: 0.6 },
    },
    conservator: { radius: 0.26 },
    details: {
      buchas: '2 de alta + 2 de baixa tensão',
      radiadores: '10 aletas, só nas faces longas',
      conservador: 'cilindro de 0,52 m com termômetro de óleo',
      tanque: 'aço pintado · 2,0 × 1,6 × 1,3 m',
    },
  },
  {
    id: 'forca',
    label: 'Força — grande porte',
    caption: 'Grande porte · tanque 4,2 × 2,2 × 2,0 m · 3 fases',
    tank: { width: 4.2, height: 2.2, depth: 2.0 },
    fins: { front: 22, side: 11, depth: 0.26 },
    bushings: {
      phases: 3,
      hv: { height: 1.4, sheds: 9, shaftRadius: 0.065, shedRadius: 0.19, step: 1.3 },
      lv: { height: 0.75, sheds: 6, shaftRadius: 0.058, shedRadius: 0.15, step: 1.02 },
    },
    conservator: { radius: 0.42 },
    details: {
      buchas: '3 de alta + 3 de baixa tensão, mais altas',
      radiadores: '22 aletas por face longa + 11 por face curta',
      conservador: 'cilindro de 0,84 m com termômetro de óleo',
      tanque: 'aço pintado · 4,2 × 2,2 × 2,0 m',
    },
  },
]

export const DEFAULT_MODEL_ID = TRANSFORMER_MODELS[0].id

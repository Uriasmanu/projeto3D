/**
 * Partes do transformador exibidas como cards no dashboard.
 *
 * O `id` é a chave compartilhada entre a geometria (Viewer3D registra cada
 * grupo com esse id) e a interface (App desenha um card por item e liga a
 * linha de chamada até a posição da peça projetada na tela). `side` define em
 * qual coluna o card é renderizado.
 *
 * Peças que existem na cena 3D mas não estão listadas aqui (base, tampa,
 * válvula e placa de advertência) continuam sendo desenhadas, apenas sem card
 * nem linha de chamada — App ignora âncoras sem card correspondente.
 */
export const TRANSFORMER_PARTS = [
  {
    id: 'buchas',
    side: 'left',
    label: 'Buchas / isoladores',
    description:
      'Isoladores de porcelana que conduzem a energia para dentro do tanque sem contato com a carcaça. As saias escalonadas aumentam o caminho de fuga.',
    detail: '3 de alta + 3 de baixa tensão',
  },
  {
    id: 'radiadores',
    side: 'left',
    label: 'Radiadores',
    description:
      'Aletas verticais que aumentam a área de troca térmica e dissipam por convecção natural o calor absorvido pelo óleo.',
    detail: 'aletas nas laterais',
  },
  {
    id: 'conservador',
    side: 'right',
    label: 'Conservador de óleo',
    description:
      'Compartimento cilíndrico acoplado ao tanque que acomoda a expansão e a contração do óleo isolante conforme a temperatura varia.',
    detail: 'tampa circular aparafusada',
  },
  {
    id: 'tanque',
    side: 'right',
    label: 'Tanque principal',
    description:
      'Carcaça de aço que abriga o núcleo, os enrolamentos e o óleo isolante — o corpo estrutural do equipamento.',
    detail: 'aço pintado',
  },
]

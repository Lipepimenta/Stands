/* ==========================================================================
   CONFIGURAÇÃO DO SITE — edite aqui os dados da JM
   Imagens: salve os arquivos em /assets/img/... e coloque o caminho abaixo.
   Enquanto um caminho estiver vazio (''), o site mostra o placeholder.
   ========================================================================== */

window.SITE = {
  // Número com DDI + DDD, só dígitos. Ex.: 5511987654321
  whatsapp: '5541995605724',

  // Mensagem padrão dos botões de WhatsApp (flutuante e rodapé)
  whatsappMessage: 'Olá, JM! Gostaria de conversar sobre um projeto de stand.',

  // E-mail que recebe as solicitações enviadas "por e-mail"
  email: 'marcenariarodsouza@gmail.com',

  // Formulário "Solicitar projeto"
  form: {
    // Sem endpoint: o briefing abre no WhatsApp/e-mail do cliente e ele anexa os arquivos por lá.
    // Com endpoint (ex.: 'https://formspree.io/f/xxxxxxx'): dados E arquivos chegam automaticamente
    // no e-mail da JM, sem o cliente precisar anexar nada. Veja o README.
    endpoint: '',
    maxUploadMB: 25 // limite total de anexos quando há endpoint
  },

  // Redes sociais — cole o link completo. Ícone vazio ('') não aparece no site.
  social: {
    instagram: 'https://www.instagram.com/jmstands_',
    facebook: '',
    linkedin: '',
    youtube: ''
  },

  // Medição de acessos — só carregam DEPOIS que o visitante aceitar os cookies.
  analytics: {
    ga4: '',       // Google Analytics 4, ex.: 'G-XXXXXXXXXX'   (categoria "Estatística")
    metaPixel: ''  // Meta/Facebook Pixel, ex.: '123456789012345' (categoria "Marketing")
  },

  images: {
    hero: '',              // ex.: 'assets/img/hero.jpg'  (recomendado 2400×1400)
    estrutura: ['', '', ''] // [principal, lateral 1, lateral 2] ex.: 'assets/img/estrutura/oficina.jpg'
  },

  // Portfólio real. Só cadastre trabalhos da JM que podem ser publicados.
  // A primeira foto de cada projeto vira capa; as demais aparecem na galeria.
  // Exemplo:
  // { client: 'Nome autorizado', title: 'Stand para lançamento', event: 'Nome da feira',
  //   city: 'São Paulo', area: '120 m²', type: 'Stand ilha',
  //   images: [
  //     { src: 'assets/img/projetos/cliente-feira-01.webp', alt: 'Vista frontal do stand' },
  //     { src: 'assets/img/projetos/cliente-feira-02.webp', alt: 'Área de atendimento' }
  //   ] },
  projects: [],

  // Vitrine temporária: ajuda a visualizar o portfólio antes da entrada das fotos reais.
  // Estes itens aparecem identificados como "Visual conceitual" e são ocultados
  // automaticamente assim que houver ao menos um item em `projects`.
  projectConcepts: [
    {
      title: 'Stand ilha para relacionamento',
      area: '120–180 m²',
      type: 'Stand ilha',
      objective: 'Recepção, reuniões e hospitalidade',
      images: [
        { src: 'assets/img/conceitos/stand-ilha-conceitual.jpg', alt: 'Visual conceitual de stand ilha com marcenaria clara, lounge e iluminação indireta' }
      ]
    },
    {
      title: 'Stand de esquina compacto',
      area: '36–60 m²',
      type: 'Stand de esquina',
      objective: 'Exposição de produto e atendimento',
      images: [
        { src: 'assets/img/conceitos/stand-esquina-conceitual.jpg', alt: 'Visual conceitual de stand de esquina com expositores, balcão e mesas de atendimento' }
      ]
    },
    {
      title: 'Experiência de marca e demonstração',
      area: '80–120 m²',
      type: 'Stand península',
      objective: 'Demonstrações e geração de fluxo',
      images: [
        { src: 'assets/img/conceitos/stand-experiencia-conceitual.jpg', alt: 'Visual conceitual de stand para experiência de marca com estrutura suspensa e ilha de demonstração' }
      ]
    }
  ],

  // Logos de clientes autorizados (a seção fica oculta enquanto a lista estiver vazia)
  // ex.: { name: 'Nome da marca', logo: 'assets/img/clientes/marca.svg' }
  clients: []
};

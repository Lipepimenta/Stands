# JM Stands — site institucional

Site estático (HTML + CSS + JS puro), sem build e sem dependências. Basta subir a pasta para qualquer hospedagem.

## Estrutura

```
jm-stands/
├── index.html          → página principal (textos, seções, FAQ, números)
├── 404.html            → página de "não encontrado"
├── privacidade.html    → Política de Privacidade (LGPD)
├── site.webmanifest    → ícones para celular (Android)
├── css/style.css       → todo o visual
├── js/config.js        → ⚙️ DADOS EDITÁVEIS: WhatsApp, projetos, fotos, clientes
├── js/main.js          → portfólio, galeria, links e animações
├── js/quote.js         → formulário de solicitação em etapas
├── js/i18n.js          → idiomas português, inglês e espanhol
├── js/consent.js       → aviso de cookies + carregamento do Analytics/Pixel
├── assets/
│   ├── favicon.svg
│   ├── apple-touch-icon.png, icon-192.png, icon-512.png
│   └── img/
│       ├── projetos/   → fotos dos projetos
│       ├── estrutura/  → fotos da oficina / equipe / montagem
│       └── clientes/   → logos (de preferência .svg ou .png transparente)
├── robots.txt
└── sitemap.xml
```

## Portfólio visual

O site prioriza fotos **reais da JM**. Enquanto não houver fotos cadastradas, ele mostra a seção de soluções e oculta logos e galerias vazias. Assim que um projeto com imagem for adicionado em `js/config.js`, a primeira foto aparece na abertura, as capas entram abaixo dela e o portfólio exibe cliente, evento e galeria ampliável.

1. Separe de 3 a 6 projetos executados pela JM. Para cada um, escolha uma foto geral do stand, 2 a 5 detalhes ou outros ângulos, nome do cliente (se autorizado), feira, cidade, metragem e formato.
2. Salve as fotos em `assets/img/projetos/`, preferencialmente em WebP ou JPG, com nomes simples e sem espaços. Use a foto mais forte como a primeira da lista.
3. Cadastre cada projeto em `js/config.js` no campo `projects`. Exemplo:

```js
projects: [
  {
    client: 'Cliente autorizado',
    title: 'Stand para lançamento de produto',
    event: 'Nome da feira', city: 'São Paulo', area: '60 m²', type: 'Stand ilha',
    images: [
      { src: 'assets/img/projetos/cliente-feira-01.webp', alt: 'Vista geral do stand no pavilhão' },
      { src: 'assets/img/projetos/cliente-feira-02.webp', alt: 'Área de atendimento do stand' }
    ]
  }
]
```

Também é possível cadastrar uma foto de abertura separada em `images.hero` e fotos da oficina em `images.estrutura`. Os logos autorizados entram em `clients`, no mesmo arquivo. Não use fotos de outras montadoras como se fossem trabalhos da JM.

## Rodar no computador

Abrir o `index.html` direto no navegador já funciona. Para simular um servidor real (recomendado):

- **VS Code:** instale a extensão *Live Server* → clique com o botão direito no `index.html` → *Open with Live Server*.
- **Ou**, com Python instalado: `python -m http.server 8080` dentro da pasta e acesse http://localhost:8080

## Checklist antes de publicar

- [ ] `js/config.js` → número real do WhatsApp (`whatsapp`)
- [ ] `js/config.js` → projetos reais + caminhos das fotos (`projects[].images`)
- [ ] `js/config.js` → foto do hero e 3 fotos da estrutura (`images`)
- [ ] `js/config.js` → logos de clientes autorizados (`clients`)
- [x] `index.html` → números reais (anos, projetos, estados)
- [ ] `index.html` → revisar respostas do FAQ e texto da seção Estrutura (marcados com `TROQUE`)
- [x] `index.html` → e-mail real e cidade (Colombo · PR)
- [x] Domínio definido: `https://www.jmstandspr.com.br` (já aplicado em `index.html`, `links.html`, `privacidade.html`, `robots.txt` e `sitemap.xml`)
- [ ] Criar `assets/img/og-image.jpg` (1200×630) — imagem que aparece ao compartilhar o link no WhatsApp/LinkedIn
- [ ] `js/config.js` → links das redes sociais (`social`) — ícone sem link não aparece
- [ ] `privacidade.html` → razão social e CNPJ reais (procure por `TROQUE`)
- [ ] `js/config.js` → IDs do Google Analytics / Meta Pixel (`analytics`), se forem usar

## Formulário "Solicitar projeto" (`js/quote.js`)

Assistente em 4 etapas (Evento → Espaço → Referências → Contato) com anexos, links, revisão do briefing e envio por WhatsApp ou e-mail.

- **Como está hoje (sem configurar nada):** o briefing abre pronto no WhatsApp da JM ou no e-mail do cliente. Os arquivos escolhidos aparecem listados na mensagem e a tela final lembra o cliente de anexá-los (no celular, o botão "Enviar os arquivos agora" abre o compartilhamento direto para o WhatsApp).
- **Para receber os arquivos automaticamente no e-mail:** crie um formulário em um serviço como o [Formspree](https://formspree.io) (plano com upload de arquivos) e cole o endereço em `js/config.js` → `form.endpoint`. O limite total de anexos fica em `form.maxUploadMB`.
- As faixas de "Investimento previsto" ficam no `index.html` (procure por `TROQUE`).

## LGPD e cookies

- `js/consent.js` mostra o aviso de cookies. Google Analytics e Meta Pixel **só carregam depois que o visitante aceita** (categorias Estatística e Marketing). A escolha pode ser mudada pelo link "Preferências de cookies" no rodapé.
- O formulário exige o aceite da Política de Privacidade (`privacidade.html`).
- Se mudar a forma de usar os dados (nova ferramenta, novo uso), atualize a `privacidade.html` e aumente `VERSION` em `js/consent.js` — o aviso volta a aparecer para todos.
- Os leads chegam pelo WhatsApp: **o site não guarda nenhum dado**. Os pedidos ficam no WhatsApp/e-mail da JM — trate esses dados conforme a política (prazo de 2 anos para quem não fechou contrato, atender pedidos de exclusão em até 15 dias).

**Fotos:** use JPG ou WebP, com no máximo ~2400px de largura e ~300–500 KB cada (comprima em https://squoosh.app). Fotos pesadas deixam o site lento.

## Publicar (opções gratuitas)

**Netlify (mais simples):** crie uma conta em netlify.com → *Add new site* → *Deploy manually* → arraste a pasta `jm-stands`. Em segundos o site fica no ar em um endereço `*.netlify.app`.

**Cloudflare Pages / Vercel:** mesmo processo (upload da pasta ou conexão com um repositório GitHub).

**GitHub Pages:** suba a pasta em um repositório → *Settings → Pages* → publicar a partir da branch `main`.

A página `404.html` é reconhecida automaticamente pelo Netlify, Cloudflare Pages e GitHub Pages.

### Domínio próprio

1. Registre o domínio (ex.: `jmstandspr.com.br`) em https://registro.br
2. No painel da hospedagem (Netlify/Cloudflare/Vercel), adicione o domínio personalizado.
3. No registro.br, aponte o DNS conforme as instruções que a hospedagem mostrar. O HTTPS é ativado automaticamente.

### Depois de publicar

- Cadastre o site no **Google Search Console** e envie o `sitemap.xml`.
- Crie/atualize o **Perfil da Empresa no Google** apontando para o site.
- Opcional: adicione Google Analytics ou Meta Pixel para medir acessos e conversões.

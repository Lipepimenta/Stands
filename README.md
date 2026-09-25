# JM Stands — site institucional

Site estático (HTML + CSS + JS puro), sem build e sem dependências. Basta subir a pasta para qualquer hospedagem.

## Estrutura

```
jm-stands/
├── index.html          → página principal (textos, seções, FAQ, números)
├── projetos.html       → portfólio completo (filtros, galeria, marcas)
├── links.html          → página de links da bio do Instagram
├── 404.html            → página de "não encontrado"
├── privacidade.html    → Política de Privacidade (LGPD)
├── site.webmanifest    → ícones para celular (Android)
├── admin/              → painel de conteúdo (/admin): index.html + config.yml
├── ENVIAR-FOTOS.bat    → robô: converte e publica as fotos de fotos-para-subir/
├── ferramentas/        → código do robô de fotos (não faz parte do site)
├── content/            → projetos.json e clientes.json (gravados pelo painel)
├── css/style.css       → todo o visual
├── js/config.js        → ⚙️ DADOS EDITÁVEIS: WhatsApp, projetos, fotos, clientes
├── js/main.js          → home: destaques do portfólio, links e animações
├── js/projects.js      → leitura dos projetos + galeria de fotos (home e portfólio)
├── js/portfolio.js     → página de portfólio: grid, filtros, marcas, feiras
├── js/quote.js         → formulário de solicitação em etapas
├── js/i18n.js          → idiomas português, inglês e espanhol
├── js/consent.js       → aviso de cookies + carregamento do Analytics/Pixel
├── assets/
│   ├── favicon.svg
│   ├── apple-touch-icon.png, icon-192.png, icon-512.png
│   └── img/
│       ├── projetos/   → uma pasta por projeto, fotos 01.jpg, 02.jpg…
│       ├── conceitos/  → imagens conceituais temporárias
│       ├── estrutura/  → fotos da oficina / equipe / montagem
│       └── clientes/   → logos (de preferência .svg ou .png transparente)
├── robots.txt
└── sitemap.xml
```

## Portfólio visual

O site prioriza fotos **reais da JM**. Enquanto não houver fotos cadastradas em `projects`, ele mostra três imagens de referência claramente marcadas como **Visual conceitual**. Assim que o primeiro projeto real com imagem for adicionado em `js/config.js`, toda a vitrine conceitual é ocultada automaticamente e dá lugar aos trabalhos reais. Logos e galerias sem conteúdo permanecem ocultos.

### Painel admin: o jeito fácil de colocar projetos e fotos

Acesse **https://www.jmstandspr.com.br/admin/** (enquanto o domínio não estiver no ar: https://jmstandspr.netlify.app/admin/), pelo computador ou pelo celular.

1. Entre com **Entrar com GitHub**.
2. Abra **Portfólio → Projetos → Adicionar projeto**.
3. Preencha o nome e **arraste as fotos, várias de uma vez**, direto do celular ou da câmera (JPG, PNG ou HEIC do iPhone). O painel reduz e converte cada foto para WebP antes de enviar, então não precisa tratar nada. A primeira foto é a capa, e dá para reordenar.
4. Preencha o que souber: cliente (só com autorização), feira, ano, cidade, metragem, formato e tipo de construção. Em **Onde aparece na página inicial**, escolha *Seção Destaques* (até 4) ou *Faixa logo abaixo da abertura* (até 3). Cada projeto fica num lugar só.
5. Clique em **Salvar**. O site é atualizado sozinho em cerca de 1 minuto.

**Se aparecer "Ocorreu um erro ao salvar" / "Failed to fetch":** o GitHub interrompe salvamentos que levam mais de ~5 segundos para subir. Com internet lenta, isso acontece a partir de 3 ou 4 fotos. Salve de 3 em 3 fotos (adicione, salve, adicione mais, salve) ou use o **robô de fotos** para lotes grandes. O painel guarda um rascunho automático, então nada se perde.

Os logos de clientes ficam em **Portfólio → Marcas atendidas**. Para esconder um projeto sem apagar, marque **Ocultar do site**.

**Dar acesso a alguém da equipe:**
1. A pessoa cria uma conta grátis em github.com.
2. Em https://github.com/Lipepimenta/Stands/settings/access, clique em **Add people** e dê permissão **Write**.
3. A pessoa aceita o convite que chega por e-mail e passa a entrar no painel com essa conta.

No celular, também dá para usar **Entrar pelo celular** (QR code) a partir de um computador já logado.

**Como funciona por trás:** o painel é o [Sveltia CMS](https://sveltiacms.app), configurado em `admin/config.yml`. Cada "Salvar" vira um commit no GitHub, e a Netlify publica o site sozinha. As fotos vão para `assets/img/projetos/`, os dados para `content/projetos.json` e os logos para `content/clientes.json`. Não é preciso editar esses arquivos à mão.

**Configuração única do login pelo GitHub** (feita uma vez só):
1. No GitHub, vá em **Settings → Developer settings → OAuth Apps → New OAuth App** e preencha:
   - Homepage: `https://jmstandspr.netlify.app`
   - Callback URL: `https://api.netlify.com/auth/done`
2. Gere o **Client secret**.
3. Na Netlify, vá em **Project configuration → Access & security → OAuth → Install provider → GitHub** e cole o Client ID e o Client secret.

### Robô de fotos: para subir muitos projetos de uma vez (acervo)

Serve para quando há muitas fotos no computador, por exemplo o acervo antigo inteiro. Roda só no computador.

1. Na pasta do site, abra `fotos-para-subir/`. Se ainda não existir, ela é criada na primeira vez que o robô rodar.
2. Crie **uma pasta por projeto**, com o nome que você quer ver no site (ex.: `Expotrade 2025 - Marca X`), e jogue as fotos dentro do jeito que estão: JPG, PNG, HEIC do iPhone, qualquer tamanho. A ordem segue o nome dos arquivos, e a primeira foto vira a capa.
3. Dê **dois cliques em `ENVIAR-FOTOS.bat`**. O robô então:
   - traz do GitHub o que foi cadastrado pelo painel;
   - converte cada foto para WebP de até 1600 px, com cerca de 90% menos peso e sem dados de GPS ou da câmera;
   - cadastra cada pasta como projeto **oculto (rascunho)**. Se já existir um projeto com o mesmo nome, ele acrescenta as fotos nesse projeto;
   - publica tudo num único envio;
   - move as pastas enviadas para `fotos-para-subir/_enviados/`.
4. Abra o **painel**, complete feira, cliente, cidade etc. e desmarque **Ocultar do site**.

Para testar sem enviar nada, rode `ENVIAR-FOTOS.bat --sem-publicar` pelo terminal.

As fotos originais nunca vão para o site: a pasta `fotos-para-subir/` fica fora do Git. O robô precisa do [Node.js](https://nodejs.org) instalado e de acesso ao GitHub. O código está em `ferramentas/robo-fotos/`.

### Onde os projetos aparecem

- **`projetos.html` (Portfólio):** todos os projetos, com filtros por formato e construção, galeria com miniaturas e link direto para cada projeto (`projetos.html#nome-do-projeto`). Também mostra os logos de `clients` e a lista de feiras atendidas, montada sozinha a partir dos projetos.
- **Home:** cada área tem o seu conteúdo, e nenhuma foto se repete:
  - **Foto de abertura:** painel → **Página inicial → Fotos da página inicial**. Pode escolher uma foto já enviada. Sem escolha, o site usa uma foto de projeto que não está na home.
  - **Faixa logo abaixo da abertura** (3 fotos) e **Seção Destaques** (4 cards): definidas em cada projeto, no campo **Onde aparece na página inicial**. Sem marcação, o site completa com projetos que ainda não apareceram na página.
  - Se a capa de um projeto já apareceu (por exemplo, como foto de abertura), a home usa a próxima foto dele.
  - **Estrutura:** 3 fotos da oficina, marcenaria e montagem, também em **Página inicial**.

### Alternativa manual: inserir fotos sem o painel

1. **Escolha as fotos:** de 4 a 8 por projeto. Uma visão geral forte (vira a capa), 2 ou 3 ângulos, detalhes (balcão, iluminação, marcenaria), o stand com público e, se houver, o render 3D.
2. **Deixe as fotos leves:** cerca de 1600 px no lado maior e até ~350 KB cada, em JPG ou WebP. Foto direto do celular (4 a 8 MB) deixa o site lento. Dá para reduzir de graça em https://squoosh.app ou https://tinyjpg.com.
3. **Crie uma pasta por projeto** em `assets/img/projetos/`, com nome simples, sem espaços nem acentos, e **numere as fotos**:

```
assets/img/projetos/expotrade-2025-marca/01.jpg   ← capa
assets/img/projetos/expotrade-2025-marca/02.jpg
assets/img/projetos/expotrade-2025-marca/03.jpg
```

4. **Cadastre o projeto** em `js/config.js`, no campo `projects`, informando a pasta e quantas fotos ela tem:

```js
projects: [
  {
    folder: 'expotrade-2025-marca', photos: 3,
    client: 'Cliente autorizado', title: 'Stand para lançamento de produto',
    event: 'Expotrade', year: 2025, city: 'Pinhais', state: 'PR', area: '60 m²',
    format: 'Ilha',        // Ilha · Esquina · Península · Linear
    build: 'Construído',   // Construído · Misto · Octanorm · Cenografia
    summary: 'Uma frase: o desafio e a solução.', // opcional
    home: 'destaque'         // opcional: 'destaque' (até 4) ou 'faixa' (até 3) na home
  }
]
```

Para acrescentar fotos depois, coloque `04.jpg`, `05.jpg`… na pasta e aumente o número em `photos`. Se as fotos forem WebP, acrescente `ext: 'webp'`. Também é possível listar as fotos uma a uma, com nomes livres, em `images: [{ src, alt }]`.

Os filtros aparecem sozinhos quando há pelo menos dois valores diferentes de `format` ou `build`. Use sempre a mesma grafia (por exemplo, "Ilha", e não "ilha" ou "Stand ilha").

**Prévia local:** ao abrir `projetos.html` no computador, sem projetos reais cadastrados, a página completa a vitrine com espaços reservados e caixas de "LOGO" para mostrar como fica cheia. Esses espaços **não aparecem no site publicado**.

Também é possível cadastrar uma foto de abertura separada em `images.hero` e fotos da oficina em `images.estrutura`. Os logos autorizados entram em `clients`, no mesmo arquivo. Não use fotos de outras montadoras como se fossem trabalhos da JM.

As imagens temporárias ficam em `assets/img/conceitos/` e os respectivos dados em `projectConcepts`. Elas servem apenas para visualizar o layout antes de receber o acervo real; não atribua nomes de clientes, feiras ou resultados a esses conceitos.

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

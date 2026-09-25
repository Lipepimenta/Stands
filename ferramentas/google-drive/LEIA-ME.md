# Recebimento de orçamentos no Google Drive da JM

Com isto ligado, cada pedido feito no site:

- cria uma **pasta no Google Drive da JM**, em `Orçamentos do site JM`, com os arquivos do cliente (fotos, vídeos, plantas, até 2 GB cada);
- entra numa **planilha de controle** com a coluna *Status* (Novo, Em análise, Proposta enviada, Fechado, Perdido);
- manda para a equipe um **e-mail formatado**, com miniaturas, botões para responder no WhatsApp ou por e-mail e o link da pasta;
- manda ao cliente um **e-mail de confirmação** com o protocolo;
- guarda o **briefing em PDF** dentro da pasta do pedido.

A Netlify Forms continua recebendo uma cópia de cada pedido. Se o Google estiver fora do ar, o site envia o pedido pela Netlify e nada se perde.

## Instalação (uma vez, uns 10 minutos)

Faça tudo logado na **conta Google da JM**, a mesma do e-mail que vai receber os pedidos.

1. Abra https://script.google.com e clique em **Novo projeto**.
2. Dê o nome **Orçamentos do site JM** (no topo, onde está "Projeto sem título").
3. Apague o conteúdo do arquivo `Código.gs`, cole **todo** o conteúdo de `Codigo.gs` (este diretório) e clique em **Salvar** (ícone de disquete).
4. Se quiser, ajuste o bloco `CONFIG` no topo do código. Por exemplo, em `EMAIL_EQUIPE` dá para colocar mais de um e-mail, separados por vírgula.
5. **Autorizar:** no menu de funções (ao lado de "Depurar"), escolha **configurar** e clique em **Executar**.
   - Vai aparecer "Autorização necessária": clique em **Revisar permissões** e escolha a conta da JM.
   - Se aparecer "O Google não verificou este app", clique em **Avançado** e depois em **Acessar Orçamentos do site JM (não seguro)**. O aviso aparece porque o código é da própria JM, e não de uma empresa publicada no Google.
   - Clique em **Permitir**. Chega um e-mail "Teste: recebimento de orçamentos do site está ativo" e a pasta `Orçamentos do site JM` aparece no Drive.
6. **Publicar:** clique em **Implantar → Nova implantação**.
   - Na engrenagem de **Tipo**, escolha **App da Web**.
   - **Executar como:** *Eu* (a conta da JM).
   - **Quem pode acessar:** *Qualquer pessoa*.
   - Clique em **Implantar** e copie a **URL do app da Web** (termina em `/exec`).
7. Envie essa URL para quem mantém o site. Ela vai em `js/config.js` → `form.drive`.

## Depois de alterar o código

Se mudar alguma coisa no `Codigo.gs`, publique de novo: **Implantar → Gerenciar implantações → lápis (editar) → Versão: Nova versão → Implantar**. A URL continua a mesma.

## Limites da conta Google gratuita

| Item | Limite |
|---|---|
| Espaço no Drive | 15 GB (compartilhado com o Gmail e o Fotos) |
| E-mails enviados pelo script | 100 destinatários por dia |
| Tamanho por arquivo (definido no site) | 2 GB |
| Arquivos por pedido | 15 |

Para ter mais espaço, dá para contratar o Google One ou mover pedidos antigos da pasta `Orçamentos do site JM`.

## Segurança

- O endereço `/exec` é público, como qualquer formulário, e só aceita o formato do site: protocolo válido, tamanho e quantidade de arquivos dentro do limite.
- Pedidos preenchidos em menos de 8 segundos são recusados, porque indicam robô.
- Na autorização, o Google pede acesso ao Drive da conta, porque é o único nível de permissão que permite criar pastas e receber arquivos. O código, porém, só cria e grava dentro de `Orçamentos do site JM` e não lê nem apaga outros arquivos. Dá para conferir no próprio `Codigo.gs`.
- Os arquivos ficam **privados**: só a conta da JM (e quem ela compartilhar) abre as pastas.

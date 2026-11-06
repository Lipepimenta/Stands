// Porta de entrada do site: manda tudo para https://www (um endereço só para o Google)
// e entrega os arquivos estáticos normalmente.
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.hostname !== 'www.jmproducaostands.com.br' || url.protocol !== 'https:') {
      url.hostname = 'www.jmproducaostands.com.br';
      url.protocol = 'https:';
      return Response.redirect(url.toString(), 301);
    }
    return env.ASSETS.fetch(request);
  },
};

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const target = `https://animos-clone.pages.dev${url.pathname}${url.search}`;
    const headers = new Headers(request.headers);
    headers.delete('cf-connecting-ip');
    const resp = await fetch(target, {
      method: request.method,
      headers,
      body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
      redirect: 'follow',
    });
    // pass through, drop hop-by-hop framing
    const out = new Response(resp.body, resp);
    out.headers.set('x-served-by', 'animos-chaobro-worker');
    return out;
  },
};

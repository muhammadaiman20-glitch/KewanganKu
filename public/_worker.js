export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/health') {
      return Response.json({ status: 'ok', hosting: 'cloudflare-pages', receiptOcrConfigured: false });
    }
    if (url.pathname.startsWith('/api/')) {
      return Response.json({ error: 'Perkhidmatan OCR belum dikonfigurasi pada Cloudflare. Gunakan input manual atau suara buat sementara.' }, { status: 503 });
    }
    return env.ASSETS.fetch(request);
  },
};

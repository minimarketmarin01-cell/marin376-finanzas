// Worker deuda-sueldo-rossy después de la mudanza a Supabase (sin D1 ni archivos estáticos: cabe en el plan gratuito).
//  - /api/*  → se reenvía a la Edge Function rossy-api de Supabase (por si queda alguna pestaña vieja abierta).
//  - lo demás → redirige a la app en GitHub Pages (el acceso directo del celular sigue funcionando).
const API = "https://znywepjclzhgkctzrjxb.supabase.co/functions/v1/rossy-api";
const WEB = "https://minimarketmarin01-cell.github.io/Pedidos-Mar-n-/deuda-rossy/";
export default {
  async fetch(request) {
    const u = new URL(request.url);
    if (u.pathname.startsWith("/api/")) return fetch(new Request(API + u.pathname + u.search, request));
    const destino = u.pathname.startsWith("/resumen") ? WEB + "resumen.html" : WEB;
    return Response.redirect(destino, 302);
  }
};

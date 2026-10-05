const SUPABASE_URL = "https://sqglmzltsvqtfzpnvrtc.supabase.co";
const SUPABASE_KEY = "sb_publishable_BfuQjp6lm5pWnxVUuU59cg_5q7Y8nmN";

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  if (req.method !== "POST") {
    res.status(405).json({ error: "Método não permitido." });
    return;
  }

  try {
    const code = String(req.body?.code ?? "").trim().toUpperCase();
    if (code.length < 12 || code.length > 64) {
      res.status(401).json({ error: "Código inválido." });
      return;
    }

    const upstream = await fetch(SUPABASE_URL + "/functions/v1/lunachat-login", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "apikey": SUPABASE_KEY
      },
      body: JSON.stringify({ code })
    });

    const text = await upstream.text();
    let body;
    try { body = JSON.parse(text); }
    catch { body = { error: "Resposta inválida do servidor." }; }

    res.status(upstream.status).json(body);
  } catch (error) {
    console.error("lunachat login proxy error", error);
    res.status(502).json({ error: "Não foi possível conectar ao servidor de login." });
  }
};
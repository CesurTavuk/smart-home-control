
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders
    }
  });
}

function authorized(request, env) {
  const auth = request.headers.get("Authorization") || "";
  return !!env.CONTROL_TOKEN &&
    auth === `Bearer ${env.CONTROL_TOKEN}`;
}

async function readState(env) {
  const raw = await env.SMART_HOME_KV.get("state");

  if (!raw) {
    return {
      actual: "UNKNOWN",
      target: "OFF",
      version: 0,
      updatedAt: null,
      lastSeen: 0
    };
  }

  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("Sunucu durum verisi okunamadı.");
  }
}

async function saveState(env, state) {
  await env.SMART_HOME_KV.put(
    "state",
    JSON.stringify(state)
  );
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    // Sağlık kontrolü
    if (path === "/api/health" && request.method === "GET") {
      return json({
        ok: true,
        app: "SMART HOME CONTROL",
        version: "1.0.0"
      });
    }

    // API dışındaki adresleri statik dosya sunucusuna aktar.
    if (!path.startsWith("/api/")) {
      return env.ASSETS.fetch(request);
    }

    if (!authorized(request, env)) {
      return json({
        ok: false,
        error: "Yetkisiz erişim. Kontrol anahtarını kontrol et."
      }, 401);
    }

    try {
      // Panel mevcut röle durumunu öğrenir.
      if (path === "/api/state" && request.method === "GET") {
        const s = await readState(env);

        const bridgeOnline =
          !!s.lastSeen &&
          Date.now() - s.lastSeen < 15000;

        return json({
          ok: true,
          actual: s.actual,
          target: s.target,
          version: s.version,
          updatedAt: s.updatedAt,
          bridgeOnline
        });
      }

      // Panel açma veya kapatma komutu gönderir.
      if (path === "/api/command" && request.method === "POST") {
        let body;

        try {
          body = await request.json();
        } catch {
          return json({ ok: false, error: "Geçersiz JSON." }, 400);
        }

        if (!["ON", "OFF"].includes(body.state)) {
          return json({
            ok: false,
            error: "state değeri ON veya OFF olmalı."
          }, 400);
        }

        const s = await readState(env);

        s.target = body.state;
        s.version = (s.version || 0) + 1;
        s.updatedAt = new Date().toISOString();

        await saveState(env, s);

        return json({
          ok: true,
          target: s.target,
          version: s.version
        });
      }

      // Android Bluetooth köprüsü bu adresi düzenli sorgular.
      if (path === "/api/poll" && request.method === "GET") {
        const s = await readState(env);

        s.lastSeen = Date.now();
        await saveState(env, s);

        return json({
          ok: true,
          target: s.target,
          version: s.version,
          actual: s.actual
        });
      }

      // Android köprüsü Arduino'nun gerçek durumunu bildirir.
      if (path === "/api/report" && request.method === "POST") {
        let body;

        try {
          body = await request.json();
        } catch {
          return json({ ok: false, error: "Geçersiz JSON." }, 400);
        }

        if (
          !["ON", "OFF"].includes(body.state) ||
          !Number.isInteger(body.version)
        ) {
          return json({
            ok: false,
            error: "state ve version bilgisi gerekli."
          }, 400);
        }

        const s = await readState(env);

        s.actual = body.state;
        s.lastSeen = Date.now();
        s.updatedAt = new Date().toISOString();

        // IR kumandasıyla değişen fiziksel durumu da kaydet.
        if (
          body.version === s.version &&
          s.actual !== s.target
        ) {
          s.target = s.actual;
          s.version++;
        }

        await saveState(env, s);

        return json({
          ok: true,
          actual: s.actual,
          target: s.target,
          version: s.version
        });
      }

      return json({
        ok: false,
        error: "API adresi bulunamadı."
      }, 404);

    } catch (error) {
      return json({
        ok: false,
        error: error.message || "Sunucu hatası."
      }, 500);
    }
  }
};


const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...cors,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function initialState() {
  return {
    target: {
      led1: { on: false, brightness: 100 },
      led2: { on: false, brightness: 100 }
    },
    actual: {
      led1: { on: false, brightness: 0 },
      led2: { on: false, brightness: 0 }
    },
    version: 0,
    lastSeen: 0,
    music: { mode: "rhythm", sensitivity: 6, enabled: false }
  };
}

function authorized(request, env) {
  const token = env.CONTROL_TOKEN;
  return !!token &&
    request.headers.get("Authorization") === `Bearer ${token}`;
}

async function readState(env) {
  if (!env.SMART_HOME_KV) {
    throw new Error("SMART_HOME_KV bağlantısı bulunamadı.");
  }

  const raw = await env.SMART_HOME_KV.get("smart-home-state");

  if (!raw) return initialState();

  try {
    const state = JSON.parse(raw);
    const defaults = initialState();

    return {
      ...defaults,
      ...state,
      target: {
        ...defaults.target,
        ...(state.target || {})
      },
      actual: {
        ...defaults.actual,
        ...(state.actual || {})
      },
      music: {
        ...defaults.music,
        ...(state.music || {})
      }
    };
  } catch {
    return initialState();
  }
}

async function saveState(env, state) {
  if (!env.SMART_HOME_KV) {
    throw new Error("SMART_HOME_KV bağlantısı bulunamadı.");
  }

  await env.SMART_HOME_KV.put(
    "smart-home-state",
    JSON.stringify(state)
  );
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: cors
      });
    }

    // Her zaman herkese açık sağlık kontrolü
    if (path === "/api/health" && request.method === "GET") {
      return json({
        ok: true,
        app: "SMART HOME CONTROL",
        version: "2.2.0",
        status: "online",
        controlTokenConfigured: !!env.CONTROL_TOKEN,
        timestamp: new Date().toISOString()
      });
    }

    // Ana sayfa
    if (path === "/" && request.method === "GET") {
      if (env.ASSETS) {
        return env.ASSETS.fetch(request);
      }

      return new Response(
        "SMART HOME CONTROL Worker aktif. Arayüz için ASSETS bağlantısı gerekli.",
        {
          headers: {
            ...cors,
            "Content-Type": "text/plain; charset=utf-8"
          }
        }
      );
    }

    if (!path.startsWith("/api/")) {
      return json({ ok: false, error: "Adres bulunamadı." }, 404);
    }

    if (!authorized(request, env)) {
      return json({
        ok: false,
        error: "Kontrol şifresi hatalı veya eksik."
      }, 401);
    }

    try {
      const state = await readState(env);

      if (path === "/api/state" && request.method === "GET") {
        return json({
          ok: true,
          target: state.target,
          actual: state.actual,
          version: state.version,
          bridgeOnline: Date.now() - state.lastSeen < 15000,
          music: state.music
        });
      }

      if (path === "/api/command" && request.method === "POST") {
        const body = await request.json();
        const led = `led${body.led}`;

        if (!["led1", "led2"].includes(led)) {
          return json({ ok: false, error: "LED numarası 1 veya 2 olmalı." }, 400);
        }

        const item = state.target[led];

        if (body.action === "on") {
          item.on = true;
          if (item.brightness === 0) item.brightness = 100;
        } else if (body.action === "off") {
          item.on = false;
        } else if (body.action === "brightness") {
          const value = Number(body.brightness);

          if (!Number.isFinite(value) || value < 0 || value > 100) {
            return json({ ok: false, error: "Parlaklık 0-100 arasında olmalı." }, 400);
          }

          item.brightness = Math.round(value);
          item.on = item.brightness > 0;
        } else {
          return json({ ok: false, error: "Geçersiz komut." }, 400);
        }

        state.version++;
        await saveState(env, state);

        return json({
          ok: true,
          target: state.target,
          version: state.version
        });
      }


      if (path === "/api/music" && request.method === "POST") {
        const body = await request.json();
        const modes = ["rhythm", "breathe", "strobe", "wave", "mixed"];
        const mode = String(body.mode || state.music.mode);
        const sensitivity = Number(body.sensitivity ?? state.music.sensitivity);
        if (!modes.includes(mode)) {
          return json({ ok: false, error: "Geçersiz müzik modu." }, 400);
        }
        if (!Number.isInteger(sensitivity) || sensitivity < 1 || sensitivity > 10) {
          return json({ ok: false, error: "Hassasiyet 1-10 arasında olmalı." }, 400);
        }
        state.music = {
          mode,
          sensitivity,
          enabled: body.enabled === true
        };
        state.version++;
        await saveState(env, state);
        return json({ ok: true, music: state.music, version: state.version });
      }

      if (path === "/api/poll" && request.method === "GET") {
        state.lastSeen = Date.now();
        await saveState(env, state);

        return json({
          ok: true,
          target: state.target,
          version: state.version
        });
      }

      if (path === "/api/report" && request.method === "POST") {
        const body = await request.json();

        for (const led of ["led1", "led2"]) {
          if (body[led]) {
            const brightness = Number(body[led].brightness);

            state.actual[led] = {
              on: !!body[led].on,
              brightness: Number.isFinite(brightness)
                ? Math.max(0, Math.min(100, Math.round(brightness)))
                : 0
            };
          }
        }

        state.lastSeen = Date.now();
        await saveState(env, state);

        return json({ ok: true });
      }

      return json({ ok: false, error: "API adresi bulunamadı." }, 404);

    } catch (error) {
      return json({
        ok: false,
        error: error.message || "Sunucu hatası."
      }, 500);
    }
  }
};

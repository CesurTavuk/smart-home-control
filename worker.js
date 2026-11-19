
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...cors
    }
  });
}

function authorized(request, env) {
  return request.headers.get("Authorization") ===
    `Bearer ${env.CONTROL_TOKEN}`;
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
    lastSeen: 0
  };
}

async function readState(env) {
  const raw = await env.SMART_HOME_KV.get("smart-home-state");
  if (!raw) return initialState();

  try {
    return JSON.parse(raw);
  } catch {
    return initialState();
  }
}

async function saveState(env, state) {
  await env.SMART_HOME_KV.put(
    "smart-home-state",
    JSON.stringify(state)
  );
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    if (path === "/api/health") {
      return json({
        ok: true,
        app: "SMART HOME CONTROL",
        version: "2.0.0"
      });
    }

    if (!path.startsWith("/api/")) {
      return env.ASSETS.fetch(request);
    }

    if (!authorized(request, env)) {
      return json({ ok: false, error: "Kontrol anahtarı hatalı." }, 401);
    }

    try {
      const state = await readState(env);

      if (path === "/api/state" && request.method === "GET") {
        return json({
          ok: true,
          target: state.target,
          actual: state.actual,
          version: state.version,
          bridgeOnline: Date.now() - state.lastSeen < 15000
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
            state.actual[led] = {
              on: !!body[led].on,
              brightness: Math.max(
                0,
                Math.min(100, Math.round(Number(body[led].brightness) || 0))
              )
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

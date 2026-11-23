
const PANEL_HTML = "<!doctype html>\n<html lang=\"tr\">\n<head>\n<meta charset=\"utf-8\">\n<meta name=\"viewport\" content=\"width=device-width,initial-scale=1,viewport-fit=cover\">\n<meta name=\"theme-color\" content=\"#0b1220\">\n<title>SMART HOME CONTROL</title>\n<style>\n:root{color-scheme:dark;--bg:#0b1220;--panel:#172338;--line:#2b3b53;--text:#f4f7fb;--muted:#9aabc1;--accent:#f4bd35;--green:#35d39a;--red:#f47777}\n*{box-sizing:border-box}body{margin:0;background:radial-gradient(ellipse at 50% -30%,#263752 0,var(--bg) 55%);color:var(--text);font:16px system-ui,Arial,sans-serif;min-height:100vh}\nheader{padding:20px max(18px,env(safe-area-inset-left));border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center;gap:12px}h1{font-size:18px;letter-spacing:.08em;margin:0}h1 span{color:var(--accent)}main{max-width:940px;margin:auto;padding:18px}.panel,.led{background:linear-gradient(145deg,#19273c,#131f32);border:1px solid var(--line);border-radius:20px;padding:18px;margin-bottom:16px;box-shadow:0 14px 40px #0002}.row{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}.hint,small{color:var(--muted);font-size:12px}.hint{line-height:1.5}.status{color:var(--muted);font-size:13px}.status:before{content:\"\";display:inline-block;width:9px;height:9px;border-radius:50%;background:var(--red);margin-right:8px}.status.ok:before{background:var(--green)}\nbutton,select{border:0;border-radius:12px;padding:12px 15px;font-weight:750;font-size:14px;cursor:pointer}button:disabled{opacity:.42;cursor:not-allowed}.connect{background:var(--accent);color:#171717}.secondary{background:#2b3b53;color:white}.on{background:#14634d;color:white}.off{background:#633b43;color:white}.connect-row{display:flex;gap:9px;flex-wrap:wrap}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:15px}.led h2{font-size:19px;margin:0}.gauge{width:min(100%,340px);margin:18px auto 5px;position:relative}.gauge svg{width:100%;display:block;overflow:visible}.gauge-value{position:absolute;left:0;right:0;bottom:8px;text-align:center;font-size:36px;font-weight:850}.gauge-value small{display:block;letter-spacing:.15em}.slider{width:100%;accent-color:var(--accent);margin:18px 0 8px}.controls{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:14px}.presets{display:flex;gap:8px;margin-top:10px}.presets button{flex:1}.select-row{margin-top:16px}select{background:#2b3b53;color:white}#log{white-space:pre-wrap;word-break:break-word;max-height:135px;overflow:auto;font:12px/1.5 ui-monospace,monospace;color:#c5d0df;background:#0d1727;padding:11px;border-radius:12px}.badge{border:1px solid #42536d;border-radius:99px;padding:6px 10px;color:var(--muted);font-size:11px;letter-spacing:.06em}.warning{border-left:3px solid var(--accent);padding:9px 12px;background:#f4bd3512;border-radius:0 10px 10px 0}.footer{text-align:center;color:var(--muted);font-size:12px;padding:8px 0 24px}\n@media(max-width:620px){.grid{grid-template-columns:1fr}header{align-items:flex-start;flex-direction:column}.led{padding:16px}main{padding:14px}}\n#loginScreen{min-height:100vh;display:grid;place-items:center;padding:22px}.login-card{width:min(100%,410px);background:var(--panel);border:1px solid var(--line);border-radius:22px;padding:28px;box-shadow:0 18px 55px #0005}.login-card h2{margin:0 0 8px;font-size:25px}.login-card p{color:var(--muted);font-size:13px;line-height:1.5}.login-card label{display:block;margin:16px 0 7px;font-size:13px;color:var(--muted)}.login-card input{width:100%;padding:14px;border:1px solid var(--line);border-radius:11px;background:#0d1727;color:var(--text);font-size:16px;outline:none}.login-card input:focus{border-color:var(--accent)}.login-card button{width:100%;margin-top:20px;background:var(--accent);color:#171717}#loginError{min-height:18px;color:var(--red);font-size:13px;margin-top:12px}#appShell[hidden],#loginScreen[hidden]{display:none!important}#logout{background:#633b43;color:white}\n\n.music-controls{display:grid;gap:9px;margin-top:14px}.music-controls label{font-size:13px;color:var(--muted)}.music-controls select{width:100%}.music-controls .row{justify-content:flex-start}.music-panel{border-color:#66532a}.music-panel .connect{background:var(--accent)}\n</style>\n</head>\n<body>\n<section id=\"loginScreen\">\n <div class=\"login-card\">\n  <h2>SMART HOME <span style=\"color:var(--accent)\">CONTROL</span></h2>\n  <p>Kontrol paneline devam etmek için mevcut hesabınla giriş yap.</p>\n  <form id=\"loginForm\">\n   <label for=\"loginUser\">Kullanıcı adı</label><input id=\"loginUser\" name=\"username\" autocomplete=\"username\" required>\n   <label for=\"loginPass\">Şifre</label><input id=\"loginPass\" name=\"password\" type=\"password\" autocomplete=\"current-password\" required>\n   <button id=\"loginSubmit\" type=\"submit\">GİRİŞ YAP</button><div id=\"loginError\" role=\"alert\"></div>\n  </form>\n </div>\n</section>\n<div id=\"appShell\" hidden>\n<header><h1>SMART HOME <span>CONTROL</span></h1><div class=\"row\"><div id=\"status\" class=\"status\">Bağlı değil</div><span id=\"modeBadge\" class=\"badge\">USB SERİ</span><button id=\"logout\" type=\"button\">ÇIKIŞ</button></div></header>\n<main>\n<section class=\"panel\">\n <div class=\"row\"><div><b>Arduino UNO bağlantısı</b><div id=\"help\" class=\"hint\">Masaüstü Chrome’da USB seri portunu doğrudan aç.</div></div>\n  <div class=\"connect-row\"><button class=\"connect\" id=\"connect\">USB’Yİ SEÇ VE BAĞLAN</button><button class=\"secondary\" id=\"disconnect\" disabled>AYRIL</button></div>\n </div>\n <div class=\"row select-row\"><label for=\"fade\">Yumuşak geçiş süresi</label><select id=\"fade\"><option value=\"0\">Anında</option><option value=\"500\">0,5 saniye</option><option value=\"1000\">1 saniye</option><option value=\"1500\" selected>1,5 saniye</option><option value=\"2500\">2,5 saniye</option><option value=\"4000\">4 saniye</option></select></div>\n <p id=\"browserNote\" class=\"hint warning\"></p>\n</section>\n<section class=\"grid\">\n <article class=\"led\"><div class=\"row\"><h2>💡 LED 1</h2><span id=\"state1\" class=\"hint\">KAPALI</span></div><div class=\"gauge\"><svg viewBox=\"0 0 300 175\" aria-label=\"LED 1 parlaklık göstergesi\"><path d=\"M30 150 A120 120 0 0 1 270 150\" fill=\"none\" stroke=\"#35445a\" stroke-width=\"16\" stroke-linecap=\"round\"/><path id=\"arc1\" d=\"M30 150 A120 120 0 0 1 270 150\" fill=\"none\" stroke=\"#f4bd35\" stroke-width=\"16\" stroke-linecap=\"round\" stroke-dasharray=\"0 377\"/></svg><div class=\"gauge-value\"><span id=\"value1\">0</span>%<small>PARLAKLIK</small></div></div><input class=\"slider\" id=\"slider1\" type=\"range\" min=\"0\" max=\"100\" value=\"0\" aria-label=\"LED 1 parlaklık\"><div class=\"row\"><small>0%</small><small>100%</small></div><div class=\"controls\"><button class=\"on\" data-action=\"ON\" data-ch=\"1\">AÇ</button><button class=\"off\" data-action=\"OFF\" data-ch=\"1\">KAPAT</button></div><div class=\"presets\"><button class=\"secondary\" data-set=\"1\" data-value=\"50\">%50</button><button class=\"secondary\" data-set=\"1\" data-value=\"100\">%100</button></div></article>\n <article class=\"led\"><div class=\"row\"><h2>💡 LED 2</h2><span id=\"state2\" class=\"hint\">KAPALI</span></div><div class=\"gauge\"><svg viewBox=\"0 0 300 175\" aria-label=\"LED 2 parlaklık göstergesi\"><path d=\"M30 150 A120 120 0 0 1 270 150\" fill=\"none\" stroke=\"#35445a\" stroke-width=\"16\" stroke-linecap=\"round\"/><path id=\"arc2\" d=\"M30 150 A120 120 0 0 1 270 150\" fill=\"none\" stroke=\"#f4bd35\" stroke-width=\"16\" stroke-linecap=\"round\" stroke-dasharray=\"0 377\"/></svg><div class=\"gauge-value\"><span id=\"value2\">0</span>%<small>PARLAKLIK</small></div></div><input class=\"slider\" id=\"slider2\" type=\"range\" min=\"0\" max=\"100\" value=\"0\" aria-label=\"LED 2 parlaklık\"><div class=\"row\"><small>0%</small><small>100%</small></div><div class=\"controls\"><button class=\"on\" data-action=\"ON\" data-ch=\"2\">AÇ</button><button class=\"off\" data-action=\"OFF\" data-ch=\"2\">KAPAT</button></div><div class=\"presets\"><button class=\"secondary\" data-set=\"2\" data-value=\"50\">%50</button><button class=\"secondary\" data-set=\"2\" data-value=\"100\">%100</button></div></article>\n</section>\n\n<section class=\"panel music-panel\">\n <div class=\"row\"><div><b>🎵 Müzik modu</b><div class=\"hint\">Mikrofon sesini analiz eder; tek renk LED'leri ritme göre sürer.</div></div><span id=\"musicState\" class=\"badge\">KAPALI</span></div>\n <div class=\"music-controls\">\n  <label for=\"cameraSource\">Kamera kaynağı (OBS Virtual Camera)</label>\n  <select id=\"cameraSource\" disabled><option value=\"\">Önce izin ver</option></select>\n  <label for=\"audioSource\">Ses kaynağı (OBS masaüstü sesi)</label>\n  <select id=\"audioSource\" disabled><option value=\"\">Önce izin ver</option></select>\n  <label for=\"musicMode\">Efekt</label>\n  <select id=\"musicMode\"><option value=\"rhythm\">Ritim</option><option value=\"breathe\">Nefes</option><option value=\"strobe\">Strobe</option><option value=\"wave\">Dalga</option><option value=\"mixed\">Karışık</option></select>\n  <label for=\"sensitivity\">Ritim hassasiyeti <span id=\"sensitivityValue\">6</span>/10</label>\n  <input id=\"sensitivity\" class=\"slider\" type=\"range\" min=\"1\" max=\"10\" value=\"6\">\n  <div class=\"row\"><button id=\"musicStart\" class=\"connect\" type=\"button\" disabled>MİKROFONU AÇ</button><button id=\"musicStop\" class=\"secondary\" type=\"button\" disabled>DURDUR</button></div>\n  <p id=\"musicNote\" class=\"hint\">Mikrofonu Aç düğmesi kamera ve ses izni ister. OBS kamerası seçilir; görüntü ekranda gösterilmez. Ses kaynağından masaüstü sesi analiz edilir.</p>\n </div>\n</section>\n<section class=\"panel\"><div class=\"row\"><b>Seri geri bildirimi</b><button id=\"statusBtn\" class=\"secondary\" disabled>DURUMU SORGULA</button></div><p class=\"hint\">UNO’dan gelen durum mesajları:</p><div id=\"log\">Henüz veri alınmadı.</div></section>\n<footer class=\"footer\">SMART HOME CONTROL · ARDUINO NANO · 2 PWM KANAL</footer>\n</main>\n</div>\n<script>\n\"use strict\";\nconst $=id=>document.getElementById(id);\nlet port=null,reader=null,writer=null,readTask=null,connected=false,mode=\"serial\",fadeMs=1500,authToken=\"\";\nlet audioContext=null,analyser=null,micStream=null,cameraStream=null,mediaPermissionReady=false,musicFrame=0,musicRunning=false,lastMusicSend=0,lastBeat=0,energyHistory=[],lastMusicLevels=[-1,-1],mixedStep=0,micNoiseFloor=-58,micEnvelope=0,beatUntil=0,lastMicUi=0;\nconst decoder=new TextDecoder(),encoder=new TextEncoder();let pendingText=\"\";\nconst uiRampFrames=[0,0],ignoreStateUntil=[0,0],commandRevision=[0,0],shownPercent=[0,0];\nfunction showApp(){$(\"loginScreen\").hidden=true;$(\"appShell\").hidden=false}\nfunction showLogin(){authToken=\"\";$(\"appShell\").hidden=true;$(\"loginScreen\").hidden=false}\n$(\"loginForm\").addEventListener(\"submit\",async e=>{\n e.preventDefault();const btn=$(\"loginSubmit\"),err=$(\"loginError\");err.textContent=\"\";btn.disabled=true;btn.textContent=\"KONTROL EDİLİYOR…\";\n try{\n  const username=$(\"loginUser\").value.trim(),password=$(\"loginPass\").value;\n  if(username!==\"Smart Home\")throw new Error(\"Kullanıcı adı hatalı.\");\n  const response=await fetch(\"/api/state\",{method:\"GET\",headers:{\"Authorization\":\"Bearer \"+password},cache:\"no-store\"});\n  const data=await response.json().catch(()=>({}));\n  if(!response.ok||data.ok!==true||!data.target)throw new Error(data.error||\"Giriş bilgileri doğrulanamadı.\");\n  authToken=password;$(\"loginPass\").value=\"\";showApp();\n }catch(error){err.textContent=error.message.includes(\"Failed to fetch\")?\"Sunucuya ulaşılamadı. Cloudflare sunucu bağlantısını kontrol et.\":error.message}\n finally{btn.disabled=false;btn.textContent=\"GİRİŞ YAP\"}\n});\nfunction log(s){$(\"log\").textContent=(s+\"\\n\"+$(\"log\").textContent).slice(0,1800)}\nfunction setConnected(ok,label=\"USB seri\"){\n connected=ok;$(\"status\").textContent=ok?\"Bağlandı: \"+label:\"Bağlı değil\";$(\"status\").className=ok?\"status ok\":\"status\";\n $(\"connect\").disabled=ok;$(\"disconnect\").disabled=!ok;$(\"statusBtn\").disabled=!ok;$(\"musicStart\").disabled=!ok||musicRunning;\n document.querySelectorAll(\"[data-action],[data-set]\").forEach(b=>b.disabled=!ok);$(\"fade\").disabled=!ok;\n}\nfunction updateChannel(ch,pct){pct=Math.max(0,Math.min(100,Math.round(Number(pct)||0)));shownPercent[ch-1]=pct;$(\"value\"+ch).textContent=pct;$(\"slider\"+ch).value=pct;$('arc'+ch).setAttribute('stroke-dasharray',(377*pct/100)+' 377');$(\"state\"+ch).textContent=pct>0?\"AÇIK\":\"KAPALI\"}\nfunction animateChannel(ch,target,duration,from,start){const index=ch-1;if(uiRampFrames[index])cancelAnimationFrame(uiRampFrames[index]);if(duration<=0){uiRampFrames[index]=0;updateChannel(ch,target);return}const draw=now=>{const progress=Math.min(1,(now-start)/duration);updateChannel(ch,from+(target-from)*progress);if(progress<1)uiRampFrames[index]=requestAnimationFrame(draw);else{uiRampFrames[index]=0;updateChannel(ch,target)}};uiRampFrames[index]=requestAnimationFrame(draw)}\nasync function commandChannel(ch,target){const index=ch-1,revision=++commandRevision[index],duration=fadeMs;ignoreStateUntil[index]=performance.now()+duration+350;const sent=await send(\"SET \"+ch+\" \"+target+\" \"+duration);if(!sent){if(revision===commandRevision[index])ignoreStateUntil[index]=0;return}if(revision!==commandRevision[index])return;const start=performance.now(),from=shownPercent[index];ignoreStateUntil[index]=start+duration+350;animateChannel(ch,target,duration,from,start)}\nasync function send(line){if(!connected){log(\"Gönderilemedi: bağlantı yok.\");return false}try{if(mode===\"serial\")await writer.write(encoder.encode(line+\"\\n\"));else androidSocket.send(line+\"\\n\");log(\">> \"+line);return true}catch(e){log(\"Gönderme hatası: \"+e.message);setConnected(false);return false}}\nfunction handleLine(line){line=line.trim();if(!line)return;log(\"<< \"+line);let m=line.match(/^STATE\\s+([12])\\s+(\\d{1,3})$/i);if(m){const ch=+m[1];if(performance.now()>=ignoreStateUntil[ch-1])updateChannel(ch,+m[2])}if(line.startsWith(\"ERR \"))log(\"Arduino hata bildirdi.\")}\nasync function readLoop(){try{while(port&&port.readable){reader=port.readable.getReader();try{while(true){const {value,done}=await reader.read();if(done)break;pendingText+=decoder.decode(value,{stream:true});let lines=pendingText.split(/\\r?\\n/);pendingText=lines.pop()||\"\";for(const l of lines)handleLine(l)}}catch(e){if(port)log(\"Okuma uyarısı: \"+e.message)}finally{reader.releaseLock();reader=null}}}catch(e){log(\"USB bağlantısı kesildi.\")}finally{if(connected)await disconnect()}}\nlet androidSocket=null;\nasync function connectUSB(){if(!window.isSecureContext){log(\"Web Serial için güvenli bağlantı gerekir. HTTPS sayfasını kullan veya localhost üzerinden aç.\");return}if(!(\"serial\" in navigator)){log(\"Bu tarayıcıda Web Serial yok. Bilgisayarda Chrome/Edge kullan; Android Chrome bu API’yi resmi olarak desteklemiyor.\");return}try{port=await navigator.serial.requestPort();await port.open({baudRate:9600,dataBits:8,stopBits:1,parity:\"none\",flowControl:\"none\"});mode=\"serial\";writer=port.writable.getWriter();$(\"modeBadge\").textContent=\"USB SERİ\";$(\"help\").textContent=\"Arduino USB portu doğrudan tarayıcıya bağlı.\";setConnected(true,\"Arduino UNO · USB\");log(\"USB seri bağlantısı açıldı · 9600 baud\");readTask=readLoop();await send(\"STATUS\")}catch(e){log(\"Bağlantı kurulamadı: \"+e.message);if(port){try{await port.close()}catch{}port=null}}}\nasync function disconnect(){try{if(musicRunning)await stopMusic();setConnected(false);if(mode===\"serial\"){if(reader){try{await reader.cancel()}catch{}}if(writer){try{writer.releaseLock()}catch{}writer=null}if(port){try{await port.close()}catch{}port=null}}else if(androidSocket){androidSocket.close();androidSocket=null}}catch(e){log(\"Kapatma uyarısı: \"+e.message)}finally{setConnected(false);log(\"Bağlantı kapatıldı.\")}}\nasync function connectAndroidBridge(){if(!(\"WebSocket\" in window)){log(\"Bu tarayıcı WebSocket desteklemiyor.\");return}try{mode=\"bridge\";androidSocket=new WebSocket(\"ws://\"+(location.hostname.endsWith(\".workers.dev\")||location.hostname.endsWith(\".pages.dev\")?\"127.0.0.1\":location.hostname)+\":8765/serial\");androidSocket.onopen=()=>{if(androidSocket.readyState!==WebSocket.OPEN)return;$(\"modeBadge\").textContent=\"ANDROID KÖPRÜ\";$(\"help\").textContent=\"USB seri köprüsü yerel ağda çalışıyor.\";setConnected(true,\"Android USB köprüsü\");send(\"STATUS\")};androidSocket.onmessage=e=>String(e.data).split(/\\r?\\n/).forEach(handleLine);androidSocket.onerror=()=>log(\"Yerel USB köprüsüne erişilemiyor. Köprü uygulamasını ve port ayarını kontrol et.\");androidSocket.onclose=()=>{androidSocket=null;setConnected(false);log(\"Android köprüsü bağlantısı kapandı.\")}}catch(e){log(\"Köprü bağlantı hatası: \"+e.message)}}\n$(\"connect\").addEventListener(\"click\",()=>{if(\"serial\" in navigator)connectUSB();else connectAndroidBridge()});$(\"disconnect\").addEventListener(\"click\",disconnect);$(\"fade\").addEventListener(\"change\",()=>{fadeMs=Number($(\"fade\").value);send(\"FADE \"+fadeMs)});$(\"statusBtn\").addEventListener(\"click\",()=>send(\"STATUS\"));\n$(\"logout\").addEventListener(\"click\",async()=>{if(connected)await disconnect();showLogin()});\ndocument.querySelectorAll(\"[data-action]\").forEach(b=>b.addEventListener(\"click\",()=>commandChannel(+b.dataset.ch,b.dataset.action===\"ON\"?100:0)));document.querySelectorAll(\"[data-set]\").forEach(b=>b.addEventListener(\"click\",()=>commandChannel(+b.dataset.set,+b.dataset.value)));[1,2].forEach(ch=>{$(\"slider\"+ch).addEventListener(\"input\",e=>$(\"value\"+ch).textContent=e.target.value);$(\"slider\"+ch).addEventListener(\"change\",e=>commandChannel(ch,+e.target.value))});\n\nasync function saveMusicSettings(enabled){if(!authToken)return;try{await fetch(\"/api/music\",{method:\"POST\",headers:{\"Content-Type\":\"application/json\",\"Authorization\":\"Bearer \"+authToken},body:JSON.stringify({mode:$(\"musicMode\").value,sensitivity:Number($(\"sensitivity\").value),enabled:!!enabled})})}catch(e){log(\"Müzik ayarı sunucuya kaydedilemedi: \"+e.message)}}\nfunction clamp01(v){return Math.max(0,Math.min(1,v))}\nfunction musicLevels(now){\n const timeData=new Uint8Array(analyser.fftSize);\n const freqData=new Uint8Array(analyser.frequencyBinCount);\n analyser.getByteTimeDomainData(timeData);\n analyser.getByteFrequencyData(freqData);\n\n // Gerçek mikrofon RMS seviyesi; yalnızca bas frekansına bağlı kalmaz.\n let sum=0;\n for(let i=0;i<timeData.length;i++){const v=(timeData[i]-128)/128;sum+=v*v}\n const rms=Math.sqrt(sum/timeData.length);\n const db=20*Math.log10(Math.max(rms,0.00001));\n\n // Ortam gürültüsünü yavaşça takip et; ani müzik yükselişini bastırma.\n if(db<micNoiseFloor+12)micNoiseFloor+=(db-micNoiseFloor)*0.045;\n else if(db<micNoiseFloor)micNoiseFloor+=(db-micNoiseFloor)*0.02;\n const level=clamp01((db-micNoiseFloor-4)/23);\n const attack=level>micEnvelope?0.48:0.16;\n micEnvelope+=(level-micEnvelope)*attack;\n\n // Bas enerjisi yalnızca ritim vuruşunu bulmak için kullanılır.\n const hzPerBin=audioContext.sampleRate/analyser.fftSize;\n const lo=Math.max(1,Math.floor(45/hzPerBin));\n const hi=Math.min(freqData.length-1,Math.floor(180/hzPerBin));\n let bass=0,count=0;\n for(let i=lo;i<=hi;i++){bass+=freqData[i];count++}\n bass=count?bass/count:0;\n const sensitivity=Number($(\"sensitivity\").value);\n energyHistory.push(bass);\n if(energyHistory.length>36)energyHistory.shift();\n const baseline=energyHistory.reduce((a,b)=>a+b,0)/Math.max(1,energyHistory.length);\n const beatThreshold=Math.max(7,baseline*(1.18+(10-sensitivity)*0.035)+2);\n if(bass>beatThreshold&&micEnvelope>0.035&&now-lastBeat>170){\n   lastBeat=now;beatUntil=now+145;\n }\n const beat=now<beatUntil;\n const t=now/1000,modeName=$(\"musicMode\").value;\n let a=0,b=0;\n const volume=Math.round(micEnvelope*100);\n if(modeName===\"rhythm\"){\n   const value=Math.max(0,Math.min(100,volume*1.15+(beat?28:0)));\n   a=value;b=value;\n }else if(modeName===\"breathe\"){\n   const value=Math.max(0,Math.min(100,volume*(0.55+0.45*(0.5+0.5*Math.sin(t*2.2)))));\n   a=value;b=value;\n }else if(modeName===\"strobe\"){\n   const value=beat?Math.max(65,volume):Math.round(volume*0.12);\n   a=value;b=value;\n }else if(modeName===\"wave\"){\n   const wave=0.35+0.65*(0.5+0.5*Math.sin(t*5));\n   a=volume*wave;b=volume*(1.05-wave*0.45);\n }else{\n   const phase=Math.floor(t*2)%3;\n   const pulse=beat?30:0;\n   a=Math.min(100,volume*(phase===0?1:0.55)+pulse);\n   b=Math.min(100,volume*(phase===1?1:0.55)+pulse);\n }\n a=Math.round(Math.max(0,Math.min(100,a))/3)*3;\n b=Math.round(Math.max(0,Math.min(100,b))/3)*3;\n\n // Seri hatta gereksiz trafik oluşturma; en fazla 20 güncelleme/sn.\n if(now-lastMusicSend>=50&&(Math.abs(a-lastMusicLevels[0])>=3||Math.abs(b-lastMusicLevels[1])>=3||now-lastMusicSend>180)){\n   lastMusicLevels=[a,b];\n   send(\"SET 1 \"+a+\" 0\\nSET 2 \"+b+\" 0\");\n   lastMusicSend=now;\n }\n if(now-lastMicUi>400){\n   $(\"musicNote\").textContent=\"Mikrofon seviyesi: \"+Math.round(micEnvelope*100)+\"% · Giriş: \"+db.toFixed(0)+\" dB · Gürültü tabanı: \"+micNoiseFloor.toFixed(0)+\" dB\";\n   lastMicUi=now;\n }\n}\nfunction fillMediaDeviceSelect(id,devices,placeholder){\n const select=$(id);select.innerHTML=\"\";\n const first=document.createElement(\"option\");first.value=\"\";first.textContent=placeholder;select.appendChild(first);\n devices.forEach((device,index)=>{const option=document.createElement(\"option\");option.value=device.deviceId;option.textContent=device.label||(\"Aygıt \"+(index+1));select.appendChild(option)});\n select.disabled=devices.length===0;\n}\nasync function requestMediaPermission(){\n if(!navigator.mediaDevices?.getUserMedia||!window.isSecureContext){$(\"musicNote\").textContent=\"Kamera ve ses izni için HTTPS veya localhost gerekir.\";return false}\n let permissionStream=null;\n try{\n  permissionStream=await navigator.mediaDevices.getUserMedia({video:true,audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}});\n  permissionStream.getTracks().forEach(track=>track.stop());\n  const devices=await navigator.mediaDevices.enumerateDevices();\n  const cameras=devices.filter(device=>device.kind===\"videoinput\");\n  const audioInputs=devices.filter(device=>device.kind===\"audioinput\");\n  fillMediaDeviceSelect(\"cameraSource\",cameras,\"Kamera seç\");\n  fillMediaDeviceSelect(\"audioSource\",audioInputs,\"Ses aygıtı seç\");\n  const obsCamera=cameras.find(device=>/obs.*virtual|virtual.*camera/i.test(device.label));\n  const obsAudio=audioInputs.find(device=>/obs|cable|virtual/i.test(device.label));\n  if(obsCamera)$(\"cameraSource\").value=obsCamera.deviceId;\n  else if(cameras[0])$(\"cameraSource\").value=cameras[0].deviceId;\n  if(obsAudio)$(\"audioSource\").value=obsAudio.deviceId;\n  else if(audioInputs[0])$(\"audioSource\").value=audioInputs[0].deviceId;\n  mediaPermissionReady=true;\n  $(\"musicStart\").textContent=\"SEÇİLEN KAYNAKLARI AÇ\";\n  $(\"musicNote\").textContent=\"Kaynakları seç: OBS Virtual Camera görüntüsü gösterilmeyecek. Ses kaynağında OBS masaüstü sesinin yönlendirildiği aygıtı seç.\";\n  return true;\n }catch(e){\n  if(permissionStream)permissionStream.getTracks().forEach(track=>track.stop());\n  $(\"musicNote\").textContent=\"Kamera/ses izni alınamadı: \"+e.message;\n  return false;\n }\n}\nasync function startMusic(){\n if(!connected){log(\"Önce Arduino bağlantısını kur.\");return}\n if(!mediaPermissionReady){await requestMediaPermission();return}\n const cameraId=$(\"cameraSource\").value,audioId=$(\"audioSource\").value;\n if(!cameraId||!audioId){$(\"musicNote\").textContent=\"Devam etmek için kamera ve ses kaynağını seç.\";return}\n try{\n  // Kamera akışı yalnızca cihazı/izni doğrulamak için alınır; hiçbir video öğesine bağlanmaz.\n  micStream=await navigator.mediaDevices.getUserMedia({\n   video:{deviceId:{exact:cameraId}},\n   audio:{deviceId:{exact:audioId},echoCancellation:false,noiseSuppression:false,autoGainControl:false}\n  });\n  cameraStream=micStream;\n  if(!micStream.getAudioTracks().length)throw new Error(\"Seçilen akışta ses kanalı yok. OBS masaüstü sesini sanal ses girişine yönlendirip Ses kaynağından onu seç.\");\n  audioContext=new (window.AudioContext||window.webkitAudioContext)();await audioContext.resume();\n  analyser=audioContext.createAnalyser();analyser.fftSize=2048;analyser.smoothingTimeConstant=.18;\n  audioContext.createMediaStreamSource(new MediaStream(micStream.getAudioTracks())).connect(analyser);\n  energyHistory=[];micNoiseFloor=-58;micEnvelope=0;lastBeat=0;beatUntil=0;lastMusicSend=0;lastMusicLevels=[-1,-1];\n  musicRunning=true;saveMusicSettings(true);$(\"musicState\").textContent=\"DİNLİYOR\";$(\"musicState\").style.color=\"var(--green)\";\n  $(\"musicStart\").disabled=true;$(\"musicStop\").disabled=false;\n  $(\"cameraSource\").disabled=true;$(\"audioSource\").disabled=true;\n  $(\"musicNote\").textContent=\"Seçilen OBS kaynakları aktif. Kamera görüntüsü gösterilmiyor; ses analiz ediliyor.\";\n  const tick=now=>{if(!musicRunning)return;musicLevels(now);musicFrame=requestAnimationFrame(tick)};musicFrame=requestAnimationFrame(tick);\n }catch(e){\n  if(micStream)micStream.getTracks().forEach(track=>track.stop());micStream=null;cameraStream=null;\n  $(\"musicNote\").textContent=\"Kaynaklar açılamadı: \"+e.message;\n }\n}\nasync function stopMusic(){\n musicRunning=false;saveMusicSettings(false);if(musicFrame)cancelAnimationFrame(musicFrame);\n if(micStream)micStream.getTracks().forEach(track=>track.stop());micStream=null;cameraStream=null;\n if(audioContext){try{await audioContext.close()}catch{}audioContext=null}\n analyser=null;energyHistory=[];micEnvelope=0;lastMusicLevels=[-1,-1];$(\"musicState\").textContent=\"KAPALI\";$(\"musicState\").style.color=\"\";\n $(\"musicStart\").disabled=!connected;$(\"musicStop\").disabled=true;\n $(\"cameraSource\").disabled=false;$(\"audioSource\").disabled=false;\n $(\"musicStart\").textContent=mediaPermissionReady?\"SEÇİLEN KAYNAKLARI AÇ\":\"MİKROFONU AÇ\";\n if(connected){await send(\"SET 1 0 0\");await send(\"SET 2 0 0\")}\n}\n$(\"musicStart\").addEventListener(\"click\",startMusic);$(\"musicStop\").addEventListener(\"click\",stopMusic);\n$(\"sensitivity\").addEventListener(\"input\",e=>{$(\"sensitivityValue\").textContent=e.target.value;saveMusicSettings(musicRunning)});$(\"musicMode\").addEventListener(\"change\",()=>saveMusicSettings(musicRunning));\n\nif(\"serial\" in navigator){$(\"browserNote\").textContent=\"Masaüstü Chrome/Edge: doğrudan USB seri. Bir terminal programı aynı COM portunu açıksa kapat; aynı portu iki uygulama eşzamanlı kullanamaz.\"}else{$(\"browserNote\").textContent=\"navigator.serial bu tarayıcıda bulunamadı. Android Chrome resmi Web Serial desteğine sahip değil; Android’de ayrıca USB→WebSocket köprüsü gerekir.\"}\nnavigator.serial?.addEventListener(\"disconnect\",()=>{if(connected&&mode===\"serial\")disconnect()});setConnected(false);\n</script>\n</body>\n</html>\n\r\n";

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

    // Ana sayfa: güncel panel Worker içinde sunulur.
    if ((path === "/" || path === "/index.html") && request.method === "GET") {
      return new Response(PANEL_HTML, {
        headers: { ...cors, "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" }
      });
    }

    if (!path.startsWith("/api/") && env.ASSETS) {
      return env.ASSETS.fetch(request);
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

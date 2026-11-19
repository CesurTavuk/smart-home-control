
const cors = {
 "Access-Control-Allow-Origin": "*",
 "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
 "Access-Control-Allow-Headers": "Content-Type, Authorization"
};

function json(data,status=200){
 return new Response(JSON.stringify(data),{
  status,
  headers:{
   "Content-Type":"application/json; charset=utf-8",
   ...cors
  }
 });
}

function authorized(request,env){
 return !!env.CONTROL_TOKEN &&
 request.headers.get("Authorization") ===
 "Bearer " + env.CONTROL_TOKEN;
}

async function readState(env){
 const raw = await env.SMART_HOME_KV.get("state");

 if(!raw){
  return {
   actual:"OFF",
   target:"OFF",
   version:0,
   updatedAt:null,
   lastSeen:0
  };
 }

 try{
  return JSON.parse(raw);
 }catch{
  return {
   actual:"OFF",
   target:"OFF",
   version:0,
   updatedAt:null,
   lastSeen:0
  };
 }
}

async function saveState(env,state){
 await env.SMART_HOME_KV.put(
  "state",
  JSON.stringify(state)
 );
}

export default {
 async fetch(request,env){

  const url = new URL(request.url);

  if(request.method === "OPTIONS"){
   return new Response(null,{
    status:204,
    headers:cors
   });
  }

  // Sunucu sağlık kontrolü
  if(url.pathname === "/api/health"){
   return json({
    ok:true,
    app:"SMART HOME CONTROL",
    version:"1.0.0"
   });
  }

  if(!url.pathname.startsWith("/api/")){
   return json({ok:false,error:"Not found"},404);
  }

  if(!authorized(request,env)){
   return json({ok:false,error:"Unauthorized"},401);
  }

  // Panel mevcut durumu öğrenir
  if(url.pathname === "/api/state" &&
     request.method === "GET"){

   const s = await readState(env);

   const bridgeOnline =
    !!s.lastSeen &&
    Date.now() - s.lastSeen < 15000;

   return json({
    ok:true,
    actual:s.actual,
    target:s.target,
    version:s.version,
    updatedAt:s.updatedAt,
    bridgeOnline
   });
  }

  // Panel açma veya kapatma komutu gönderir
  if(url.pathname === "/api/command" &&
     request.method === "POST"){

   let body;

   try{
    body = await request.json();
   }catch{
    return json({ok:false,error:"Geçersiz JSON"},400);
   }

   if(!["ON","OFF"].includes(body.state)){
    return json({
     ok:false,
     error:"state ON veya OFF olmalı"
    },400);
   }

   const s = await readState(env);

   s.target = body.state;
   s.version = (s.version || 0) + 1;
   s.updatedAt = new Date().toISOString();

   await saveState(env,s);

   return json({
    ok:true,
    target:s.target,
    version:s.version
   });
  }

  // Android Bluetooth köprüsü komutları kontrol eder
  if(url.pathname === "/api/poll" &&
     request.method === "GET"){

   const s = await readState(env);

   s.lastSeen = Date.now();

   await saveState(env,s);

   return json({
    ok:true,
    target:s.target,
    version:s.version,
    actual:s.actual
   });
  }

  // Arduino'dan gelen gerçek durum sunucuya bildirilir
  if(url.pathname === "/api/report" &&
     request.method === "POST"){

   let body;

   try{
    body = await request.json();
   }catch{
    return json({ok:false,error:"Geçersiz JSON"},400);
   }

   if(!["ON","OFF"].includes(body.state) ||
      !Number.isInteger(body.version)){
    return json({
     ok:false,
     error:"state ve version gerekli"
    },400);
   }

   const s = await readState(env);

   s.actual = body.state;
   s.lastSeen = Date.now();
   s.updatedAt = new Date().toISOString();

   // IR kumandasıyla değişen durum da sunucuya aktarılır.
   if(body.version === s.version &&
      s.actual !== s.target){

    s.target = s.actual;
    s.version++;
   }

   await saveState(env,s);

   return json({
    ok:true,
    actual:s.actual,
    target:s.target,
    version:s.version
   });
  }

  return json({
   ok:false,
   error:"Not found"
  },404);
 }
};

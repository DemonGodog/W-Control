require('dotenv').config();
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const crypto = require('node:crypto');

function startDashboard() {
  const { DASHBOARD_CLIENT_ID: clientId, DASHBOARD_CLIENT_SECRET: clientSecret,
    DASHBOARD_REDIRECT_URI: redirectUri, DASHBOARD_GUILD_ID: guildId,
    DASHBOARD_SESSION_SECRET: sessionSecret, BOT_API_URL: botApiUrl, BOT_API_KEY: botApiKey } = process.env;
  const missing = Object.entries({DASHBOARD_CLIENT_ID:clientId,DASHBOARD_CLIENT_SECRET:clientSecret,
    DASHBOARD_REDIRECT_URI:redirectUri,DASHBOARD_GUILD_ID:guildId,DASHBOARD_SESSION_SECRET:sessionSecret,BOT_API_URL:botApiUrl,BOT_API_KEY:botApiKey})
    .filter(([,v])=>!v).map(([k])=>k);
  if (missing.length) {
    console.warn(`[Dashboard] Not started. Add these values to .env: ${missing.join(', ')}`);
    return;
  }
  if (sessionSecret.length < 32 || /REPLACE|CHANGE_ME|YOUR_/.test(sessionSecret)) {
    console.error('[Dashboard] Refusing to start: DASHBOARD_SESSION_SECRET must be a long random secret (32+ chars).');
    return;
  }
  const app = express();
  const apiBase = String(botApiUrl).replace(/\/$/, '');
  async function api(path, options={}) { const r=await fetch(apiBase+path,{...options,headers:{'content-type':'application/json','authorization':`Bearer ${botApiKey}`,...(options.headers||{})}}); const data=await r.json().catch(()=>({error:'Invalid response from bot API'})); if(!r.ok) throw new Error(data.error||`Bot API returned ${r.status}`); return data; }
  const port = Number(process.env.DASHBOARD_PORT || process.env.SERVER_PORT || process.env.PORT || 3000);
  const isHttps = redirectUri.startsWith('https://');
  app.disable('x-powered-by');
  app.set('trust proxy', 1); // Needed when HTTPS terminates at CloudPanel/Nginx.
  app.use(helmet({contentSecurityPolicy:{directives:{defaultSrc:["'self'"],styleSrc:["'self'","'unsafe-inline'"],scriptSrc:["'self'","'unsafe-inline'"],imgSrc:["'self'",'https://cdn.discordapp.com','data:'],connectSrc:["'self'"]}}}));
  app.use(express.urlencoded({extended:false, limit:'20kb'}));
  app.use(express.json({limit:'20kb'}));
  app.use(session({name:'w_dashboard',secret:sessionSecret,resave:false,saveUninitialized:false,
    cookie:{httpOnly:true,sameSite:'lax',secure:isHttps,maxAge:8*60*60*1000},
    // Default MemoryStore is acceptable for a single low-traffic dashboard process;
    // sessions are invalidated on restart. Do not run multiple replicas with this store.
  }));

  const esc = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const html = (title, body, user=null, csrf='') => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} · W Dashboard</title><style>
  :root{color-scheme:dark;--bg:#0b0d12;--panel:#12151d;--line:#262b38;--muted:#9ba3b4;--text:#f3f5f9;--accent:#b4bbc8;--accent2:#7c8799;--ok:#a7e3c1;--danger:#ffb4b4}*{box-sizing:border-box}body{margin:0;background:radial-gradient(900px 500px at 80% -10%,#202633 0,transparent 60%),var(--bg);font:15px/1.5 Inter,ui-sans-serif,system-ui,-apple-system,sans-serif;color:var(--text)}a{color:#e2e7ef;text-decoration:none}.wrap{max-width:1120px;margin:auto;padding:28px 20px 60px}.top{display:flex;justify-content:space-between;align-items:center;gap:16px;border-bottom:1px solid var(--line);padding:4px 0 22px;margin-bottom:28px}.brand{font-weight:750;letter-spacing:.04em}.brand small{display:block;color:var(--muted);font-weight:500;letter-spacing:0}.user{display:flex;align-items:center;gap:10px;color:var(--muted);font-size:13px}.avatar{width:32px;height:32px;border-radius:50%}.hero{margin:24px 0 26px}.eyebrow{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--muted)}h1{font-size:clamp(28px,4vw,40px);letter-spacing:-.04em;line-height:1.12;margin:7px 0 9px}p{color:var(--muted)}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.card{background:linear-gradient(145deg,#151923,#10131a);border:1px solid var(--line);border-radius:16px;padding:22px;margin-bottom:16px}.card h2{font-size:17px;margin:0 0 4px}.card .desc{font-size:13px;margin:0 0 20px}.field{margin:16px 0}.field label{display:block;font-size:13px;font-weight:650;margin-bottom:7px}.field small{display:block;color:var(--muted);font-size:12px;margin-top:6px}input,select{width:100%;background:#0b0e14;color:var(--text);border:1px solid #303747;border-radius:9px;padding:12px 13px;font:inherit;outline:none}input:focus,select:focus{border-color:#8792a4;box-shadow:0 0 0 3px #8792a422}.btn{display:inline-flex;justify-content:center;align-items:center;gap:8px;background:#e8ebf0;color:#10131a;border:0;border-radius:9px;padding:11px 16px;font-weight:750;font:inherit;cursor:pointer}.btn:hover{background:#fff}.btn.secondary{background:#202531;color:#f3f5f9;border:1px solid #343b4a}.actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:20px}.status{padding:12px 14px;border-radius:10px;background:#17251f;border:1px solid #2b4b3c;color:var(--ok);margin-bottom:18px}.error{background:#2b191b;border-color:#613438;color:var(--danger)}.stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.stat{padding:16px;border:1px solid var(--line);border-radius:12px;background:#10131a}.stat strong{display:block;font-size:22px}.stat span{font-size:12px;color:var(--muted)}.pill{border:1px solid var(--line);border-radius:99px;padding:5px 9px;color:var(--muted);font-size:12px}.footer{color:#747d8f;text-align:center;font-size:12px;margin-top:32px}.empty{padding:14px;border:1px dashed #343b4a;border-radius:10px;color:var(--muted)}@media(max-width:700px){.grid,.stats{grid-template-columns:1fr}.top{align-items:flex-start}.wrap{padding:18px 14px 40px}.card{padding:17px}}
  </style></head><body><div class="wrap"><header class="top"><a class="brand" href="/">W / CONTROL<small>Creator community dashboard</small></a><div class="user">${user?`<img class="avatar" src="${esc(user.avatar)}" alt=""><span>${esc(user.username)}</span><a class="pill" href="/logout">Sign out</a>`:'<span class="pill">Private dashboard</span>'}</div></header>${body}<div class="footer">W Control · Private server dashboard · Never share your bot token</div></div></body></html>`;
  const csrf = req => { if(!req.session.csrf) req.session.csrf=crypto.randomBytes(24).toString('hex'); return req.session.csrf; };
  const validCsrf = (req,res,next) => { if(!req.session.csrf || req.body?._csrf !== req.session.csrf) return res.status(403).send(html('Request rejected',`<div class="status error">That form expired. Go back and reload the dashboard.</div><a class="btn" href="/">Return to dashboard</a>`,req.session.user)); next(); };
  const userCard = req => req.session.user ? {username:req.session.user.username,avatar:req.session.user.avatar} : null;
  function requireAuth(req,res,next){if(!req.session.user)return res.redirect('/login');if(req.session.user.guildId!==guildId || !req.session.user.allowed)return res.status(403).send(html('Access denied','<div class="card"><h1>Access denied</h1><p>You must have Manage Server or Administrator permission in the configured server.</p></div>',userCard(req)));next();}
  async function dashboardData(){ return await api('/api/dashboard/data'); }
  function select(name,label,items,value,help=''){return `<div class="field"><label for="${name}">${label}</label><select id="${name}" name="${name}"><option value="">— Not configured —</option>${items.map(i=>`<option value="${esc(i.id)}" ${value===i.id?'selected':''}>${esc(i.name)}</option>`).join('')}</select>${help?`<small>${help}</small>`:''}</div>`;}
  function formStart(token){return `<form method="post" action="/save"><input type="hidden" name="_csrf" value="${esc(token)}">`;}
  app.get('/',requireAuth,async(req,res)=>{
    try{
      const {guild,settings,channels,roles,botReady}=await dashboardData(); const token=csrf(req);
      const notice=req.query.saved?'<div class="status">Settings saved successfully. The bot will use them immediately.</div>':'';
      const body=`<section class="hero"><div class="eyebrow">Workspace / ${esc(guild.name)}</div><h1>Server control, minus the commands.</h1><p>Configure your bot with dropdowns. No more typing setup commands in Discord.</p></section>${notice}<div class="stats"><div class="stat"><strong>${esc(guild.memberCount ?? '—')}</strong><span>Server members</span></div><div class="stat"><strong>${botReady?'Online':'Connecting'}</strong><span>Bot connection</span></div><div class="stat"><strong>${channels.length}</strong><span>Available channels</span></div></div><form method="post" action="/save"><input type="hidden" name="_csrf" value="${esc(token)}"><div class="grid"><section class="card"><h2>Welcome & roles</h2><p class="desc">Choose where new members are welcomed and which role they receive.</p>${select('welcomeChannelId','Welcome channel',channels,settings.welcomeChannelId)}${select('autoRoleId','Automatic member role',roles,settings.autoRoleId,'The bot role must be above the selected role.')}</section><section class="card"><h2>Moderation & support</h2><p class="desc">Send moderation logs to a private staff channel and route tickets to your team.</p>${select('modLogChannelId','Moderation log channel',channels,settings.modLogChannelId)}${select('ticketStaffRoleId','Ticket staff role',roles,settings.ticketStaffRoleId)}</section><section class="card"><h2>YouTube notifications</h2><p class="desc">Announce new uploads in your selected Discord channel.</p><div class="field"><label for="youtubeChannelId">YouTube channel ID</label><input id="youtubeChannelId" name="youtubeChannelId" value="${esc(settings.youtubeChannelId||'')}" placeholder="UCxxxxxxxxxxxxxxxxxxxxxx" maxlength="80"><small>Usually starts with UC. A handle URL like @creator is not a channel ID.</small></div>${select('youtubeAnnounceChannelId','Announcement channel',channels,settings.youtubeAnnounceChannelId)}</section><section class="card"><h2>Quick setup checklist</h2><p class="desc">These settings are stored in your existing data.json.</p><div class="field"><label>Discord permissions</label><div class="empty">The bot needs View Channels, Send Messages, Manage Channels for tickets, and Manage Roles for auto-role. Role hierarchy still applies.</div></div><div class="field"><label>Data safety</label><div class="empty">Your current warnings, XP, giveaway entries and settings are preserved. Back up data.json before replacing bot files.</div></div></section></div><div class="actions"><button class="btn" type="submit">Save changes</button><a class="btn secondary" href="/">Discard changes</a></div></form>`;
      res.send(html('Dashboard',body,userCard(req)));
    }catch(e){res.status(503).send(html('Dashboard unavailable',`<div class="card"><h1>Dashboard unavailable</h1><p>${esc(e.message)}</p><p>Check DASHBOARD_GUILD_ID and make sure the bot has joined that server.</p></div>`,userCard(req)));}
  });
  app.post('/save',requireAuth,validCsrf,async(req,res)=>{
    try{
      const payload={}; for(const key of ['welcomeChannelId','modLogChannelId','youtubeAnnounceChannelId','autoRoleId','ticketStaffRoleId','youtubeChannelId']) payload[key]=String(req.body[key]||'').trim();
      await api('/api/dashboard/settings',{method:'POST',body:JSON.stringify(payload)}); res.redirect('/?saved=1');
    }catch(e){console.error('[Dashboard] Save failed:',e.message);res.status(502).send(html('Save failed',`<div class="status error">Could not save settings: ${esc(e.message)}</div><a class="btn" href="/">Back</a>`,userCard(req)));}
  });
  app.get('/login',(req,res)=>{
    const token=csrf(req);const body=`<section class="hero"><div class="eyebrow">Private admin access</div><h1>Your server. One clean control panel.</h1><p>Sign in with Discord. Only server managers can change settings.</p></section><section class="card"><h2>Continue with Discord</h2><p class="desc">We verify your identity and your permission in the configured server.</p><a class="btn" href="/auth/start">Sign in with Discord ↗</a></section>`;
    res.send(html('Sign in',body,userCard(req),token));
  });
  app.get('/auth/start',(req,res)=>{
    const state=crypto.randomBytes(24).toString('hex');req.session.oauthState=state;
    const url=new URL('https://discord.com/oauth2/authorize');url.searchParams.set('client_id',clientId);url.searchParams.set('redirect_uri',redirectUri);url.searchParams.set('response_type','code');url.searchParams.set('scope','identify guilds');url.searchParams.set('state',state);res.redirect(url.toString());
  });
  app.get('/auth/callback',async(req,res)=>{
    if(!req.query.code||!req.query.state||req.query.state!==req.session.oauthState){return res.status(400).send(html('Login failed','<div class="status error">OAuth state check failed. Please try again.</div><a class="btn" href="/login">Sign in</a>'));}
    delete req.session.oauthState;
    try{
      const tokenResponse=await fetch('https://discord.com/api/oauth2/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:clientId,client_secret:clientSecret,grant_type:'authorization_code',code:String(req.query.code),redirect_uri:redirectUri})});
      if(!tokenResponse.ok)throw new Error('Discord rejected the OAuth login. Check the client secret and redirect URI.');
      const tokenData=await tokenResponse.json();
      const headers={Authorization:`Bearer ${tokenData.access_token}`};
      const [userRes,guildsRes]=await Promise.all([fetch('https://discord.com/api/users/@me',{headers}),fetch('https://discord.com/api/users/@me/guilds',{headers})]);
      if(!userRes.ok||!guildsRes.ok)throw new Error('Could not verify your Discord account.');
      const user=await userRes.json();const guilds=await guildsRes.json();const target=guilds.find(g=>g.id===guildId);
      const perms=BigInt(target?.permissions||'0');const allowed=!!target&&((perms&(1n<<5n))!==0n||(perms&(1n<<3n))!==0n);
      if(!allowed)return res.status(403).send(html('Access denied','<div class="card"><h1>Server manager access required</h1><p>Your Discord account needs Manage Server or Administrator permission in the configured server.</p><a class="btn" href="/login">Try another account</a></div>'));
      const avatar=user.avatar?`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=64`: `https://cdn.discordapp.com/embed/avatars/${Number(user.discriminator||0)%5}.png`;
      await new Promise((resolve,reject)=>req.session.regenerate(err=>err?reject(err):resolve()));
      req.session.user={id:user.id,username:user.global_name||user.username,avatar,guildId,allowed:true};req.session.csrf=crypto.randomBytes(24).toString('hex');
      req.session.save(err=>{if(err)return res.status(500).send('Could not create a secure session.');res.redirect('/');});
    }catch(e){console.error('[Dashboard] OAuth failed:',e.message);res.status(502).send(html('Login failed',`<div class="status error">${esc(e.message)}</div><a class="btn" href="/login">Try again</a>`));}
  });
  app.get('/logout',(req,res)=>req.session.destroy(()=>res.redirect('/login')));
  app.get('/health',async(req,res)=>{try{const d=await api('/api/dashboard/data');res.json({ok:true,botReady:d.botReady});}catch(e){res.status(503).json({ok:false,error:e.message});}});
  app.listen(port,'0.0.0.0',()=>console.log(`[Dashboard] Listening on 0.0.0.0:${port}. Configure HTTPS before exposing login publicly.`));
}
module.exports={startDashboard};

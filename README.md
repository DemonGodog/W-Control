# W Control Dashboard — standalone Render app

This project hosts only the website. Your Discord bot and `data.json` stay on Pelican. The dashboard talks to a small authenticated API bridge running beside the bot.

## Render setup
1. Put the `dashboard-render` folder in a private GitHub repo (or its own repo). Never commit `.env`, bot tokens, OAuth client secret, or API keys.
2. Create a Render **Web Service** from that repo. Runtime Node; Build command `npm install`; Start command `npm start`.
3. Add environment variables from `.env.example` in Render. Set `DASHBOARD_REDIRECT_URI` to the exact service URL plus `/auth/callback`. `BOT_API_URL` must be your HTTPS bot API domain. `BOT_API_KEY` must exactly match `DASHBOARD_API_KEY` on Pelican. Set `PORT` only if required by your service; Render provides it automatically.
4. In Discord Developer Portal → OAuth2, add the exact `DASHBOARD_REDIRECT_URI` to Redirects. Use the same application as your bot.
5. Do not deploy the bot code to Render. Only deploy this `dashboard-render` folder.

## Required bot-side setup
Follow `bot-pelican/README-ADD-TO-EXISTING-BOT.md`. Configure CloudPanel HTTPS reverse proxy for the bot bridge API, and keep the bridge port firewall-restricted. Dashboard and bot API must communicate over HTTPS. The bot remains the only process writing `data.json`.

## Notes
- Node 20+.
- OAuth login requires Manage Server or Administrator in the configured Discord server.
- The dashboard service can sleep on a free Render plan; first visit may take time to wake.
- Sessions reset when the dashboard process restarts. Only one dashboard instance is supported by the in-memory session store.

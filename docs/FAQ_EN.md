# Frequently asked questions (FAQ) – Streamer Scheduler

[User guide (EN)](USER-GUIDE.md) · [Guía de usuarios (ES)](GUIA-USUARIOS.md) · [FAQ (ES)](FAQ_ES.md)

---

## Account and access

### How do I sign up?
You can create an account with **email and password** or sign in with **Google**, **Twitch**, or **Discord**. On the login screen, choose the option you prefer.

### What is the trial?
It’s a free period of use assigned to new accounts (depending on the service configuration). When it ends, you’ll need to purchase a license to keep using the app.

### I forgot my password
On the login screen use **Forgot password?** and enter your email. You’ll receive a link to reset it (if the team has set up email delivery).

---

## Posts and calendar

### How do I schedule a post?
Go to **Schedule** (menu) or **Dashboard → Schedule content**. Fill in title, text, choose platforms (Twitch, Discord, X, etc.), date and time, and save. At that time the app will try to publish to the accounts you have connected.

### Why didn’t my content get published?
Check that the **platform is connected** under **Settings → Platforms**. If the token has expired, disconnect and reconnect. In the calendar or in the content detail, check if there’s a publication error; if so, you can reschedule or contact support.

### Can I edit or cancel a scheduled post?
Yes. From the **calendar** or **Dashboard** you can open the content, edit it, or **cancel publication** so it won’t be sent.

### What content types are there?
**Post**, **Stream**, **Event**, and **Reel**. For Discord events, a scheduled event is created on the server you choose; for Twitch you can create a segment on the channel’s schedule.

---

## Platforms (Twitch, Discord, X, YouTube)

### How do I connect Twitch / Discord / X / YouTube?
Go to **Settings → Platforms**. Click **Connect** on the network you want. The platform’s official page will open; sign in and accept the permissions. Return to the app and the account will be linked.

### For Discord, what is the bot and how do I add it to my server?
The app uses a **Discord bot** to post messages and events to your server. Under **Settings → Platforms** (with Discord connected) you’ll see a link to **invite the bot** to your server. Without the bot in the server you won’t be able to choose channels to publish to.

### Where do Twitch clips get posted on Discord?
Under **Settings → Platforms** there’s a **Twitch clips channel** section. Choose the **server** and **channel** in Discord where you want clips to be published automatically and save.

### I see “X (Twitter) is not configured” or “Discord not configured”
That means the application administrator hasn’t set up that platform yet (OAuth keys, Discord bot, etc.). Contact the team or administrator to have it enabled.

---

## Licenses and payments

### Where do I see my license and when it expires?
On your **Profile** and under **Settings → Billing**. There you’ll see the license type (trial, monthly, quarterly, lifetime) and the expiry date.

### How do I renew or buy a license?
If payments are enabled (Stripe), under **Settings → Billing** you’ll see options to **purchase** or **renew** according to the available plans.

### Can I change plans?
That depends on the service configuration. Check the billing section or contact support.

---

## Media, templates, and to-do

### Where do I upload images and videos for my posts?
Under **Media** (/media). There you upload files to the cloud; then, when creating or editing a post in the calendar, you can attach them. Limits apply depending on your plan.

### What are templates for?
To **reuse** title, text, content type, and platforms without typing everything again. Create templates under **Templates** and apply them when scheduling new content.

### What is the to-do list?
It’s a **personal list** under **To-do** (/todos): you can add items, mark them done or pending, and delete them. It’s available to all users.

---

## Stream mode and screen sharing

### What is stream mode and when should I use it?
**Stream mode** is a toggle in the header (video icon). When it’s **on**, sensitive data is hidden in **Settings → Bots** and **Settings → Profile**: your API key, webhook URLs, email, username, and Discord announce webhook are masked so you can share your screen during a stream without exposing them. The setting is saved in your browser. Turn it off when you’re done streaming to see and copy your keys and URLs again.

---

## Chat bots and commands (Nightbot, Streamer.bot)

### Where do I get my API key and chat command URLs?
Go to **Settings → Bots**. There you’ll see your **API key** and a table of **chat commands** with ready-to-use URLs (each URL includes your key). Copy the URL for the command you need (e.g. next stream, countdown, weekly schedule, goal, !commands list) and paste it into Nightbot, Streamer.bot, or Mix It Up.

### What chat commands are available?
Examples: **!nextstream** (next scheduled stream), **!countdown** (time until next stream), **!schedule** or **!week** (weekly schedule), **!goal** (follower/sub goal), **!myschedule** (link to your public schedule), **!streamstats**, **!quote random**, **!randomidea**, and **!commands** (lists all commands). In **Settings → Bots** you’ll see the full list with copy-paste URLs and Nightbot/Streamer.bot examples.

### How do I set up Nightbot or Streamer.bot?
In **Settings → Bots** each command has a URL. For **Nightbot**, use the “Nightbot” example (e.g. `$(urlfetch https://...)`). For **Streamer.bot**, call the same URL in your action. Your API key is included in the URL; keep it private and don’t share it on stream (use **stream mode** to hide it when sharing your screen).

---

## Settings and language

### How do I change the language (Spanish / English)?
Under **Settings → Profile** or via the language selector in the header (if shown). The interface and FAQ will be shown in the selected language.

### How do I change the theme (light / dark)?
Under **Settings → Appearance** you can choose light, dark, or automatic theme (based on system), and the accent colour.

### How do I change my password?
Under **Settings → Security** enter your current password and the new one (twice). This only applies if you signed in with email and password.

---

## Support and contact

### Where are the terms of use and privacy policy?
In the app footer links: **Privacy** and **Terms of Service**. You can also check the project’s legal documentation.

### How do I contact support?
Use **Settings → Support** to send a message, or the email/channel indicated on the website or in the copyright notice.

---

*Last updated: 2026. Streamer Scheduler – FAQ.*

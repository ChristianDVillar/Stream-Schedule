# User Guide – Streamer Scheduler

[Español](GUIA-USUARIOS.md) · [FAQ (ES)](FAQ_ES.md) · [FAQ (EN)](FAQ_EN.md)

Information on how to use **Streamer Scheduler**: what the app is, how to get started, and how to use its main features.

---

## What is Streamer Scheduler?

Streamer Scheduler is a web application that lets you **schedule streams and posts** and **automate announcements** for multiple platforms from one dashboard. It is designed for streamers and creators who want to plan content for Twitch, Discord, X (Twitter), Instagram, and YouTube, share a public schedule page, and use chat bots (Nightbot, Streamer.bot) with commands like !schedule and !nextstream—without logging into each platform separately.

---

## Getting started

### Create an account and sign in

- You can **sign up with email and password** or **sign in with Google, Twitch, or Discord**.
- After your first login, if you don’t have a license, you may be assigned a **free trial** (depending on the application’s configuration).
- Once signed in, you’ll see the **Dashboard** (main panel).

### Licenses

The application uses a license / plan system. With the current pricing model, a realistic structure is:

- **Free** – 0 €  
  To try the product and get started:
  - 7-day trial for new accounts.
  - Calendar and scheduling for one streamer.
  - Public schedule page.
  - Basic overlays (Next stream, Schedule, Quote).

- **Creator** – ~7 €/month (indicative price)  
  For streamers who already stream several times per week and want **automatic promotion**:
  - Everything in Free.
  - Unlimited schedules and announcements.
  - Automatic Discord announcements.
  - Public schedule without watermark.
  - Overlays for OBS/Streamlabs (Next stream, Goal, Weekly schedule, Quote).

- **Pro** – ~15 €/month (indicative price)  
  For creators who need more (team, analytics, multi-platform automation):
  - Everything in Creator.
  - Viewer reminders and notification experiments.
  - Slack workspace setup for the streaming team.
  - Stream performance analytics (on the roadmap).
  - More integrations and API access.
  - Priority support.

Your **current plan/license** and expiry date are shown in your **Profile** and under **Settings → Billing**.  
From **Billing** you can **purchase, renew, or change plans** (Stripe payments) when payments are enabled. Final prices and active plans may vary depending on the project phase; the most up-to-date reference is always the public `/pricing` page and the billing section inside the app.

---

## Dashboard

On the **Dashboard** (/dashboard) you have:

- A summary of your activity and scheduled or published content.
- Quick links to **schedule content**, **templates**, **media**, **to-do list**, and **profile**.
- If Twitch is connected, subscription, bits, or donation data may be shown (when enabled by the administrator).
- Important notices (e.g. license or password reminders).

From here you can open the **calendar** and create posts.

### Stream mode (hide sensitive data when streaming)

In the header there is a **stream mode** toggle (video icon). When it’s **on**, the app hides sensitive data in **Settings → Bots** and **Settings → Profile** (API key, URLs, email, Discord webhook) so you can share your screen during a stream safely. Turn it off when you’re done to see and copy your keys again.

---

## Scheduling content (Calendar)

The **Schedule** section (/schedule) is where you create and organize content:

- **Calendar view** by day/week: you see scheduled posts and can **drag and drop** to change date or time.
- **Content types:** Post, Stream, Event, Reel.
- **Create a post:** title, text, and **platform** selection (Twitch, X, Instagram, Discord, YouTube, as enabled).
- **Upload images or videos** to attach to the post (from **Media** or in the form; within your plan’s limits).
- **Date and time** for publishing: the system will attempt to publish at that time on the selected platforms (when they are connected and the feature is active).
- For **Discord events** you can choose server, channel, and optionally an announcement channel.
- You can **edit** or **delete** posts from the calendar or from the post’s detail view.

For posts to be sent automatically to each network, you must have those platforms’ accounts **connected** (see below).

---

## To-do list

Under **To-do** (/todos) you can:

- Maintain a **personal to-do list**: add items, mark them done or pending, and delete them.
- It is available to **all users** (not only non-admins).
- Handy for reminders or steps related to your content. If you connect **Nightbot** (Settings → Bots), you can add to-dos from Twitch chat with `!todo text`.

---

## Public streamer page

Each user has a **public page** you can share in your Twitch bio, Discord, or socials:

- **URL:** `yoursite.com/streamer/your_username` — shows your upcoming streams, a countdown to the next one, and a live indicator when you’re streaming.
- **Notify me:** Viewers can subscribe with their email to receive reminders before you go live.
- **Embed:** `yoursite.com/embed/streamer/your_username` — for use in an iframe (Discord panels, fan site, etc.).
- Copy the link and embed URL from **Settings → Bots**.

---

## Media (files)

Under **Media** (/media):

- **Upload images and videos** to the cloud (Supabase Storage) to use in your posts.
- View the list of uploaded files and attach them when creating or editing content.
- Upload limits depend on your plan (trial, pro, etc.).

---

## Templates

Under **Templates** (/templates):

- Create **reusable templates** (title, text, content type, platforms, hashtags).
- Apply a template when creating a new post in the calendar to save time.
- Templates can also be saved from the schedule form.

---

## Messages (support)

If the application has **Messages** (/messages) for non-admin users:

- Send **support messages** to the team.
- See the status of your conversations (unread, read, replied).

---

## Profile

On your **Profile** (/profile) you can:

- View and **edit your name**, bio, timezone, and language.
- Change your **profile photo**.
- View your **license** (type and expiry date).
- Manage **connected accounts** (Google, Twitch, X/Twitter, Discord, YouTube): connect or disconnect to publish on each network.
- View **post performance analytics**: total published, failed, and attempts per platform.
- Change your **password** (under **Settings → Security**).
- Adjust **notifications**, **theme** (light/dark), and **language** (Spanish/English) under **Settings**.

---

## Settings

Under **Settings** (/settings) you have several tabs:

- **Profile:** name, email, merchandising link, photo, dashboard options (Twitch).
- **Notifications:** notification preferences.
- **Platforms:** connect or disconnect Google, Twitch, Discord, X (Twitter), YouTube. Here you can also set the **Discord channel for Twitch clips**: automatically published clips will go to the server and channel you choose.
- **Bots:** your **API key** and **chat command URLs** for Nightbot, Streamer.bot, or Mix It Up. Each URL is copy-paste ready (key included). Commands include: next stream, countdown, weekly schedule (!schedule / !week), goal (!goal), public schedule link (!myschedule), stream stats, random quote/idea, and !commands (list of all commands). You also get your **public schedule link** (`/streamer/your_username`) and **embed** URL for Discord or your site (`/embed/streamer/your_username`). To-do: add items from chat with `!todo text` when Nightbot is set up.
- **Security:** change password.
- **Appearance:** theme, accent colour, header banners.
- **Billing:** view license, purchase or renew (Stripe), payment history.
- **Support:** send messages to the team.
- **Data:** export or delete account (when offered).

---

## Connecting platforms

For content to be published on each network, you need to **link** your accounts:

- Under **Settings → Platforms** you’ll see which networks are connected or not.
- Click **Connect** on the one you want (e.g. Twitch, Discord, X, YouTube). The official authorization page for that platform will open; sign in and accept the permissions.
- **Discord:** to publish to a server, the application’s bot must be invited to that server; the invite link is shown in the app.
- Once connected, you can select that platform when creating or editing a post in the calendar.
- If an account stops working (expired token, etc.), the app may ask you to **disconnect and reconnect** that account.

---

## Language and theme

- **Language:** change under **Settings → Profile** or via the language selector (Spanish / English). The interface and **FAQ** are shown in the selected language.
- **Theme:** under **Settings → Appearance** you can choose light, dark, or automatic theme, and the accent colour.

---

## Help and support

- **FAQ:** see the [FAQ in Spanish](FAQ_ES.md) or [FAQ in English](FAQ_EN.md), or the **FAQ** link in the app (according to your language).
- For **terms of use**, **privacy**, and **contact**, see the links in the app footer or the project’s legal documentation (*Terms of Service*, *Copyright Notice*).
- If you find a bug or have a specific request, contact the team that runs the application (email or channel indicated on the website).

---

*Last updated: 2026. Streamer Scheduler – User guide.*

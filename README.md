# Anime Miner Frontend WEB

Welcome to **Anime Miner Frontend WEB**, the most stunning, hyper-responsive, and awesomely designed anime streaming interface you'll ever lay your eyes on! 🚀

## 🌟 Why is it so Awesome?

This isn't just another generic anime website. This frontend is built with an absolute obsession for detail:
- **Hyper-Fast UI**: Seamless transitions, smooth animations, and a zero-latency feel.
- **Premium Design**: Dark mode by default, glassmorphism touches, and an undeniably aesthetic layout.
- **Flawless Playback Integration**: Automatically hooks into the best servers to deliver high-quality, buffer-free anime episodes.

---

## ⚙️ Powered by Ronin API (Backend Server)

This frontend operates by connecting to a dedicated, high-performance **backend server** running the **Ronin API**. 
The Ronin API is a highly advanced, customized fork of the revolutionary **Open Anime API** framework. By offloading all the heavy lifting (scraping, link mining, and data aggregation) to this robust backend server, the frontend remains incredibly lightweight, lightning fast, and secure.

---

## 📢 Calling all Developers: Check out Open Anime API!

If you are a developer looking to build your own streaming platform, you absolutely MUST check out **[Open Anime API](https://github.com/Zcross091/Open-Anime-API)**. It is the core engine that makes projects like this possible!

### Why Open Anime API?
Open Anime API is an open-source, highly modular anime metadata and streaming link aggregator. It supports:
- **Automated Scraping**: Mines links from multiple domains via Puppeteer and stealth plugins.
- **Database Caching**: Natively supports both Local JSON databases and Supabase Cloud clusters!
- **Extremely Useful `start.js` Script**: Getting started has never been easier!

### The Magic of `start.js`
The `start.js` script inside Open Anime API is an absolute lifesaver. It features:
1. **Auto-Dependency Installer**: Don't have `package.json` or modules installed? No problem! `start.js` automatically detects missing packages and installs them for you on the fly.
2. **Interactive Setup Wizard**: The script prompts you with a beautiful CLI wizard to choose between a Local DB or Supabase cloud DB, saving your credentials directly into an `.env` file.
3. **Admin Dashboard**: It spins up a sleek, built-in Express admin dashboard on `localhost` so you can instantly test stream resolvers, check server status, and monitor your database!

### How to use Open Anime API
1. Clone the repository: `git clone https://github.com/Zcross091/Open-Anime-API`
2. Navigate to the directory: `cd Open-Anime-API`
3. Run the magical start script: `node start.js`
4. Follow the interactive prompts, and your API server will be live!

---

## 📱 The Ultimate Desktop Experience: RoninX Anime Client

While the website is fantastic, there is a dedicated desktop application that takes the experience to an entirely new level: **RoninX Anime Client**.

Built to consume the same API, the RoninX Client offers a native, immersive, and incredibly polished viewing experience that outperforms a standard web browser interface.

[![RoninX Anime Client Repository](https://img.shields.io/badge/View_Repo-RoninX_Anime_Client-f43f5e?style=for-the-badge&logo=github)](https://github.com/Zcross091/RoninX-Anime-Client)

> **Note on Cloning:** Because the RoninX Anime Client relies directly on the private backend *Ronin API*, you cannot simply copy and run it out of the box. **However**, you can absolutely fork the client, swap out its API endpoints to connect to your own instance of the **Open Anime API**, and build your own custom desktop anime project!

---

Enjoy your endless anime streaming experience with Anime Miner Frontend WEB!

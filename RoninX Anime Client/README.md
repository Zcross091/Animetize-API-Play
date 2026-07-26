# RoninX Anime (Native Android) 🚀

Welcome to the **RoninX Anime Native Android Client**. This is a complete, high-performance rewrite of the RoninX anime experience, built from the ground up using modern Android technologies. 

No longer just a web-wrapper, this is a **fully native application** designed for speed, immersion, and a premium viewing experience.

## 📱 Key Features

- **Native UI/UX**: Built with **Jetpack Compose** for fluid animations and a modern, glassmorphic dark theme.
- **Cinematic Playback**: Powered by **Media3 ExoPlayer**, offering native buffer management and adaptive bitrate streaming.
- **Instant Search**: Intelligent, debounced search engine for finding any anime in seconds.
- **Smart Stream Mining**: Deep integration with the **Ronin Proxy**, automatically triggering miners if a stream is not yet cached.
- **Minimalist Navigation**: Native bottom navigation for Home, Manga, Browse, and Profile.

---

## 🛠️ Tech Stack

- **Language**: Kotlin
- **UI Framework**: Jetpack Compose (Material 3)
- **Networking**: Retrofit & OkHttp
- **Dependency Injection**: Hilt
- **Media**: Android Media3 ExoPlayer
- **Architecture**: MVVM (Model-View-ViewModel)

---

## ⚙️ Powered by Ronin API (Backend Server)

This app connects to a dedicated, high-performance **backend server** running the **Ronin API**. 
The Ronin API is a highly advanced, customized fork of the revolutionary **Open Anime API** framework. 

### 📢 Credits: Open Anime API
If you are a developer looking to build your own streaming platform, you absolutely MUST check out **[Open Anime API](https://github.com/Zcross091/Open-Anime-API)**. It is the core engine that makes projects like this possible!

---

## 🚀 Getting Started

1. **Clone the project**: `git clone <repo-url>`
2. **Open in Android Studio**: Ensure you have the latest version of Android Studio (Ladybug or newer).
3. **Configure Environment**: Update the API endpoints in the `NetworkModule.kt` if using a custom proxy.
4. **Build and Run**: Deploy to an Android device or emulator (API 26+).

---

Enjoy your ultimate native anime streaming experience with RoninX!

# Turning RoninX Anime Website into an Android App

This plan outlines the steps to convert the existing React + Vite anime website into a native-feeling Android application using **Capacitor**. This approach allows you to maintain your existing React codebase while gaining the ability to run as a standalone Android app with access to native features.

## User Review Required

> [!IMPORTANT]
> **Capacitor vs. Native Compose:**
> This plan uses **Capacitor** to wrap your current React website. This is the fastest way to get your website onto a phone. If you instead wanted a **fully native rewrite** using Jetpack Compose (Kotlin), please let me know, as that would be a significantly larger task.

> [!NOTE]
> **Package ID:**
> I will use `com.roninx.anime` as the default package ID. If you have a specific domain or ID in mind, please specify it.

## Proposed Changes

### [Conversion to Hybrid App]

#### [MODIFY] [package.json](file:///C:/Users/afaqa/OneDrive/Documents/Development/Anime%20Player%20webot/RoninX%20Anime%20Client/package.json)
- Add Capacitor dependencies (`@capacitor/core`, `@capacitor/cli`, `@capacitor/android`).

#### [NEW] [capacitor.config.ts](file:///C:/Users/afaqa/OneDrive/Documents/Development/Anime%20Player%20webot/RoninX%20Anime%20Client/capacitor.config.ts)
- Configuration file for Capacitor.

#### [NEW] [android/](file:///C:/Users/afaqa/OneDrive/Documents/Development/Anime%20Player%20webot/RoninX%20Anime%20Client/android/)
- A new Android project directory will be generated within your project.

## Workflow

1.  **Install Dependencies:** Add Capacitor core and CLI to the project.
2.  **Initialize Capacitor:** Set up the app name and package ID.
3.  **Build Web App:** Run the Vite build to generate the `dist` folder.
4.  **Add Android Platform:** Generate the native Android project.
5.  **Sync Code:** Copy the built web assets into the Android project.
6.  **Verification:** Ensure the Android project can be built and run in Android Studio.

## Verification Plan

### Automated Tests
- I will run `npm run build` to ensure the web project compiles correctly.
- I will run `npx cap sync` to verify the integration between the web and native parts.

### Manual Verification
- You will be able to open the generated `android` folder in Android Studio and run it on an emulator or physical device.

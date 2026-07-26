# Native Search Screen Implementation

This plan details the implementation of a unified search screen for the RoninX Anime app. This will allow users to find any anime title using the Jikan API.

## User Review Required

> [!NOTE]
> **Unified Search:**
> Initially, the search will focus on **Anime**. I will add a toggle for **Manga** search once the Manga metadata repository is fully implemented in the next phase.

## Proposed Changes

### [Search Architecture]

#### [NEW] [SearchViewModel](file:///C:/Users/afaqa/OneDrive/Documents/Development/Anime%20Player%20webot/RoninX%20Anime%20Client/app/src/main/kotlin/com/roninx/anime/ui/search/SearchViewModel.kt)
- Handles the search query state.
- Debounces input to avoid excessive API calls (e.g., waiting 300ms after typing).
- Triggers `repository.searchAnime(query)`.

#### [NEW] [SearchScreen](file:///C:/Users/afaqa/OneDrive/Documents/Development/Anime%20Player%20webot/RoninX%20Anime%20Client/app/src/main/kotlin/com/roninx/anime/ui/search/SearchScreen.kt)
- **Search Bar:** A clean, native `TextField` with a magnifying glass icon and "Clear" button.
- **Results Grid:** Reuses the `AnimeCard` component in a 2-column or 3-column grid layout.
- **Empty States:** Displays "Type to search..." initially and "No results found" when appropriate.

### [Data Layer]

#### [MODIFY] [AnimeRepository](file:///C:/Users/afaqa/OneDrive/Documents/Development/Anime%20Player%20webot/RoninX%20Anime%20Client/app/src/main/kotlin/com/roninx/anime/data/repository/AnimeRepository.kt)
- Ensure error handling for empty search results.

## Workflow

1.  **Search Logic:** Implement the `SearchViewModel` with debounce logic using Kotlin Coroutines/Flow.
2.  **UI Layout:** Create the `SearchScreen` with a sticky search bar and a scrollable results area.
3.  **Navigation:** Hook up the bottom navigation to the real `SearchScreen`.
4.  **Refinement:** Add "Loading" and "Error" states to the search UI.

## Verification Plan

### Automated Tests
- **Unit Test:** Verify the debounce logic ensures only one API call is made if the user types rapidly.

### Manual Verification
- Type "Naruto" and verify that results appear.
- Tap a result and verify it navigates to the Correct **Detail Screen**.
- Clear the search and verify the UI resets.

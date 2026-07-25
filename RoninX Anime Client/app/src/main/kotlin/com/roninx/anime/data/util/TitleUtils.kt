package com.roninx.anime.data.util

object TitleUtils {
    fun buildVariants(input: List<String?>): List<String> {
        val allVariants = mutableListOf<String>()
        
        input.filterNotNull().forEach { t ->
            val base = t.lowercase().trim()
            if (base.isEmpty()) return@forEach
            
            val withSpaces = base.replace(Regex("[^a-z0-9]+"), " ").replace(Regex("\\s+"), " ").trim()
            val noSymbols = base.replace(Regex("[^a-z0-9\\s]"), "").replace(Regex("\\s+"), " ").trim()
            val noSpaces = withSpaces.replace(" ", "")
            val noSeason = withSpaces.replace(Regex("\\s*(season|part|tv|cour)\\s*\\d*\\s*$", RegexOption.IGNORE_CASE), "").trim()
            val withHyphens = withSpaces.replace(" ", "-")
            val baseHyphenated = base.replace(" ", "-")
            val pureAlphaNumeric = base.replace(Regex("[^a-z0-9]"), "")

            val subs = listOf(base, withSpaces, noSymbols, noSpaces, noSeason, withHyphens, baseHyphenated, pureAlphaNumeric)
            allVariants.addAll(subs)
            allVariants.addAll(subs.map { "$it dub" })
        }

        return allVariants.distinct()
    }
}

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TMDBItem } from "./useTMDB";

// Common movie/series title patterns in Portuguese articles
const MOVIE_KEYWORDS = [
  "filme", "filmes", "longa", "longa-metragem",
  "série", "séries", "seriado",
  "cinema", "estreia", "estreou",
  "ator", "atriz", "diretor",
  "oscar", "globo de ouro", "emmy",
  "netflix", "prime video", "disney+", "hbo", "max",
  "marvel", "dc", "star wars",
];

// Extract potential movie/series titles from text
function extractPotentialTitles(text: string): string[] {
  const titles: string[] = [];
  
  // Look for quoted titles
  const quotedPattern = /"([^"]+)"|'([^']+)'|"([^"]+)"|«([^»]+)»/g;
  let match;
  while ((match = quotedPattern.exec(text)) !== null) {
    const title = match[1] || match[2] || match[3] || match[4];
    if (title && title.length > 2 && title.length < 100) {
      titles.push(title.trim());
    }
  }

  // Look for capitalized phrases that might be titles (3+ consecutive capitalized words)
  const capitalizedPattern = /(?:[A-Z][a-záàâãéèêíïóôõöúçñ]*\s+){2,}[A-Z][a-záàâãéèêíïóôõöúçñ]*/g;
  while ((match = capitalizedPattern.exec(text)) !== null) {
    const potential = match[0].trim();
    if (potential.length > 5 && potential.length < 100) {
      titles.push(potential);
    }
  }

  // Dedupe and limit
  return [...new Set(titles)].slice(0, 10);
}

// Check if article content is likely about entertainment
function isEntertainmentContent(text: string, category: string): boolean {
  if (category === "entretenimento" || category === "cultura") {
    return true;
  }
  
  const lowerText = text.toLowerCase();
  const keywordCount = MOVIE_KEYWORDS.filter(kw => lowerText.includes(kw)).length;
  return keywordCount >= 2;
}

export function useArticleTMDBMentions(
  articleContent: string | null,
  articleTitle: string,
  category: string
) {
  return useQuery({
    queryKey: ["tmdb-mentions", articleTitle],
    queryFn: async (): Promise<TMDBItem[]> => {
      const fullText = `${articleTitle} ${articleContent || ""}`;
      
      // Only search if content seems entertainment-related
      if (!isEntertainmentContent(fullText, category)) {
        return [];
      }

      const potentialTitles = extractPotentialTitles(fullText);
      
      // Also add the article title as a potential search
      if (category === "entretenimento" || category === "cultura") {
        // Try to extract movie title from article title
        const titleMatch = articleTitle.match(/["'"](.+?)["'"]|:\s*(.+?)(?:\s*[-–—]|$)/);
        if (titleMatch) {
          potentialTitles.unshift(titleMatch[1] || titleMatch[2]);
        }
      }

      if (potentialTitles.length === 0) {
        return [];
      }

      const results: TMDBItem[] = [];
      const seenIds = new Set<number>();

      // Search for each potential title (limit to first 5 to avoid too many requests)
      for (const title of potentialTitles.slice(0, 5)) {
        try {
          const { data, error } = await supabase.functions.invoke("tmdb-sync", {
            body: { action: "search", query: title, type: "multi" },
          });

          if (!error && data?.data) {
            // Get first result that's a movie or TV show
            const match = data.data.find(
              (item: any) =>
                (item.media_type === "movie" || item.media_type === "tv") &&
                !seenIds.has(item.id)
            );
            
            if (match) {
              seenIds.add(match.id);
              results.push({
                id: String(match.id),
                tmdb_id: match.id,
                media_type: match.media_type,
                title: match.title || match.name,
                original_title: match.original_title || match.original_name,
                poster_path: match.poster_path,
                backdrop_path: match.backdrop_path,
                overview: match.overview,
                release_date: match.release_date || match.first_air_date,
                vote_average: match.vote_average,
                popularity: match.popularity,
                genre_ids: match.genre_ids,
                is_trending: false,
              });
            }
          }
        } catch (err) {
          console.error("Error searching TMDB:", err);
        }

        // Limit to 3 results max
        if (results.length >= 3) break;
      }

      return results;
    },
    enabled: !!(articleContent || articleTitle),
    staleTime: 1000 * 60 * 60, // 1 hour
    retry: false,
  });
}

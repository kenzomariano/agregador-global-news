import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TMDBItem } from "./useTMDB";

// Extract potential movie/series titles from text more accurately
function extractPotentialTitles(text: string, articleTitle: string): string[] {
  const titles: string[] = [];
  
  // Look for quoted titles (various quote styles)
  const quotedPattern = /"([^"]+)"|'([^']+)'|"([^"]+)"|«([^»]+)»|'([^']+)'/g;
  let match;
  while ((match = quotedPattern.exec(text)) !== null) {
    const title = match[1] || match[2] || match[3] || match[4] || match[5];
    if (title && title.length > 2 && title.length < 80 && !isCommonPhrase(title)) {
      titles.push(title.trim());
    }
  }

  // Look for titles after common patterns like "filme X" or "série Y"
  const filmPatterns = [
    /(?:filme|longa|produção)\s+["']?([A-Z][^"',\n.]+)/gi,
    /(?:série|seriado)\s+["']?([A-Z][^"',\n.]+)/gi,
    /(?:franquia|saga)\s+["']?([A-Z][^"',\n.]+)/gi,
    /(?:sequência|continuação)\s+(?:de\s+)?["']?([A-Z][^"',\n.]+)/gi,
  ];
  
  for (const pattern of filmPatterns) {
    while ((match = pattern.exec(text)) !== null) {
      const title = match[1]?.trim();
      if (title && title.length > 3 && title.length < 60 && !isCommonPhrase(title)) {
        titles.push(title);
      }
    }
  }

  // Extract from article title if it mentions a movie/series
  const titleMatch = articleTitle.match(/["'"]([^"'"]+)["'"]|:\s*([^–—\-]+?)(?:\s*[–—\-]|$)/);
  if (titleMatch) {
    const extracted = (titleMatch[1] || titleMatch[2])?.trim();
    if (extracted && extracted.length > 2 && extracted.length < 80) {
      titles.unshift(extracted);
    }
  }

  // Dedupe, filter and limit
  const seen = new Set<string>();
  return titles
    .filter(t => {
      const lower = t.toLowerCase();
      if (seen.has(lower)) return false;
      seen.add(lower);
      return true;
    })
    .slice(0, 8);
}

// Filter out common Portuguese phrases that aren't movie titles
function isCommonPhrase(text: string): boolean {
  const commonPhrases = [
    "entreaberta", "veja mais", "leia mais", "clique aqui", "saiba mais",
    "em breve", "em seguida", "no entanto", "por outro lado", "além disso",
    "de acordo", "segundo fontes", "conforme", "neste momento", "até agora",
    "por isso", "desta forma", "sendo assim"
  ];
  const lower = text.toLowerCase();
  return commonPhrases.some(phrase => lower.includes(phrase)) || text.length < 3;
}

// Check if article content is likely about entertainment
function isEntertainmentContent(text: string, category: string): boolean {
  if (category === "entretenimento" || category === "cultura") {
    return true;
  }
  
  const entertainmentKeywords = [
    "filme", "filmes", "longa", "longa-metragem",
    "série", "séries", "seriado", "temporada",
    "cinema", "estreia", "estreou", "lançamento",
    "ator", "atriz", "diretor", "diretora", "roteirista",
    "oscar", "globo de ouro", "emmy", "golden globe",
    "netflix", "prime video", "disney+", "hbo", "max", "streaming",
    "marvel", "dc", "star wars", "pixar", "dreamworks",
    "hollywood", "blockbuster", "bilheteria", "trailer",
    "piratas do caribe", "capitão jack", "johnny depp"
  ];
  
  const lowerText = text.toLowerCase();
  const keywordCount = entertainmentKeywords.filter(kw => lowerText.includes(kw)).length;
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

      const potentialTitles = extractPotentialTitles(fullText, articleTitle);

      if (potentialTitles.length === 0) {
        return [];
      }

      console.log("Searching TMDB for titles:", potentialTitles);

      const results: TMDBItem[] = [];
      const seenIds = new Set<number>();

      // Search for each potential title (limit to first 5)
      for (const title of potentialTitles.slice(0, 5)) {
        try {
          const { data, error } = await supabase.functions.invoke("tmdb-sync", {
            body: { action: "search", query: title, type: "multi" },
          });

          if (!error && data?.data && Array.isArray(data.data)) {
            // Get first relevant result that's a movie or TV show
            const match = data.data.find(
              (item: any) =>
                (item.media_type === "movie" || item.media_type === "tv") &&
                !seenIds.has(item.id) &&
                item.vote_count > 10 // Filter out obscure titles
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
          console.error("Error searching TMDB for:", title, err);
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

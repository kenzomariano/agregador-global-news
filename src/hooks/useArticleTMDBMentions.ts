import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TMDBItem } from "./useTMDB";

// Known movie/series titles to look for explicitly (popular franchises)
const KNOWN_FRANCHISES: Record<string, { query: string; type: "movie" | "tv" }> = {
  "piratas do caribe": { query: "Pirates of the Caribbean", type: "movie" },
  "pirates of the caribbean": { query: "Pirates of the Caribbean", type: "movie" },
  "star wars": { query: "Star Wars", type: "movie" },
  "guerra nas estrelas": { query: "Star Wars", type: "movie" },
  "harry potter": { query: "Harry Potter", type: "movie" },
  "senhor dos anéis": { query: "Lord of the Rings", type: "movie" },
  "lord of the rings": { query: "Lord of the Rings", type: "movie" },
  "vingadores": { query: "Avengers", type: "movie" },
  "avengers": { query: "Avengers", type: "movie" },
  "homem-aranha": { query: "Spider-Man", type: "movie" },
  "spider-man": { query: "Spider-Man", type: "movie" },
  "batman": { query: "Batman", type: "movie" },
  "game of thrones": { query: "Game of Thrones", type: "tv" },
  "stranger things": { query: "Stranger Things", type: "tv" },
  "breaking bad": { query: "Breaking Bad", type: "tv" },
  "the witcher": { query: "The Witcher", type: "tv" },
  "the mandalorian": { query: "The Mandalorian", type: "tv" },
  "wandavision": { query: "WandaVision", type: "tv" },
  "loki": { query: "Loki", type: "tv" },
  "casa do dragão": { query: "House of the Dragon", type: "tv" },
  "house of the dragon": { query: "House of the Dragon", type: "tv" },
  "the last of us": { query: "The Last of Us", type: "tv" },
  "succession": { query: "Succession", type: "tv" },
  "white lotus": { query: "The White Lotus", type: "tv" },
};

// Extract potential movie/series titles from text more accurately
function extractPotentialTitles(text: string, articleTitle: string): { title: string; type?: "movie" | "tv" }[] {
  const results: { title: string; type?: "movie" | "tv" }[] = [];
  const lowerText = text.toLowerCase();
  
  // First, check for known franchises
  for (const [key, value] of Object.entries(KNOWN_FRANCHISES)) {
    if (lowerText.includes(key)) {
      results.push({ title: value.query, type: value.type });
    }
  }

  // Look for quoted titles (various quote styles)
  const quotedPattern = /"([^"]+)"|'([^']+)'|"([^"]+)"|«([^»]+)»|'([^']+)'/g;
  let match;
  while ((match = quotedPattern.exec(text)) !== null) {
    const title = match[1] || match[2] || match[3] || match[4] || match[5];
    if (title && title.length > 2 && title.length < 80 && !isCommonPhrase(title)) {
      results.push({ title: title.trim() });
    }
  }

  // Look for titles after common patterns
  const filmPatterns = [
    { pattern: /(?:filme|longa|produção|longa-metragem)\s+["']?([A-Z][^"',\n.]+)/gi, type: "movie" as const },
    { pattern: /(?:série|seriado|minissérie)\s+["']?([A-Z][^"',\n.]+)/gi, type: "tv" as const },
    { pattern: /(?:nova\s+temporada\s+de|temporada\s+de)\s+["']?([A-Z][^"',\n.]+)/gi, type: "tv" as const },
    { pattern: /(?:franquia|saga|trilogia)\s+["']?([A-Z][^"',\n.]+)/gi, type: "movie" as const },
    { pattern: /(?:sequência|continuação|spin-off)\s+(?:de\s+)?["']?([A-Z][^"',\n.]+)/gi, type: "movie" as const },
  ];
  
  for (const { pattern, type } of filmPatterns) {
    while ((match = pattern.exec(text)) !== null) {
      const title = match[1]?.trim();
      if (title && title.length > 3 && title.length < 60 && !isCommonPhrase(title)) {
        results.push({ title, type });
      }
    }
  }

  // Extract from article title if it mentions a movie/series
  const titleMatch = articleTitle.match(/["'"]([^"'"]+)["'"]|:\s*([^–—\-]+?)(?:\s*[–—\-]|$)/);
  if (titleMatch) {
    const extracted = (titleMatch[1] || titleMatch[2])?.trim();
    if (extracted && extracted.length > 2 && extracted.length < 80 && !isCommonPhrase(extracted)) {
      results.unshift({ title: extracted });
    }
  }

  // Dedupe
  const seen = new Set<string>();
  return results.filter((item) => {
    const lower = item.title.toLowerCase();
    if (seen.has(lower)) return false;
    seen.add(lower);
    return true;
  }).slice(0, 8);
}

// Filter out common Portuguese phrases that aren't movie titles
function isCommonPhrase(text: string): boolean {
  const commonPhrases = [
    "entreaberta", "veja mais", "leia mais", "clique aqui", "saiba mais",
    "em breve", "em seguida", "no entanto", "por outro lado", "além disso",
    "de acordo", "segundo fontes", "conforme", "neste momento", "até agora",
    "por isso", "desta forma", "sendo assim", "já disponível", "em cartaz",
    "confira", "assista", "não perca", "exclusivo", "inédito", "novo",
    "recente", "últimas", "notícias", "atualização", "novidade", "lançamento",
    "anúncio", "revelação", "spoiler", "entrevista"
  ];
  const lower = text.toLowerCase().trim();
  return commonPhrases.some(phrase => lower === phrase || lower.startsWith(phrase + " ")) || text.length < 3;
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
    "piratas do caribe", "capitão jack", "johnny depp",
    "personagem", "protagonista", "elenco", "produção cinematográfica"
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
      for (const { title, type } of potentialTitles.slice(0, 5)) {
        try {
          const searchType = type || "multi";
          const { data, error } = await supabase.functions.invoke("tmdb-sync", {
            body: { action: "search", query: title, type: searchType },
          });

          if (!error && data?.data && Array.isArray(data.data)) {
            // Get first relevant result that's a movie or TV show
            const match = data.data.find(
              (item: any) =>
                (item.media_type === "movie" || item.media_type === "tv" || type) &&
                !seenIds.has(item.id) &&
                item.vote_count > 50 && // Higher threshold to filter obscure titles
                item.popularity > 5 // Also filter by popularity
            );
            
            if (match) {
              seenIds.add(match.id);
              results.push({
                id: String(match.id),
                tmdb_id: match.id,
                media_type: match.media_type || type || "movie",
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

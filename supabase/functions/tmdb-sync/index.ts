import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TMDB_API_KEY = "31d4d2b07ffe738b5a9b813d1787e71f";
const TMDB_BASE_URL = "https://api.themoviedb.org/3";

interface TMDBMovie {
  id: number;
  title: string;
  original_title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  release_date: string;
  vote_average: number;
  popularity: number;
  genre_ids: number[];
}

interface TMDBTVShow {
  id: number;
  name: string;
  original_name: string;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  first_air_date: string;
  vote_average: number;
  popularity: number;
  genre_ids: number[];
}

interface TMDBVideo {
  key: string;
  site: string;
  name: string;
  type: string;
  official: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { action } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (action === "sync_trending") {
      console.log("Syncing trending content from TMDB...");

      // Clear old trending flags
      await supabase
        .from("tmdb_cache")
        .update({ is_trending: false })
        .eq("is_trending", true);

      // Fetch trending movies
      const moviesResponse = await fetch(
        `${TMDB_BASE_URL}/trending/movie/week?api_key=${TMDB_API_KEY}&language=pt-BR`
      );
      const moviesData = await moviesResponse.json();

      // Fetch trending TV shows
      const tvResponse = await fetch(
        `${TMDB_BASE_URL}/trending/tv/week?api_key=${TMDB_API_KEY}&language=pt-BR`
      );
      const tvData = await tvResponse.json();

      let syncedCount = 0;

      // Process movies
      for (const movie of (moviesData.results || []).slice(0, 10) as TMDBMovie[]) {
        const { error } = await supabase
          .from("tmdb_cache")
          .upsert({
            tmdb_id: movie.id,
            media_type: "movie",
            title: movie.title,
            original_title: movie.original_title,
            poster_path: movie.poster_path,
            backdrop_path: movie.backdrop_path,
            overview: movie.overview,
            release_date: movie.release_date || null,
            vote_average: movie.vote_average,
            popularity: movie.popularity,
            genre_ids: movie.genre_ids,
            is_trending: true,
            updated_at: new Date().toISOString(),
          }, { onConflict: "tmdb_id,media_type" });

        if (!error) {
          syncedCount++;
          
          // Fetch and store trailers
          await fetchAndStoreTrailers(supabase, movie.id, "movie");
        }
      }

      // Process TV shows
      for (const show of (tvData.results || []).slice(0, 10) as TMDBTVShow[]) {
        const { error } = await supabase
          .from("tmdb_cache")
          .upsert({
            tmdb_id: show.id,
            media_type: "tv",
            title: show.name,
            original_title: show.original_name,
            poster_path: show.poster_path,
            backdrop_path: show.backdrop_path,
            overview: show.overview,
            release_date: show.first_air_date || null,
            vote_average: show.vote_average,
            popularity: show.popularity,
            genre_ids: show.genre_ids,
            is_trending: true,
            updated_at: new Date().toISOString(),
          }, { onConflict: "tmdb_id,media_type" });

        if (!error) {
          syncedCount++;
          
          // Fetch and store trailers
          await fetchAndStoreTrailers(supabase, show.id, "tv");
        }
      }

      console.log(`Synced ${syncedCount} trending items`);

      return new Response(
        JSON.stringify({ success: true, syncedCount }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "get_trending") {
      const { data, error } = await supabase
        .from("tmdb_cache")
        .select("*")
        .eq("is_trending", true)
        .order("popularity", { ascending: false })
        .limit(20);

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "get_trailers") {
      const { data: cache, error: cacheError } = await supabase
        .from("tmdb_cache")
        .select("tmdb_id, media_type, title, poster_path, backdrop_path")
        .eq("is_trending", true)
        .order("popularity", { ascending: false })
        .limit(10);

      if (cacheError) throw cacheError;

      const { data: trailers, error: trailersError } = await supabase
        .from("tmdb_trailers")
        .select("*")
        .in("tmdb_id", cache?.map(c => c.tmdb_id) || []);

      if (trailersError) throw trailersError;

      // Combine cache data with trailers
      const result = cache?.map(item => ({
        ...item,
        trailers: trailers?.filter(t => t.tmdb_id === item.tmdb_id && t.media_type === item.media_type) || []
      }));

      return new Response(
        JSON.stringify({ success: true, data: result }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "search") {
      const { query, type = "multi" } = await req.json();
      
      const searchResponse = await fetch(
        `${TMDB_BASE_URL}/search/${type}?api_key=${TMDB_API_KEY}&language=pt-BR&query=${encodeURIComponent(query)}`
      );
      const searchData = await searchResponse.json();

      return new Response(
        JSON.stringify({ success: true, data: searchData.results }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("TMDB sync error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function fetchAndStoreTrailers(
  supabase: any,
  tmdbId: number,
  mediaType: "movie" | "tv"
) {
  try {
    const videosResponse = await fetch(
      `${TMDB_BASE_URL}/${mediaType}/${tmdbId}/videos?api_key=${TMDB_API_KEY}&language=pt-BR`
    );
    const videosData = await videosResponse.json();

    // Also fetch English videos as fallback
    const videosEnResponse = await fetch(
      `${TMDB_BASE_URL}/${mediaType}/${tmdbId}/videos?api_key=${TMDB_API_KEY}&language=en-US`
    );
    const videosEnData = await videosEnResponse.json();

    const allVideos = [...(videosData.results || []), ...(videosEnData.results || [])];
    
    // Filter for trailers on YouTube
    const trailers = allVideos
      .filter((v: TMDBVideo) => v.site === "YouTube" && (v.type === "Trailer" || v.type === "Teaser"))
      .slice(0, 3);

    // Store unique trailers
    const seenKeys = new Set<string>();
    for (const trailer of trailers as TMDBVideo[]) {
      if (seenKeys.has(trailer.key)) continue;
      seenKeys.add(trailer.key);

      await supabase
        .from("tmdb_trailers")
        .upsert({
          tmdb_id: tmdbId,
          media_type: mediaType,
          video_key: trailer.key,
          video_site: trailer.site,
          video_name: trailer.name,
          video_type: trailer.type,
          is_official: trailer.official,
        }, { onConflict: "tmdb_id,media_type,video_key" });
    }
  } catch (error) {
    console.error(`Failed to fetch trailers for ${mediaType}/${tmdbId}:`, error);
  }
}
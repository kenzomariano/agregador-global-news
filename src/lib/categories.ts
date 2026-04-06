export const CATEGORIES = {
  politica: { label: 'Política', icon: 'Landmark', color: 'text-red-600' },
  economia: { label: 'Economia', icon: 'TrendingUp', color: 'text-green-600' },
  tecnologia: { label: 'Tecnologia', icon: 'Cpu', color: 'text-blue-600' },
  esportes: { label: 'Esportes', icon: 'Trophy', color: 'text-orange-600' },
  entretenimento: { label: 'Entretenimento', icon: 'Film', color: 'text-purple-600' },
  saude: { label: 'Saúde', icon: 'Heart', color: 'text-pink-600' },
  ciencia: { label: 'Ciência', icon: 'FlaskConical', color: 'text-cyan-600' },
  mundo: { label: 'Mundo', icon: 'Globe', color: 'text-indigo-600' },
  brasil: { label: 'Brasil', icon: 'Flag', color: 'text-emerald-600' },
  cultura: { label: 'Cultura', icon: 'Palette', color: 'text-amber-600' },
} as const;

export type CategoryKey = keyof typeof CATEGORIES;

export const ENTERTAINMENT_SUBCATEGORIES = {
  anime: { label: 'Anime', icon: '🎌' },
  streaming: { label: 'Streaming', icon: '📺' },
  novela: { label: 'Novela', icon: '📖' },
  serie: { label: 'Série', icon: '🎬' },
  filme: { label: 'Filme', icon: '🎥' },
  cinema: { label: 'Cinema', icon: '🍿' },
  musica: { label: 'Música', icon: '🎵' },
  celebridades: { label: 'Celebridades', icon: '⭐' },
  games: { label: 'Games', icon: '🎮' },
  kdrama: { label: 'K-Drama', icon: '🇰🇷' },
} as const;

export type EntertainmentSubcategory = keyof typeof ENTERTAINMENT_SUBCATEGORIES;

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

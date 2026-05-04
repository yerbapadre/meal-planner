export const TAG_COLORS = [
  'bg-orange-100 text-orange-700 border-orange-200',
  'bg-teal-100 text-teal-700 border-teal-200',
  'bg-violet-100 text-violet-700 border-violet-200',
  'bg-amber-100 text-amber-700 border-amber-200',
  'bg-sky-100 text-sky-700 border-sky-200',
]

// Structured filter groups — logic:
//   'or'  = meal matches if it has ANY selected tag in this group (e.g. Breakfast OR Lunch)
//   'and' = meal matches if it has ALL selected tags in this group (e.g. Vegan AND Gluten-free)
export const FILTER_GROUPS = [
  {
    label: 'Meal type',
    tags: ['breakfast', 'lunch', 'dinner', 'snack', 'dessert', 'appetizer'],
    logic: 'or' as const,
  },
  {
    label: 'Diet',
    tags: ['vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'keto', 'paleo'],
    logic: 'and' as const,
  },
  {
    label: 'Cuisine',
    tags: ['italian', 'mexican', 'asian', 'thai', 'mediterranean', 'american', 'indian'],
    logic: 'or' as const,
  },
  {
    label: 'Method',
    tags: ['freezer-friendly', 'meal-prep', 'one-pan', 'slow-cooker'],
    logic: 'or' as const,
  },
] as const

export type TimeFilter = 'quick' | 'medium' | 'slow'

export const TIME_OPTIONS: { id: TimeFilter; label: string; description: string }[] = [
  { id: 'quick',  label: 'Quick',  description: '≤ 20 min' },
  { id: 'medium', label: 'Medium', description: '21–45 min' },
  { id: 'slow',   label: 'Slow',   description: '> 45 min' },
]

export const TAG_CATEGORIES = [
  { label: 'Diet',    tags: ['vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'keto', 'paleo'] },
  { label: 'Meal',    tags: ['breakfast', 'lunch', 'dinner', 'snack', 'dessert'] },
  { label: 'Speed',   tags: ['quick', 'meal-prep', 'slow-cooker'] },
  { label: 'Cuisine', tags: ['italian', 'mexican', 'asian', 'mediterranean', 'american'] },
]

const CANONICAL = new Set(TAG_CATEGORIES.flatMap(c => c.tags))

export function groupTags(tags: string[]): { label: string; tags: string[] }[] {
  const result: { label: string; tags: string[] }[] = []
  for (const cat of TAG_CATEGORIES) {
    const matched = cat.tags.filter(t => tags.includes(t))
    if (matched.length) result.push({ label: cat.label, tags: matched })
  }
  const other = tags.filter(t => !CANONICAL.has(t)).sort()
  if (other.length) result.push({ label: 'Other', tags: other })
  return result
}

export function suggestTags(input: string, allTags: string[], current: string[]): string[] {
  const q = input.toLowerCase().trim()
  if (!q) return []
  const seen = new Set<string>()
  const results: string[] = []
  for (const t of [...TAG_CATEGORIES.flatMap(c => c.tags), ...allTags]) {
    if (!seen.has(t) && t.includes(q) && !current.includes(t)) {
      seen.add(t)
      results.push(t)
    }
  }
  return results.slice(0, 8)
}

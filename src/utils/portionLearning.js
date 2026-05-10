// ── Portion Learning — personalized gram adjustments ─────────────────────────
// Required Supabase migration (run once in SQL editor):
//
//   create table if not exists portion_corrections (
//     id uuid default gen_random_uuid() primary key,
//     user_id uuid references auth.users not null,
//     meal_id uuid, meal_type text, component_id text,
//     ai_estimated_g numeric, user_corrected_g numeric,
//     correction_direction text, created_at timestamptz default now()
//   );
//   alter table portion_corrections enable row level security;
//   create policy "own corrections" on portion_corrections
//     for all using (auth.uid() = user_id);

// Load user's average correction factor per component.
// Returns: { [componentId]: factor }  where factor = avg(user_corrected / ai_estimated)
export async function loadPortionAdjustments(supabase, userId) {
  try {
    const { data } = await supabase
      .from('portion_corrections')
      .select('component_id, ai_estimated_g, user_corrected_g')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100)

    if (!data?.length) return {}

    const groups = {}
    for (const row of data) {
      if (!row.ai_estimated_g || !row.user_corrected_g) continue
      const f = row.user_corrected_g / row.ai_estimated_g
      ;(groups[row.component_id] ||= []).push(f)
    }

    const out = {}
    for (const [id, fs] of Object.entries(groups)) {
      const avg = fs.reduce((s, f) => s + f, 0) / fs.length
      out[id] = Math.max(0.5, Math.min(2.0, avg))   // cap to 0.5–2× range
    }
    return out
  } catch { return {} }
}

// Save corrections for components the user explicitly adjusted.
// Only called after a successful meal insert.
export async function savePortionCorrections(supabase, userId, mealId, mealType, components) {
  const rows = components
    .filter(c => c.correctionDir && (c.baseGrams || 0) > 0)
    .map(c => ({
      user_id: userId,
      meal_id: mealId || null,
      meal_type: mealType || null,
      component_id: c.aiName || c.name,
      ai_estimated_g: Math.round(c.baseGrams),
      user_corrected_g: Math.round(c.grams || c.baseGrams),
      correction_direction: c.correctionDir,
    }))
  if (rows.length) await supabase.from('portion_corrections').insert(rows)
}

// True once the user has any saved corrections
export const hasPersonalization = (adj) => Object.keys(adj || {}).length > 0

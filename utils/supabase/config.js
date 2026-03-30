export function getSupabaseConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
  const missing = [];

  if (!supabaseUrl) {
    missing.push('NEXT_PUBLIC_SUPABASE_URL');
  }

  if (!supabaseKey) {
    missing.push('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY');
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing Supabase environment variables: ${missing.join(', ')}. Configure them in your deployment environment and redeploy.`
    );
  }

  return { supabaseUrl, supabaseKey };
}

export async function GET() {
  return Response.json({
    base: process.env.NEXT_PUBLIC_BASE_URL ?? null,
    supabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    anonKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    where: process.env.VERCEL_ENV ?? null,
  })
}


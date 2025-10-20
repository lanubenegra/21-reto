// Simple placeholder to silence /api/state errors while the real
// persistence layer is implemented.
export async function GET() {
  return Response.json({ ok: true, state: null }, { status: 200 });
}

export async function POST(req: Request) {
  try {
    await req.json();
  } catch {
    // ignore malformed payload; this endpoint is just a stub
  }
  return Response.json({ ok: true }, { status: 200 });
}

export async function PUT(req: Request) {
  try {
    await req.json();
  } catch {
    // ignore malformed payload; this endpoint is just a stub
  }
  return Response.json({ ok: true }, { status: 200 });
}

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (typeof body?.is_favourite !== "boolean") {
    return NextResponse.json({ error: "is_favourite (boolean) is required." }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("foods")
    .update({ is_favourite: body.is_favourite })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ food: data });
}

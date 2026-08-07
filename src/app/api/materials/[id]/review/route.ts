import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { MATERIALS_BUCKET } from '@/lib/supabase/storage';

const ALLOWED_STATUSES = ['approved', 'rejected'];

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'ADMIN') {
    return NextResponse.json(
      { error: 'Acesso negado. Apenas administradores.' },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { status } = body as { status?: string };

  if (!status || !ALLOWED_STATUSES.includes(status)) {
    return NextResponse.json(
      { error: 'Estado inválido. Usa approved ou rejected.' },
      { status: 400 }
    );
  }

  const { data: material } = await supabase
    .from('materials')
    .select('storage_path')
    .eq('id', id)
    .single();

  if (!material) {
    return NextResponse.json(
      { error: 'Material não encontrado.' },
      { status: 404 }
    );
  }

  if (status === 'rejected') {
    if (material.storage_path) {
      await supabase.storage
        .from(MATERIALS_BUCKET)
        .remove([material.storage_path]);
    }

    const { error } = await supabase.from('materials').delete().eq('id', id);

    if (error) {
      return NextResponse.json(
        { error: `Erro ao eliminar: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      deleted: true,
      message: 'Material rejeitado e removido.',
    });
  }

  const { data: updated, error } = await supabase
    .from('materials')
    .update({ review_status: 'approved' })
    .eq('id', id)
    .select()
    .single();

  if (error || !updated) {
    return NextResponse.json(
      { error: error?.message || 'Material não encontrado.' },
      { status: error ? 500 : 404 }
    );
  }

  return NextResponse.json({
    material: updated,
    message: 'Material aprovado com sucesso.',
  });
}

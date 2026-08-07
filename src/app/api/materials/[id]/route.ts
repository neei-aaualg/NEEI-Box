import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { MATERIALS_BUCKET } from '@/lib/supabase/storage';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
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

    if (material.storage_path) {
      const { error: storageError } = await supabase.storage
        .from(MATERIALS_BUCKET)
        .remove([material.storage_path]);

      if (storageError) throw storageError;
    }

    const { error } = await supabase.from('materials').delete().eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

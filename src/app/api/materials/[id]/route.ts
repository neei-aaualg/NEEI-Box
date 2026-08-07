import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { deleteFileFromOneDrive } from '@/lib/microsoft/onedrive';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> } // 1. Mudar para Promise
) {
  const resolvedParams = await params; // 2. Fazer await dos params
  const materialId = resolvedParams.id;

  try {
    const body = await request.json();
    const { onedrive_item_id } = body;

    if (!onedrive_item_id) {
      return NextResponse.json(
        { error: 'onedrive_item_id é obrigatório no body' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // 1. Apagar do OneDrive primeiro
    await deleteFileFromOneDrive(onedrive_item_id);

    // 2. Apagar do Supabase
    const { error } = await supabase
      .from('materials')
      .delete()
      .eq('id', materialId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
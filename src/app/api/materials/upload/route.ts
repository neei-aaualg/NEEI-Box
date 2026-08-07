import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { MATERIALS_BUCKET } from '@/lib/supabase/storage';
import { sanitizeFileName } from '@/lib/file-types';

const MAX_FILE_SIZE_MB = 25;

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json(
        { error: 'Falha ao ler o ficheiro enviado. Tenta novamente.' },
        { status: 400 }
      );
    }

    const file = formData.get('file') as File;
    const originalName = (formData.get('original_name') as string) || file.name;
    const courseId = formData.get('course_id') as string;
    const title = formData.get('title') as string;
    const description = (formData.get('description') as string) || '';

    if (!file || !courseId || !title) {
      return NextResponse.json(
        { error: 'Faltam campos obrigatórios.' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      return NextResponse.json(
        { error: `O ficheiro excede o limite de ${MAX_FILE_SIZE_MB} MB.` },
        { status: 413 }
      );
    }

    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id')
      .eq('id', courseId)
      .single();

    if (courseError || !course) {
      return NextResponse.json(
        { error: 'Unidade Curricular não encontrada.' },
        { status: 404 }
      );
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin = profile?.role === 'ADMIN';
    const initialStatus = isAdmin ? 'approved' : 'pending';

    const storagePath = `${user.id}/${crypto.randomUUID()}-${sanitizeFileName(file.name)}`;

    const { error: uploadError } = await supabase.storage
      .from(MATERIALS_BUCKET)
      .upload(storagePath, file, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: `Falha ao guardar o ficheiro: ${uploadError.message}` },
        { status: 500 }
      );
    }

    const { data: publicUrlData } = supabase.storage
      .from(MATERIALS_BUCKET)
      .getPublicUrl(storagePath);

    const { data: material, error: insertError } = await supabase
      .from('materials')
      .insert([
        {
          course_id: courseId,
          title,
          description,
          storage_path: storagePath,
          web_url: publicUrlData.publicUrl,
          file_name: originalName,
          uploaded_by: user.id,
          review_status: initialStatus,
        },
      ])
      .select()
      .single();

    if (insertError) {
      await supabase.storage.from(MATERIALS_BUCKET).remove([storagePath]);

      return NextResponse.json(
        { error: `Erro na BD: ${insertError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      material,
      message: isAdmin
        ? 'Material adicionado com sucesso!'
        : 'Material submetido para aprovação.',
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Erro interno no servidor.';

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

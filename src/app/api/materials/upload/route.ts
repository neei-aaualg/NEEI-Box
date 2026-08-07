import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { uploadFileToOneDrive } from '@/lib/microsoft/onedrive';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const courseId = formData.get('course_id') as string;
    const title = formData.get('title') as string;
    const description = (formData.get('description') as string) || '';

    if (!file || !courseId || !title) {
      return NextResponse.json(
        { error: 'Faltam campos obrigatórios.' },
        { status: 400 }
      );
    }

    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('name')
      .eq('id', courseId)
      .single();

    if (courseError || !course) {
      return NextResponse.json(
        { error: 'Unidade Curricular não encontrada.' },
        { status: 404 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const onedriveData = await uploadFileToOneDrive(
      buffer,
      file.name,
      course.name
    );

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin = profile?.role === 'ADMIN';
    const initialStatus = isAdmin ? 'approved' : 'pending';

    const { data: material, error: insertError } = await supabase
      .from('materials')
      .insert([
        {
          course_id: courseId,
          title,
          description,
          onedrive_item_id: onedriveData.onedrive_item_id,
          web_url: onedriveData.web_url,
          uploaded_by: user.id,
          review_status: initialStatus,
        },
      ])
      .select()
      .single();

    if (insertError) {
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

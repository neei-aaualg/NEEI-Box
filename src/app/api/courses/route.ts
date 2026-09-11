import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import prisma from '@/lib/db';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  const courses = await prisma.course.findMany({
    include: {
      _count: {
        select: { materials: true },
      },
    },
    orderBy: { name: 'asc' },
  });

  const normalized = courses.map((course) => ({
    id: course.id,
    name: course.name,
    year: course.year,
    semester: course.semester,
    created_at: course.createdAt.toISOString(),
    materials_count: course._count.materials,
  }));

  return NextResponse.json(normalized);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Acesso restrito a administradores.' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { name, year, semester } = body;

    if (!name || typeof year !== 'number' || typeof semester !== 'number') {
      return NextResponse.json({ error: 'Dados da Unidade Curricular inválidos.' }, { status: 400 });
    }

    const course = await prisma.course.create({
      data: {
        name: name.trim(),
        year,
        semester,
      },
    });

    return NextResponse.json({
      id: course.id,
      name: course.name,
      year: course.year,
      semester: course.semester,
      created_at: course.createdAt.toISOString(),
      materials_count: 0,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao criar Unidade Curricular.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

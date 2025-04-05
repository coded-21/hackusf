import { cookies } from 'next/headers';

export async function getCanvasToken(): Promise<string | null> {
  const cookieStore = cookies();
  return cookieStore.get('canvas_token')?.value || null;
} 
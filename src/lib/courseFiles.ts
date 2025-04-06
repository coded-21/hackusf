import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { createCanvasAPI } from './canvas';

export interface CourseFile {
  id: string;
  name: string;
  content: string;
  url: string;
  type: string;
}

export async function getCourseFiles(courseId: string): Promise<CourseFile[]> {
  const supabase = createClientComponentClient();
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Not authenticated');
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('canvas_token, canvas_domain')
      .eq('id', user.id)
      .single();

    if (userError) throw userError;

    if (!userData?.canvas_token || !userData?.canvas_domain) {
      throw new Error('Canvas credentials not found');
    }

    const canvas = createCanvasAPI({
      domain: userData.canvas_domain,
      token: userData.canvas_token,
    });

    const files = await canvas.getCourseFiles(Number(courseId));
    
    // Transform files to our format
    return files.map(file => ({
      id: file.id.toString(),
      name: file.display_name,
      content: '', // This will be populated when the file is selected
      url: file.url,
      type: file.content_type || 'unknown'
    }));
  } catch (error) {
    console.error('Error fetching course files:', error);
    throw error;
  }
}

export async function getFileContent(fileUrl: string): Promise<string> {
  try {
    const response = await fetch(fileUrl);
    const content = await response.text();
    return content;
  } catch (error) {
    console.error('Error fetching file content:', error);
    return '';
  }
} 
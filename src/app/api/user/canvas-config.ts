import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export interface CanvasConfig {
  domain: string;
  token: string;
}

export async function getUserCanvasConfig(userId: string): Promise<CanvasConfig | null> {
  try {
    const cookieStore = cookies();
    const supabase = createServerComponentClient({ cookies: () => cookieStore });
    
    // Get user's Canvas settings
    const { data: userData, error: settingsError } = await supabase
      .from('users')
      .select('canvas_token, canvas_domain')
      .eq('id', userId)
      .single();

    if (settingsError) {
      console.error('Error fetching user Canvas settings:', settingsError);
      return null;
    }

    if (!userData?.canvas_token || !userData?.canvas_domain) {
      console.error('Canvas settings not configured for user:', userId);
      return null;
    }

    return {
      domain: userData.canvas_domain,
      token: userData.canvas_token
    };
  } catch (error) {
    console.error('Error in getUserCanvasConfig:', error);
    return null;
  }
} 
import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

async function fetchFromCanvas(domain: string, token: string, endpoint: string) {
  const url = `${domain}/api/v1/${endpoint}`;
  console.log('Fetching from Canvas:', url);

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Invalid Canvas API token');
    } else if (response.status === 404) {
      throw new Error('Resource not found');
    }
    throw new Error(`Canvas API error: ${response.statusText}`);
  }

  return response.json();
}

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get user's Canvas settings
    const { data: userData, error: settingsError } = await supabase
      .from('users')
      .select('canvas_token, canvas_domain')
      .eq('id', user.id)
      .single();

    if (settingsError) {
      console.error('Error fetching user settings:', settingsError);
      return NextResponse.json(
        { error: 'Failed to fetch Canvas settings' },
        { status: 500 }
      );
    }

    if (!userData?.canvas_token || !userData?.canvas_domain) {
      return NextResponse.json(
        { error: 'Canvas settings not configured' },
        { status: 400 }
      );
    }

    // Get the endpoint from request body
    const { endpoint } = await request.json();
    if (!endpoint) {
      return NextResponse.json(
        { error: 'No endpoint specified' },
        { status: 400 }
      );
    }

    // Make the Canvas API request
    const data = await fetchFromCanvas(
      userData.canvas_domain,
      userData.canvas_token,
      endpoint
    );

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error('Error in Canvas API route:', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 
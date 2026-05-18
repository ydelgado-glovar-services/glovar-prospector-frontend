import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Validate the session and get the user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const payload = await request.json()

    // Inject the authenticated user.id into the payload
    const enrichedPayload = {
      ...payload,
      user_id: user.id
    }

    // Proxy the request to the FastAPI backend
    // Assuming the Python backend is running locally on port 8000, 
    // or defined via PYTHON_BACKEND_URL (falling back to NEXT_PUBLIC_API_URL if needed)
    const backendUrl = process.env.PYTHON_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'
    const endpoint = `${backendUrl}/api/v1/prospect`

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Pass along the authorization header if needed by the backend, 
        // though we injected the user_id into the body.
        'Authorization': request.headers.get('Authorization') || '',
      },
      body: JSON.stringify(enrichedPayload),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json(
        { error: `Backend error: ${response.status}`, details: errorText },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data, { status: 200 })
    
  } catch (error: any) {
    console.error('[Next.js Proxy] Error in /api/v1/prospect:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    )
  }
}

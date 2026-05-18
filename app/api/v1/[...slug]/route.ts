import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

// Reusable handler for all methods
async function handleRequest(request: NextRequest, { params }: { params: { slug: string[] } }) {
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

    // Reconstruct the target FastAPI URL dynamically
    const backendUrl = process.env.PYTHON_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'
    const endpoint = `${backendUrl}/api/v1/${params.slug.join('/')}${request.nextUrl.search}`

    // Prepare headers
    const headers = new Headers(request.headers)
    
    // Inject custom header for user ID
    headers.set('X-User-Id', user.id)
    
    // We shouldn't forward the Host header to the backend, it can cause issues
    headers.delete('Host')
    headers.delete('Connection')
    
    const requestInit: RequestInit = {
      method: request.method,
      headers: headers,
    }
    
    if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
      const clonedReq = request.clone()
      const text = await clonedReq.text()
      
      if (text) {
        try {
          const payload = JSON.parse(text)
          // Inject the authenticated user.id into the payload
          const enrichedPayload = {
            ...payload,
            user_id: user.id
          }
          requestInit.body = JSON.stringify(enrichedPayload)
          headers.set('Content-Type', 'application/json')
        } catch (e) {
          // If not JSON or failed to parse, send original text
          requestInit.body = text
        }
      }
    }

    const response = await fetch(endpoint, requestInit)

    // Handle response gracefully
    const contentType = response.headers.get('content-type')
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json()
      return NextResponse.json(data, { status: response.status })
    } else {
      const data = await response.text()
      return new NextResponse(data, { 
        status: response.status, 
        headers: { 'Content-Type': contentType || 'text/plain' } 
      })
    }

  } catch (error: any) {
    console.error(`[Next.js Catch-All Proxy] Error:`, error)
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest, context: { params: { slug: string[] } }) {
  return handleRequest(request, context)
}

export async function POST(request: NextRequest, context: { params: { slug: string[] } }) {
  return handleRequest(request, context)
}

export async function PUT(request: NextRequest, context: { params: { slug: string[] } }) {
  return handleRequest(request, context)
}

export async function PATCH(request: NextRequest, context: { params: { slug: string[] } }) {
  return handleRequest(request, context)
}

export async function DELETE(request: NextRequest, context: { params: { slug: string[] } }) {
  return handleRequest(request, context)
}

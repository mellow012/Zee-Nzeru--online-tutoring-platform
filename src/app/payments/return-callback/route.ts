import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    let txRef = '';
    let status = '';

    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const body = await request.json();
      txRef = body.tx_ref || body.txRef || '';
      status = body.status || '';
    } else {
      // Default to parsing form data
      const formData = await request.formData();
      txRef = (formData.get('tx_ref') || formData.get('txRef') || '').toString();
      status = (formData.get('status') || '').toString();
    }

    // Fallback to query parameters
    const { searchParams } = new URL(request.url);
    if (!txRef) txRef = searchParams.get('tx_ref') || '';
    if (!status) status = searchParams.get('status') || '';

    console.log(`[payments/return-callback] Intercepted POST redirect. Ref: "${txRef}", Status: "${status}"`);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    
    // Redirect to GET page using 303 See Other
    return NextResponse.redirect(
      `${appUrl}/payments/return?tx_ref=${encodeURIComponent(txRef)}&status=${encodeURIComponent(status)}`,
      303
    );
  } catch (err) {
    console.error('[payments/return-callback] Error handling redirect:', err);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    return NextResponse.redirect(`${appUrl}/student/sessions`, 303);
  }
}

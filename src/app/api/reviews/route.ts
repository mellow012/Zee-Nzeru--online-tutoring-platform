import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// ── POST /api/reviews ─────────────────────────────────────────────────────────
// Creates a review for a completed session.
// Security: only the session's student can review, session must be completed,
// and only one review is allowed per session per reviewer.

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { sessionId, rating, comment } = await request.json();

    // Validate required fields
    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'sessionId is required' },
        { status: 400 }
      );
    }

    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      return NextResponse.json(
        { success: false, error: 'rating must be an integer between 1 and 5' },
        { status: 400 }
      );
    }

    // Verify session exists and belongs to this student
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id, tutor_id, student_id, status, subject')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      );
    }

    if (session.student_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'You can only review your own sessions' },
        { status: 403 }
      );
    }

    if (session.status !== 'completed') {
      return NextResponse.json(
        { success: false, error: 'You can only review completed sessions' },
        { status: 400 }
      );
    }

    // Prevent duplicate reviews
    const { data: existing } = await supabase
      .from('reviews')
      .select('id')
      .eq('session_id', sessionId)
      .eq('reviewer_id', user.id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'You have already reviewed this session' },
        { status: 409 }
      );
    }

    // Insert the review
    const { data: review, error: insertError } = await supabase
      .from('reviews')
      .insert({
        session_id: sessionId,
        reviewer_id: user.id,
        reviewee_id: session.tutor_id,
        rating,
        comment: comment?.trim() || null,
        is_public: true,
        would_recommend: rating >= 4,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[POST /api/reviews] insert error:', insertError);
      return NextResponse.json(
        { success: false, error: 'Failed to submit review' },
        { status: 500 }
      );
    }

    // Recalculate tutor's average rating from all public reviews.
    // NOTE: A database trigger is the ideal place for this; this is a safe fallback.
    supabase
      .from('reviews')
      .select('rating')
      .eq('reviewee_id', session.tutor_id)
      .eq('is_public', true)
      .then(({ data: allRatings }) => {
        if (!allRatings?.length) return;
        const avg =
          allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length;
        supabase
          .from('tutor_profiles')
          .update({ rating: Math.round(avg * 100) / 100 })
          .eq('user_id', session.tutor_id)
          .then(({ error }) => {
            if (error) console.warn('[POST /api/reviews] rating update error:', error.message);
          });
      });

    // Notify the tutor — non-blocking
    supabase
      .from('notifications')
      .insert({
        user_id: session.tutor_id,
        type: 'new_review',
        title: 'New Review Received',
        message: `You received a ${rating}-star review for your ${session.subject} session.`,
        session_id: sessionId,
      })
      .then(({ error }) => {
        if (error) console.warn('[POST /api/reviews] notification error:', error.message);
      });

    return NextResponse.json({ success: true, review }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/reviews] unexpected error:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
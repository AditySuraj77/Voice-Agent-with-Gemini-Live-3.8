/**
 * Supabase JWT Authentication Middleware for Aristotle Backend
 * Ensures backward-compatibility for local development and guest users,
 * while protecting production endpoints against unauthorized API quota drain.
 */
export async function verifyAuthSession(req, res, next) {
  const isProd = process.env.NODE_ENV === 'production';
  const enforceAuth = process.env.ENFORCE_AUTH === 'true';

  const authHeader = req.headers.authorization;

  // Case 1: No Authorization header provided
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    if (isProd && enforceAuth) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'A valid Supabase authentication session token is required to access this endpoint in production.',
      });
    }
    // Graceful guest fallback for local development or guest tutoring
    req.user = { id: `guest_${req.ip || 'anonymous'}`, isGuest: true };
    return next();
  }

  // Case 2: Token is provided - verify against Supabase Auth API
  const token = authHeader.split(' ')[1];
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // If Supabase credentials are not set on backend, allow gracefully with unverified status
    req.user = { id: 'unverified_session', isGuest: false };
    return next();
  }

  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: supabaseAnonKey,
      },
    });

    if (!response.ok) {
      if (isProd && enforceAuth) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'The provided authentication session has expired or is invalid. Please sign in again.',
        });
      }
      req.user = { id: 'guest', isGuest: true };
      return next();
    }

    const userData = await response.json();
    req.user = { id: userData.id, email: userData.email, isGuest: false };
    return next();
  } catch (err) {
    console.error('[authMiddleware] Session verification error:', err.message);
    if (isProd && enforceAuth) {
      return res.status(401).json({ error: 'Session verification failed.' });
    }
    req.user = { id: 'guest', isGuest: true };
    return next();
  }
}

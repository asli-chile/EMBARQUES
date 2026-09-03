function firstEnv(...keys) {
  for (const key of keys) {
    const value = String(process.env[key] || '').trim()
    if (value) return value
  }
  return ''
}

export function stackingEnv() {
  return {
    supabaseUrl: firstEnv('PUBLIC_SUPABASE_URL', 'SUPABASE_URL').replace(/\/$/, ''),
    serviceRoleKey: firstEnv('SUPABASE_SERVICE_ROLE_KEY'),
    anonKey: firstEnv('PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_ANON_KEY'),
    bucket: firstEnv('SUPABASE_STACKING_BUCKET') || 'stacking-navieras',
    syncToken: firstEnv('STACKING_SYNC_TOKEN'),
  }
}

export function jsonError(res, status, message, extra = {}) {
  return res.status(status).json({ ok: false, message, ...extra })
}

export function storagePath(bucket, path) {
  return `${encodeURIComponent(bucket)}/${String(path).split('/').map(encodeURIComponent).join('/')}`
}

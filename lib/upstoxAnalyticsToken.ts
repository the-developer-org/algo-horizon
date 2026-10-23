export async function getAnalyticsToken() {
  const backend = (process.env.NEXT_PUBLIC_BACKEND_URL || '').replace(/\/$/, '');
  if (!backend) {
    throw new Error('Backend URL is not configured');
  }

  const response = await fetch(`${backend}/api/admin/get-analytics-token`, {
    method: 'POST',
    cache: 'no-store',
  });
  const text = (await response.text()).trim().replace(/^"|"$/g, '');
  if (!response.ok || !text || /no valid token/i.test(text)) {
    throw new Error(text || 'No analytics token found');
  }
  return text.startsWith('Bearer ') ? text : `Bearer ${text}`;
}

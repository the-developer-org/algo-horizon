import ProfileClient from './ProfileClient';

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ instrumentKey?: string | string[]; name?: string | string[] }>;
}) {
  const params = await searchParams;
  const instrumentKey = typeof params.instrumentKey === 'string' ? params.instrumentKey.trim() : '';
  const name = typeof params.name === 'string' ? params.name.trim() : '';

  return <ProfileClient instrumentKey={instrumentKey} name={name} />;
}

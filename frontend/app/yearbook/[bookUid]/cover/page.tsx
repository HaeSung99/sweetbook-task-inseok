import { redirect } from 'next/navigation';

type Props = {
  params: Promise<{ bookUid: string }>;
};

export default async function YearbookCoverRedirectPage({ params }: Props) {
  const { bookUid } = await params;
  redirect(`/yearbook/${encodeURIComponent(bookUid)}/edit`);
}

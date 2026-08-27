import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import NavBar from '@/components/NavBar';

export default async function ReportsLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  if (!cookieStore.get('auth')) redirect('/');
  return (
    <>
      <NavBar />
      {children}
    </>
  );
}

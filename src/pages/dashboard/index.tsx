import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { Spinner } from 'react-bootstrap';

export default function DashboardRedirect() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated') {
      const role = session?.user?.role?.toLowerCase();
      if (role) {
        // preserve query parameters (like ?tab=xyz)
        router.push({
          pathname: `/dashboard/${role}`,
          query: router.query
        });
      } else {
        router.push('/auth/signin');
      }
    }
  }, [status, session, router]);

  return (
    <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
      <Spinner animation="border" variant="primary" />
    </div>
  );
}

export const getStaticProps = async ({ locale }: any) => ({
  props: {
    ...(await serverSideTranslations(locale ?? 'en', ['common'])),
  },
});

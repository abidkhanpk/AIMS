import { serverSideTranslations } from 'next-i18next/pages/serverSideTranslations';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { Spinner } from 'react-bootstrap';
import AdminMenu from '../../components/dashboards/AdminMenu';
import menuStyles from '../../components/dashboards/AdminMenu.module.css';
import { SubjectManagementTab } from '../../components/dashboards/AdminDashboard';
import { useTranslation } from 'react-i18next';
import Head from 'next/head';

export default function AdminSubjectsPage() {
  const { t } = useTranslation('common');
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated' && session?.user?.role !== 'ADMIN') {
      router.push('/dashboard');
    }
  }, [status, session, router]);

  if (status === 'loading') {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  if (status !== 'authenticated' || session?.user?.role !== 'ADMIN') {
    return null;
  }

  const handleSelect = (key?: string | null) => {
    if (!key || key === 'subjects') return;
    if (key === 'home') {
      router.push('/dashboard');
      return;
    }
    const routeMap: Record<string, string> = {
      teachers: '/dashboard/teachers',
      parents: '/dashboard/parents',
      students: '/dashboard/students',
      progress: '/dashboard/progress',
      tests: '/dashboard/tests',
      'parent-remarks': '/dashboard/parent-remarks',
      remarks: '/dashboard/parent-remarks',
      fees: '/dashboard/fees',
      'fee-verification': '/dashboard/fee-verification',
      salaries: '/dashboard/salaries',
      assignments: '/dashboard/assignments',
      'attendance-reports': '/dashboard/attendance-reports',
      'report-cards': '/dashboard/report-cards',
    };
    router.push(routeMap[key] || `/dashboard?tab=${key}`);
  };

  return (
    <>
      <Head>
        <title>{t('menu.subjects', 'Subjects') + ' | AIMS'}</title>
      </Head>
      <div className={menuStyles.menuShell}>
        <div className={menuStyles.menuLayout}>
          <AdminMenu activeKey="subjects" onSelect={handleSelect} />
          <div className={menuStyles.mainContent}>
            <div className="container-fluid py-4">
              <SubjectManagementTab />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export const getStaticProps = async ({ locale }: any) => ({
  props: {
    ...(await serverSideTranslations(locale ?? 'en', ['common'])),
  },
});

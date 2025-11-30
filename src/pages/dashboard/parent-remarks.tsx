import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { Spinner } from 'react-bootstrap';
import AdminMenu from '../../components/dashboards/AdminMenu';
import menuStyles from '../../components/dashboards/AdminMenu.module.css';
import { RemarksTab } from '../../components/dashboards/AdminDashboard';

export default function AdminParentRemarksPage() {
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
    return <Spinner animation="border" />;
  }

  if (status !== 'authenticated' || session?.user?.role !== 'ADMIN') {
    return null;
  }

  const handleSelect = (key?: string | null) => {
    if (!key || key === 'parent-remarks' || key === 'remarks') return;
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
      fees: '/dashboard/fees',
      'fee-verification': '/dashboard/fee-verification',
      salaries: '/dashboard/salaries',
    };
    router.push(routeMap[key] || `/dashboard?tab=${key}`);
  };

  return (
    <div className={menuStyles.menuShell}>
      <div className={menuStyles.menuLayout}>
        <AdminMenu activeKey="parent-remarks" onSelect={handleSelect} />
        <div className={menuStyles.mainContent}>
          <div className="container-fluid py-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <div>
                <h2 className="h5 mb-1">
                  <i className="bi bi-chat-dots me-2"></i>
                  Parent Remarks
                </h2>
                <p className="text-muted mb-0">Review remarks and threads</p>
              </div>
            </div>
            <RemarksTab />
          </div>
        </div>
      </div>
    </div>
  );
}

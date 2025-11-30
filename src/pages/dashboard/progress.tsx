import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { Spinner } from 'react-bootstrap';
import AdminMenu from '../../components/dashboards/AdminMenu';
import menuStyles from '../../components/dashboards/AdminMenu.module.css';
import { ProgressTab } from '../../components/dashboards/AdminDashboard';

export default function AdminProgressPage() {
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
    if (!key || key === 'progress') return;
    if (key === 'home') {
      router.push('/dashboard');
      return;
    }
    const routeMap: Record<string, string> = {
      teachers: '/dashboard/teachers',
      parents: '/dashboard/parents',
      students: '/dashboard/students',
      'parent-remarks': '/dashboard/parent-remarks',
      remarks: '/dashboard/parent-remarks',
      tests: '/dashboard/tests',
      progress: '/dashboard/progress',
    };
    router.push(routeMap[key] || `/dashboard?tab=${key}`);
  };

  return (
    <div className={menuStyles.menuShell}>
      <div className={menuStyles.menuLayout}>
        <AdminMenu activeKey="progress" onSelect={handleSelect} />
        <div className={menuStyles.mainContent}>
          <div className="container-fluid py-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <div>
                <h2 className="h5 mb-1">
                  <i className="bi bi-graph-up me-2"></i>
                  Student Progress
                </h2>
                <p className="text-muted mb-0">Track progress and attendance</p>
              </div>
            </div>
            <ProgressTab />
          </div>
        </div>
      </div>
    </div>
  );
}

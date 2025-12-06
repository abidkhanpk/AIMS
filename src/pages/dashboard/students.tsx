import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { Spinner } from 'react-bootstrap';
import AdminMenu from '../../components/dashboards/AdminMenu';
import menuStyles from '../../components/dashboards/AdminMenu.module.css';
import { UserManagementTab } from '../../components/dashboards/AdminDashboard';

export default function AdminStudentsPage() {
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
    if (!key || key === 'students') return;
    if (key === 'home') {
      router.push('/dashboard');
      return;
    }
    if (key === 'teachers' || key === 'parents') {
      router.push(`/dashboard/${key}`);
      return;
    }
    router.push(key ? `/dashboard?tab=${key}` : '/dashboard');
  };

  return (
    <div className={menuStyles.menuShell}>
      <div className={menuStyles.menuLayout}>
        <AdminMenu activeKey="students" onSelect={handleSelect} />
        <div className={menuStyles.mainContent}>
          <div className="container-fluid py-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <div>
                <h2 className="h5 mb-1">
                  <i className="bi bi-mortarboard me-2"></i>
                  Students
                </h2>
                <p className="text-muted mb-0">Manage student accounts</p>
              </div>
            </div>
            <UserManagementTab role="STUDENT" />
          </div>
        </div>
      </div>
    </div>
  );
}

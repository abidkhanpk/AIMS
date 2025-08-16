import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import DeveloperDashboard from '../components/dashboards/DeveloperDashboard';
import AdminDashboard from '../components/dashboards/AdminDashboard';
import TeacherDashboard from '../components/dashboards/TeacherDashboard';
import ParentDashboard from '../components/dashboards/ParentDashboard';
import StudentDashboard from '../components/dashboards/StudentDashboard';
import { Spinner } from 'react-bootstrap';

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  if (status === 'loading') {
    return <Spinner animation="border" />;
  }

  if (status === 'authenticated') {
    const userRole = session.user?.role;

    switch (userRole) {
      case 'DEVELOPER':
        return <DeveloperDashboard />;
      case 'ADMIN':
        return <AdminDashboard />;
      case 'TEACHER':
        return <TeacherDashboard />;
      case 'PARENT':
        return <ParentDashboard />;
      case 'STUDENT':
        return <StudentDashboard />;
      default:
        return <div>Unknown role</div>;
    }
  }

  return null;
}

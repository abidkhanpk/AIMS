import type { NextPage } from 'next';
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

interface AppSettings {
  appName: string;
  appLogo: string;
  enableHomePage: boolean;
  tagline: string;
}

const Home: NextPage = () => {
  const { data: session, status } = useSession();
  const [appSettings, setAppSettings] = useState<AppSettings>({ 
    appName: 'AIMS', 
    appLogo: '/assets/app-logo.png', 
    enableHomePage: true,
    tagline: 'Academy Information and Management System'
  });
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchAppSettings();
  }, []);

  useEffect(() => {
    // Wait for both settings and session to load
    if (loading || status === 'loading') return;

    // If user is authenticated, redirect to dashboard
    if (status === 'authenticated') {
      router.push('/dashboard');
      return;
    }

    // If homepage is disabled and user is not authenticated, redirect to signin
    if (!appSettings.enableHomePage && status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }
  }, [appSettings.enableHomePage, status, loading, router]);

  const fetchAppSettings = async () => {
    try {
      const res = await fetch('/api/settings/developer');
      if (res.ok) {
        const data = await res.json();
        setAppSettings({
          appName: data.appName || 'AIMS',
          appLogo: data.appLogo || '/assets/app-logo.png',
          enableHomePage: data.enableHomePage !== false,
          tagline: data.tagline || 'Academy Information and Management System'
        });
      }
    } catch (error) {
      console.error('Error fetching app settings:', error);
    } finally {
      setLoading(false);
    }
  };

  // Show loading while checking settings and authentication
  if (loading || status === 'loading') {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2 text-muted">Loading...</p>
        </div>
      </div>
    );
  }

  // If homepage is disabled or user is authenticated, don't render homepage content
  // (Router will handle redirects)
  if (!appSettings.enableHomePage || status === 'authenticated') {
    return null;
  }

  return (
    <div>
      <Head>
        <title>{appSettings.appName} - Academy Information and Management System</title>
        <meta name="description" content="Modern Academy Information and Management System for schools and educational institutions" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Hero Section */}
      <div className="bg-primary text-white py-5">
        <Container>
          <Row className="align-items-center min-vh-50">
            <Col lg={6}>
              <div className="py-5">
                <h1 className="display-4 fw-bold mb-4">
                  Welcome to {appSettings.appName}
                </h1>
                <p className="lead mb-4">
                  {appSettings.tagline} - A comprehensive platform designed to streamline education 
                  and enhance the learning experience for students, teachers, parents, and administrators.
                </p>
                {status === 'unauthenticated' && (
                  <div className="d-flex gap-3 flex-wrap">
                    <Link href="/auth/signin" passHref>
                      <Button variant="light" size="lg" className="px-4">
                        <i className="bi bi-box-arrow-in-right me-2"></i>
                        Sign In
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </Col>
            <Col lg={6} className="text-center">
              <div className="py-5">
                {appSettings.appLogo && (
                  <Image
                    src={appSettings.appLogo || '/assets/app-logo.png'}
                    alt="AIMS Logo"
                    width={300}
                    height={200}
                    className="img-fluid mb-4"
                    style={{ height: 'auto', width: 'auto', maxHeight: '200px', maxWidth: '100%', objectFit: 'contain' }}
                    unoptimized
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = '/assets/app-logo.png';
                    }}
                  />
                )}
                <div className="bg-white bg-opacity-10 rounded-3 p-4">
                  <i className="bi bi-mortarboard display-1 text-white-50"></i>
                </div>
              </div>
            </Col>
          </Row>
        </Container>
      </div>

      {/* Features Section */}
      <Container className="py-5">
        <Row className="text-center mb-5">
          <Col>
            <h2 className="display-5 fw-bold mb-3">Powerful Features</h2>
            <p className="lead text-muted">
              Everything you need to manage your educational institution effectively
            </p>
          </Col>
        </Row>

        <Row className="g-4">
          <Col md={6} lg={3}>
            <Card className="h-100 text-center border-0 shadow-sm">
              <Card.Body className="p-4">
                <div className="bg-primary bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style={{ width: '80px', height: '80px' }}>
                  <i className="bi bi-people-fill text-primary" style={{ fontSize: '2rem' }}></i>
                </div>
                <h5 className="fw-bold mb-3">User Management</h5>
                <p className="text-muted">
                  Comprehensive role-based access control for developers, admins, teachers, parents, and students.
                </p>
              </Card.Body>
            </Card>
          </Col>

          <Col md={6} lg={3}>
            <Card className="h-100 text-center border-0 shadow-sm">
              <Card.Body className="p-4">
                <div className="bg-success bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style={{ width: '80px', height: '80px' }}>
                  <i className="bi bi-graph-up text-success" style={{ fontSize: '2rem' }}></i>
                </div>
                <h5 className="fw-bold mb-3">Progress Tracking</h5>
                <p className="text-muted">
                  Real-time progress monitoring with detailed analytics and reporting for all stakeholders.
                </p>
              </Card.Body>
            </Card>
          </Col>

          <Col md={6} lg={3}>
            <Card className="h-100 text-center border-0 shadow-sm">
              <Card.Body className="p-4">
                <div className="bg-info bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style={{ width: '80px', height: '80px' }}>
                  <i className="bi bi-book text-info" style={{ fontSize: '2rem' }}></i>
                </div>
                <h5 className="fw-bold mb-3">Course Management</h5>
                <p className="text-muted">
                  Easy-to-use course creation and management tools with flexible assignment options.
                </p>
              </Card.Body>
            </Card>
          </Col>

          <Col md={6} lg={3}>
            <Card className="h-100 text-center border-0 shadow-sm">
              <Card.Body className="p-4">
                <div className="bg-warning bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style={{ width: '80px', height: '80px' }}>
                  <i className="bi bi-phone text-warning" style={{ fontSize: '2rem' }}></i>
                </div>
                <h5 className="fw-bold mb-3">Mobile Friendly</h5>
                <p className="text-muted">
                  Fully responsive design that works seamlessly across all devices and screen sizes.
                </p>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>

      {/* User Roles Section */}
      <div className="bg-light py-5">
        <Container>
          <Row className="text-center mb-5">
            <Col>
              <h2 className="display-5 fw-bold mb-3">Built for Everyone</h2>
              <p className="lead text-muted">
                Tailored experiences for each user role in your educational ecosystem
              </p>
            </Col>
          </Row>

          <Row className="g-4">
            <Col md={6} lg={4}>
              <Card className="h-100 border-0 shadow-sm">
                <Card.Body className="p-4">
                  <div className="d-flex align-items-center mb-3">
                    <div className="bg-primary bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center me-3" style={{ width: '50px', height: '50px' }}>
                      <i className="bi bi-gear-fill text-primary"></i>
                    </div>
                    <h5 className="fw-bold mb-0">Administrators</h5>
                  </div>
                  <p className="text-muted mb-0">
                    Complete control over user management, course creation, and system configuration with detailed analytics.
                  </p>
                </Card.Body>
              </Card>
            </Col>

            <Col md={6} lg={4}>
              <Card className="h-100 border-0 shadow-sm">
                <Card.Body className="p-4">
                  <div className="d-flex align-items-center mb-3">
                    <div className="bg-success bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center me-3" style={{ width: '50px', height: '50px' }}>
                      <i className="bi bi-person-workspace text-success"></i>
                    </div>
                    <h5 className="fw-bold mb-0">Teachers</h5>
                  </div>
                  <p className="text-muted mb-0">
                    Manage assigned students, track progress, and provide detailed feedback with easy-to-use tools.
                  </p>
                </Card.Body>
              </Card>
            </Col>

            <Col md={6} lg={4}>
              <Card className="h-100 border-0 shadow-sm">
                <Card.Body className="p-4">
                  <div className="d-flex align-items-center mb-3">
                    <div className="bg-info bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center me-3" style={{ width: '50px', height: '50px' }}>
                      <i className="bi bi-people text-info"></i>
                    </div>
                    <h5 className="fw-bold mb-0">Parents</h5>
                  </div>
                  <p className="text-muted mb-0">
                    Monitor your children's academic progress with detailed reports and historical data.
                  </p>
                </Card.Body>
              </Card>
            </Col>

            <Col md={6} lg={4}>
              <Card className="h-100 border-0 shadow-sm">
                <Card.Body className="p-4">
                  <div className="d-flex align-items-center mb-3">
                    <div className="bg-warning bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center me-3" style={{ width: '50px', height: '50px' }}>
                      <i className="bi bi-mortarboard text-warning"></i>
                    </div>
                    <h5 className="fw-bold mb-0">Students</h5>
                  </div>
                  <p className="text-muted mb-0">
                    Track your own progress, view grades, and stay updated with your academic journey.
                  </p>
                </Card.Body>
              </Card>
            </Col>

            <Col md={6} lg={4}>
              <Card className="h-100 border-0 shadow-sm">
                <Card.Body className="p-4">
                  <div className="d-flex align-items-center mb-3">
                    <div className="bg-secondary bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center me-3" style={{ width: '50px', height: '50px' }}>
                      <i className="bi bi-code-slash text-secondary"></i>
                    </div>
                    <h5 className="fw-bold mb-0">Developers</h5>
                  </div>
                  <p className="text-muted mb-0">
                    System-level access to manage multiple institutions and configure global settings.
                  </p>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Container>
      </div>

      {/* CTA Section */}
      {status === 'unauthenticated' && (
        <Container className="py-5">
          <Row className="text-center">
            <Col>
              <div className="py-5">
                <h2 className="display-5 fw-bold mb-3">Ready to Get Started?</h2>
                <p className="lead text-muted mb-4">
                  Join thousands of educational institutions already using our platform
                </p>
                <Link href="/auth/signin" passHref>
                  <Button variant="primary" size="lg" className="px-5">
                    <i className="bi bi-box-arrow-in-right me-2"></i>
                    Sign In Now
                  </Button>
                </Link>
              </div>
            </Col>
          </Row>
        </Container>
      )}
    </div>
  );
};

export default Home;

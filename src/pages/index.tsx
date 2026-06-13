import { serverSideTranslations } from 'next-i18next/pages/serverSideTranslations';
import type { NextPage } from 'next';
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';

interface AppSettings {
  appName: string;
  appLogo: string;
  enableHomePage: boolean;
  tagline: string;
}

const Home: NextPage = () => {
    const { t } = useTranslation('common');
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
            <span className="visually-hidden">{t('auto.loading', `Loading...`)}</span>
          </div>
          <p className="mt-2 text-muted">{t('auto.loading', `Loading...`)}</p>
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
        <title>{appSettings.appName} {t('auto.academyInformationAndManagemen', `- Academy Information and Management System`)}</title>
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
                  {t('auto.welcomeTo', `Welcome to`)} {appSettings.appName}
                </h1>
                <p className="lead mb-4">
                  {appSettings.tagline} {t('auto.aComprehensivePlatformDesigned', `- A comprehensive platform designed to streamline education 
                  and enhance the learning experience for students, teachers, parents, and administrators.`)}
                                                  </p>
                {status === 'unauthenticated' && (
                  <div className="d-flex gap-3 flex-wrap">
                    <Link href="/auth/signin" className="btn btn-light btn-lg px-4">
                      <i className="bi bi-box-arrow-in-right me-2"></i>
                      {t('auto.signIn', `Sign In`)}
                    </Link>
                  </div>
                )}
              </div>
            </Col>
            <Col lg={6} className="text-center">
              <div className="py-5">
                {appSettings.appLogo && (
                  <Image
                    src={appSettings.appLogo}
                    alt={t('auto.aimsLogo', `AIMS Logo`)}
                    width={200}
                    height={200}
                    priority
                    className="img-fluid mb-4"
                  />
                )}
              </div>
            </Col>
          </Row>
        </Container>
      </div>

      {/* Features Section */}
      <section id="features" className="py-5 bg-white border-bottom">
        <Container className="py-5">
          <Row className="text-center mb-5">
            <Col lg={8} className="mx-auto">
              <h2 className="display-5 fw-bold mb-3">{t('auto.powerfulFeatures', `Powerful Features`)}</h2>
              <p className="lead text-muted">
                {t('auto.everythingYouNeedToManageYourE', `Everything you need to manage your educational institution effectively`)}
                                              </p>
            </Col>
          </Row>
          <Row className="g-4">
            <Col md={6} lg={3}>
              <Card className="h-100 border-0 shadow-sm p-3">
                <Card.Body>
                  <div className="text-primary fs-1 mb-3">
                    <i className="bi bi-people-fill"></i>
                  </div>
                  <h5 className="fw-bold mb-3">{t('auto.userManagement', `User Management`)}</h5>
                  <Card.Text className="text-muted">
                    {t('auto.comprehensiveRolebasedAccessCo', `Comprehensive role-based access control for developers, admins, teachers, parents, and students.`)}
                                      </Card.Text>
                </Card.Body>
              </Card>
            </Col>
            <Col md={6} lg={3}>
              <Card className="h-100 border-0 shadow-sm p-3">
                <Card.Body>
                  <div className="text-success fs-1 mb-3">
                    <i className="bi bi-graph-up-arrow"></i>
                  </div>
                  <h5 className="fw-bold mb-3">{t('auto.progressTracking', `Progress Tracking`)}</h5>
                  <Card.Text className="text-muted">
                    {t('auto.realtimeProgressMonitoringWith', `Real-time progress monitoring with detailed analytics and reporting for all stakeholders.`)}
                                      </Card.Text>
                </Card.Body>
              </Card>
            </Col>
            <Col md={6} lg={3}>
              <Card className="h-100 border-0 shadow-sm p-3">
                <Card.Body>
                  <div className="text-warning fs-1 mb-3">
                    <i className="bi bi-journal-text"></i>
                  </div>
                  <h5 className="fw-bold mb-3">{t('auto.courseManagement', `Course Management`)}</h5>
                  <Card.Text className="text-muted">
                    {t('auto.easytouseCourseCreationAndMana', `Easy-to-use course creation and management tools with flexible assignment options.`)}
                                      </Card.Text>
                </Card.Body>
              </Card>
            </Col>
            <Col md={6} lg={3}>
              <Card className="h-100 border-0 shadow-sm p-3">
                <Card.Body>
                  <div className="text-info fs-1 mb-3">
                    <i className="bi bi-phone-fill"></i>
                  </div>
                  <h5 className="fw-bold mb-3">{t('auto.mobileFriendly', `Mobile Friendly`)}</h5>
                  <Card.Text className="text-muted">
                    {t('auto.fullyResponsiveDesignThatWorks', `Fully responsive design that works seamlessly across all devices and screen sizes.`)}
                                      </Card.Text>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Roles Section */}
      <section className="py-5 bg-light">
        <Container className="py-5">
          <Row className="text-center mb-5">
            <Col lg={8} className="mx-auto">
              <h2 className="display-5 fw-bold mb-3">{t('auto.builtForEveryone', `Built for Everyone`)}</h2>
              <p className="lead text-muted">
                {t('auto.tailoredExperiencesForEachUser', `Tailored experiences for each user role in your educational ecosystem`)}
                                              </p>
            </Col>
          </Row>
          <Row className="g-4">
            <Col md={6} lg={4}>
              <Card className="h-100 border-0 shadow-sm">
                <Card.Body className="d-flex align-items-start p-4">
                  <div className="bg-primary-subtle text-primary rounded p-3 me-3">
                    <i className="bi bi-shield-lock-fill fs-4"></i>
                  </div>
                  <div>
                    <h5 className="fw-bold mb-0">{t('auto.administrators', `Administrators`)}</h5>
                    <Card.Text className="text-muted mt-2">
                    {t('auto.completeControlOverUserManagem', `Complete control over user management, course creation, and system configuration with detailed analytics.`)}
                                          </Card.Text>
                  </div>
                </Card.Body>
              </Card>
            </Col>
            <Col md={6} lg={4}>
              <Card className="h-100 border-0 shadow-sm">
                <Card.Body className="d-flex align-items-start p-4">
                  <div className="bg-success-subtle text-success rounded p-3 me-3">
                    <i className="bi bi-person-badge-fill fs-4"></i>
                  </div>
                  <div>
                    <h5 className="fw-bold mb-0">{t('auto.teachers', `Teachers`)}</h5>
                    <Card.Text className="text-muted mt-2">
                    {t('auto.manageAssignedStudentsTrackPro', `Manage assigned students, track progress, and provide detailed feedback with easy-to-use tools.`)}
                                          </Card.Text>
                  </div>
                </Card.Body>
              </Card>
            </Col>
            <Col md={6} lg={4}>
              <Card className="h-100 border-0 shadow-sm">
                <Card.Body className="d-flex align-items-start p-4">
                  <div className="bg-warning-subtle text-warning rounded p-3 me-3">
                    <i className="bi bi-people-fill fs-4"></i>
                  </div>
                  <div>
                    <h5 className="fw-bold mb-0">{t('auto.parents', `Parents`)}</h5>
                    <Card.Text className="text-muted mt-2">
                    {t('auto.monitorYourChildrensAcademicPr', `Monitor your children's academic progress with detailed reports and historical data.`)}
                                          </Card.Text>
                  </div>
                </Card.Body>
              </Card>
            </Col>
            <Col md={6} lg={4}>
              <Card className="h-100 border-0 shadow-sm">
                <Card.Body className="d-flex align-items-start p-4">
                  <div className="bg-info-subtle text-info rounded p-3 me-3">
                    <i className="bi bi-mortarboard-fill fs-4"></i>
                  </div>
                  <div>
                    <h5 className="fw-bold mb-0">{t('auto.students', `Students`)}</h5>
                    <Card.Text className="text-muted mt-2">
                    {t('auto.trackYourOwnProgressViewGrades', `Track your own progress, view grades, and stay updated with your academic journey.`)}
                                          </Card.Text>
                  </div>
                </Card.Body>
              </Card>
            </Col>
            <Col md={6} lg={4}>
              <Card className="h-100 border-0 shadow-sm">
                <Card.Body className="d-flex align-items-start p-4">
                  <div className="bg-dark-subtle text-dark rounded p-3 me-3">
                    <i className="bi bi-cpu-fill fs-4"></i>
                  </div>
                  <div>
                    <h5 className="fw-bold mb-0">{t('auto.developers', `Developers`)}</h5>
                    <Card.Text className="text-muted mt-2">
                    {t('auto.systemlevelAccessToManageMulti', `System-level access to manage multiple institutions and configure global settings.`)}
                                          </Card.Text>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Container>
      </section>

      {/* CTA Section */}
      {status === 'unauthenticated' && (
        <Container className="py-5">
          <Row className="text-center">
            <Col>
              <div className="py-5">
                <h2 className="display-5 fw-bold mb-3">{t('auto.readyToGetStarted', `Ready to Get Started?`)}</h2>
                <p className="lead text-muted mb-4">
                  {t('auto.joinThousandsOfEducationalInst', `Join thousands of educational institutions already using our platform`)}
                                                  </p>
                <Link href="/auth/signin" className="btn btn-primary btn-lg px-5">
                  <i className="bi bi-box-arrow-in-right me-2"></i>
                  {t('auto.signInNow', `Sign In Now`)}
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

export const getStaticProps = async ({ locale }: any) => ({
  props: {
    ...(await serverSideTranslations(locale ?? 'en', ['common'])),
  },
});

import { serverSideTranslations } from 'next-i18next/pages/serverSideTranslations';
import type { NextPage } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Badge, Card, Col, Container, Row } from 'react-bootstrap';

interface PublicAppSettings {
  appName: string;
  tagline: string;
}

const PrivacyPolicy: NextPage = () => {
  const [appSettings, setAppSettings] = useState<PublicAppSettings>({
    appName: 'AIMS',
    tagline: 'Academy Information and Management System',
  });

  useEffect(() => {
    const fetchAppSettings = async () => {
      try {
        const res = await fetch('/api/settings/developer');
        if (!res.ok) return;
        const data = await res.json();
        setAppSettings({
          appName: data.appName || 'AIMS',
          tagline: data.tagline || 'Academy Information and Management System',
        });
      } catch (error) {
        console.error('Error fetching app settings:', error);
      }
    };

    fetchAppSettings();
  }, []);

  return (
    <>
      <Head>
        <title>Privacy Policy - {appSettings.appName}</title>
        <meta
          name="description"
          content={`Privacy Policy for ${appSettings.appName}, ${appSettings.tagline}.`}
        />
      </Head>

      <Container className="py-5">
        <Row className="justify-content-center">
          <Col lg={10} xl={9}>
            <div className="mb-4">
              <Badge bg="primary" className="mb-3">Privacy</Badge>
              <h1 className="display-5 fw-bold mb-3">Privacy Policy</h1>
              <p className="lead text-muted mb-0">
                This policy explains how {appSettings.appName} collects, uses, stores, and protects information used
                to run academy management services.
              </p>
              <p className="text-muted mt-3 mb-0">Last updated: June 20, 2026</p>
            </div>

            <Card className="border-0 shadow-sm">
              <Card.Body className="p-4 p-md-5">
                <section className="mb-4">
                  <h2 className="h4 fw-bold">Information We Collect</h2>
                  <p>
                    We collect information needed to operate the academy platform, including names, email addresses,
                    phone numbers, roles, student records, parent associations, course or subject assignments,
                    attendance, progress records, test records, fee records, salary records, subscription records,
                    messages, notifications, and account settings.
                  </p>
                  <p>
                    When users upload logos, payment proofs, or related files, those files may be stored with the
                    configured storage provider, such as Google Drive or Cloudinary.
                  </p>
                </section>

                <section className="mb-4">
                  <h2 className="h4 fw-bold">How We Use Information</h2>
                  <p>
                    We use information to provide user accounts, role-based dashboards, academy administration,
                    student progress tracking, attendance and report generation, fee and salary management,
                    subscriptions, notifications, direct messaging, security features, and support.
                  </p>
                </section>

                <section className="mb-4">
                  <h2 className="h4 fw-bold">Authentication and Cookies</h2>
                  <p>
                    The platform uses authentication sessions and necessary cookies to keep users signed in, protect
                    dashboards, remember language preferences, and support secure account access. These cookies are
                    required for core application functionality.
                  </p>
                </section>

                <section className="mb-4">
                  <h2 className="h4 fw-bold">Sharing and Storage</h2>
                  <p>
                    We do not sell personal information. Information may be processed by service providers that help
                    run the platform, including hosting, database, email, authentication, cloud file storage, and
                    payment or subscription workflows where configured.
                  </p>
                  <p>
                    Access to information is limited by user role. Developers and administrators may access data
                    required to manage the system and provide academy services.
                  </p>
                </section>

                <section className="mb-4">
                  <h2 className="h4 fw-bold">Data Security</h2>
                  <p>
                    We use access controls, authenticated sessions, encrypted password storage, and role-based
                    permissions to help protect information. No online system can guarantee absolute security, so users
                    should keep passwords private and report suspicious activity promptly.
                  </p>
                </section>

                <section className="mb-4">
                  <h2 className="h4 fw-bold">Data Retention</h2>
                  <p>
                    Records are retained while needed for academy operations, compliance, account management, reporting,
                    dispute handling, and backups. Some temporary uploaded files may be removed automatically according
                    to configured cleanup rules.
                  </p>
                </section>

                <section className="mb-4">
                  <h2 className="h4 fw-bold">Your Choices</h2>
                  <p>
                    Users may update certain account settings from their dashboard. For correction, export, or deletion
                    requests, contact the academy or system administrator responsible for your account.
                  </p>
                </section>

                <section>
                  <h2 className="h4 fw-bold">Contact</h2>
                  <p className="mb-0">
                    For privacy questions, contact your academy administrator or the system operator managing this
                    {` ${appSettings.appName} `}installation. You can return to the{' '}
                    <Link href="/">home page</Link>.
                  </p>
                </section>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </>
  );
};

export default PrivacyPolicy;

export const getStaticProps = async ({ locale }: any) => ({
  props: {
    ...(await serverSideTranslations(locale ?? 'en', ['common'])),
  },
});

import { useState, useEffect } from 'react';
import { signIn, getSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { Form, Button, Card, Container, Row, Col, Alert, Spinner } from 'react-bootstrap';
import Head from 'next/head';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({ appTitle: 'LMS Academy', headerImg: '/assets/logo.png' });
  const router = useRouter();

  useEffect(() => {
    // Check if user is already signed in
    getSession().then((session) => {
      if (session) {
        router.push('/dashboard');
      }
    });

    // Fetch default settings for branding
    fetchSettings();
  }, [router]);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings/my-settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (error) {
      // Use default settings on error
      console.error('Error fetching settings:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid email or password');
      } else {
        router.push('/dashboard');
      }
    } catch (error) {
      setError('An error occurred during sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Sign In - {settings.appTitle}</title>
        <meta name="description" content="Sign in to your LMS account" />
      </Head>

      <div className="min-vh-100 d-flex align-items-center bg-light">
        <Container>
          <Row className="justify-content-center">
            <Col md={6} lg={5} xl={4}>
              <Card className="shadow-lg border-0">
                <Card.Body className="p-5">
                  <div className="text-center mb-4">
                    {settings.headerImg && (
                      <img 
                        src={settings.headerImg} 
                        alt="Logo" 
                        style={{ maxHeight: '80px', maxWidth: '200px' }}
                        className="mb-3"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    )}
                    <h2 className="fw-bold text-dark mb-2">Welcome Back</h2>
                    <p className="text-muted">Sign in to {settings.appTitle}</p>
                  </div>

                  {error && (
                    <Alert variant="danger" className="mb-4">
                      <i className="bi bi-exclamation-triangle me-2"></i>
                      {error}
                    </Alert>
                  )}

                  <Form onSubmit={handleSubmit}>
                    <Form.Group className="mb-3">
                      <Form.Label className="fw-medium">Email Address</Form.Label>
                      <Form.Control
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="py-2"
                        disabled={loading}
                      />
                    </Form.Group>

                    <Form.Group className="mb-4">
                      <Form.Label className="fw-medium">Password</Form.Label>
                      <Form.Control
                        type="password"
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="py-2"
                        disabled={loading}
                      />
                    </Form.Group>

                    <Button
                      variant="primary"
                      type="submit"
                      className="w-100 py-2 fw-medium"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Spinner animation="border" size="sm" className="me-2" />
                          Signing In...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-box-arrow-in-right me-2"></i>
                          Sign In
                        </>
                      )}
                    </Button>
                  </Form>

                  <div className="text-center mt-4">
                    <small className="text-muted">
                      Need help? Contact your administrator
                    </small>
                  </div>
                </Card.Body>
              </Card>

              <div className="text-center mt-4">
                <small className="text-muted">
                  © 2024 {settings.appTitle}. All rights reserved.
                </small>
              </div>
            </Col>
          </Row>
        </Container>
      </div>
    </>
  );
}
import { serverSideTranslations } from 'next-i18next/pages/serverSideTranslations';
import { useState, useEffect } from 'react';
import { Form, Button, Card, Container, Row, Col, Alert, Spinner } from 'react-bootstrap';
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';

export default function ForgotPassword() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [questions, setQuestions] = useState({ question1: '', question2: '' });
  const [answers, setAnswers] = useState({ answer1: '', answer2: '' });
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({ appTitle: 'AIMS', headerImg: '/assets/app-logo.png' });
  const router = useRouter();

  useEffect(() => {
    fetchAppSettings();
  }, []);

  const fetchAppSettings = async () => {
    try {
      const res = await fetch('/api/settings/developer');
      if (res.ok) {
        const data = await res.json();
        setSettings({
          appTitle: data.appName || 'AIMS',
          headerImg: data.appLogo || '/assets/app-logo.png'
        });
      }
    } catch (error) {
      console.error('Error fetching app settings:', error);
    }
  };

  const handleFetchQuestions = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await res.json();

      if (res.ok) {
        setQuestions({ question1: data.question1, question2: data.question2 });
        setStep(2);
      } else {
        setError(data.message || 'Failed to fetch security questions');
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, 
          answer1: answers.answer1, 
          answer2: answers.answer2, 
          newPassword 
        })
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess('Password reset successfully. You can now sign in.');
        setStep(3);
        setTimeout(() => {
          router.push('/auth/signin');
        }, 3000);
      } else {
        setError(data.message || 'Failed to reset password');
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Reset Password - {settings.appTitle}</title>
        <meta name="description" content="Reset your AIMS password" />
      </Head>

      <div className="min-vh-100 d-flex align-items-center bg-light">
        <Container>
          <Row className="justify-content-center">
            <Col md={6} lg={5} xl={4}>
              <Card className="shadow-lg border-0">
                <Card.Body className="p-5">
                  <div className="text-center mb-4">
                    {settings.headerImg && (
                      <Image
                        src={settings.headerImg || '/assets/app-logo.png'}
                        alt="Logo"
                        width={250}
                        height={100}
                        style={{ height: 'auto', width: 'auto', objectFit: 'contain', maxHeight: '100px', maxWidth: '250px' }}
                        className="mb-3"
                        unoptimized
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = '/assets/app-logo.png';
                        }}
                      />
                    )}
                    <h2 className="fw-bold text-dark mb-2">Reset Password</h2>
                    <p className="text-muted">
                      {step === 1 && "Enter your email to get started"}
                      {step === 2 && "Answer your security questions"}
                      {step === 3 && "Success!"}
                    </p>
                  </div>

                  {error && (
                    <Alert variant="danger" className="mb-4">
                      <i className="bi bi-exclamation-triangle me-2"></i>
                      {error}
                    </Alert>
                  )}

                  {success && (
                    <Alert variant="success" className="mb-4">
                      <i className="bi bi-check-circle me-2"></i>
                      {success}
                    </Alert>
                  )}

                  {step === 1 && (
                    <Form onSubmit={handleFetchQuestions}>
                      <Form.Group className="mb-4">
                        <Form.Label className="fw-medium">Email Address</Form.Label>
                        <Form.Control
                          type="email"
                          placeholder="Enter your registered email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          className="py-2"
                          disabled={loading}
                        />
                      </Form.Group>

                      <Button
                        variant="primary"
                        type="submit"
                        className="w-100 py-2 fw-medium mb-3"
                        disabled={loading || !email}
                      >
                        {loading ? (
                          <><Spinner animation="border" size="sm" className="me-2" />Please wait...</>
                        ) : (
                          "Continue"
                        )}
                      </Button>
                      
                      <div className="text-center">
                        <Link href="/auth/signin" className="text-decoration-none">
                          <i className="bi bi-arrow-left me-1"></i>
                          Back to Sign In
                        </Link>
                      </div>
                    </Form>
                  )}

                  {step === 2 && (
                    <Form onSubmit={handleResetPassword}>
                      <Alert variant="info" className="small">
                        Please answer the security questions you set up in your account settings.
                      </Alert>

                      <Form.Group className="mb-3">
                        <Form.Label className="fw-medium small text-muted">Question 1</Form.Label>
                        <p className="fw-bold mb-2">{questions.question1}</p>
                        <Form.Control
                          type="text"
                          placeholder="Your answer"
                          value={answers.answer1}
                          onChange={(e) => setAnswers({...answers, answer1: e.target.value})}
                          required
                          className="py-2"
                          disabled={loading}
                        />
                      </Form.Group>

                      <Form.Group className="mb-4">
                        <Form.Label className="fw-medium small text-muted">Question 2</Form.Label>
                        <p className="fw-bold mb-2">{questions.question2}</p>
                        <Form.Control
                          type="text"
                          placeholder="Your answer"
                          value={answers.answer2}
                          onChange={(e) => setAnswers({...answers, answer2: e.target.value})}
                          required
                          className="py-2"
                          disabled={loading}
                        />
                      </Form.Group>

                      <hr className="my-4" />

                      <Form.Group className="mb-3">
                        <Form.Label className="fw-medium">New Password</Form.Label>
                        <Form.Control
                          type="password"
                          placeholder="Enter new password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          required
                          minLength={8}
                          className="py-2"
                          disabled={loading}
                        />
                      </Form.Group>

                      <Form.Group className="mb-4">
                        <Form.Label className="fw-medium">Confirm New Password</Form.Label>
                        <Form.Control
                          type="password"
                          placeholder="Confirm new password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                          minLength={8}
                          className="py-2"
                          disabled={loading}
                        />
                      </Form.Group>

                      <Button
                        variant="primary"
                        type="submit"
                        className="w-100 py-2 fw-medium mb-3"
                        disabled={loading || !answers.answer1 || !answers.answer2 || !newPassword || !confirmPassword}
                      >
                        {loading ? (
                          <><Spinner animation="border" size="sm" className="me-2" />Resetting...</>
                        ) : (
                          "Reset Password"
                        )}
                      </Button>

                      <div className="text-center">
                        <Button 
                          variant="link" 
                          className="text-decoration-none p-0 text-muted"
                          onClick={() => setStep(1)}
                          disabled={loading}
                        >
                          Use a different email
                        </Button>
                      </div>
                    </Form>
                  )}

                  {step === 3 && (
                    <div className="text-center">
                      <div className="mb-4">
                        <i className="bi bi-check-circle text-success" style={{ fontSize: '4rem' }}></i>
                      </div>
                      <p>Redirecting you to sign in...</p>
                      <Button
                        variant="outline-primary"
                        onClick={() => router.push('/auth/signin')}
                        className="mt-3"
                      >
                        Sign In Now
                      </Button>
                    </div>
                  )}

                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Container>
      </div>
    </>
  );
}

export const getStaticProps = async ({ locale }: any) => ({
  props: {
    ...(await serverSideTranslations(locale ?? 'en', ['common'])),
  },
});

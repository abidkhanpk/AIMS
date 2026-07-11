import { serverSideTranslations } from 'next-i18next/pages/serverSideTranslations';
import { useState, useEffect } from 'react';
import { Form, Button, Card, Container, Row, Col, Alert, Spinner } from 'react-bootstrap';
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';

export default function ForgotPassword() {
  const { t } = useTranslation('common');
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [questions, setQuestions] = useState({ question1: '', question2: '' });
  const [answers, setAnswers] = useState({ answer1: '', answer2: '' });
  const [verificationCode, setVerificationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [settings, setSettings] = useState({ appTitle: 'AIMS', headerImg: '/assets/app-logo.png' });
  
  const [recoveryOptions, setRecoveryOptions] = useState({
    hasSecurityQuestions: false,
    hasEmailReset: false
  });
  const [selectedMethod, setSelectedMethod] = useState<'QUESTIONS' | 'EMAIL' | null>(null);

  const router = useRouter();

  useEffect(() => {
    fetchAppSettings();
  }, []);

  const fetchAppSettings = async () => {
    try {
      let slug = '';
      if (typeof window !== 'undefined') {
        const path = window.location.pathname;
        const segments = path.split('/').filter(Boolean);
        const RESERVED_WORDS = new Set(['auth', 'signin', 'register', 'messages', 'dashboard', 'en', 'ur']);
        if (segments[0] && !RESERVED_WORDS.has(segments[0])) {
          slug = segments[0];
        }
      }

      if (slug) {
        const res = await fetch(`/api/public/academy-branding?slug=${slug}`);
        if (res.ok) {
          const data = await res.json();
          setSettings({
            appTitle: data.appTitle || 'AIMS',
            headerImg: data.headerImg || '/assets/app-logo.png'
          });
          return;
        }
      }

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

  const handleCheckRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await res.json();

      if (res.ok) {
        setQuestions({ question1: data.question1, question2: data.question2 });
        setRecoveryOptions({
          hasSecurityQuestions: data.hasSecurityQuestions,
          hasEmailReset: data.hasEmailReset
        });

        if (data.hasSecurityQuestions && data.hasEmailReset) {
          // Both options available: go to selection step
          setStep(2);
        } else if (data.hasSecurityQuestions) {
          // Only security questions
          setSelectedMethod('QUESTIONS');
          setStep(3);
        } else if (data.hasEmailReset) {
          // Only email reset
          setSelectedMethod('EMAIL');
          await triggerSendCode();
          setStep(4);
        } else {
          setError(t('auto.noRecoveryOptions', 'No recovery options configured for this account. Please contact your administrator.'));
        }
      } else {
        setError(data.message || t('auto.failedToFetchRecovery', 'Failed to fetch recovery options'));
      }
    } catch (error) {
      setError(t('auto.genericError', 'An error occurred. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const triggerSendCode = async () => {
    setSendingCode(true);
    setError('');
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, action: 'send-code' })
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(t('auto.verificationCodeSent', 'A verification code has been sent to your email.'));
        setTimeout(() => setSuccess(''), 6000);
      } else {
        setError(data.message || t('auto.failedToSendCode', 'Failed to send verification code.'));
      }
    } catch (err) {
      setError(t('auto.genericError', 'An error occurred. Please try again.'));
    } finally {
      setSendingCode(false);
    }
  };

  const selectMethodAndProceed = async (method: 'QUESTIONS' | 'EMAIL') => {
    setSelectedMethod(method);
    if (method === 'QUESTIONS') {
      setStep(3);
    } else {
      setStep(4);
      await triggerSendCode();
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError(t('auto.passwordsDoNotMatch', 'Passwords do not match'));
      return;
    }

    if (newPassword.length < 8) {
      setError(t('auto.passwordMinLength', 'Password must be at least 8 characters long'));
      return;
    }

    setLoading(true);

    try {
      const payload: any = {
        email,
        mode: selectedMethod,
        newPassword
      };

      if (selectedMethod === 'QUESTIONS') {
        payload.answer1 = answers.answer1;
        payload.answer2 = answers.answer2;
      } else {
        payload.code = verificationCode;
      }

      const res = await fetch('/api/auth/forgot-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(t('auto.passwordResetSuccess', 'Password reset successfully. Redirecting you to sign in...'));
        setStep(5);
        setTimeout(() => {
          router.push('/auth/signin');
        }, 3000);
      } else {
        setError(data.message || t('auto.failedToResetPassword', 'Failed to reset password'));
      }
    } catch (error) {
      setError(t('auto.genericError', 'An error occurred. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>{t('auto.resetPassword', 'Reset Password -')} {settings.appTitle}</title>
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
                        alt={t('auto.logo', 'Logo')}
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
                    <h2 className="fw-bold text-dark mb-2">
                      {t('auto.resetPassword', 'Reset Password')}
                    </h2>
                    <p className="text-muted small">
                      {step === 1 && t('auto.enterEmailStep', 'Enter your email to verify your identity')}
                      {step === 2 && t('auto.selectRecoveryStep', 'Select your preferred recovery method')}
                      {step === 3 && t('auto.answerQuestionsStep', 'Answer your security questions')}
                      {step === 4 && t('auto.enterCodeStep', 'Enter the code sent to your email')}
                      {step === 5 && t('auto.successStep', 'Successfully updated')}
                    </p>
                  </div>

                  {/* Step Progress Dots */}
                  {step < 5 && (
                    <div className="d-flex justify-content-center gap-2 mb-4">
                      {[1, 2, 3, 4].map((s) => {
                        let active = s === step;
                        if (step === 2 && s === 2) active = true;
                        if (step === 3 && s === 3) active = true;
                        if (step === 4 && s === 3) active = true;
                        if (s === 4 && step > 1) active = step >= 3;
                        
                        return (
                          <div 
                            key={s} 
                            style={{
                              width: active ? '20px' : '6px',
                              height: '6px',
                              borderRadius: '3px',
                              backgroundColor: active ? '#0d6efd' : 'rgba(0, 0, 0, 0.15)',
                              transition: 'all 0.3s ease'
                            }}
                          />
                        );
                      })}
                    </div>
                  )}

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

                  {/* STEP 1: Enter Email */}
                  {step === 1 && (
                    <Form onSubmit={handleCheckRecovery}>
                      <Form.Group className="mb-4">
                        <Form.Label className="fw-medium">
                          {t('auto.emailAddress', 'Email Address')}
                        </Form.Label>
                        <Form.Control
                          type="email"
                          placeholder={t('auto.enterYourRegisteredEmail', 'Enter your registered email')}
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
                          <><Spinner animation="border" size="sm" className="me-2" />{t('auto.checking', 'Checking...')}</>
                        ) : (
                          t('auto.continue', 'Continue')
                        )}
                      </Button>

                      <div className="text-center">
                        <Link href="/auth/signin" className="text-decoration-none">
                          <i className="bi bi-arrow-left me-1"></i>
                          {t('auto.backToSignIn', 'Back to Sign In')}
                        </Link>
                      </div>
                    </Form>
                  )}

                  {/* STEP 2: Choose Method */}
                  {step === 2 && (
                    <div>
                      <p className="text-muted small mb-4">{t('auto.multipleRecoveryOptionsFound', 'Please choose how you would like to reset your password:')}</p>
                      
                      <div className="d-flex flex-column gap-3 mb-4">
                        {recoveryOptions.hasEmailReset && (
                          <div 
                            onClick={() => selectMethodAndProceed('EMAIL')}
                            className="p-3 border text-start rounded d-flex align-items-center gap-3 bg-white"
                            style={{
                              borderColor: 'rgba(0, 0, 0, 0.125)',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = '#0d6efd';
                              e.currentTarget.style.background = '#f8f9fa';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.125)';
                              e.currentTarget.style.background = '#ffffff';
                            }}
                          >
                            <div className="p-2.5 rounded d-flex align-items-center justify-content-center bg-light" style={{ width: '42px', height: '42px' }}>
                              <i className="bi bi-envelope-check text-primary" style={{ fontSize: '1.25rem' }}></i>
                            </div>
                            <div>
                              <div className="fw-semibold text-dark">{t('auto.emailVerification', 'Email Verification')}</div>
                              <div className="small text-muted">{t('auto.sendAOneTimeCodeTo', 'Send code to your email')}</div>
                            </div>
                          </div>
                        )}

                        {recoveryOptions.hasSecurityQuestions && (
                          <div 
                            onClick={() => selectMethodAndProceed('QUESTIONS')}
                            className="p-3 border text-start rounded d-flex align-items-center gap-3 bg-white"
                            style={{
                              borderColor: 'rgba(0, 0, 0, 0.125)',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = '#0d6efd';
                              e.currentTarget.style.background = '#f8f9fa';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.125)';
                              e.currentTarget.style.background = '#ffffff';
                            }}
                          >
                            <div className="p-2.5 rounded d-flex align-items-center justify-content-center bg-light" style={{ width: '42px', height: '42px' }}>
                              <i className="bi bi-shield-lock text-primary" style={{ fontSize: '1.25rem' }}></i>
                            </div>
                            <div>
                              <div className="fw-semibold text-dark">{t('auto.securityQuestions', 'Security Questions')}</div>
                              <div className="small text-muted">{t('auto.answerQuestionsToConfirm', 'Answer your security questions')}</div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="text-center">
                        <Button 
                          variant="link" 
                          className="text-decoration-none text-muted small p-0"
                          onClick={() => setStep(1)}
                        >
                          {t('auto.backToEmailInput', 'Use a different email')}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* STEP 3: Verify via Security Questions */}
                  {step === 3 && (
                    <Form onSubmit={handleResetPassword}>
                      <Alert variant="info" className="small">
                        {t('auto.pleaseAnswerTheSecurityQuestio', 'Please answer the security questions you set up in your account settings.')}
                      </Alert>

                      <Form.Group className="mb-3">
                        <Form.Label className="fw-medium small text-muted">{t('auto.question1', 'Question 1')}</Form.Label>
                        <p className="fw-bold mb-2">{questions.question1}</p>
                        <Form.Control
                          type="text"
                          placeholder={t('auto.yourAnswer', 'Your answer')}
                          value={answers.answer1}
                          onChange={(e) => setAnswers({...answers, answer1: e.target.value})}
                          required
                          className="py-2"
                          disabled={loading}
                        />
                      </Form.Group>

                      <Form.Group className="mb-4">
                        <Form.Label className="fw-medium small text-muted">{t('auto.question2', 'Question 2')}</Form.Label>
                        <p className="fw-bold mb-2">{questions.question2}</p>
                        <Form.Control
                          type="text"
                          placeholder={t('auto.yourAnswer', 'Your answer')}
                          value={answers.answer2}
                          onChange={(e) => setAnswers({...answers, answer2: e.target.value})}
                          required
                          className="py-2"
                          disabled={loading}
                        />
                      </Form.Group>

                      <hr className="my-4" />

                      <Form.Group className="mb-3">
                        <Form.Label className="fw-medium">{t('auto.newPassword', 'New Password')}</Form.Label>
                        <Form.Control
                          type="password"
                          placeholder={t('auto.enterNewPassword', 'Enter new password')}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          required
                          minLength={8}
                          className="py-2"
                          disabled={loading}
                        />
                      </Form.Group>

                      <Form.Group className="mb-4">
                        <Form.Label className="fw-medium">{t('auto.confirmNewPassword', 'Confirm New Password')}</Form.Label>
                        <Form.Control
                          type="password"
                          placeholder={t('auto.confirmNewPassword', 'Confirm new password')}
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
                          <><Spinner animation="border" size="sm" className="me-2" />{t('auto.resetting', 'Resetting...')}</>
                        ) : (
                          t('auto.resetPassword', 'Reset Password')
                        )}
                      </Button>

                      <div className="text-center">
                        <Button 
                          variant="link" 
                          className="text-decoration-none text-muted small p-0"
                          onClick={() => {
                            if (recoveryOptions.hasEmailReset && recoveryOptions.hasSecurityQuestions) {
                              setStep(2);
                            } else {
                              setStep(1);
                            }
                          }}
                          disabled={loading}
                        >
                          {t('auto.goBack', 'Go back')}
                        </Button>
                      </div>
                    </Form>
                  )}

                  {/* STEP 4: Verify via Email Verification Code */}
                  {step === 4 && (
                    <Form onSubmit={handleResetPassword}>
                      <Alert variant="info" className="small">
                        {t('auto.emailCodeInstruction', 'Please enter the 6-digit verification code sent to your email to verify ownership.')}
                      </Alert>

                      <Form.Group className="mb-4">
                        <Form.Label className="fw-medium small text-muted mb-1">{t('auto.verificationCode', 'Verification Code')}</Form.Label>
                        <div className="d-flex gap-2 align-items-center">
                          <Form.Control
                            type="text"
                            placeholder="123456"
                            maxLength={6}
                            value={verificationCode}
                            onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                            required
                            className="py-2 text-center fw-bold fs-5"
                            style={{ letterSpacing: '3px' }}
                            disabled={loading || sendingCode}
                          />
                          <Button
                            variant="outline-secondary"
                            onClick={triggerSendCode}
                            disabled={sendingCode || loading}
                            style={{ whiteSpace: 'nowrap' }}
                            className="py-2"
                          >
                            {sendingCode ? <Spinner animation="border" size="sm" /> : t('auto.resend', 'Resend')}
                          </Button>
                        </div>
                      </Form.Group>

                      <hr className="my-4" />

                      <Form.Group className="mb-3">
                        <Form.Label className="fw-medium">{t('auto.newPassword', 'New Password')}</Form.Label>
                        <Form.Control
                          type="password"
                          placeholder={t('auto.enterNewPassword', 'Enter new password')}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          required
                          minLength={8}
                          className="py-2"
                          disabled={loading}
                        />
                      </Form.Group>

                      <Form.Group className="mb-4">
                        <Form.Label className="fw-medium">{t('auto.confirmNewPassword', 'Confirm New Password')}</Form.Label>
                        <Form.Control
                          type="password"
                          placeholder={t('auto.confirmNewPassword', 'Confirm new password')}
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
                        disabled={loading || !verificationCode || !newPassword || !confirmPassword || sendingCode}
                      >
                        {loading ? (
                          <><Spinner animation="border" size="sm" className="me-2" />{t('auto.resetting', 'Resetting...')}</>
                        ) : (
                          t('auto.resetPassword', 'Reset Password')
                        )}
                      </Button>

                      <div className="text-center">
                        <Button 
                          variant="link" 
                          className="text-decoration-none text-muted small p-0"
                          onClick={() => {
                            if (recoveryOptions.hasEmailReset && recoveryOptions.hasSecurityQuestions) {
                              setStep(2);
                            } else {
                              setStep(1);
                            }
                          }}
                          disabled={loading}
                        >
                          {t('auto.goBack', 'Go back')}
                        </Button>
                      </div>
                    </Form>
                  )}

                  {/* STEP 5: Redirect / Success */}
                  {step === 5 && (
                    <div className="text-center py-4">
                      <div className="mb-4">
                        <i className="bi bi-check-circle text-success" style={{ fontSize: '4rem' }}></i>
                      </div>
                      <h4 className="fw-bold mb-2">{t('auto.allDone', 'All Done!')}</h4>
                      <p className="text-muted small mb-4">{t('auto.redirectingToSignIn', 'Redirecting you to sign in...')}</p>
                      <Button
                        variant="outline-primary"
                        onClick={() => router.push('/auth/signin')}
                        className="mt-2"
                      >
                        {t('auto.signInNow', 'Sign In Now')}
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

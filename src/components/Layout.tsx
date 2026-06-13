import { useSession, signOut } from 'next-auth/react';
import { Container, Nav, Navbar, NavDropdown, Image, Modal, Form, Button, Alert, Spinner, Tabs, Tab, Badge, Offcanvas, ListGroup } from 'react-bootstrap';
import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import NotificationDropdown from './NotificationDropdown';
import { useRouter } from 'next/router';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';

interface Settings {
  appTitle: string;
  headerImg: string;
  headerImgUrl?: string | null;
  tagline: string;
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const user = session?.user;
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [settings, setSettings] = useState<Settings | null>(null);
  const { t } = useTranslation('common');

  // User settings modal states
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [secretQuestion1, setSecretQuestion1] = useState('');
  const [secretAnswer1, setSecretAnswer1] = useState('');
  const [secretQuestion2, setSecretQuestion2] = useState('');
  const [secretAnswer2, setSecretAnswer2] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  const [enableNotifications, setEnableNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [parentRemarkNotifications, setParentRemarkNotifications] = useState(true);
  const [defaultLanguage, setDefaultLanguage] = useState('en');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [updating, setUpdating] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [showMobileDrawer, setShowMobileDrawer] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  const timezones = [
    'UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
    'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Asia/Tokyo', 'Asia/Shanghai',
    'Asia/Kolkata', 'Asia/Dubai', 'Australia/Sydney', 'Pacific/Auckland'
  ];

  const secretQuestions = [
    "What was the name of your first pet?",
    "What is your mother's maiden name?",
    "What was the name of your first school?",
    "What is your favorite book?",
    "What city were you born in?",
    "What is your favorite food?",
    "What was your childhood nickname?",
    "What is the name of your best friend?"
  ];

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/settings/my-settings');
      if (res.ok) {
        const data = await res.json();
        const logo = data.headerImgUrl || data.headerImg || '/assets/default-logo.png';
        setSettings({ ...data, headerImg: logo });
      } else {
        setSettings({
          appTitle: 'AIMS',
          headerImg: '/assets/default-logo.png',
          tagline: 'Academy Information and Management System',
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      setSettings({
        appTitle: 'AIMS',
        headerImg: '/assets/default-logo.png',
        tagline: 'Academy Information and Management System',
      });
    }
  }, []);

  const fetchUserSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/settings/user-settings');
      if (res.ok) {
        const data = await res.json();
        setNewEmail(data.email || user?.email || '');
        setSecretQuestion1(data.secretQuestion1 || '');
        setSecretAnswer1(data.secretAnswer1 || '');
        setSecretQuestion2(data.secretQuestion2 || '');
        setSecretAnswer2(data.secretAnswer2 || '');
        setTimezone(data.timezone || 'UTC');
        const dbLang = data.defaultLanguage || 'en';
        setDefaultLanguage(dbLang);
        setEnableNotifications(data.enableNotifications ?? true);
        setEmailNotifications(data.emailNotifications ?? true);
        setParentRemarkNotifications(data.parentRemarkNotifications ?? true);

        // Sync locale if database differs from current router locale
        if (dbLang !== router.locale) {
          document.cookie = `NEXT_LOCALE=${dbLang}; path=/; max-age=31536000`;
          router.push(router.pathname, router.asPath, { locale: dbLang });
        }
      }
    } catch (error) {
      console.error('Error fetching user settings:', error);
    }
  }, [user?.email, router.locale, router.pathname, router.asPath]);

  const loadUnreadMessages = useCallback(async () => {
    try {
      const res = await fetch('/api/messages/unread-count');
      if (res.ok) {
        const data = await res.json();
        setUnreadMessages(data.count || 0);
      }
    } catch (error) {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchSettings();
      fetchUserSettings();
      loadUnreadMessages();
      const interval = setInterval(loadUnreadMessages, 30000);
      return () => clearInterval(interval);
    }
  }, [status, fetchSettings, fetchUserSettings, loadUnreadMessages]);

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      setError(t('auto.newPasswordsDoNotMatch', `New passwords do not match`));
      return;
    }
    if (newPassword.length < 6) {
      setError(t('auto.passwordMustBeAtLeast', `Password must be at least 6 characters long`));
      return;
    }

    setUpdating(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/settings/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });

      if (res.ok) {
        setSuccess(t('auto.passwordChangedSuccessfully', `Password changed successfully!`));
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        const errorData = await res.json();
        setError(errorData.message || 'Failed to change password');
      }
    } catch (error) {
      setError(t('auto.errorChangingPassword', `Error changing password`));
    } finally {
      setUpdating(false);
    }
  };

  const openMainMenuMobile = () => {
    if (typeof window !== 'undefined') {
      if (user?.role === 'ADMIN') {
        window.dispatchEvent(new Event('open-admin-menu'));
      } else {
        setShowMobileDrawer(true);
      }
    }
  };

  // Open settings modal from sidebar trigger
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = () => setShowSettingsModal(true);
    window.addEventListener('open-settings-modal', handler);
    return () => window.removeEventListener('open-settings-modal', handler);
  }, []);

  // Track viewport to hide burger on desktop explicitly
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 991.98px)');
    const update = () => setIsMobile(mq.matches);
    update();
    if (mq.addEventListener) {
      mq.addEventListener('change', update);
      return () => mq.removeEventListener('change', update);
    } else {
      mq.addListener(update);
      return () => mq.removeListener(update);
    }
  }, []);

  // Track PWA install prompt and device status
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(standalone);

    if (standalone) {
      setCanInstall(false);
      return;
    }

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setCanInstall(false);
  };

  const handleEmailChange = async () => {
    if (!newEmail || newEmail === user?.email) {
      setError(t('auto.pleaseEnterANewEmail', `Please enter a new email address`));
      return;
    }

    setUpdating(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/settings/change-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newEmail })
      });

      if (res.ok) {
        setSuccess(t('auto.emailChangedSuccessfully', `Email changed successfully!`));
      } else {
        const errorData = await res.json();
        setError(errorData.message || 'Failed to change email');
      }
    } catch (error) {
      setError(t('auto.errorChangingEmail', `Error changing email`));
    } finally {
      setUpdating(false);
    }
  };

  const handleSecretQuestionsUpdate = async () => {
    if (!secretQuestion1 || !secretAnswer1 || !secretQuestion2 || !secretAnswer2) {
      setError(t('auto.pleaseFillInBothSecret', `Please fill in both secret questions and answers`));
      return;
    }

    setUpdating(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/settings/secret-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secretQuestion1,
          secretAnswer1,
          secretQuestion2,
          secretAnswer2,
          timezone
        })
      });

      if (res.ok) {
        setSuccess(t('auto.securitySettingsUpdatedSuccessfully', `Security settings updated successfully!`));
      } else {
        const errorData = await res.json();
        setError(errorData.message || 'Failed to update settings');
      }
    } catch (error) {
      setError(t('auto.errorUpdatingSettings', `Error updating settings`));
    } finally {
      setUpdating(false);
    }
  };

  const handleNotificationSettingsUpdate = async () => {
    setUpdating(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/settings/user-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timezone,
          enableNotifications,
          emailNotifications,
          parentRemarkNotifications
        })
      });

      if (res.ok) {
        setSuccess(t('auto.notificationSettingsUpdatedSuccessfully', `Notification settings updated successfully!`));
      } else {
        const errorData = await res.json();
        setError(errorData.message || 'Failed to update notification settings');
      }
    } catch (error) {
      setError(t('auto.errorUpdatingNotificationSettings', `Error updating notification settings`));
    } finally {
      setUpdating(false);
    }
  };

  const handleLanguageSettingsUpdate = async () => {
    setUpdating(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/settings/user-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          defaultLanguage
        })
      });

      if (res.ok) {
        setSuccess('Language settings updated successfully!');
        document.cookie = `NEXT_LOCALE=${defaultLanguage}; path=/; max-age=31536000`;
        router.push(router.pathname, router.asPath, { locale: defaultLanguage });
      } else {
        const errorData = await res.json();
        setError(errorData.message || 'Failed to update language settings');
      }
    } catch (error) {
      setError('Error updating language settings');
    } finally {
      setUpdating(false);
    }
  };

  const handleSignOut = async () => {
    try {
      // Clear any local storage or session storage if needed
      localStorage.clear();
      sessionStorage.clear();
      
      // Force sign out with redirect
      await signOut({ 
        redirect: false,
        callbackUrl: '/auth/signin'
      });
      
      // Force redirect after a short delay
      setTimeout(() => {
        window.location.href = '/auth/signin';
      }, 100);
    } catch (error) {
      console.error('Sign out error:', error);
      // Force redirect if signOut fails
      window.location.href = '/auth/signin';
    }
  };

  const isAuthPage = router.pathname.startsWith('/auth/');

  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <>
      <Navbar
        bg="dark"
        variant="dark"
        expand="lg"
        className="shadow-sm"
        style={{
          minHeight: '80px',
          position: 'sticky',
          top: 0,
          zIndex: 1040,
          backgroundColor: 'hsl(256, 12%, 12%)',
        }}
      >
        <Container fluid className="px-3">
          <div className="d-flex align-items-center">
            {status === 'authenticated' && (
              <button
                className="btn btn-link text-light me-2 p-0 d-lg-none mobile-menu-button"
                aria-label="Open menu"
                onClick={openMainMenuMobile}
                style={{ display: isMobile ? 'inline-flex' : 'none' }}
              >
                <i className="bi bi-list fs-3"></i>
              </button>
            )}
            {settings?.headerImg && (
              <div className="me-3 app-brand-logo">
                <Image 
                  src={settings.headerImg} 
                  alt={t('auto.headerImage', `Header Image`)}
                  className="rounded"
                  style={{ 
                    maxHeight: '60px',
                    maxWidth: '120px',
                    width: 'auto',
                    height: 'auto',
                    objectFit: 'contain'
                  }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/assets/default-logo.png';
                  }}
                />
              </div>
            )}
            <Link href="/" passHref legacyBehavior>
              <Navbar.Brand
                className="fw-bold d-flex flex-column text-decoration-none app-brand"
                style={{ textDecoration: 'none' }}
              >
                <div className="fs-4 app-brand-text text-truncate">{settings?.appTitle || 'AIMS'}</div>
                {settings?.tagline && (
                  <small
                    className="text-light opacity-75 fw-normal text-decoration-none app-brand-text text-truncate"
                    style={{ fontSize: '0.75rem', lineHeight: '1', textDecoration: 'none' }}
                  >
                    {settings.tagline}
                  </small>
                )}
              </Navbar.Brand>
            </Link>
          </div>
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="d-flex align-items-center ms-auto d-none d-lg-flex">
              {canInstall && (
                <Button
                  variant="outline-light"
                  size="sm"
                  className="me-3 d-flex align-items-center"
                  onClick={handleInstall}
                >
                  <i className="bi bi-download me-2"></i>
                  {t('layout.install')}
                </Button>
              )}
              {status === 'authenticated' && user && (
                <>
                  {/* Removed theme toggle */}
                  <div className="me-2 position-relative">
                    <NotificationDropdown />
                  </div>
                  <Button
                    variant="link"
                    size="sm"
                    className="me-2 d-flex align-items-center text-light text-decoration-none p-0 position-relative"
                    onClick={() => router.push('/messages')}
                    title={t('auto.messages', `Messages`)}
                  >
                    <i className="bi bi-envelope fs-5"></i>
                    {unreadMessages > 0 && (
                      <Badge bg="danger" pill className="position-absolute top-0 start-100 translate-middle">
                        {unreadMessages}
                      </Badge>
                    )}
                  </Button>
                  
                  <NavDropdown 
                    title={<i className="bi bi-globe fs-5 text-light"></i>} 
                    id="language-dropdown" 
                    align="end" 
                    className="me-2"
                  >
                    <NavDropdown.Item onClick={async () => {
                      document.cookie = `NEXT_LOCALE=en; path=/; max-age=31536000`;
                      if (status === 'authenticated') {
                        try {
                          await fetch('/api/settings/user-settings', {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ defaultLanguage: 'en' })
                          });
                        } catch (e) {
                          console.error(e);
                        }
                      }
                      router.push(router.pathname, router.asPath, { locale: 'en' });
                    }}>
                      {t('english', 'English')}
                    </NavDropdown.Item>
                    <NavDropdown.Item onClick={async () => {
                      document.cookie = `NEXT_LOCALE=ur; path=/; max-age=31536000`;
                      if (status === 'authenticated') {
                        try {
                          await fetch('/api/settings/user-settings', {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ defaultLanguage: 'ur' })
                          });
                        } catch (e) {
                          console.error(e);
                        }
                      }
                      router.push(router.pathname, router.asPath, { locale: 'ur' });
                    }}>
                      {t('urdu', 'Urdu (اردو)')}
                    </NavDropdown.Item>
                  </NavDropdown>
                  <NavDropdown 
                    title={
                      <span className="text-light">
                        <i className="bi bi-person-circle me-1"></i>
                        {user.name || user.email}
                      </span>
                    } 
                    id="basic-nav-dropdown"
                    align="end"
                  >
                    <NavDropdown.Item disabled className="text-muted small">
                      {t('layout.role')} <bdi>{user.role}</bdi>
                    </NavDropdown.Item>
                    <NavDropdown.Divider />
                    <NavDropdown.Item onClick={() => setShowSettingsModal(true)}>
                      <i className="bi bi-gear me-2"></i>
                      {t('layout.userSettings', 'User Settings')}
                    </NavDropdown.Item>
                    <NavDropdown.Item onClick={handleSignOut}>
                      <i className="bi bi-box-arrow-right me-2"></i>
                      {t('logout', 'Sign Out')}
                    </NavDropdown.Item>
                  </NavDropdown>
                </>
              )}
              {status === 'unauthenticated' && (
                <Link href="/auth/signin" className="nav-link fw-medium text-light">
                  <i className="bi bi-box-arrow-in-right me-1"></i>
                  {t('layout.signIn')}
                </Link>
              )}
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>
      
      <main className="min-vh-100 bg-light">
        <Container fluid className="py-4 px-3">
          <div className="row justify-content-center">
            <div className="col-12">
              {children}
            </div>
          </div>
        </Container>
      </main>

      
      <footer className="bg-dark text-light py-3 mt-auto">
        <Container>
          <div className="row">
            <div className="col-12 text-center">
              <small>
                © {new Date().getFullYear()} {settings?.appTitle || 'AIMS'}. {t('layout.allRightsReserved')}
              </small>
              <div className="mt-1">
                <small className="text-muted fst-italic">
                  {settings?.tagline || 'Academy Information and Management System'}
                </small>
              </div>
            </div>
          </div>
        </Container>
      </footer>

      {/* User Settings Modal */}
      <Modal show={showSettingsModal} onHide={() => setShowSettingsModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-gear me-2"></i>
            {t('layout.userSettings')}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
          {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}
          
          <Tabs defaultActiveKey="password" className="mb-3">
            <Tab eventKey="password" title={t('layout.password')}>
              <Form>
                <Form.Group className="mb-3">
                  <Form.Label>{t('layout.currentPassword')}</Form.Label>
                  <Form.Control
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder={t('layout.currentPassword')}
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>{t('layout.newPassword')}</Form.Label>
                  <Form.Control
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder={t('layout.newPassword')}
                    minLength={6}
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>{t('layout.confirmNewPassword')}</Form.Label>
                  <Form.Control
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={t('layout.confirmNewPassword')}
                    minLength={6}
                  />
                </Form.Group>
                <Button 
                  variant="primary" 
                  onClick={handlePasswordChange}
                  disabled={updating}
                >
                  {updating ? <Spinner animation="border" size="sm" className="me-2" /> : null}
                  {t('layout.changePassword')}
                </Button>
              </Form>
            </Tab>
            
            <Tab eventKey="email" title={t('layout.email')}>
              <Form>
                <Form.Group className="mb-3">
                  <Form.Label>{t('layout.currentEmail')}</Form.Label>
                  <Form.Control
                    type="email"
                    value={user?.email || ''}
                    disabled
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>{t('layout.newEmailAddress')}</Form.Label>
                  <Form.Control
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder={t('layout.newEmailAddress')}
                  />
                </Form.Group>
                <Button 
                  variant="primary" 
                  onClick={handleEmailChange}
                  disabled={updating}
                >
                  {updating ? <Spinner animation="border" size="sm" className="me-2" /> : null}
                  {t('layout.changeEmail')}
                </Button>
              </Form>
            </Tab>
            
            <Tab eventKey="security" title={t('layout.securityQuestions')}>
              <Form>
                <Form.Group className="mb-3">
                  <Form.Label>{t('layout.securityQuestion1')}</Form.Label>
                  <Form.Select
                    value={secretQuestion1}
                    onChange={(e) => setSecretQuestion1(e.target.value)}
                  >
                    <option value="">{t('layout.selectQuestion')}</option>
                    {secretQuestions.map((question, index) => (
                      <option key={index} value={question}>{question}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>{t('layout.answer1')}</Form.Label>
                  <Form.Control
                    type="text"
                    value={secretAnswer1}
                    onChange={(e) => setSecretAnswer1(e.target.value)}
                    placeholder={t('layout.answer1')}
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>{t('layout.securityQuestion2')}</Form.Label>
                  <Form.Select
                    value={secretQuestion2}
                    onChange={(e) => setSecretQuestion2(e.target.value)}
                  >
                    <option value="">{t('layout.selectQuestion')}</option>
                    {secretQuestions.map((question, index) => (
                      <option key={index} value={question}>{question}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>{t('layout.answer2')}</Form.Label>
                  <Form.Control
                    type="text"
                    value={secretAnswer2}
                    onChange={(e) => setSecretAnswer2(e.target.value)}
                    placeholder={t('layout.answer2')}
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>{t('layout.timezone')}</Form.Label>
                  <Form.Select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                  >
                    {timezones.map((tz) => (
                      <option key={tz} value={tz}>{tz}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
                <Button 
                  variant="primary" 
                  onClick={handleSecretQuestionsUpdate}
                  disabled={updating}
                >
                  {updating ? <Spinner animation="border" size="sm" className="me-2" /> : null}
                  {t('layout.updateSecuritySettings')}
                </Button>
              </Form>
            </Tab>

            <Tab eventKey="notifications" title={t('layout.notifications')}>
              <Form>
                <Form.Group className="mb-3">
                  <Form.Check
                    type="switch"
                    id="enable-notifications"
                    label={t('layout.enableNotifications')}
                    checked={enableNotifications}
                    onChange={(e) => setEnableNotifications(e.target.checked)}
                  />
                  <Form.Text className="text-muted">
                    {t('layout.masterSwitch')}
                  </Form.Text>
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Check
                    type="switch"
                    id="email-notifications"
                    label={t('layout.emailNotifications')}
                    checked={emailNotifications}
                    onChange={(e) => setEmailNotifications(e.target.checked)}
                    disabled={!enableNotifications}
                  />
                  <Form.Text className="text-muted">
                    {t('layout.receiveViaEmail')}
                  </Form.Text>
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Check
                    type="switch"
                    id="parent-remark-notifications"
                    label={t('layout.parentRemarkNotifications')}
                    checked={parentRemarkNotifications}
                    onChange={(e) => setParentRemarkNotifications(e.target.checked)}
                    disabled={!enableNotifications}
                  />
                  <Form.Text className="text-muted">
                    {t('layout.getNotified')}
                  </Form.Text>
                </Form.Group>
                <Button 
                  variant="primary" 
                  onClick={handleNotificationSettingsUpdate}
                  disabled={updating}
                >
                  {updating ? <Spinner animation="border" size="sm" className="me-2" /> : null}
                  {t('layout.updateNotificationSettings')}
                </Button>
              </Form>
            </Tab>
            
            <Tab eventKey="language" title={t('layout.language', 'Language')}>
              <Form>
                <Form.Group className="mb-3">
                  <Form.Label>{t('layout.defaultLanguageSetting', 'Default Language')}</Form.Label>
                  <Form.Select
                    value={defaultLanguage}
                    onChange={(e) => setDefaultLanguage(e.target.value)}
                  >
                    <option value="en">{t('english', 'English')}</option>
                    <option value="ur">{t('urdu', 'Urdu (اردو)')}</option>
                  </Form.Select>
                </Form.Group>
                <Button 
                  variant="primary" 
                  onClick={handleLanguageSettingsUpdate}
                  disabled={updating}
                >
                  {updating ? <Spinner animation="border" size="sm" className="me-2" /> : null}
                  {t('layout.updateLanguageSettings', 'Update Language Settings')}
                </Button>
              </Form>
            </Tab>
          </Tabs>
        </Modal.Body>
      </Modal>

      {/* Unified Mobile Menu Drawer for Non-Admin roles */}
      <Offcanvas
        show={showMobileDrawer}
        onHide={() => setShowMobileDrawer(false)}
        className="d-lg-none"
        placement={router.locale === 'ur' ? 'end' : 'start'}
      >
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>
            <i className="bi bi-list me-2"></i>
            {t('menu.menu', 'Menu')}
          </Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body className="d-flex flex-column justify-content-between">
          <div>
            {/* User Info Header */}
            {user && (
              <div className="p-3 mb-3 bg-light rounded text-dark">
                <div className="d-flex align-items-center gap-2 mb-2">
                  <i className="bi bi-person-circle fs-3 text-secondary"></i>
                  <div>
                    <div className="fw-bold text-truncate" style={{ maxWidth: '200px' }}>{user.name || user.email}</div>
                    <small className="text-muted d-block text-truncate" style={{ maxWidth: '200px' }}>{user.email}</small>
                  </div>
                </div>
                <div className="small">
                  <span className="text-muted">{t('layout.role', 'Role')}: </span>
                  <Badge bg="primary" className="text-capitalize">{user.role}</Badge>
                </div>
              </div>
            )}

            <ListGroup variant="flush" className="mb-4">
              {/* Home Link */}
              <ListGroup.Item
                action
                onClick={() => {
                  router.push('/dashboard');
                  setShowMobileDrawer(false);
                }}
                className="d-flex align-items-center py-3"
              >
                <i className="bi bi-house me-3 fs-5 text-primary"></i>
                <span>{t('menu.home', 'Home')}</span>
              </ListGroup.Item>

              {/* Messages Link */}
              <ListGroup.Item
                action
                onClick={() => {
                  router.push('/messages');
                  setShowMobileDrawer(false);
                }}
                className="d-flex align-items-center py-3 justify-content-between"
              >
                <span className="d-flex align-items-center">
                  <i className="bi bi-envelope me-3 fs-5 text-success"></i>
                  <span>{t('messages', 'Messages')}</span>
                </span>
                {unreadMessages > 0 && (
                  <Badge bg="danger" pill>
                    {unreadMessages}
                  </Badge>
                )}
              </ListGroup.Item>

              {/* Notifications Link/Dropdown */}
              <ListGroup.Item
                className="d-flex align-items-center py-2 justify-content-between px-3"
              >
                <span className="d-flex align-items-center text-dark">
                  <i className="bi bi-bell me-3 fs-5 text-warning"></i>
                  <span>{t('auto.notifications', 'Notifications')}</span>
                </span>
                <NotificationDropdown theme="light" />
              </ListGroup.Item>

              {/* User Settings */}
              <ListGroup.Item
                action
                onClick={() => {
                  setShowSettingsModal(true);
                  setShowMobileDrawer(false);
                }}
                className="d-flex align-items-center py-3"
              >
                <i className="bi bi-gear me-3 fs-5 text-secondary"></i>
                <span>{t('layout.userSettings', 'User Settings')}</span>
              </ListGroup.Item>
            </ListGroup>

            {/* Language Switcher */}
            <div className="mb-4 px-3">
              <label className="form-label small text-muted fw-bold mb-2">
                <i className="bi bi-globe me-2"></i>{t('layout.language', 'Language')}
              </label>
              <div className="d-flex gap-2">
                <Button
                  size="sm"
                  variant={router.locale === 'en' ? 'primary' : 'outline-secondary'}
                  className="w-50"
                  onClick={async () => {
                    document.cookie = `NEXT_LOCALE=en; path=/; max-age=31536000`;
                    if (status === 'authenticated') {
                      try {
                        await fetch('/api/settings/user-settings', {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ defaultLanguage: 'en' })
                        });
                      } catch (e) {
                        console.error(e);
                      }
                    }
                    router.push(router.pathname, router.asPath, { locale: 'en' });
                    setShowMobileDrawer(false);
                  }}
                >
                  English
                </Button>
                <Button
                  size="sm"
                  variant={router.locale === 'ur' ? 'primary' : 'outline-secondary'}
                  className="w-50"
                  onClick={async () => {
                    document.cookie = `NEXT_LOCALE=ur; path=/; max-age=31536000`;
                    if (status === 'authenticated') {
                      try {
                        await fetch('/api/settings/user-settings', {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ defaultLanguage: 'ur' })
                        });
                      } catch (e) {
                        console.error(e);
                      }
                    }
                    router.push(router.pathname, router.asPath, { locale: 'ur' });
                    setShowMobileDrawer(false);
                  }}
                >
                  اردو
                </Button>
              </div>
            </div>

            {/* PWA Install Area */}
            {canInstall && (
              <div className="px-3 mb-4">
                <Button
                  variant="outline-primary"
                  className="w-100 d-flex align-items-center justify-content-center py-2 fs-6 fw-bold"
                  onClick={handleInstall}
                >
                  <i className="bi bi-download me-2"></i>
                  {t('layout.install', 'Install App')}
                </Button>
              </div>
            )}

            {/* iOS PWA Instructions */}
            {isIOS && !isStandalone && (
              <Alert variant="info" className="mx-3 mb-4 small py-2 px-3">
                <div className="fw-bold mb-1">
                  <i className="bi bi-info-circle me-1"></i>
                  {t('auto.installOnIphone', 'Install on iPhone / iPad')}
                </div>
                <ol className="mb-0 ps-3">
                  <li>{t('auto.iosInstallStep1', 'Tap the Share icon in Safari (bottom navigation bar).')}</li>
                  <li>{t('auto.iosInstallStep2', 'Scroll down and select "Add to Home Screen".')}</li>
                </ol>
              </Alert>
            )}
          </div>

          {/* Sign Out Button at bottom of drawer */}
          <div className="p-3 border-top mt-auto">
            <Button
              variant="danger"
              className="w-100 py-2 d-flex align-items-center justify-content-center"
              onClick={() => {
                handleSignOut();
                setShowMobileDrawer(false);
              }}
            >
              <i className="bi bi-box-arrow-right me-2"></i>
              {t('logout', 'Sign Out')}
            </Button>
          </div>
        </Offcanvas.Body>
      </Offcanvas>
    </>
  );
}

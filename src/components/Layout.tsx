import { useSession, signOut } from 'next-auth/react';
import { Container, Nav, Navbar, NavDropdown, Image, Modal, Form, Button, Alert, Spinner, Tabs, Tab } from 'react-bootstrap';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import NotificationDropdown from './NotificationDropdown';

interface Settings {
  appTitle: string;
  headerImg: string;
  tagline: string;
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const user = session?.user;
  const [settings, setSettings] = useState<Settings | null>(null);

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
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [updating, setUpdating] = useState(false);

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

  useEffect(() => {
    if (status === 'authenticated') {
      fetchSettings();
      fetchUserSettings();
    }
  }, [status]);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings/my-settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      setSettings({
        appTitle: 'AIMS',
        headerImg: '/assets/default-logo.png',
        tagline: 'Academy Information and Management System',
      });
    }
  };

  const fetchUserSettings = async () => {
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
        setEnableNotifications(data.enableNotifications ?? true);
        setEmailNotifications(data.emailNotifications ?? true);
        setParentRemarkNotifications(data.parentRemarkNotifications ?? true);
      }
    } catch (error) {
      console.error('Error fetching user settings:', error);
    }
  };

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
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
        setSuccess('Password changed successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        const errorData = await res.json();
        setError(errorData.message || 'Failed to change password');
      }
    } catch (error) {
      setError('Error changing password');
    } finally {
      setUpdating(false);
    }
  };

  const handleEmailChange = async () => {
    if (!newEmail || newEmail === user?.email) {
      setError('Please enter a new email address');
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
        setSuccess('Email changed successfully!');
      } else {
        const errorData = await res.json();
        setError(errorData.message || 'Failed to change email');
      }
    } catch (error) {
      setError('Error changing email');
    } finally {
      setUpdating(false);
    }
  };

  const handleSecretQuestionsUpdate = async () => {
    if (!secretQuestion1 || !secretAnswer1 || !secretQuestion2 || !secretAnswer2) {
      setError('Please fill in both secret questions and answers');
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
        setSuccess('Security settings updated successfully!');
      } else {
        const errorData = await res.json();
        setError(errorData.message || 'Failed to update settings');
      }
    } catch (error) {
      setError('Error updating settings');
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
        setSuccess('Notification settings updated successfully!');
      } else {
        const errorData = await res.json();
        setError(errorData.message || 'Failed to update notification settings');
      }
    } catch (error) {
      setError('Error updating notification settings');
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

  return (
    <>
      <Navbar bg="dark" variant="dark" expand="lg" className="shadow-sm" style={{ minHeight: '80px' }}>
        <Container fluid className="px-3">
          <div className="d-flex align-items-center">
            {settings?.headerImg && (
              <div className="me-3">
                <Image 
                  src={settings.headerImg} 
                  alt="Header Image"
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
            <Link href="/" passHref>
              <Navbar.Brand className="fw-bold d-flex flex-column">
                <div className="fs-4">{settings?.appTitle || 'AIMS'}</div>
                {settings?.tagline && (
                  <small className="text-light opacity-75 fw-normal" style={{ fontSize: '0.75rem', lineHeight: '1' }}>
                    {settings.tagline}
                  </small>
                )}
              </Navbar.Brand>
            </Link>
          </div>
          
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="me-auto">
              {user && (
                <Link href="/dashboard" passHref>
                  <Nav.Link className="fw-medium">Dashboard</Nav.Link>
                </Link>
              )}
            </Nav>
            <Nav className="d-flex align-items-center">
              {status === 'authenticated' && user && (
                <>
                  <div className="me-2 position-relative">
                    <NotificationDropdown />
                  </div>
                  
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
                      Role: {user.role}
                    </NavDropdown.Item>
                    <NavDropdown.Divider />
                    <NavDropdown.Item onClick={() => setShowSettingsModal(true)}>
                      <i className="bi bi-gear me-2"></i>
                      Settings
                    </NavDropdown.Item>
                    <NavDropdown.Item onClick={handleSignOut}>
                      <i className="bi bi-box-arrow-right me-2"></i>
                      Sign Out
                    </NavDropdown.Item>
                  </NavDropdown>
                </>
              )}
              {status === 'unauthenticated' && (
                <Link href="/auth/signin" passHref>
                  <Nav.Link className="fw-medium">
                    <i className="bi bi-box-arrow-in-right me-1"></i>
                    Sign In
                  </Nav.Link>
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
                © {new Date().getFullYear()} {settings?.appTitle || 'AIMS'}. All rights reserved.
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
            User Settings
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
          {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}
          
          <Tabs defaultActiveKey="password" className="mb-3">
            <Tab eventKey="password" title="Password">
              <Form>
                <Form.Group className="mb-3">
                  <Form.Label>Current Password</Form.Label>
                  <Form.Control
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>New Password</Form.Label>
                  <Form.Control
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    minLength={6}
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Confirm New Password</Form.Label>
                  <Form.Control
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    minLength={6}
                  />
                </Form.Group>
                <Button 
                  variant="primary" 
                  onClick={handlePasswordChange}
                  disabled={updating}
                >
                  {updating ? <Spinner animation="border" size="sm" className="me-2" /> : null}
                  Change Password
                </Button>
              </Form>
            </Tab>
            
            <Tab eventKey="email" title="Email">
              <Form>
                <Form.Group className="mb-3">
                  <Form.Label>Current Email</Form.Label>
                  <Form.Control
                    type="email"
                    value={user?.email || ''}
                    disabled
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>New Email Address</Form.Label>
                  <Form.Control
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="Enter new email address"
                  />
                </Form.Group>
                <Button 
                  variant="primary" 
                  onClick={handleEmailChange}
                  disabled={updating}
                >
                  {updating ? <Spinner animation="border" size="sm" className="me-2" /> : null}
                  Change Email
                </Button>
              </Form>
            </Tab>
            
            <Tab eventKey="security" title="Security Questions">
              <Form>
                <Form.Group className="mb-3">
                  <Form.Label>Security Question 1</Form.Label>
                  <Form.Select
                    value={secretQuestion1}
                    onChange={(e) => setSecretQuestion1(e.target.value)}
                  >
                    <option value="">Select a question...</option>
                    {secretQuestions.map((question, index) => (
                      <option key={index} value={question}>{question}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Answer 1</Form.Label>
                  <Form.Control
                    type="text"
                    value={secretAnswer1}
                    onChange={(e) => setSecretAnswer1(e.target.value)}
                    placeholder="Enter your answer"
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Security Question 2</Form.Label>
                  <Form.Select
                    value={secretQuestion2}
                    onChange={(e) => setSecretQuestion2(e.target.value)}
                  >
                    <option value="">Select a question...</option>
                    {secretQuestions.map((question, index) => (
                      <option key={index} value={question}>{question}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Answer 2</Form.Label>
                  <Form.Control
                    type="text"
                    value={secretAnswer2}
                    onChange={(e) => setSecretAnswer2(e.target.value)}
                    placeholder="Enter your answer"
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Timezone</Form.Label>
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
                  Update Security Settings
                </Button>
              </Form>
            </Tab>

            <Tab eventKey="notifications" title="Notifications">
              <Form>
                <Form.Group className="mb-3">
                  <Form.Check
                    type="switch"
                    id="enable-notifications"
                    label="Enable Notifications"
                    checked={enableNotifications}
                    onChange={(e) => setEnableNotifications(e.target.checked)}
                  />
                  <Form.Text className="text-muted">
                    Master switch for all notifications
                  </Form.Text>
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Check
                    type="switch"
                    id="email-notifications"
                    label="Email Notifications"
                    checked={emailNotifications}
                    onChange={(e) => setEmailNotifications(e.target.checked)}
                    disabled={!enableNotifications}
                  />
                  <Form.Text className="text-muted">
                    Receive notifications via email
                  </Form.Text>
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Check
                    type="switch"
                    id="parent-remark-notifications"
                    label="Parent Remark Notifications"
                    checked={parentRemarkNotifications}
                    onChange={(e) => setParentRemarkNotifications(e.target.checked)}
                    disabled={!enableNotifications}
                  />
                  <Form.Text className="text-muted">
                    Get notified when parents add remarks
                  </Form.Text>
                </Form.Group>
                <Button 
                  variant="primary" 
                  onClick={handleNotificationSettingsUpdate}
                  disabled={updating}
                >
                  {updating ? <Spinner animation="border" size="sm" className="me-2" /> : null}
                  Update Notification Settings
                </Button>
              </Form>
            </Tab>
          </Tabs>
        </Modal.Body>
      </Modal>
    </>
  );
}
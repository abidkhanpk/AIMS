import { useSession, signOut } from 'next-auth/react';
import { Container, Nav, Navbar, NavDropdown, Image } from 'react-bootstrap';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import NotificationDropdown from './NotificationDropdown';

interface Settings {
  appTitle: string;
  headerImg: string;
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const user = session?.user;
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchSettings();
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
      // Use default settings on error
      setSettings({
        appTitle: 'LMS Academy',
        headerImg: '/assets/default-logo.png',
      });
    }
  };

  return (
    <>
      <Navbar bg="dark" variant="dark" expand="lg" className="shadow-sm">
        <Container fluid className="px-3">
          <div className="d-flex align-items-center">
            {settings?.headerImg && (
              <Image 
                src={settings.headerImg} 
                height={40} 
                width={40}
                className="me-2 rounded" 
                alt="Header Image"
                style={{ objectFit: 'cover' }}
                onError={(e) => {
                  // Fallback to default logo on error
                  (e.target as HTMLImageElement).src = '/assets/default-logo.png';
                }}
              />
            )}
            <Link href="/" passHref>
              <Navbar.Brand className="fw-bold">
                {settings?.appTitle || 'LMS Academy'}
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
                  {/* Notification Dropdown */}
                  <div className="me-2">
                    <NotificationDropdown />
                  </div>
                  
                  {/* User Dropdown */}
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
                    <NavDropdown.Item onClick={() => signOut()}>
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
                © 2024 {settings?.appTitle || 'LMS Academy'}. All rights reserved.
              </small>
            </div>
          </div>
        </Container>
      </footer>
    </>
  );
}
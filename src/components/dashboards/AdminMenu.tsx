import { useEffect, useState } from 'react';
import { Offcanvas, ListGroup, Button, Alert, Modal, Tabs, Tab } from 'react-bootstrap';
import { useRouter } from 'next/router';
import NotificationDropdown from '../NotificationDropdown';
import { useTranslation } from 'react-i18next';
import { signOut, useSession } from 'next-auth/react';
import styles from './AdminMenu.module.css';

type MenuItem = {
  key: string;
  label: string;
  icon: string;
  children?: MenuItem[];
};

const menuItems: MenuItem[] = [
  {
    key: 'home',
    label: 'menu.home',
    icon: 'bi-house',
  },
  {
    key: 'individuals',
    label: 'menu.individuals',
    icon: 'bi-people',
    children: [
      { key: 'teachers', label: 'menu.teachers', icon: 'bi-person-workspace' },
      { key: 'parents', label: 'menu.parents', icon: 'bi-people' },
      { key: 'students', label: 'menu.students', icon: 'bi-mortarboard' },
    ],
  },
  {
    key: 'academic',
    label: 'menu.academic',
    icon: 'bi-mortarboard',
    children: [
      { key: 'subjects', label: 'menu.subjects', icon: 'bi-book' },
      { key: 'assignments', label: 'menu.assignments', icon: 'bi-diagram-3' },
      { key: 'progress', label: 'menu.progress', icon: 'bi-graph-up' },
      { key: 'attendance-reports', label: 'menu.attendanceReports', icon: 'bi-file-earmark-spreadsheet' },
      { key: 'report-cards', label: 'menu.reportCards', icon: 'bi-award' },
      { key: 'tests', label: 'menu.tests', icon: 'bi-journal-check' },
    ],
  },
  {
    key: 'financials',
    label: 'menu.financials',
    icon: 'bi-cash-stack',
    children: [
      { key: 'fees', label: 'menu.fees', icon: 'bi-cash-coin' },
      { key: 'fee-verification', label: 'menu.feeVerification', icon: 'bi-check-circle' },
      { key: 'salaries', label: 'menu.salaries', icon: 'bi-wallet2' },
    ],
  },
  {
    key: 'parent-remarks',
    label: 'menu.parentRemarks',
    icon: 'bi-chat-dots',
  },
  {
    key: 'system',
    label: 'menu.system',
    icon: 'bi-shield-lock',
    children: [
      { key: 'audit-logs', label: 'menu.auditLogs', icon: 'bi-file-earmark-code' },
      { key: 'academy-settings', label: 'menu.academySettings', icon: 'bi-gear-fill' },
      { key: 'subscription-management', label: 'menu.subscriptionManagement', icon: 'bi-credit-card' },
      { key: 'whatsapp', label: 'menu.whatsapp', icon: 'bi-whatsapp' },
    ],
  },
];

export default function AdminMenu({ activeKey, onSelect }: { activeKey: string; onSelect: (key: string) => void }) {
  const router = useRouter();
  const { t } = useTranslation('common');
  const { data: session, status } = useSession();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [mobileGroups, setMobileGroups] = useState<Record<string, boolean>>({});

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isSecure, setIsSecure] = useState(true);
  const [showInstructionsModal, setShowInstructionsModal] = useState(false);
  const [instructionsTab, setInstructionsTab] = useState('android');

  const handleSignOut = async () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      await signOut({ 
        redirect: false,
        callbackUrl: '/auth/signin'
      });
      setTimeout(() => {
        window.location.href = '/auth/signin';
      }, 100);
    } catch (error) {
      console.error('Sign out error:', error);
      window.location.href = '/auth/signin';
    }
  };

  useEffect(() => {
    // Keep parent group open when a child is active
    setOpenGroups((prev) => {
      const defaults: Record<string, boolean> = {};
      menuItems.forEach((item) => {
        if (item.children?.some((child) => child.key === activeKey) && typeof prev[item.key] !== 'boolean') {
          defaults[item.key] = true;
        }
      });
      return Object.keys(defaults).length ? { ...prev, ...defaults } : prev;
    });

    setMobileGroups((prev) => {
      const defaults: Record<string, boolean> = {};
      menuItems.forEach((item) => {
        if (item.children?.some((child) => child.key === activeKey) && typeof prev[item.key] !== 'boolean') {
          defaults[item.key] = true;
        }
      });
      return Object.keys(defaults).length ? { ...prev, ...defaults } : prev;
    });
  }, [activeKey]);

  // Allow external trigger (header burger) to open the mobile menu
  useEffect(() => {
    const handler = () => setShowMobileMenu(true);
    if (typeof window !== 'undefined') {
      window.addEventListener('open-admin-menu', handler);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('open-admin-menu', handler);
      }
    };
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

    const secure = window.location.protocol === 'https:' || 
                   window.location.hostname === 'localhost' || 
                   window.location.hostname === '127.0.0.1';
    setIsSecure(secure);

    if (standalone) {
      setCanInstall(false);
      return;
    }

    // Check if prompt is already captured globally
    if ((window as any).deferredPrompt) {
      setCanInstall(true);
    }

    const handlePrompt = (e: any) => {
      e.preventDefault();
      (window as any).deferredPrompt = e;
      setDeferredPrompt(e);
      setCanInstall(true);
      window.dispatchEvent(new Event('pwa-install-available'));
    };

    const handleAvailable = () => {
      setCanInstall(true);
    };

    const handleInstalled = () => {
      setCanInstall(false);
    };

    window.addEventListener('beforeinstallprompt', handlePrompt);
    window.addEventListener('pwa-install-available', handleAvailable);
    window.addEventListener('pwa-installed', handleInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handlePrompt);
      window.removeEventListener('pwa-install-available', handleAvailable);
      window.removeEventListener('pwa-installed', handleInstalled);
    };
  }, []);

  const handleInstall = async () => {
    const prompt = (window as any).deferredPrompt || deferredPrompt;
    if (!prompt) return;
    prompt.prompt();
    await prompt.userChoice;
    (window as any).deferredPrompt = null;
    setDeferredPrompt(null);
    setCanInstall(false);
    window.dispatchEvent(new Event('pwa-installed'));
  };

  const triggerPwaInstall = () => {
    if (canInstall) {
      handleInstall();
    } else {
      setShowInstructionsModal(true);
    }
  };

  const renderMenuItem = (item: MenuItem, isChild = false) => {
    const hasChildren = Array.isArray(item.children) && item.children.length > 0;
    const childActive = item.children?.some((child) => child.key === activeKey);
    const isActive = activeKey === item.key || childActive;
    const explicit = openGroups[item.key];
    const expanded = hasChildren && (typeof explicit === 'boolean' ? explicit : childActive);

    const handleClick = () => {
      if (hasChildren) {
        setOpenGroups((prev) => {
          const next: Record<string, boolean> = {};
          menuItems.forEach((m) => {
            if (m.children?.length) {
              next[m.key] = false;
            }
          });
          const current = typeof prev[item.key] === 'boolean' ? prev[item.key] : childActive;
          next[item.key] = !current;
          return next;
        });
        return;
      }
      onSelect(item.key);
    };

    return (
      <li key={item.key} className={`${styles.navbarItem} ${isChild ? styles.subItem : ''}`}>
        <button
          type="button"
          className={`${styles.navbarItemInner} ${styles.flexLeft} ${isActive ? styles.navbarItemInnerActive : ''}`}
          onClick={handleClick}
          aria-current={isActive ? 'page' : undefined}
          aria-expanded={hasChildren ? expanded : undefined}
        >
          <div className={styles.parentRow}>
            <div className={`${styles.iconWrapper}`}>
              <i className={`bi ${item.icon}`} aria-hidden />
            </div>
            <span className={styles.linkText}>{t(item.label)}</span>
          </div>
          {hasChildren && (
            <i className={`bi ${expanded ? 'bi-chevron-up' : 'bi-chevron-down'} ${styles.arrow}`} aria-hidden />
          )}
        </button>
        {hasChildren && (
          <div className={expanded ? `${styles.subGroup} ${styles.subGroupOpen}` : styles.subGroup}>
            <ul className={styles.subList}>
              {item.children?.map((child) => renderMenuItem(child, true))}
            </ul>
          </div>
        )}
      </li>
    );
  };

  const toggleMobileGroup = (key: string, childActive: boolean | undefined) => {
    setMobileGroups((prev) => ({
      ...prev,
      [key]: typeof prev[key] === 'boolean' ? !prev[key] : !childActive,
    }));
  };

  const openSettingsModal = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('open-settings-modal'));
    }
    setShowMobileMenu(false);
  };

  const renderMobileItem = (item: MenuItem) => {
    const hasChildren = Array.isArray(item.children) && item.children.length > 0;
    const childActive = item.children?.some((child) => child.key === activeKey);
    const expanded = hasChildren && (typeof mobileGroups[item.key] === 'boolean' ? mobileGroups[item.key] : childActive);

    return (
      <div key={item.key} className="mb-2">
        <ListGroup.Item
          action
          onClick={() => {
            if (hasChildren) {
              toggleMobileGroup(item.key, childActive);
              return;
            }
            onSelect(item.key);
            setShowMobileMenu(false);
          }}
          className="d-flex align-items-center justify-content-between"
          style={{ fontSize: '1.05rem' }}
        >
          <span className="d-flex align-items-center">
            <i className={`bi ${item.icon} me-2`}></i>
            {t(item.label)}
          </span>
          {hasChildren && (
            <i className={`bi ${expanded ? 'bi-chevron-up' : 'bi-chevron-down'}`}></i>
          )}
        </ListGroup.Item>
        {hasChildren && expanded && (
          <ListGroup className="ms-3 mt-1">
            {item.children?.map((child) => (
              <ListGroup.Item
                key={child.key}
                action
                onClick={() => {
                  onSelect(child.key);
                  setShowMobileMenu(false);
                }}
                className="d-flex align-items-center"
                style={{ fontSize: '1.05rem' }}
              >
                <i className={`bi ${child.icon} me-2`}></i>
                {t(child.label)}
              </ListGroup.Item>
            ))}
          </ListGroup>
        )}
      </div>
    );
  };

  return (
    <>
      <nav className={`${styles.navbar} d-none d-lg-block`} aria-label="Admin navigation">
        <ul className={`${styles.navbarItems} ${styles.flexCol}`}>
          {menuItems.map((item) => renderMenuItem(item))}
          <div className={styles.spacer} aria-hidden></div>
          <li className={styles.navbarItem}>
            <button
              type="button"
              className={`${styles.navbarItemInner} ${styles.flexLeft} ${activeKey === 'tutorials' ? styles.navbarItemInnerActive : ''}`}
              onClick={() => router.push('/dashboard/videos')}
            >
              <div className={styles.iconWrapper}>
                <i className="bi bi-question-circle" aria-hidden />
              </div>
              <span className={styles.linkText}>{t('menu.help', 'Help')}</span>
            </button>
          </li>
          <li className={styles.navbarItem}>
            <button
              type="button"
              className={`${styles.navbarItemInner} ${styles.flexLeft}`}
              onClick={openSettingsModal}
            >
              <div className={styles.iconWrapper}>
                <i className="bi bi-gear" aria-hidden />
              </div>
              <span className={styles.linkText}>{t('layout.userSettings')}</span>
            </button>
          </li>
          <li className={styles.navbarItem}>
            <button
              type="button"
              className={`${styles.navbarItemInner} ${styles.flexLeft} text-danger`}
              onClick={handleSignOut}
            >
              <div className={styles.iconWrapper}>
                <i className="bi bi-box-arrow-right" aria-hidden />
              </div>
              <span className={styles.linkText}>{t('logout')}</span>
            </button>
          </li>
        </ul>
      </nav>

      <Offcanvas 
        show={showMobileMenu} 
        onHide={() => setShowMobileMenu(false)} 
        className="d-lg-none"
        placement={router.locale === 'ur' ? 'end' : 'start'}
      >
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>
            <i className="bi bi-list me-2"></i>
            {t('menu.menu')}
          </Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          <ListGroup variant="flush">
            {menuItems.map((item) => renderMobileItem(item))}
            <ListGroup.Item
              action
              onClick={() => {
                router.push('/dashboard/videos');
                setShowMobileMenu(false);
              }}
              className="d-flex align-items-center mt-2"
              style={{ fontSize: '1.05rem' }}
            >
              <i className="bi bi-question-circle me-2"></i>
              {t('menu.help', 'Help')}
            </ListGroup.Item>
            <ListGroup.Item
              action
              onClick={openSettingsModal}
              className="d-flex align-items-center mt-2"
              style={{ fontSize: '1.05rem' }}
            >
              <i className="bi bi-gear me-2"></i>
              {t('layout.userSettings')}
            </ListGroup.Item>

          </ListGroup>
          {/* Language Switcher */}
          <div className="mt-3 pt-3 border-top px-3 mb-4">
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
                  setShowMobileMenu(false);
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
                  setShowMobileMenu(false);
                }}
              >
                اردو
              </Button>
            </div>
          </div>

          {/* PWA Install Area — always visible if not standalone */}
          {!isStandalone && (
            <div className="px-3 mb-4">
              <Button
                variant="outline-primary"
                className="w-100 d-flex align-items-center justify-content-center py-2 fs-6 fw-bold"
                onClick={triggerPwaInstall}
              >
                <i className="bi bi-download me-2"></i>
                {t('layout.install', 'Install App')}
              </Button>
            </div>
          )}

          <div className="mt-3 pt-3 border-top">
            <div className="d-flex align-items-center mb-2 px-3 justify-content-between">
              <span className="text-muted small"><i className="bi bi-bell me-1"></i>{t('auto.notifications', 'Notifications')}:</span>
              <NotificationDropdown theme="light" />
            </div>
            <ListGroup>
              <ListGroup.Item
                action
                onClick={() => {
                  router.push('/messages');
                  setShowMobileMenu(false);
                }}
                className="d-flex align-items-center"
                style={{ fontSize: '1.05rem' }}
              >
                <i className="bi bi-envelope me-2"></i>
                {t('messages')}
              </ListGroup.Item>
            </ListGroup>
          </div>

          <div className="p-3 border-top mt-auto">
            <Button
              variant="danger"
              className="w-100 py-2 d-flex align-items-center justify-content-center"
              onClick={() => {
                handleSignOut();
                setShowMobileMenu(false);
              }}
            >
              <i className="bi bi-box-arrow-right me-2"></i>
              {t('logout', 'Sign Out')}
            </Button>
          </div>
        </Offcanvas.Body>
      </Offcanvas>

      {/* PWA Installation Instructions Modal */}
      <Modal show={showInstructionsModal} onHide={() => setShowInstructionsModal(false)} centered size="lg">
        <Modal.Header closeButton style={{ background: 'linear-gradient(135deg, #0d6efd, #6610f2)', color: '#fff', border: 'none' }}>
          <Modal.Title className="d-flex align-items-center gap-2">
            <i className="bi bi-phone"></i>
            {t('pwa.installTitle', 'Install AIMS App')}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-0">
          <Tabs
            activeKey={instructionsTab}
            onSelect={(k) => setInstructionsTab(k || 'android')}
            className="px-3 pt-3"
            fill
          >
            <Tab eventKey="android" title={<span><i className="bi bi-android2 me-1"></i> Android</span>}>
              <div className="p-4">
                <div className="d-flex align-items-center gap-2 mb-3">
                  <span style={{ width: 32, height: 32, borderRadius: '50%', background: '#34a853', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>1</span>
                  <span>{t('pwa.androidStep1', 'Open this page in Google Chrome browser.')}</span>
                </div>
                <div className="d-flex align-items-center gap-2 mb-3">
                  <span style={{ width: 32, height: 32, borderRadius: '50%', background: '#34a853', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>2</span>
                  <span>{t('pwa.androidStep2', 'Tap the three-dot menu (⋮) in the top-right corner.')}</span>
                </div>
                <div className="d-flex align-items-center gap-2 mb-3">
                  <span style={{ width: 32, height: 32, borderRadius: '50%', background: '#34a853', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>3</span>
                  <span>{t('pwa.androidStep3', 'Select "Install app" or "Add to Home screen".')}</span>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <span style={{ width: 32, height: 32, borderRadius: '50%', background: '#34a853', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>4</span>
                  <span>{t('pwa.androidStep4', 'Tap "Install" to confirm. The app icon will appear on your home screen.')}</span>
                </div>
              </div>
            </Tab>
            <Tab eventKey="ios" title={<span><i className="bi bi-apple me-1"></i> iOS</span>}>
              <div className="p-4">
                <div className="d-flex align-items-center gap-2 mb-3">
                  <span style={{ width: 32, height: 32, borderRadius: '50%', background: '#007aff', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>1</span>
                  <span>{t('pwa.iosStep1', 'Open this page in Safari browser (required for iOS).')}</span>
                </div>
                <div className="d-flex align-items-center gap-2 mb-3">
                  <span style={{ width: 32, height: 32, borderRadius: '50%', background: '#007aff', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>2</span>
                  <span>{t('pwa.iosStep2', 'Tap the Share button (square with an upward arrow) at the bottom.')}</span>
                </div>
                <div className="d-flex align-items-center gap-2 mb-3">
                  <span style={{ width: 32, height: 32, borderRadius: '50%', background: '#007aff', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>3</span>
                  <span>{t('pwa.iosStep3', 'Scroll down and tap "Add to Home Screen".')}</span>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <span style={{ width: 32, height: 32, borderRadius: '50%', background: '#007aff', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>4</span>
                  <span>{t('pwa.iosStep4', 'Tap "Add" to confirm. The app icon will appear on your home screen.')}</span>
                </div>
                <Alert variant="info" className="mt-3 small">
                  <i className="bi bi-info-circle me-1"></i>
                  {t('pwa.iosNote', 'Note: On iOS, the app can only be installed via Safari. Other browsers like Chrome for iOS do not support PWA installation.')}
                </Alert>
              </div>
            </Tab>
            <Tab eventKey="desktop" title={<span><i className="bi bi-laptop me-1"></i> Desktop</span>}>
              <div className="p-4">
                <div className="d-flex align-items-center gap-2 mb-3">
                  <span style={{ width: 32, height: 32, borderRadius: '50%', background: '#5b21b6', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>1</span>
                  <span>{t('pwa.desktopStep1', 'Open this page in Google Chrome or Microsoft Edge.')}</span>
                </div>
                <div className="d-flex align-items-center gap-2 mb-3">
                  <span style={{ width: 32, height: 32, borderRadius: '50%', background: '#5b21b6', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>2</span>
                  <span>{t('pwa.desktopStep2', 'Look for the install icon (⊕) in the address bar on the right side.')}</span>
                </div>
                <div className="d-flex align-items-center gap-2 mb-3">
                  <span style={{ width: 32, height: 32, borderRadius: '50%', background: '#5b21b6', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>3</span>
                  <span>{t('pwa.desktopStep3', 'Click it and select "Install" in the popup.')}</span>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <span style={{ width: 32, height: 32, borderRadius: '50%', background: '#5b21b6', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>4</span>
                  <span>{t('pwa.desktopStep4', 'The app will open in its own window and appear in your apps list.')}</span>
                </div>
              </div>
            </Tab>
          </Tabs>
        </Modal.Body>
        <Modal.Footer className="border-0 pt-0">
          <Button variant="secondary" onClick={() => setShowInstructionsModal(false)}>
            {t('pwa.close', 'Close')}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

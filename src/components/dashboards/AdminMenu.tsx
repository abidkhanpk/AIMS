import { useEffect, useState } from 'react';
import { Offcanvas, ListGroup } from 'react-bootstrap';
import { useRouter } from 'next/router';
import NotificationDropdown from '../NotificationDropdown';
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
    label: 'Home',
    icon: 'bi-house',
  },
  {
    key: 'individuals',
    label: 'Individuals',
    icon: 'bi-people',
    children: [
      { key: 'teachers', label: 'Teachers', icon: 'bi-person-workspace' },
      { key: 'parents', label: 'Relatives', icon: 'bi-people' },
      { key: 'students', label: 'Students', icon: 'bi-mortarboard' },
    ],
  },
  {
    key: 'academic',
    label: 'Academic',
    icon: 'bi-mortarboard',
    children: [
      { key: 'progress', label: 'Progress', icon: 'bi-graph-up' },
      { key: 'tests', label: 'Tests & Exams', icon: 'bi-journal-check' },
    ],
  },
  {
    key: 'financials',
    label: 'Financials',
    icon: 'bi-cash-stack',
    children: [
      { key: 'fees', label: 'Fee', icon: 'bi-cash-coin' },
      { key: 'fee-verification', label: 'Fee Verification', icon: 'bi-check-circle' },
      { key: 'salaries', label: 'Salaries', icon: 'bi-wallet2' },
    ],
  },
  {
    key: 'parent-remarks',
    label: 'Parent Remarks',
    icon: 'bi-chat-dots',
  },
];

export default function AdminMenu({ activeKey, onSelect }: { activeKey: string; onSelect: (key: string) => void }) {
  const router = useRouter();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [mobileGroups, setMobileGroups] = useState<Record<string, boolean>>({});

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
            <span className={styles.linkText}>{item.label}</span>
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
            {item.label}
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
                {child.label}
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
              className={`${styles.navbarItemInner} ${styles.flexLeft}`}
              onClick={openSettingsModal}
            >
              <div className={styles.iconWrapper}>
                <i className="bi bi-gear" aria-hidden />
              </div>
              <span className={styles.linkText}>Settings</span>
            </button>
          </li>
        </ul>
      </nav>

      <Offcanvas show={showMobileMenu} onHide={() => setShowMobileMenu(false)} className="d-lg-none">
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>
            <i className="bi bi-list me-2"></i>
            Menu
          </Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          <ListGroup variant="flush">
            {menuItems.map((item) => renderMobileItem(item))}
            <ListGroup.Item
              action
              onClick={openSettingsModal}
              className="d-flex align-items-center mt-2"
              style={{ fontSize: '1.05rem' }}
            >
              <i className="bi bi-gear me-2"></i>
              Settings
            </ListGroup.Item>
          </ListGroup>
          <div className="mt-3 pt-3 border-top">
            <div className="d-flex align-items-center mb-2">
              <NotificationDropdown />
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
                Messages
              </ListGroup.Item>
            </ListGroup>
          </div>
        </Offcanvas.Body>
      </Offcanvas>
    </>
  );
}

import Link from 'next/link';
import { useEffect, useState } from 'react';
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
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Keep parent group open when a child is active
    const defaults: Record<string, boolean> = {};
    menuItems.forEach((item) => {
      if (item.children?.some((child) => child.key === activeKey)) {
        defaults[item.key] = true;
      }
    });
    setOpenGroups((prev) => ({ ...prev, ...defaults }));
  }, [activeKey]);

  const renderMenuItem = (item: MenuItem, isChild = false) => {
    const hasChildren = Array.isArray(item.children) && item.children.length > 0;
    const childActive = item.children?.some((child) => child.key === activeKey);
    const isActive = activeKey === item.key || childActive;
    const expanded = hasChildren && (openGroups[item.key] ?? childActive);

    const handleClick = () => {
      if (hasChildren) {
        setOpenGroups({ [item.key]: !expanded });
        if (!expanded) {
          onSelect(item.children?.[0]?.key || item.key);
        }
      } else {
        onSelect(item.key);
      }
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

  return (
    <nav className={styles.navbar} aria-label="Admin navigation">
      <ul className={`${styles.navbarItems} ${styles.flexCol}`}>
        {menuItems.map((item) => renderMenuItem(item))}
        <li className={styles.navbarItem}>
          <Link href="/" className={`${styles.navbarItemInner} ${styles.flexLeft}`}>
            <div className={styles.iconWrapper}>
              <i className="bi bi-arrow-left-circle" aria-hidden />
            </div>
            <span className={styles.linkText}>Back to Site</span>
          </Link>
        </li>
      </ul>
    </nav>
  );
}

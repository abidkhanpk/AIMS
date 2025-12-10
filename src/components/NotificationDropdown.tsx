import { useState, useEffect } from 'react';
import { Dropdown, Badge, Button, Spinner } from 'react-bootstrap';
import { useRouter } from 'next/router';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  sender: {
    name: string;
    role: string;
  };
}

export default function NotificationDropdown() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    fetchNotifications();
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId }),
      });

      if (res.ok) {
        setNotifications(prev => 
          prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/notifications/mark-all-read', {
        method: 'PUT',
      });

      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    } finally {
      setLoading(false);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'PARENT_REMARK':
        return 'bi-chat-dots text-info';
      case 'PROGRESS_UPDATE':
        return 'bi-graph-up text-success';
      case 'SYSTEM_ALERT':
        return 'bi-exclamation-triangle text-warning';
      case 'FEE_DUE':
        return 'bi-credit-card text-warning';
      case 'FEE_PAID':
        return 'bi-check-circle text-success';
      case 'SALARY_PAID':
        return 'bi-cash text-success';
      case 'SUBSCRIPTION_DUE':
        return 'bi-calendar-x text-warning';
      case 'SUBSCRIPTION_PAID':
        return 'bi-check-circle text-success';
      case 'PAYMENT_PROCESSING':
        return 'bi-clock text-info';
      case 'PAYMENT_VERIFIED':
        return 'bi-check-circle text-success';
      default:
        return 'bi-bell text-primary';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const navigateForNotification = (notification: Notification) => {
    // Minimal routing: send the user to the most relevant page for this notification type
    const type = notification.type;
    if (['FEE_DUE', 'FEE_PAID', 'PAYMENT_PROCESSING', 'PAYMENT_VERIFIED'].includes(type)) {
      router.push('/dashboard/fees');
      return;
    }
    if (['PARENT_REMARK', 'PROGRESS_UPDATE'].includes(type)) {
      router.push('/dashboard/parent-remarks');
      return;
    }
    if (['SALARY_PAID'].includes(type)) {
      router.push('/dashboard/salaries');
      return;
    }
    if (['SUBSCRIPTION_DUE', 'SUBSCRIPTION_PAID'].includes(type)) {
      router.push('/dashboard');
      return;
    }
    if (['SYSTEM_ALERT'].includes(type)) {
      router.push('/dashboard');
      return;
    }

    // Default: go to dashboard
    router.push('/dashboard');
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }
    navigateForNotification(notification);
    setShow(false);
  };

  return (
    <Dropdown show={show} onToggle={setShow} align="end">
      <Dropdown.Toggle
        as="button"
        className="btn btn-link text-light position-relative p-2 border-0"
        style={{ background: 'none' }}
      >
        <i className="bi bi-bell fs-5"></i>
        {unreadCount > 0 && (
          <Badge 
            bg="danger" 
            className="position-absolute rounded-pill"
            style={{ 
              fontSize: '0.65rem',
              top: '2px',
              right: '2px',
              transform: 'translate(25%, -25%)',
              minWidth: '18px',
              height: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Dropdown.Toggle>

      <Dropdown.Menu className="shadow-lg" style={{ width: '350px', maxHeight: '400px', overflowY: 'auto' }}>
        <div className="d-flex justify-content-between align-items-center px-3 py-2 border-bottom">
          <h6 className="mb-0">Notifications</h6>
          {unreadCount > 0 && (
            <Button
              variant="link"
              size="sm"
              className="p-0 text-decoration-none"
              onClick={markAllAsRead}
              disabled={loading}
            >
              {loading ? (
                <Spinner animation="border" size="sm" />
              ) : (
                'Mark all read'
              )}
            </Button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="text-center py-4 text-muted">
            <i className="bi bi-bell-slash display-6"></i>
            <p className="mt-2 mb-0">No notifications</p>
          </div>
        ) : (
          <div>
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`px-3 py-2 border-bottom notification-item ${
                  !notification.isRead ? 'bg-light' : ''
                }`}
                style={{ cursor: 'pointer' }}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="d-flex align-items-start">
                  <div className="me-2 mt-1">
                    <i className={`${getNotificationIcon(notification.type)} fs-5`}></i>
                  </div>
                  <div className="flex-grow-1">
                    <div className="d-flex justify-content-between align-items-start">
                      <h6 className={`mb-1 ${!notification.isRead ? 'fw-bold' : ''}`}>
                        {notification.title}
                      </h6>
                      {!notification.isRead && (
                        <div className="bg-primary rounded-circle" style={{ width: '8px', height: '8px' }}></div>
                      )}
                    </div>
                    <p className="mb-1 small text-muted">{notification.message}</p>
                    <div className="d-flex justify-content-between align-items-center">
                      <small className="text-muted">
                        From: {notification.sender.name} ({notification.sender.role})
                      </small>
                      <small className="text-muted">
                        {formatTimeAgo(notification.createdAt)}
                      </small>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Dropdown.Menu>
    </Dropdown>
  );
}

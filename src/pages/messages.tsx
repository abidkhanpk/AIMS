import { serverSideTranslations } from 'next-i18next/pages/serverSideTranslations';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { Card, Table, Alert, Spinner, Badge } from 'react-bootstrap';
import { useSession } from 'next-auth/react';
import MessageThreadModal, { MessageItem } from '../components/messages/MessageThreadModal';
import DirectMessageModal from '../components/messages/DirectMessageModal';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/router';
import AdminMenu from '../components/dashboards/AdminMenu';
import menuStyles from '../components/dashboards/AdminMenu.module.css';

function buildThreads(messagesList: any[], currentUserId?: string | null) {
  const map = new Map<
    string,
    {
      threadId: string;
      subject: string;
      messages: any[];
      other: any | null;
      lastDate: string;
      unreadCount: number;
    }
  >();
  for (const msg of messagesList) {
    const existing = map.get(msg.threadId) || {
      threadId: msg.threadId,
      subject: msg.subject || 'No subject',
      messages: [] as any[],
      other: null,
      lastDate: msg.createdAt,
      unreadCount: 0,
    };
    existing.messages.push(msg);
    if (new Date(msg.createdAt).getTime() > new Date(existing.lastDate).getTime()) {
      existing.lastDate = msg.createdAt;
    }
    const other = msg.senderId === currentUserId ? msg.receiver : msg.sender;
    existing.other = other || existing.other;
    if (msg.receiverId === currentUserId && !msg.isRead) {
      existing.unreadCount += 1;
    }
    map.set(msg.threadId, existing);
  }
  return Array.from(map.values()).sort((a, b) => new Date(b.lastDate).getTime() - new Date(a.lastDate).getTime());
}

export default function MessagesPage() {
    const { t } = useTranslation('common');
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;
  const userRole = session?.user?.role;
  const router = useRouter();
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showThreadModal, setShowThreadModal] = useState(false);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedMessages, setSelectedMessages] = useState<MessageItem[]>([]);
  const [selectedOther, setSelectedOther] = useState<{ id: string; name?: string } | null>(null);
  const [showComposer, setShowComposer] = useState(false);
  const [composerTarget, setComposerTarget] = useState<{ id: string | null; name?: string; subject?: string; threadId?: string }>({ id: null });

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/messages');
      if (res.ok) {
        const data = await res.json();
        setMessages(Array.isArray(data) ? data : []);
        return Array.isArray(data) ? data : [];
      } else {
        setError(t('auto.failedToLoadMessages', `Failed to load messages`));
      }
    } catch (err) {
      setError(t('auto.failedToLoadMessages', `Failed to load messages`));
    } finally {
      setLoading(false);
    }
    return [];
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(() => {
      fetchMessages();
    }, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const threads = useMemo(() => buildThreads(messages, currentUserId), [messages, currentUserId]);

  const syncSelectedThread = useCallback((threadId: string | null, list: any[]) => {
    if (!threadId) return;
    const built = buildThreads(list, currentUserId);
    const thread = built.find((t) => t.threadId === threadId);
    if (!thread) return;
    const sorted = [...thread.messages].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const formatted: MessageItem[] = sorted.map((m) => ({
      id: m.id,
      content: m.content,
      createdAt: m.createdAt,
      author: {
        id: m.sender?.id,
        name: m.sender?.name,
        role: m.sender?.role,
      },
    }));
    setSelectedSubject(thread.subject || 'No subject');
    setSelectedMessages(formatted);
    setSelectedOther(thread.other ? { id: thread.other.id, name: thread.other.name } : null);
  }, [currentUserId]);

  const openThread = async (threadId: string) => {
    setSelectedThreadId(threadId);
    setShowThreadModal(true);
    await fetch('/api/messages/mark-read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ threadId }),
    });
    const data = await fetchMessages();
    syncSelectedThread(threadId, data);
  };

  useEffect(() => {
    if (selectedThreadId) {
      syncSelectedThread(selectedThreadId, messages);
    }
  }, [messages, selectedThreadId, syncSelectedThread]);

  const handleReply = async (content: string) => {
    if (!selectedOther?.id || !selectedSubject || !selectedThreadId) return false;
    try {
      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiverId: selectedOther.id,
          content,
          subject: selectedSubject,
          threadId: selectedThreadId,
        }),
      });
      if (res.ok) {
        const data = await fetchMessages();
        syncSelectedThread(selectedThreadId, data);
        return true;
      }
      const err = await res.json();
      setError(err.message || 'Failed to send reply');
      return false;
    } catch (e) {
      setError(t('auto.failedToSendReply', `Failed to send reply`));
      return false;
    }
  };

  const handleSelect = (key?: string | null) => {
    if (!key || key === 'messages') return;
    if (key === 'home') {
      router.push('/dashboard');
      return;
    }
    const routeMap: Record<string, string> = {
      teachers: '/dashboard/teachers',
      parents: '/dashboard/parents',
      students: '/dashboard/students',
      progress: '/dashboard/progress',
      tests: '/dashboard/tests',
      'parent-remarks': '/dashboard/parent-remarks',
      remarks: '/dashboard/parent-remarks',
      fees: '/dashboard/fees',
      'fee-verification': '/dashboard/fee-verification',
      salaries: '/dashboard/salaries',
      subjects: '/dashboard/subjects',
      'attendance-reports': '/dashboard/attendance-reports',
      'report-cards': '/dashboard/report-cards',
    };
    router.push(routeMap[key] || `/dashboard?tab=${key}`);
  };

  const pageContent = (
    <div className={userRole === 'ADMIN' ? 'container-fluid py-4' : 'container py-4'}>
      <h1 className="h4 mb-4">
        <i className="bi bi-envelope me-2"></i>
        {t('auto.messages', `Messages`)}
                    </h1>

      {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}

      <Card>
        <Card.Header className="d-flex justify-content-between align-items-center">
          <div>
            <span className="me-3 fw-bold">{t('auto.inbox', `Inbox`)}</span>
            <button 
              className="btn btn-primary btn-sm"
              onClick={() => {
                setComposerTarget({ id: null, subject: '' });
                setShowComposer(true);
              }}
            >
              <i className="bi bi-pencil-square me-1"></i> {t('auto.newMessage', `New Message`)}
                                      </button>
          </div>
          <span className="text-muted small">{threads.length} {t('auto.thread', `thread`)}{threads.length === 1 ? '' : 's'}</span>
        </Card.Header>
        <Card.Body className="p-0">
          {loading ? (
            <div className="text-center py-4">
              <Spinner animation="border" size="sm" />
            </div>
          ) : threads.length === 0 ? (
            <div className="text-center py-4 text-muted">{t('auto.noMessages', `No messages`)}</div>
          ) : (
            <div className="table-responsive">
              <Table hover size="sm" className="mb-0">
                <thead className="table-light">
                  <tr>
                    <th>{t('auto.fromTo', `From / To`)}</th>
                    <th>{t('auto.role', `Role`)}</th>
                    <th>{t('auto.subject', `Subject`)}</th>
                    <th>{t('auto.date', `Date`)}</th>
                    <th>{t('auto.status', `Status`)}</th>
                  </tr>
                </thead>
                <tbody>
                  {threads.map((thread) => {
                    const other = thread.other;
                    return (
                      <tr key={thread.threadId} role="button" onClick={() => openThread(thread.threadId)}>
                        <td className="fw-semibold">
                          {other?.name || 'User'}
                        </td>
                        <td className="text-muted small">{other?.role || '-'}</td>
                        <td className="small">{thread.subject || 'No subject'}</td>
                        <td className="text-muted small">{new Date(thread.lastDate).toLocaleString()}</td>
                        <td>
                          {thread.unreadCount > 0 ? (
                            <Badge bg="danger">{thread.unreadCount} {t('auto.new', `new`)}</Badge>
                          ) : (
                            <Badge bg="secondary">{t('auto.read', `Read`)}</Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>

      <MessageThreadModal
        show={showThreadModal}
        onHide={() => setShowThreadModal(false)}
        title={`${selectedOther?.name || 'User'}: ${selectedSubject || 'No subject'}`}
        messages={selectedMessages}
        currentUserId={currentUserId}
        onReply={handleReply}
        onRefresh={fetchMessages}
        onMessageUser={(id, name) => {
          setComposerTarget({ id: id || null, name: name || undefined, subject: selectedSubject, threadId: selectedThreadId || undefined });
          setShowComposer(true);
        }}
      />

      <DirectMessageModal
        show={showComposer}
        onHide={() => setShowComposer(false)}
        targetId={composerTarget.id}
        targetName={composerTarget.name}
        subject={composerTarget.subject}
        threadId={composerTarget.threadId}
        onSent={() => {
          setShowComposer(false);
          fetchMessages();
        }}
      />
    </div>
  );

  if (userRole === 'ADMIN') {
    return (
      <div className={menuStyles.menuShell}>
        <div className={menuStyles.menuLayout}>
          <AdminMenu activeKey="messages" onSelect={handleSelect} />
          <div className={menuStyles.mainContent}>
            {pageContent}
          </div>
        </div>
      </div>
    );
  }

  return pageContent;
}

export const getStaticProps = async ({ locale }: any) => ({
  props: {
    ...(await serverSideTranslations(locale ?? 'en', ['common'])),
  },
});

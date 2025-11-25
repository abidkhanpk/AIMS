import { useEffect, useState, useMemo } from 'react';
import { Card, Table, Alert, Spinner, Badge } from 'react-bootstrap';
import { useSession } from 'next-auth/react';
import MessageThreadModal, { MessageItem } from '../components/messages/MessageThreadModal';
import DirectMessageModal from '../components/messages/DirectMessageModal';

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
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;
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
        setError('Failed to load messages');
      }
    } catch (err) {
      setError('Failed to load messages');
    } finally {
      setLoading(false);
    }
    return [];
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  const threads = useMemo(() => buildThreads(messages, currentUserId), [messages, currentUserId]);

  const syncSelectedThread = (threadId: string | null, list: any[]) => {
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
  };

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
  }, [messages, selectedThreadId]);

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
      setError('Failed to send reply');
      return false;
    }
  };

  return (
    <div className="container py-4">
      <h1 className="h4 mb-4">
        <i className="bi bi-envelope me-2"></i>
        Messages
      </h1>

      {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}

      <Card>
        <Card.Header className="d-flex justify-content-between align-items-center">
          <span>Inbox</span>
          <span className="text-muted small">{threads.length} thread{threads.length === 1 ? '' : 's'}</span>
        </Card.Header>
        <Card.Body className="p-0">
          {loading ? (
            <div className="text-center py-4">
              <Spinner animation="border" size="sm" />
            </div>
          ) : threads.length === 0 ? (
            <div className="text-center py-4 text-muted">No messages</div>
          ) : (
            <div className="table-responsive">
              <Table hover size="sm" className="mb-0">
                <thead className="table-light">
                  <tr>
                    <th>From / To</th>
                    <th>Role</th>
                    <th>Subject</th>
                    <th>Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {threads.map((t) => {
                    const other = t.other;
                    return (
                      <tr key={t.threadId} role="button" onClick={() => openThread(t.threadId)}>
                        <td className="fw-semibold">
                          {other?.name || 'User'}
                        </td>
                        <td className="text-muted small">{other?.role || '-'}</td>
                        <td className="small">{t.subject || 'No subject'}</td>
                        <td className="text-muted small">{new Date(t.lastDate).toLocaleString()}</td>
                        <td>
                          {t.unreadCount > 0 ? (
                            <Badge bg="danger">{t.unreadCount} new</Badge>
                          ) : (
                            <Badge bg="secondary">Read</Badge>
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
}

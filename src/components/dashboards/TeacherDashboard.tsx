import { useState, useEffect, useCallback } from 'react';
import { Card, Row, Col, Table, Badge, Form, Button, Modal, Alert, Spinner, Tabs, Tab, InputGroup } from 'react-bootstrap';
import { AttendanceStatus, AssessmentType } from '@prisma/client';
import { useSession } from 'next-auth/react';
import RemarkThreadModal from '../remarks/RemarkThreadModal';
import DirectMessageModal from '../messages/DirectMessageModal';

interface Student {
  id: string;
  name: string;
  email: string;
  studentCourses: {
    course: {
      id: string;
      name: string;
      description: string;
    };
  }[];
  progressRecords: {
    id: string;
    date: string;
    lesson: string;
    homework: string;
    lessonProgress: number;
    remarks: string;
    attendance: AttendanceStatus;
    createdAt: string;
    course: {
      id: string;
      name: string;
    };
    parentRemarks: {
      id: string;
      remark: string;
      createdAt: string;
      parent: {
        name: string;
      };
    }[];
  }[];
  testRecords: TestRecord[];
}

interface TestRecord {
  id: string;
  title: string;
  type: AssessmentType;
  performedAt: string;
  maxMarks: number;
  obtainedMarks: number;
  percentage: number;
  performanceNote?: string | null;
  remarks?: string | null;
  course: {
    id: string;
    name: string;
  };
  teacher: {
    id: string;
    name: string;
  };
}

// Expandable Text Component
function ExpandableText({ text, maxLength = 50 }: { text: string; maxLength?: number }) {
  const [expanded, setExpanded] = useState(false);
  
  if (!text || text.length <= maxLength) {
    return <span>{text || '-'}</span>;
  }

  return (
    <span>
      {expanded ? text : `${text.substring(0, maxLength)}...`}
      <Button
        variant="link"
        size="sm"
        className="p-0 ms-1"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? 'Show less' : 'Show more'}
      </Button>
    </span>
  );
}

export default function TeacherDashboard() {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;

  const findProgressInList = (list: Student[], progressId: string) => {
    for (const student of list) {
      if (!student.progressRecords) continue;
      const match = student.progressRecords.find((p: any) => p.id === progressId);
      if (match) return match;
    }
    return null;
  };
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('progress');

  // Progress update modal states
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [progressDate, setProgressDate] = useState(new Date().toISOString().split('T')[0]);
  const [lesson, setLesson] = useState('');
  const [homework, setHomework] = useState('');
  const [lessonProgress, setLessonProgress] = useState('');
  const [remarks, setRemarks] = useState('');
  const [attendance, setAttendance] = useState<AttendanceStatus>('PRESENT');
  const [updatingProgress, setUpdatingProgress] = useState(false);
  const [editingProgressId, setEditingProgressId] = useState<string | null>(null);

  // Parent remarks modal states
  const [showRemarksModal, setShowRemarksModal] = useState(false);
  const [selectedRemarks, setSelectedRemarks] = useState<any[]>([]);
  const [selectedProgressId, setSelectedProgressId] = useState<string | null>(null);
  const [threadTitle, setThreadTitle] = useState('');

  // Test modal states
  const [showTestModal, setShowTestModal] = useState(false);
  const [selectedTestStudent, setSelectedTestStudent] = useState<Student | null>(null);
  const [selectedTestCourse, setSelectedTestCourse] = useState('');
  const [testTitle, setTestTitle] = useState('');
  const [testType, setTestType] = useState<AssessmentType>('QUIZ');
  const [performedAt, setPerformedAt] = useState(new Date().toISOString().split('T')[0]);
  const [maxMarks, setMaxMarks] = useState('');
  const [obtainedMarks, setObtainedMarks] = useState('');
  const [performanceNote, setPerformanceNote] = useState('');
  const [testRemarks, setTestRemarks] = useState('');
  const [savingTest, setSavingTest] = useState(false);
  const [editingTestId, setEditingTestId] = useState<string | null>(null);

  // Direct message modal
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatTargetId, setChatTargetId] = useState<string | null>(null);
  const [chatTargetName, setChatTargetName] = useState('');

  const fetchAssignedStudents = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent;
    try {
      if (!silent) setLoading(true);
      const res = await fetch('/api/users/assigned-students');
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        setStudents(list);
        // Refresh open thread if needed
        if (showRemarksModal && selectedProgressId) {
          const match = findProgressInList(list, selectedProgressId);
          if (match) {
            setSelectedRemarks(match.parentRemarks || []);
          }
        }
        return list;
      } else {
        setError('Failed to fetch assigned students');
        setStudents([]);
      }
    } catch (error) {
      setError('Error fetching assigned students');
      setStudents([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [showRemarksModal, selectedProgressId]);

  useEffect(() => {
    fetchAssignedStudents();
  }, [fetchAssignedStudents]);

  const handleUpdateProgress = (student: Student) => {
    setSelectedStudent(student);
    setSelectedCourse('');
    setProgressDate(new Date().toISOString().split('T')[0]);
    setLesson('');
    setHomework('');
    setLessonProgress('');
    setRemarks('');
    setAttendance('PRESENT');
    setEditingProgressId(null);
    setShowProgressModal(true);
  };

  const handleEditProgress = (student: Student, progress: any) => {
    setSelectedStudent(student);
    setSelectedCourse(progress.course.id);
    setProgressDate(progress.date ? progress.date.split('T')[0] : new Date().toISOString().split('T')[0]);
    setLesson(progress.lesson || '');
    setHomework(progress.homework || '');
    setLessonProgress(progress.lessonProgress !== null && progress.lessonProgress !== undefined ? String(progress.lessonProgress) : '');
    setRemarks(progress.remarks || '');
    setAttendance(progress.attendance || 'PRESENT');
    setEditingProgressId(progress.id);
    setShowProgressModal(true);
  };

  const handleAddTest = (student: Student) => {
    setSelectedTestStudent(student);
    setSelectedTestCourse('');
    setTestTitle('');
    setTestType('QUIZ');
    setPerformedAt(new Date().toISOString().split('T')[0]);
    setMaxMarks('');
    setObtainedMarks('');
    setPerformanceNote('');
    setTestRemarks('');
    setEditingTestId(null);
    setShowTestModal(true);
  };

  const handleSubmitProgress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !selectedCourse) return;

    setUpdatingProgress(true);
    setError('');
    setSuccess('');

    const payload = {
      studentId: selectedStudent.id,
      courseId: selectedCourse,
      date: progressDate,
      lesson: lesson || null,
      homework: homework || null,
      lessonProgress: lessonProgress ? parseFloat(lessonProgress) : null,
      remarks: remarks || null,
      attendance: attendance,
    };

    try {
      const res = await fetch(editingProgressId ? '/api/progress/edit' : '/api/progress/update', {
        method: editingProgressId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          editingProgressId
            ? { ...payload, id: editingProgressId }
            : payload
        ),
      });

      if (res.ok) {
        setSuccess(editingProgressId ? 'Progress edited successfully!' : 'Progress updated successfully!');
        setShowProgressModal(false);
        setEditingProgressId(null);
        fetchAssignedStudents(); // Refresh data
      } else {
        const errorData = await res.json();
        setError(errorData.message || 'Failed to update progress');
      }
    } catch (error) {
      setError('Error updating progress');
    } finally {
      setUpdatingProgress(false);
    }
  };

  const computedPercentage = () => {
    const max = parseFloat(maxMarks);
    const obtained = parseFloat(obtainedMarks);
    if (Number.isNaN(max) || max <= 0 || Number.isNaN(obtained) || obtained < 0) return null;
    return Math.max(0, Math.min(100, (obtained / max) * 100));
  };

  const handleSubmitTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTestStudent || !selectedTestCourse) return;

    setSavingTest(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(editingTestId ? '/api/tests/edit' : '/api/tests/records', {
        method: editingTestId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingTestId || undefined,
          studentId: selectedTestStudent.id,
          courseId: selectedTestCourse,
          title: testTitle,
          type: testType,
          performedAt,
          maxMarks,
          obtainedMarks,
          performanceNote,
          remarks: testRemarks,
        }),
      });

      if (res.ok) {
        setSuccess(editingTestId ? 'Test/Exam updated successfully!' : 'Test/Exam recorded successfully!');
        setShowTestModal(false);
        setEditingTestId(null);
        fetchAssignedStudents();
      } else {
        const errorData = await res.json();
        setError(errorData.message || 'Failed to record test');
      }
    } catch (err) {
      setError('Error recording test');
    } finally {
      setSavingTest(false);
    }
  };

  const handleEditTest = (student: Student, test: TestRecord) => {
    setSelectedTestStudent(student);
    setSelectedTestCourse(test.course.id);
    setTestTitle(test.title);
    setTestType(test.type);
    setPerformedAt(test.performedAt ? test.performedAt.split('T')[0] : new Date().toISOString().split('T')[0]);
    setMaxMarks(String(test.maxMarks));
    setObtainedMarks(String(test.obtainedMarks));
    setPerformanceNote(test.performanceNote || '');
    setTestRemarks(test.remarks || '');
    setEditingTestId(test.id);
    setShowTestModal(true);
  };

  const buildThreadTitle = (progress: any, studentName: string) => {
    const teacherName = progress.teacher?.name || session?.user?.name || 'Teacher';
    const courseName = progress.course?.name || 'Subject';
    const dateLabel = progress.date ? new Date(progress.date).toLocaleDateString() : '';
    const studentLabel = studentName || 'Student';
    return `${teacherName}: Progress of ${studentLabel} for ${courseName}${dateLabel ? ` on ${dateLabel}` : ''}`;
  };

  const handleViewParentRemarks = (progress: any, studentName: string) => {
    setSelectedRemarks(progress.parentRemarks || []);
    setSelectedProgressId(progress.id);
    setThreadTitle(buildThreadTitle(progress, studentName));
    setShowRemarksModal(true);
  };

  const handleSendReply = async (remarkId: string, content: string) => {
    if (!remarkId || !content.trim()) return false;
    try {
      const res = await fetch('/api/progress/remark-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remarkId, content: content.trim() }),
      });
      if (res.ok) {
        const newReply = await res.json();
        // Update local thread view immediately
        setSelectedRemarks((prev) =>
          prev.map((r: any) =>
            r.id === newReply.remarkId
              ? { ...r, replies: [...(r.replies || []), newReply] }
              : r
          )
        );
        const list = await fetchAssignedStudents({ silent: true });
        if (list && selectedProgressId) {
          const match = findProgressInList(list, selectedProgressId);
          if (match) setSelectedRemarks(match.parentRemarks || []);
        }
        setSuccess('Reply posted');
        return true;
      } else {
        const err = await res.json();
        setError(err.message || 'Failed to post reply');
        return false;
      }
    } catch (err) {
      setError('Failed to post reply');
      return false;
    }
  };

  const openChat = (id?: string, name?: string) => {
    if (!id) return;
    setChatTargetId(id);
    setChatTargetName(name || '');
    setShowChatModal(true);
  };

  const refreshSelectedThread = async () => {
    const list = await fetchAssignedStudents({ silent: true });
    if (list && selectedProgressId) {
      const match = findProgressInList(list, selectedProgressId);
      if (match) setSelectedRemarks(match.parentRemarks || []);
    }
  };

  const handleSendChat = async (content: string) => {
    if (!chatTargetId || !content.trim()) return;
    try {
      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiverId: chatTargetId, content: content.trim() }),
      });
      if (res.ok) {
        setShowChatModal(false);
        setSuccess('Message sent');
      } else {
        const err = await res.json();
        setError(err.message || 'Failed to send message');
      }
    } catch (err) {
      setError('Failed to send message');
    }
  };

  const getAttendanceBadge = (attendance: AttendanceStatus) => {
    switch (attendance) {
      case 'PRESENT':
        return <Badge bg="success">Present</Badge>;
      case 'ABSENT':
        return <Badge bg="danger">Absent</Badge>;
      case 'LATE':
        return <Badge bg="warning">Late</Badge>;
      case 'EXCUSED':
        return <Badge bg="info">Excused</Badge>;
      default:
        return <Badge bg="secondary">{attendance}</Badge>;
    }
  };

  const formatTestType = (type: AssessmentType) => {
    switch (type) {
      case 'EXAM':
        return { label: 'Exam', variant: 'danger' as const };
      case 'HOMEWORK':
        return { label: 'Homework', variant: 'secondary' as const };
      case 'OTHER':
        return { label: 'Other', variant: 'info' as const };
      default:
        return { label: 'Quiz', variant: 'info' as const };
    }
  };

  const getLatestMyReply = (progress: any) => {
    if (!progress.parentRemarks || !currentUserId) return null;
    const replies = progress.parentRemarks.flatMap((r: any) =>
      (r.replies || []).map((reply: any) => ({ ...reply, remarkId: r.id }))
    );
    const mine = replies.filter((r: any) => r.author?.id === currentUserId);
    if (!mine.length) return null;
    return mine.sort(
      (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" />
        <p className="mt-2 text-muted">Loading your assigned students...</p>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      <div className="row mb-4">
        <div className="col-12">
          <h1 className="h2 mb-0">
            <i className="bi bi-person-workspace me-2 text-success"></i>
            Teacher Dashboard
          </h1>
          <p className="text-muted">Manage your assigned students, track their progress, and record attendance</p>
        </div>
      </div>

      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

      <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k || 'progress')} className="mb-4">
        <Tab 
          eventKey="progress" 
          title={
            <span>
              <i className="bi bi-graph-up me-2"></i>
              Progress & Attendance
            </span>
          }
        >
          {!students || students.length === 0 ? (
            <Card className="text-center py-5">
              <Card.Body>
                <i className="bi bi-people display-4 text-muted"></i>
                <h4 className="mt-3 text-muted">No Students Assigned</h4>
                <p className="text-muted">You don&apos;t have any students assigned to you yet. Please contact your administrator.</p>
              </Card.Body>
            </Card>
          ) : (
            <Row className="g-4">
              {students.map((student) => (
                <Col key={student.id} xl={12}>
                  <Card className="shadow-sm">
                    <Card.Header className="bg-light">
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <h5
                            className="mb-0 fw-bold"
                            role="button"
                            onClick={() => openChat(student.id, student.name)}
                          >
                            {student.name}
                          </h5>
                          <small className="text-muted">{student.email}</small>
                        </div>
                        <Button
                          variant="success"
                          size="sm"
                          onClick={() => handleUpdateProgress(student)}
                        >
                          <i className="bi bi-plus-circle me-1"></i>
                          Add Progress & Attendance
                        </Button>
                      </div>
                    </Card.Header>
                    <Card.Body className="p-0">
                      {!student.studentCourses || student.studentCourses.length === 0 ? (
                        <div className="text-center py-3">
                          <small className="text-muted">No subjects assigned</small>
                        </div>
                      ) : (
                        <div className="table-responsive">
                          <Table className="mb-0">
                            <thead className="table-light small">
                              <tr>
                                <th>Date</th>
                                <th>Course</th>
                                <th>Attendance</th>
                                <th>Lesson</th>
                            <th>Homework</th>
                            <th>Progress %</th>
                            <th>Teacher&apos;s Remarks</th>
                            <th>My Remarks</th>
                            <th>Parent Remarks</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {!student.progressRecords || student.progressRecords.length === 0 ? (
                            <tr>
                              <td colSpan={9} className="text-center py-3 text-muted">
                                No progress records yet
                              </td>
                            </tr>
                          ) : (
                            student.progressRecords.map((progress) => (
                                  <tr key={progress.id}>
                                    <td className="small">
                                      {new Date(progress.date).toLocaleDateString()}
                                    </td>
                                    <td className="fw-medium small">
                                      {progress.course.name}
                                    </td>
                                    <td>
                                      {getAttendanceBadge(progress.attendance)}
                                    </td>
                                    <td className="small">
                                      <ExpandableText text={progress.lesson} maxLength={20} />
                                    </td>
                                    <td className="small">
                                      <ExpandableText text={progress.homework} maxLength={20} />
                                    </td>
                                    <td>
                                      {progress.lessonProgress !== null ? (
                                        <Badge bg="primary">
                                          {progress.lessonProgress}%
                                        </Badge>
                                      ) : (
                                        <span className="text-muted small">-</span>
                                      )}
                                    </td>
                                    <td className="small">
                                  <ExpandableText text={progress.remarks} maxLength={30} />
                                </td>
                                    <td className="small">
                                      {(() => {
                                        const latest = getLatestMyReply(progress);
                                        return latest ? (
                                          <span className="text-muted text-truncate d-inline-block" style={{ maxWidth: '160px' }}>
                                            {latest.content}
                                          </span>
                                        ) : (
                                          <span className="text-muted">-</span>
                                        );
                                      })()}
                                    </td>
                                    <td className="small">
                                      {progress.parentRemarks && progress.parentRemarks.length > 0 ? (
                                        (() => {
                                          const replyCount = progress.parentRemarks.reduce(
                                            (sum: number, r: any) => sum + (r.replies?.length || 0),
                                            0
                                          );
                                          return (
                                            <span className="small text-muted d-inline-block">
                                              Remark with{' '}
                                              <span className={replyCount > 0 ? 'text-success' : 'text-danger'}>
                                                {replyCount > 0 ? replyCount : 'no'}
                                              </span>{' '}
                                              comment{replyCount === 1 ? '' : 's'}
                                            </span>
                                          );
                                        })()
                                      ) : (
                                        <span className="small text-muted d-inline-block">No parent remark</span>
                                      )}
                                    </td>
                                    <td>
                                      <div className="d-flex gap-2 align-items-center flex-nowrap">
                                        {progress.parentRemarks && progress.parentRemarks.length > 0 && (
                                          <Button
                                            variant="outline-secondary"
                                            size="sm"
                                            onClick={() => handleViewParentRemarks(progress, student.name)}
                                          >
                                            <i className="bi bi-chat-dots"></i>
                                          </Button>
                                        )}
                                        <Button
                                          variant="outline-primary"
                                          size="sm"
                                          onClick={() => handleEditProgress(student, progress)}
                                        >
                                          <i className="bi bi-pencil"></i>
                                        </Button>
                                      </div>
                                    </td>
                                </tr>
                              ))
                            )}
                        </tbody>
                      </Table>
                        </div>
                      )}
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </Tab>

        <Tab 
          eventKey="tests" 
          title={
            <span>
              <i className="bi bi-journal-check me-2"></i>
              Tests & Exams
            </span>
          }
        >
          {!students || students.length === 0 ? (
            <Card className="text-center py-5">
              <Card.Body>
                <i className="bi bi-people display-4 text-muted"></i>
                <h4 className="mt-3 text-muted">No Students Assigned</h4>
                <p className="text-muted">You don&apos;t have any students assigned to you yet. Please contact your administrator.</p>
              </Card.Body>
            </Card>
          ) : (
            <Row className="g-4">
              {students.map((student) => (
                <Col key={student.id} xl={12}>
                  <Card className="shadow-sm">
                    <Card.Header className="bg-light">
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <h5 className="mb-0 fw-bold">{student.name}</h5>
                          <small className="text-muted">{student.email}</small>
                        </div>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleAddTest(student)}
                        >
                          <i className="bi bi-plus-circle me-1"></i>
                          Add Test / Exam Result
                        </Button>
                      </div>
                    </Card.Header>
                    <Card.Body className="p-0">
                      {!student.studentCourses || student.studentCourses.length === 0 ? (
                        <div className="text-center py-3">
                          <small className="text-muted">No subjects assigned</small>
                        </div>
                      ) : (
                        <div className="table-responsive">
                          <Table className="mb-0">
                            <thead className="table-light small">
                              <tr>
                                <th>Date</th>
                                <th>Subject</th>
                                <th>Test/Exam</th>
                                <th>Type</th>
                            <th>Score</th>
                            <th>Percentage</th>
                            <th>Performance</th>
                            <th>Remarks</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {!student.testRecords || student.testRecords.length === 0 ? (
                            <tr>
                              <td colSpan={9} className="text-center py-3 text-muted">
                                No tests recorded yet
                              </td>
                            </tr>
                          ) : (
                            student.testRecords.map((test) => (
                                  <tr key={test.id}>
                                    <td className="small">
                                      {new Date(test.performedAt).toLocaleDateString()}
                                    </td>
                                    <td className="fw-medium small">
                                      {test.course.name}
                                    </td>
                                  <td className="small">
                                    <strong>{test.title}</strong>
                                  </td>
                                  <td>
                                    {(() => {
                                      const t = formatTestType(test.type);
                                      return <Badge bg={t.variant}>{t.label}</Badge>;
                                    })()}
                                  </td>
                                    <td>
                                      <Badge bg="dark">
                                        {test.obtainedMarks}/{test.maxMarks}
                                      </Badge>
                                    </td>
                                    <td>
                                      <Badge bg={test.percentage >= 80 ? 'success' : test.percentage >= 60 ? 'warning' : 'danger'}>
                                        {test.percentage}%
                                      </Badge>
                                    </td>
                                    <td className="small">
                                      <ExpandableText text={test.performanceNote || '-'} maxLength={30} />
                                    </td>
                                    <td className="small">
                                      <ExpandableText text={test.remarks || '-'} maxLength={30} />
                                    </td>
                                    <td>
                                      <Button
                                        variant="outline-primary"
                                        size="sm"
                                        onClick={() => handleEditTest(student, test)}
                                      >
                                        <i className="bi bi-pencil"></i>
                                      </Button>
                                    </td>
                                  </tr>
                                ))
                              )}
                        </tbody>
                          </Table>
                        </div>
                      )}
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </Tab>
      </Tabs>

      {/* Progress Update Modal */}
      <Modal show={showProgressModal} onHide={() => { setShowProgressModal(false); setEditingProgressId(null); }} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-graph-up me-2"></i>
            {editingProgressId ? 'Edit Progress & Attendance for ' : 'Add Progress & Attendance for '}
            {selectedStudent?.name}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSubmitProgress}>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Select Subject *</Form.Label>
                  <Form.Select
                    value={selectedCourse}
                    onChange={(e) => setSelectedCourse(e.target.value)}
                    required
                    disabled={!!editingProgressId}
                  >
                    <option value="">Choose a subject...</option>
                    {selectedStudent?.studentCourses?.map(({ course }) => (
                      <option key={course.id} value={course.id}>
                        {course.name}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Date</Form.Label>
                  <Form.Control
                    type="date"
                    value={progressDate}
                    onChange={(e) => setProgressDate(e.target.value)}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Attendance Status *</Form.Label>
                  <Form.Select
                    value={attendance}
                    onChange={(e) => setAttendance(e.target.value as AttendanceStatus)}
                    required
                  >
                    <option value="PRESENT">Present</option>
                    <option value="ABSENT">Absent</option>
                    <option value="LATE">Late</option>
                    <option value="EXCUSED">Excused</option>
                  </Form.Select>
                  <Form.Text className="text-muted">
                    Mark attendance status for this session
                  </Form.Text>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Lesson</Form.Label>
                  <Form.Control
                    type="text"
                    value={lesson}
                    onChange={(e) => setLesson(e.target.value)}
                    placeholder="Enter lesson topic"
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Homework</Form.Label>
                  <Form.Control
                    type="text"
                    value={homework}
                    onChange={(e) => setHomework(e.target.value)}
                    placeholder="Enter homework description"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Lesson Progress (%)</Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={lessonProgress}
                    onChange={(e) => setLessonProgress(e.target.value)}
                    placeholder="Enter progress percentage"
                    disabled={attendance === 'ABSENT'}
                  />
                  {attendance === 'ABSENT' && (
                    <Form.Text className="text-muted">
                      Progress cannot be recorded for absent students
                    </Form.Text>
                  )}
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-4">
              <Form.Label>Remarks</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder={
                  attendance === 'ABSENT' 
                    ? "Enter remarks about the absence..." 
                    : "Enter your remarks about student's performance..."
                }
              />
            </Form.Group>

            <div className="d-flex justify-content-end gap-2">
              <Button variant="secondary" onClick={() => setShowProgressModal(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="success"
                disabled={updatingProgress}
              >
                {updatingProgress ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Adding...
                  </>
                ) : (
                  <>
                    <i className="bi bi-check-circle me-2"></i>
                    {editingProgressId ? 'Save Changes' : 'Add Progress & Attendance'}
                  </>
                )}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      {/* Test Record Modal */}
      <Modal show={showTestModal} onHide={() => { setShowTestModal(false); setEditingTestId(null); }} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-journal-check me-2"></i>
            {editingTestId ? 'Edit Test / Exam for ' : 'Add Test / Exam for '}
            {selectedTestStudent?.name}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSubmitTest}>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Select Subject *</Form.Label>
                  <Form.Select
                    value={selectedTestCourse}
                    onChange={(e) => setSelectedTestCourse(e.target.value)}
                    required
                    disabled={!!editingTestId}
                  >
                    <option value="">Choose a subject...</option>
                    {selectedTestStudent?.studentCourses?.map(({ course }) => (
                      <option key={course.id} value={course.id}>
                        {course.name}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Date</Form.Label>
                  <Form.Control
                    type="date"
                    value={performedAt}
                    onChange={(e) => setPerformedAt(e.target.value)}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Title *</Form.Label>
                  <Form.Control
                    type="text"
                    value={testTitle}
                    onChange={(e) => setTestTitle(e.target.value)}
                    placeholder="Quiz 1, Mid-term exam, Homework check..."
                    required
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Type *</Form.Label>
                  <Form.Select
                    value={testType}
                    onChange={(e) => setTestType(e.target.value as AssessmentType)}
                  >
                    <option value="QUIZ">Quiz</option>
                    <option value="EXAM">Exam</option>
                    <option value="HOMEWORK">Homework</option>
                    <option value="OTHER">Other</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Maximum Marks *</Form.Label>
                  <Form.Control
                    type="number"
                    min="1"
                    step="0.5"
                    value={maxMarks}
                    onChange={(e) => setMaxMarks(e.target.value)}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Obtained Marks *</Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    step="0.5"
                    value={obtainedMarks}
                    onChange={(e) => setObtainedMarks(e.target.value)}
                    required
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Performance Summary</Form.Label>
                  <Form.Control
                    type="text"
                    value={performanceNote}
                    onChange={(e) => setPerformanceNote(e.target.value)}
                    placeholder="Short note on how the student performed"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Percentage</Form.Label>
                  <InputGroup>
                    <Form.Control
                      type="text"
                      value={computedPercentage() !== null ? `${computedPercentage()?.toFixed(2)}%` : 'N/A'}
                      readOnly
                    />
                    <InputGroup.Text>
                      auto
                    </InputGroup.Text>
                  </InputGroup>
                  <Form.Text className="text-muted">
                    Calculated automatically from marks
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-4">
              <Form.Label>Detailed Remarks</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={testRemarks}
                onChange={(e) => setTestRemarks(e.target.value)}
                placeholder="Any additional remarks or feedback"
              />
            </Form.Group>

            <div className="d-flex justify-content-end gap-2">
              <Button variant="secondary" onClick={() => setShowTestModal(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={savingTest}
              >
                {savingTest ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <i className="bi bi-save me-2"></i>
                    {editingTestId ? 'Save Changes' : 'Save Test / Exam'}
                  </>
                )}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      <RemarkThreadModal
        show={showRemarksModal}
        onHide={() => setShowRemarksModal(false)}
        remarks={selectedRemarks}
        onReply={handleSendReply}
        onMessageParent={openChat}
        onMessageUser={openChat}
        onRefreshAll={refreshSelectedThread}
        currentUserId={currentUserId}
        title={threadTitle || 'Remarks for this progress'}
        emptyMessage="No parent remarks yet"
      />

      <DirectMessageModal
        show={showChatModal}
        onHide={() => setShowChatModal(false)}
        targetId={chatTargetId}
        targetName={chatTargetName}
        onSent={() => setSuccess('Message sent')}
      />
    </div>
  );
}

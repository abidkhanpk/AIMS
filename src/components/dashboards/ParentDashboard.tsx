import { useState, useEffect } from 'react';
import { Card, Row, Col, Table, Badge, Alert, Spinner, Accordion, Button, Modal, Form, Tabs, Tab } from 'react-bootstrap';
import { FeeStatus, AttendanceStatus, AssessmentType } from '@prisma/client';
import FeePaymentModal from './FeePaymentModal';
import { useSession } from 'next-auth/react';
import RemarkThreadModal from '../remarks/RemarkThreadModal';

interface Child {
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
    teacher: {
      id: string;
      name: string;
    };
    parentRemarks: {
      id: string;
      remark: string;
      createdAt: string;
      parent: {
        id: string;
        name: string;
      };
      replies?: {
        id: string;
        content: string;
        createdAt: string;
        author: {
          id: string;
          name: string;
          role: string;
        };
      }[];
    }[];
  }[];
  testRecords: {
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
  }[];
}

interface Fee {
  id: string;
  title: string;
  description?: string;
  amount: number;
  dueDate: string;
  status: FeeStatus;
  paidDate?: string;
  student: {
    id: string;
    name: string;
    email: string;
  };
  paidBy?: {
    id: string;
    name: string;
    email: string;
  };
}

export default function ParentDashboard() {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;
  const [children, setChildren] = useState<Child[]>([]);
  const [fees, setFees] = useState<Fee[]>([]);
  const [loading, setLoading] = useState(true);
  const [feesLoading, setFeesLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Remark modal states
  const [showRemarkModal, setShowRemarkModal] = useState(false);
  const [selectedProgress, setSelectedProgress] = useState<any>(null);
  const [remarkText, setRemarkText] = useState('');
  const [addingRemark, setAddingRemark] = useState(false);
  const [showThreadModal, setShowThreadModal] = useState(false);
  const [threadRemarks, setThreadRemarks] = useState<any[]>([]);
  const [threadProgressId, setThreadProgressId] = useState<string | null>(null);
  const [threadChildId, setThreadChildId] = useState<string | null>(null);
  const [threadTitle, setThreadTitle] = useState('');

  // Fee payment states
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedFee, setSelectedFee] = useState<Fee | null>(null);

  useEffect(() => {
    fetchChildren();
    fetchFees();
  }, []);

  const fetchChildren = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/users/my-children');
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        setChildren(list);
        return list;
      } else {
        setError('Failed to fetch children data');
        setChildren([]);
      }
    } catch (error) {
      setError('Error fetching children data');
      setChildren([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchFees = async () => {
    try {
      setFeesLoading(true);
      const res = await fetch('/api/fees');
      if (res.ok) {
        const data = await res.json();
        setFees(Array.isArray(data) ? data : []);
      } else {
        console.error('Failed to fetch fees');
        setFees([]);
      }
    } catch (error) {
      console.error('Error fetching fees');
      setFees([]);
    } finally {
      setFeesLoading(false);
    }
  };

  const handleAddRemark = (progress: any) => {
    setSelectedProgress(progress);
    setRemarkText('');
    setShowRemarkModal(true);
  };

  const handleRemarkAction = (progress: any) => {
    if (progress.parentRemarks && progress.parentRemarks.length > 0) {
      openThread(progress);
    } else {
      handleAddRemark(progress);
    }
  };

  const handleSubmitRemark = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProgress || !remarkText.trim()) return;

    setAddingRemark(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/progress/parent-remark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          progressId: selectedProgress.id,
          remark: remarkText.trim(),
        }),
      });

      if (res.ok) {
        setSuccess('Remark added successfully!');
        setShowRemarkModal(false);
        fetchChildren(); // Refresh data
      } else {
        const errorData = await res.json();
        setError(errorData.message || 'Failed to add remark');
      }
    } catch (error) {
      setError('Error adding remark');
    } finally {
      setAddingRemark(false);
    }
  };

  const handlePayFeeClick = (fee: Fee) => {
    setSelectedFee(fee);
    setShowPaymentModal(true);
  };

  const handlePaymentSubmit = async (paymentDetails: any) => {
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/fees/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentDetails),
      });

      if (res.ok) {
        setSuccess('Fee payment submitted successfully! Awaiting admin verification.');
        fetchFees(); // Refresh fees data
      } else {
        const errorData = await res.json();
        setError(errorData.message || 'Failed to submit payment');
      }
    } catch (error) {
      setError('Error submitting payment');
    }
  };

  const getProgressForCourse = (child: Child, courseId: string) => {
    if (!child.progressRecords || !Array.isArray(child.progressRecords)) return [];
    return child.progressRecords.filter(p => p.course.id === courseId);
  };

  const getLatestProgress = (child: Child, courseId: string) => {
    const courseProgress = getProgressForCourse(child, courseId);
    return courseProgress.length > 0 ? courseProgress[0] : null;
  };

  const getAverageProgress = (child: Child) => {
    if (!child.studentCourses || !Array.isArray(child.studentCourses)) return null;
    
    const coursesWithProgress = child.studentCourses.filter(sc => {
      const latestProgress = getLatestProgress(child, sc.course.id);
      return latestProgress && latestProgress.lessonProgress !== null;
    });

    if (coursesWithProgress.length === 0) return null;

    const total = coursesWithProgress.reduce((sum, sc) => {
      const latestProgress = getLatestProgress(child, sc.course.id);
      return sum + (latestProgress?.lessonProgress || 0);
    }, 0);

    return Math.round(total / coursesWithProgress.length);
  };

  const getTestsForChild = (child: Child) => {
    if (!child.testRecords || child.testRecords.length === 0) return [];
    return child.testRecords;
  };

  const getAverageTestScore = (child: Child) => {
    const tests = getTestsForChild(child);
    if (tests.length === 0) return null;
    const total = tests.reduce((sum, test) => sum + (test.percentage || 0), 0);
    return Math.round(total / tests.length);
  };

  const getStatusBadge = (status: FeeStatus) => {
    switch (status) {
      case 'PAID':
        return <Badge bg="success">Paid</Badge>;
      case 'PENDING':
        return <Badge bg="warning">Pending</Badge>;
      case 'PROCESSING':
        return <Badge bg="info">Processing</Badge>;
      case 'OVERDUE':
        return <Badge bg="danger">Overdue</Badge>;
      case 'CANCELLED':
        return <Badge bg="secondary">Cancelled</Badge>;
      default:
        return <Badge bg="secondary">{status}</Badge>;
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

  const getPendingFees = () => {
    return fees.filter(fee => fee.status === 'PENDING' || fee.status === 'OVERDUE');
  };

  const buildThreadTitle = (progress: any) => {
    const courseName = progress.course?.name ? ` ${progress.course.name}` : '';
    const dateLabel = progress.date ? ` on ${new Date(progress.date).toLocaleDateString()}` : '';
    const studentName = progress.student?.name ? ` for ${progress.student.name}` : '';
    return `Remarks for${courseName}${studentName}${dateLabel}`;
  };

  const openThread = (progress: any) => {
    setThreadRemarks(progress.parentRemarks || []);
    setThreadProgressId(progress.id);
    const ownerChild = children.find((c) => c.progressRecords?.some((p) => p.id === progress.id));
    setThreadChildId(ownerChild?.id || null);
    setThreadTitle(buildThreadTitle({ ...progress, student: ownerChild || progress.student }));
    setShowThreadModal(true);
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
        setThreadRemarks((prev) =>
          prev.map((r: any) =>
            r.id === newReply.remarkId
              ? { ...r, replies: [...(r.replies || []), newReply] }
              : r
          )
        );
        await refreshThread();
        setSuccess('Comment added');
        return true;
      }
      const err = await res.json();
      setError(err.message || 'Failed to add comment');
      return false;
    } catch (err) {
      setError('Failed to add comment');
      return false;
    }
  };

  const refreshThread = async () => {
    const list = await fetchChildren();
    const data = list || children;
    if (threadChildId && threadProgressId) {
      const child = data.find((c: any) => c.id === threadChildId);
      const progress = child?.progressRecords?.find((p: any) => p.id === threadProgressId);
      if (progress) {
        setThreadRemarks(progress.parentRemarks || []);
      }
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" />
        <p className="mt-2 text-muted">Loading your children&apos;s data...</p>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      <div className="row mb-4">
        <div className="col-12">
          <h1 className="h2 mb-0">
            <i className="bi bi-people me-2 text-info"></i>
            Parent Dashboard
          </h1>
          <p className="text-muted">Monitor your children&apos;s academic progress and manage fees</p>
        </div>
      </div>

      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

      {!children || children.length === 0 ? (
        <Card className="text-center py-5">
          <Card.Body>
            <i className="bi bi-person-x display-4 text-muted"></i>
            <h4 className="mt-3 text-muted">No Children Assigned</h4>
            <p className="text-muted">You don&apos;t have any children assigned to your account. Please contact your administrator.</p>
          </Card.Body>
        </Card>
      ) : (
        <Tabs defaultActiveKey="progress" id="parent-dashboard-tabs" className="mb-4">
          <Tab 
            eventKey="progress" 
            title={
              <span>
                <i className="bi bi-graph-up me-2"></i>
                Progress & Attendance
              </span>
            }
          >
            <Row className="g-4">
              {children.map((child) => {
                const averageProgress = getAverageProgress(child);
                return (
                  <Col key={child.id} lg={12}>
                    <Card className="shadow-sm">
                      <Card.Header className="bg-light">
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <h5 className="mb-0 fw-bold">{child.name}</h5>
                            <small className="text-muted">{child.email}</small>
                          </div>
                          <div className="text-end">
                            {averageProgress !== null ? (
                              <div>
                                <Badge 
                                  bg={averageProgress >= 80 ? 'success' : averageProgress >= 60 ? 'warning' : 'danger'}
                                  className="fs-6"
                                >
                                  {averageProgress}% Average
                                </Badge>
                                <div className="small text-muted mt-1">Overall Progress</div>
                              </div>
                            ) : (
                              <Badge bg="secondary">No Progress Data</Badge>
                            )}
                          </div>
                        </div>
                      </Card.Header>
                      <Card.Body className="p-0">
                        {!child.studentCourses || child.studentCourses.length === 0 ? (
                          <div className="text-center py-4">
                            <i className="bi bi-book display-6 text-muted"></i>
                            <p className="mt-2 text-muted">No subjects assigned</p>
                          </div>
                        ) : (
                          <Accordion flush>
                            {child.studentCourses.map(({ course }, index) => {
                              const latestProgress = getLatestProgress(child, course.id);
                              const allProgress = getProgressForCourse(child, course.id);
                              
                              return (
                                <Accordion.Item key={course.id} eventKey={`${child.id}-${index}`}>
                                  <Accordion.Header>
                                    <div className="d-flex justify-content-between align-items-center w-100 me-3">
                                      <div>
                                        <strong>{course.name}</strong>
                                        {course.description && (
                                          <div className="small text-muted">
                                            {course.description.length > 60 
                                              ? course.description.substring(0, 60) + '...'
                                              : course.description
                                            }
                                          </div>
                                        )}
                                      </div>
                                      <div className="text-end">
                                        {latestProgress ? (
                                          <div>
                                            {latestProgress.lessonProgress !== null && (
                                              <Badge 
                                                bg={latestProgress.lessonProgress >= 80 ? 'success' : 
                                                    latestProgress.lessonProgress >= 60 ? 'warning' : 'danger'}
                                              >
                                                {latestProgress.lessonProgress}%
                                              </Badge>
                                            )}
                                            <div className="small text-muted">
                                              {new Date(latestProgress.date).toLocaleDateString()}
                                            </div>
                                          </div>
                                        ) : (
                                          <Badge bg="secondary">No Progress</Badge>
                                        )}
                                      </div>
                                    </div>
                                  </Accordion.Header>
                                  <Accordion.Body>
                                    {!allProgress || allProgress.length === 0 ? (
                                      <div className="text-center py-3">
                                        <i className="bi bi-graph-up display-6 text-muted"></i>
                                        <p className="mt-2 text-muted">No progress updates yet</p>
                                      </div>
                                    ) : (
                                      <div className="table-responsive">
                                        <Table size="sm" className="mb-0">
                                          <thead className="table-light">
                                            <tr>
                                              <th>Date</th>
                                              <th>Teacher</th>
                                              <th>Attendance</th>
                                              <th>Lesson</th>
                                              <th>Homework</th>
                                              <th>Progress</th>
                                              <th>Teacher Remarks</th>
                                              <th>My Remarks</th>
                                              <th>Action</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {allProgress.map((progress) => (
                                              <tr key={progress.id}>
                                                <td className="text-muted small">
                                                  {new Date(progress.date).toLocaleDateString()}
                                                </td>
                                                <td className="fw-medium small">
                                                  {progress.teacher?.name || 'Unknown'}
                                                </td>
                                                <td>
                                                  {getAttendanceBadge(progress.attendance)}
                                                </td>
                                                <td className="small">
                                                  {progress.lesson || '-'}
                                                </td>
                                                <td className="small">
                                                  {progress.homework || '-'}
                                                </td>
                                                <td>
                                                  {progress.lessonProgress !== null ? (
                                                    <Badge 
                                                      bg={progress.lessonProgress >= 80 ? 'success' : 
                                                          progress.lessonProgress >= 60 ? 'warning' : 'danger'}
                                                      className="small"
                                                    >
                                                      {progress.lessonProgress}%
                                                    </Badge>
                                                  ) : (
                                                    <span className="text-muted small">-</span>
                                                  )}
                                                </td>
                                                <td className="small">
                                                  {progress.remarks ? (
                                                    <span className="text-muted">
                                                      {progress.remarks.length > 30 
                                                        ? progress.remarks.substring(0, 30) + '...'
                                                        : progress.remarks
                                                      }
                                                    </span>
                                                  ) : (
                                                    <span className="text-muted">-</span>
                                                  )}
                                                </td>
                                                <td className="small">
                                                  {progress.parentRemarks && progress.parentRemarks.length > 0 ? (
                                                    (() => {
                                                      const remarkCount = progress.parentRemarks.length;
                                                      const replyCount = progress.parentRemarks.reduce(
                                                        (sum: number, r: any) => sum + (r.replies?.length || 0),
                                                        0
                                                      );
                                                      return (
                                                        <div className="d-flex flex-column">
                                                          <span className="text-success fw-semibold">
                                                            {remarkCount} remark{remarkCount > 1 ? 's' : ''}
                                                          </span>
                                                          <small className="text-muted">
                                                            {replyCount > 0
                                                              ? `${replyCount} comment${replyCount > 1 ? 's' : ''}`
                                                              : 'No comments yet'}
                                                          </small>
                                                        </div>
                                                      );
                                                    })()
                                                  ) : (
                                                    <span className="text-muted">No parent remark</span>
                                                  )}
                                                </td>
                                                <td>
                                                  <Button
                                                    variant="outline-info"
                                                    size="sm"
                                                    onClick={() => handleRemarkAction(progress)}
                                                  >
                                                    <i className="bi bi-chat-dots"></i>
                                                  </Button>
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </Table>
                                      </div>
                                    )}
                                  </Accordion.Body>
                                </Accordion.Item>
                              );
                            })}
                          </Accordion>
                        )}
                      </Card.Body>
                    </Card>
                  </Col>
                );
              })}
            </Row>
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
            <Row className="g-4">
              {children.map((child) => {
                const averageTests = getAverageTestScore(child);
                const tests = getTestsForChild(child);
                return (
                  <Col key={`${child.id}-tests`} lg={12}>
                    <Card className="shadow-sm">
                      <Card.Header className="bg-light">
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <h5 className="mb-0 fw-bold">{child.name}</h5>
                            <small className="text-muted">{child.email}</small>
                          </div>
                          <div className="text-end">
                            {averageTests !== null ? (
                              <div>
                                <Badge 
                                  bg={averageTests >= 80 ? 'success' : averageTests >= 60 ? 'warning' : 'danger'}
                                  className="fs-6"
                                >
                                  {averageTests}% Avg Score
                                </Badge>
                                <div className="small text-muted mt-1">Across all tests</div>
                              </div>
                            ) : (
                              <Badge bg="secondary">No Test Data</Badge>
                            )}
                          </div>
                        </div>
                      </Card.Header>
                      <Card.Body className="p-0">
                        {!tests || tests.length === 0 ? (
                          <div className="text-center py-4">
                            <i className="bi bi-journal-check display-6 text-muted"></i>
                            <p className="mt-2 text-muted">No tests recorded yet</p>
                          </div>
                        ) : (
                          <div className="table-responsive">
                            <Table hover size="sm" className="mb-0">
                              <thead className="table-light">
                                <tr>
                                  <th>Date</th>
                                  <th>Subject</th>
                                  <th>Test/Exam</th>
                                  <th>Type</th>
                                  <th>Score</th>
                                  <th>Percentage</th>
                                  <th>Performance</th>
                                  <th>Remarks</th>
                                  <th>Teacher</th>
                                </tr>
                              </thead>
                              <tbody>
                                {tests.map((test) => (
                                  <tr key={test.id}>
                                    <td className="text-muted small">
                                      {new Date(test.performedAt).toLocaleDateString()}
                                    </td>
                                    <td className="fw-medium small">{test.course.name}</td>
                                    <td className="small">{test.title}</td>
                                    <td>
                                      <Badge bg={
                                        test.type === 'EXAM'
                                          ? 'danger'
                                          : test.type === 'HOMEWORK'
                                            ? 'secondary'
                                            : test.type === 'OTHER'
                                              ? 'info'
                                              : 'info'
                                      }>
                                        {test.type === 'EXAM'
                                          ? 'Exam'
                                          : test.type === 'HOMEWORK'
                                            ? 'Homework'
                                            : test.type === 'OTHER'
                                              ? 'Other'
                                              : 'Quiz'}
                                      </Badge>
                                    </td>
                                    <td>
                                      <Badge bg="dark">{test.obtainedMarks}/{test.maxMarks}</Badge>
                                    </td>
                                    <td>
                                      <Badge bg={test.percentage >= 80 ? 'success' : test.percentage >= 60 ? 'warning' : 'danger'}>
                                        {test.percentage}%
                                      </Badge>
                                    </td>
                                    <td className="small">{test.performanceNote || '-'}</td>
                                    <td className="small">{test.remarks || '-'}</td>
                                    <td className="small">{test.teacher?.name || '-'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </Table>
                          </div>
                        )}
                      </Card.Body>
                    </Card>
                  </Col>
                );
              })}
            </Row>
          </Tab>

          <Tab 
            eventKey="fees" 
            title={
              <span>
                <i className="bi bi-cash-coin me-2"></i>
                Fees {getPendingFees().length > 0 && <Badge bg="danger">{getPendingFees().length}</Badge>}
              </span>
            }
          >
            <Card className="shadow-sm">
              <Card.Header className="bg-light">
                <div className="d-flex justify-content-between align-items-center">
                  <h6 className="mb-0">
                    <i className="bi bi-cash-coin me-2"></i>
                    Fee Management
                  </h6>
                  <Badge bg="warning">{fees.length} Total</Badge>
                </div>
              </Card.Header>
              <Card.Body className="p-0">
                {feesLoading ? (
                  <div className="text-center py-4">
                    <Spinner animation="border" size="sm" />
                    <p className="mt-2 text-muted small">Loading fees...</p>
                  </div>
                ) : fees.length === 0 ? (
                  <div className="text-center py-4">
                    <i className="bi bi-cash-coin display-6 text-muted"></i>
                    <p className="mt-2 text-muted small">No fees found</p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <Table hover size="sm" className="mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>Student</th>
                          <th>Title</th>
                          <th>Description</th>
                          <th>Amount</th>
                          <th>Due Date</th>
                          <th>Status</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fees.map((fee) => (
                          <tr key={fee.id}>
                            <td className="fw-medium">{fee.student.name}</td>
                            <td>{fee.title}</td>
                            <td className="text-muted small">
                              {fee.description || '-'}
                            </td>
                            <td className="fw-bold text-success">${fee.amount.toFixed(2)}</td>
                            <td className="text-muted small">
                              {new Date(fee.dueDate).toLocaleDateString()}
                            </td>
                            <td>{getStatusBadge(fee.status)}</td>
                            <td>
                              {(fee.status === 'PENDING' || fee.status === 'OVERDUE') && (
                                <Button
                                  variant="success"
                                  size="sm"
                                  onClick={() => handlePayFeeClick(fee)}
                                >
                                  <i className="bi bi-credit-card me-1"></i>
                                  Pay Now
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Tab>
        </Tabs>
      )}

      {/* Add Remark Modal */}
      <Modal show={showRemarkModal} onHide={() => setShowRemarkModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-chat-dots me-2"></i>
            Add Your Remark
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedProgress && (
            <div className="mb-3">
              <div className="bg-light p-3 rounded">
                <strong>Progress Details:</strong>
                <div className="small text-muted mt-1">
                  <div><strong>Date:</strong> {new Date(selectedProgress.date).toLocaleDateString()}</div>
                  <div><strong>Course:</strong> {selectedProgress.course?.name || 'Unknown'}</div>
                  <div><strong>Teacher:</strong> {selectedProgress.teacher?.name || 'Unknown'}</div>
                  <div><strong>Attendance:</strong> {getAttendanceBadge(selectedProgress.attendance)}</div>
                  {selectedProgress.lesson && <div><strong>Lesson:</strong> {selectedProgress.lesson}</div>}
                </div>
              </div>
            </div>
          )}
          <Form onSubmit={handleSubmitRemark}>
            <Form.Group className="mb-4">
              <Form.Label>Your Remark</Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                value={remarkText}
                onChange={(e) => setRemarkText(e.target.value)}
                placeholder="Enter your remark about your child's progress..."
                required
              />
            </Form.Group>

            <div className="d-flex justify-content-end gap-2">
              <Button variant="secondary" onClick={() => setShowRemarkModal(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="info"
                disabled={addingRemark || !remarkText.trim()}
              >
                {addingRemark ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Adding...
                  </>
                ) : (
                  <>
                    <i className="bi bi-check-circle me-2"></i>
                    Add Remark
                  </>
                )}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      <RemarkThreadModal
        show={showThreadModal}
        onHide={() => setShowThreadModal(false)}
        remarks={threadRemarks}
        currentUserId={currentUserId}
        onRefreshAll={refreshThread}
        onReply={handleSendReply}
        title={threadTitle || 'Remarks for this progress'}
        emptyMessage="No remarks"
      />

      {selectedFee && (
        <FeePaymentModal
          show={showPaymentModal}
          onHide={() => setShowPaymentModal(false)}
          fee={selectedFee}
          onPaymentSubmit={handlePaymentSubmit}
        />
      )}
    </div>
  );
}

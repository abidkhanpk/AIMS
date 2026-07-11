import { serverSideTranslations } from 'next-i18next/pages/serverSideTranslations';
import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import {
  Spinner,
  Card,
  Table,
  Button,
  Badge,
  Modal,
  Form,
  Row,
  Col,
  Alert,
  InputGroup
} from 'react-bootstrap';
import AdminMenu from '../../components/dashboards/AdminMenu';
import menuStyles from '../../components/dashboards/AdminMenu.module.css';
import { useTranslation } from 'react-i18next';
import Head from 'next/head';

interface SubjectRequest {
  courseId: string;
  startTime: string;
  duration: number;
  classDays: string[];
  timezone: string;
  monthlyFee?: number;
  currency?: string;
  teacherId?: string; // Admin assigns this
}

interface StudentRequest {
  name: string;
  email: string;
  mobile?: string;
  isWhatsApp?: boolean;
  dateOfBirth?: string;
  bFormNumber?: string;
  dateOfBirthInWords?: string;
  religiousEducation?: string;
  formalEducation?: string;
  previousInstitution?: string;
  previousInstitutionReason?: string;
  admissionClass?: string;
  admissionDepartment?: string;
  fatherAlive?: boolean;
  motherAlive?: boolean;
  notes?: string;
  password?: string; // Generated password
  subjects: SubjectRequest[];
}

interface RegistrationRequest {
  id: string;
  adminId: string;
  status: string;
  rejectionReason?: string;
  parentName: string;
  parentEmail: string;
  parentMobile: string;
  parentIsWhatsApp: boolean;
  parentCnic?: string;
  parentProfession?: string;
  parentRelation: string;
  parentAddress?: string;
  parentCountry?: string;
  studentsJson: any; // Raw JSON or array of StudentRequest
  createdAt: string;
}

interface Teacher {
  id: string;
  name: string;
  email: string;
}

interface Course {
  id: string;
  name: string;
}

const adjectives = ['Happy', 'Sunny', 'Bright', 'Blue', 'Swift', 'Calm', 'Kind', 'Wise', 'Clever', 'Brave', 'Gentle', 'Warm', 'Pure', 'Good', 'Light', 'Noble', 'Glad'];
const nouns = ['Panda', 'Eagle', 'River', 'Forest', 'Ocean', 'Star', 'Mountain', 'Cloud', 'Falcon', 'Deer', 'Lion', 'Book', 'Tree', 'Lake', 'Moon', 'Breeze', 'Dove'];

function generateSimplePassword() {
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(100 + Math.random() * 900);
  return `${adj}${noun}${num}`;
}

const timezones = [
  'UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Asia/Tokyo', 'Asia/Shanghai',
  'Asia/Kolkata', 'Asia/Dubai', 'Australia/Sydney', 'Pacific/Auckland', 'Asia/Karachi'
];

export default function AdminRegistrationsPage() {
  const { t } = useTranslation('common');
  const { data: session, status } = useSession();
  const router = useRouter();

  const [registrations, setRegistrations] = useState<RegistrationRequest[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeFilter, setActiveFilter] = useState('PENDING');

  // Review Modal State
  const [selectedRequest, setSelectedRequest] = useState<RegistrationRequest | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewStudents, setReviewStudents] = useState<StudentRequest[]>([]);
  const [parentPassword, setParentPassword] = useState('');

  // Rejection Dialog State
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // Success Confirmation State
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successDetails, setSuccessDetails] = useState<any>(null);

  // Copy Link State
  const [copiedLink, setCopiedLink] = useState(false);

  // Authentication guards
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated' && session?.user?.role !== 'ADMIN') {
      router.push('/dashboard');
    }
  }, [status, session, router]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [regRes, teachRes, subRes] = await Promise.all([
        fetch(`/api/registrations?status=${activeFilter}`),
        fetch('/api/users?role=TEACHER'),
        fetch('/api/subjects')
      ]);

      if (regRes.ok) {
        const data = await regRes.json();
        setRegistrations(Array.isArray(data) ? data : []);
      }
      if (teachRes.ok) {
        const data = await teachRes.json();
        setTeachers(Array.isArray(data) ? data : []);
      }
      if (subRes.ok) {
        const data = await subRes.json();
        setCourses(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      setError('Failed to fetch data.');
    } finally {
      setLoading(false);
    }
  }, [activeFilter]);

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role === 'ADMIN') {
      fetchData();
    }
  }, [status, session, fetchData]);

  const handleSelect = (key?: string | null) => {
    if (!key || key === 'registrations') return;
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
      assignments: '/dashboard/assignments',
      'attendance-reports': '/dashboard/attendance-reports',
      'report-cards': '/dashboard/report-cards',
    };
    router.push(routeMap[key] || `/dashboard?tab=${key}`);
  };

  const handleCopyLink = () => {
    if (typeof window === 'undefined' || !session?.user?.id) return;
    const link = `${window.location.origin}/register/${session.user.id}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Review & Approval Flow
  const handleOpenReview = (request: RegistrationRequest) => {
    setSelectedRequest(request);
    
    // Parse students array and enrich with simple memorable passwords
    let studentsArray: StudentRequest[] = [];
    try {
      studentsArray = typeof request.studentsJson === 'string' 
        ? JSON.parse(request.studentsJson) 
        : request.studentsJson;
    } catch (e) {
      studentsArray = [];
    }

    const enrichedStudents = studentsArray.map(std => ({
      ...std,
      password: std.password || generateSimplePassword(),
      subjects: std.subjects.map(sub => ({
        ...sub,
        teacherId: sub.teacherId || '',
        timezone: sub.timezone || 'Asia/Karachi',
        monthlyFee: sub.monthlyFee || 0,
        currency: sub.currency || 'PKR'
      }))
    }));

    setReviewStudents(enrichedStudents);
    setParentPassword(generateSimplePassword());
    setShowReviewModal(true);
  };

  const handleGenerateParentPassword = () => {
    setParentPassword(generateSimplePassword());
  };

  const handleGenerateStudentPassword = (studentIndex: number) => {
    const newStudents = [...reviewStudents];
    newStudents[studentIndex].password = generateSimplePassword();
    setReviewStudents(newStudents);
  };

  const handleStudentTeacherChange = (studentIndex: number, subjectIndex: number, teacherId: string) => {
    const newStudents = [...reviewStudents];
    newStudents[studentIndex].subjects[subjectIndex].teacherId = teacherId;
    setReviewStudents(newStudents);
  };

  const handleStudentSubjectFieldChange = (studentIndex: number, subjectIndex: number, field: string, value: any) => {
    const newStudents = [...reviewStudents];
    newStudents[studentIndex].subjects[subjectIndex] = {
      ...newStudents[studentIndex].subjects[subjectIndex],
      [field]: value
    };
    setReviewStudents(newStudents);
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;
    setError('');

    // Ensure all requested courses have teachers assigned
    for (const std of reviewStudents) {
      for (const sub of std.subjects) {
        if (!sub.teacherId) {
          setError(`Please select a teacher for ${std.name}'s subject: ${getCourseName(sub.courseId)}`);
          return;
        }
      }
    }

    setLoading(true);
    try {
      const res = await fetch('/api/registrations/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registrationRequestId: selectedRequest.id,
          parentPassword,
          students: reviewStudents
        })
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessDetails({
          parentEmail: selectedRequest.parentEmail,
          parentPassword,
          welcomeMessageText: data.welcomeMessageText,
          notificationSent: data.notificationSent,
          students: data.students
        });
        setShowReviewModal(false);
        setShowSuccessModal(true);
        fetchData();
      } else {
        setError(data.message || 'Approval failed.');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Rejection Flow
  const handleOpenReject = () => {
    setRejectReason('');
    setShowRejectModal(true);
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    setShowRejectModal(false);
    setLoading(true);

    try {
      const res = await fetch('/api/registrations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedRequest.id,
          status: 'REJECTED',
          rejectionReason: rejectReason
        })
      });

      if (res.ok) {
        setShowReviewModal(false);
        fetchData();
        setSuccess('Registration rejected successfully.');
        setTimeout(() => setSuccess(''), 4000);
      } else {
        setError('Failed to reject registration request.');
      }
    } catch (err) {
      setError('Connection error.');
    } finally {
      setLoading(false);
    }
  };

  const getCourseName = (courseId: string) => {
    const course = courses.find(c => c.id === courseId);
    return course ? course.name : 'Unknown Course';
  };

  if (status === 'loading') {
    return <Spinner animation="border" />;
  }

  return (
    <>
      <Head>
        <title>Student Registrations | AIMS</title>
      </Head>
      <div className={menuStyles.menuShell}>
        <div className={menuStyles.menuLayout}>
          <AdminMenu activeKey="registrations" onSelect={handleSelect} />
          <div className={menuStyles.mainContent}>
            <div className="container-fluid py-4">
              
              {/* Header */}
              <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                  <h2 className="h5 mb-1">
                    <i className="bi bi-clipboard-check me-2"></i>
                    Student Registrations
                  </h2>
                  <p className="text-muted mb-0">Review and approve self-registration requests from parents and students.</p>
                </div>
              </div>

              {/* Share link card */}
              <Card className="shadow-sm border-0 mb-4 bg-light">
                <Card.Body className="d-flex flex-column flex-md-row justify-content-between align-items-center gap-3">
                  <div>
                    <strong className="text-dark">Online Admission Form Link:</strong>
                    <div className="text-muted small mt-1">Copy and send this link to parents or students to let them register themselves:</div>
                  </div>
                  <div className="d-flex gap-2 w-100 w-md-auto align-items-center">
                    <InputGroup size="sm" style={{ minWidth: '350px' }}>
                      <Form.Control
                        readOnly
                        value={typeof window !== 'undefined' ? `${window.location.origin}/register/${session?.user?.id}` : ''}
                        className="bg-white"
                      />
                      <Button variant="outline-primary" onClick={handleCopyLink}>
                        <i className={`bi ${copiedLink ? 'bi-check' : 'bi-clipboard'} me-1`}></i>
                        {copiedLink ? 'Copied' : 'Copy'}
                      </Button>
                    </InputGroup>
                  </div>
                </Card.Body>
              </Card>

              {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
              {success && <Alert variant="success" onClose={() => setSuccess('')} dismissible>{success}</Alert>}

              {/* Filter Tabs */}
              <div className="d-flex gap-2 mb-3">
                <Button
                  size="sm"
                  variant={activeFilter === 'PENDING' ? 'primary' : 'outline-secondary'}
                  onClick={() => { setActiveFilter('PENDING'); }}
                >
                  Pending Requests
                </Button>
                <Button
                  size="sm"
                  variant={activeFilter === 'APPROVED' ? 'success' : 'outline-secondary'}
                  onClick={() => { setActiveFilter('APPROVED'); }}
                >
                  Approved
                </Button>
                <Button
                  size="sm"
                  variant={activeFilter === 'REJECTED' ? 'danger' : 'outline-secondary'}
                  onClick={() => { setActiveFilter('REJECTED'); }}
                >
                  Rejected
                </Button>
              </div>

              {/* Data Table */}
              <Card className="shadow-sm">
                <Card.Body className="p-0">
                  {loading ? (
                    <div className="text-center py-5">
                      <Spinner animation="border" />
                    </div>
                  ) : registrations.length === 0 ? (
                    <div className="text-center py-5 text-muted">
                      <i className="bi bi-clipboard-x display-4"></i>
                      <p className="mt-2">No registration requests found in this category.</p>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <Table hover size="sm" className="mb-0 mobile-card-table align-middle">
                        <thead className="table-light">
                          <tr>
                            <th>Parent / Contact</th>
                            <th>Relation</th>
                            <th>Mobile</th>
                            <th>Address</th>
                            <th>Submission Date</th>
                            <th>Status</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {registrations.map((reg) => (
                            <tr key={reg.id}>
                              <td data-label="Parent">
                                <div className="fw-semibold text-dark">{reg.parentName}</div>
                                <div className="text-muted small">{reg.parentEmail}</div>
                              </td>
                              <td data-label="Relation">
                                <Badge bg="info" className="text-capitalize">{reg.parentRelation.toLowerCase()}</Badge>
                              </td>
                              <td data-label="Mobile">
                                {reg.parentMobile}
                                {reg.parentIsWhatsApp && (
                                  <i className="bi bi-whatsapp text-success ms-1" title="WhatsApp available"></i>
                                )}
                              </td>
                              <td data-label="Address" className="text-muted small text-truncate" style={{ maxWidth: '180px' }}>
                                {reg.parentAddress || '-'}, {reg.parentCountry || '-'}
                              </td>
                              <td data-label="Submitted">
                                {new Date(reg.createdAt).toLocaleDateString()}
                              </td>
                              <td data-label="Status">
                                <Badge bg={
                                  reg.status === 'PENDING' ? 'warning' :
                                  reg.status === 'APPROVED' ? 'success' : 'danger'
                                }>
                                  {reg.status}
                                </Badge>
                              </td>
                              <td data-label="Actions">
                                {reg.status === 'PENDING' ? (
                                  <Button variant="primary" size="sm" onClick={() => handleOpenReview(reg)}>
                                    <i className="bi bi-eye me-1"></i> Review
                                  </Button>
                                ) : (
                                  <Button variant="outline-secondary" size="sm" onClick={() => handleOpenReview(reg)}>
                                    <i className="bi bi-eye me-1"></i> Details
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

            </div>
          </div>
        </div>
      </div>

      {/* Review Request Modal */}
      <Modal show={showReviewModal} onHide={() => setShowReviewModal(false)} size="xl">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-clipboard-check me-2 text-primary"></i>
            Review Registration Request
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="bg-light">
          {selectedRequest && (
            <Row className="g-4">
              
              {/* Parent Info Card */}
              <Col lg={4}>
                <Card className="border-0 shadow-sm rounded-3 mb-3">
                  <Card.Header className="bg-white border-bottom fw-bold text-dark">
                    Parent Details
                  </Card.Header>
                  <Card.Body>
                    <div className="mb-3">
                      <div className="text-muted small">Full Name</div>
                      <div className="fw-semibold">{selectedRequest.parentName}</div>
                    </div>
                    <div className="mb-3">
                      <div className="text-muted small">Relation / Profile</div>
                      <div>
                        <Badge bg="primary">{selectedRequest.parentRelation}</Badge>
                      </div>
                    </div>
                    <div className="mb-3">
                      <div className="text-muted small">Email Address</div>
                      <div>{selectedRequest.parentEmail}</div>
                    </div>
                    <div className="mb-3">
                      <div className="text-muted small">Mobile Number</div>
                      <div>
                        {selectedRequest.parentMobile}
                        {selectedRequest.parentIsWhatsApp && (
                          <Badge bg="success" className="ms-1">WhatsApp</Badge>
                        )}
                      </div>
                    </div>
                    {selectedRequest.parentCnic && (
                      <div className="mb-3">
                        <div className="text-muted small">CNIC / National ID</div>
                        <div>{selectedRequest.parentCnic}</div>
                      </div>
                    )}
                    {selectedRequest.parentProfession && (
                      <div className="mb-3">
                        <div className="text-muted small">Profession</div>
                        <div>{selectedRequest.parentProfession}</div>
                      </div>
                    )}
                    <div className="mb-3">
                      <div className="text-muted small">Residence Details</div>
                      <div className="small">
                        {selectedRequest.parentAddress || 'No Address'}, {selectedRequest.parentCountry || 'No Country'}
                      </div>
                    </div>
                  </Card.Body>
                </Card>

                {selectedRequest.status === 'PENDING' && (
                  <Card className="border-0 shadow-sm rounded-3">
                    <Card.Header className="bg-white border-bottom fw-bold text-dark">
                      Parent Account Setup
                    </Card.Header>
                    <Card.Body>
                      <Form.Group>
                        <Form.Label className="small fw-semibold">Generated Password</Form.Label>
                        <InputGroup size="sm">
                          <Form.Control
                            type="text"
                            required
                            value={parentPassword}
                            onChange={(e) => setParentPassword(e.target.value)}
                          />
                          <Button variant="outline-secondary" onClick={handleGenerateParentPassword}>
                            <i className="bi bi-arrow-clockwise"></i>
                          </Button>
                        </InputGroup>
                        <Form.Text className="text-muted">Memorable password word generated for the parent.</Form.Text>
                      </Form.Group>
                    </Card.Body>
                  </Card>
                )}
              </Col>

              {/* Children details and schedule/teacher configuration */}
              <Col lg={8}>
                {reviewStudents.map((std, sIdx) => (
                  <Card key={sIdx} className="border-0 shadow-sm rounded-3 mb-4">
                    <Card.Header className="bg-white border-bottom fw-bold text-dark d-flex justify-content-between align-items-center">
                      <span>Student: {std.name}</span>
                      {selectedRequest.status === 'PENDING' && (
                        <div className="d-flex align-items-center gap-2" style={{ maxWidth: '300px' }}>
                          <span className="small text-muted flex-shrink-0">Pass:</span>
                          <InputGroup size="sm">
                            <Form.Control
                              type="text"
                              required
                              value={std.password || ''}
                              onChange={(e) => {
                                const copy = [...reviewStudents];
                                copy[sIdx].password = e.target.value;
                                setReviewStudents(copy);
                              }}
                            />
                            <Button variant="outline-secondary" onClick={() => handleGenerateStudentPassword(sIdx)}>
                              <i className="bi bi-arrow-clockwise"></i>
                            </Button>
                          </InputGroup>
                        </div>
                      )}
                    </Card.Header>
                    <Card.Body>
                      {/* Basic details */}
                      <Row className="g-3 mb-3 border-bottom pb-3">
                        <Col md={6}>
                          <span className="small text-muted d-block">Login Email</span>
                          <span className="fw-medium text-dark">{std.email}</span>
                        </Col>
                        {std.dateOfBirth && (
                          <Col md={6}>
                            <span className="small text-muted d-block">DOB</span>
                            <span className="fw-medium text-dark">{std.dateOfBirth} ({std.dateOfBirthInWords || 'words N/A'})</span>
                          </Col>
                        )}
                        {std.bFormNumber && (
                          <Col md={6}>
                            <span className="small text-muted d-block">BForm / ID Number</span>
                            <span className="fw-medium text-dark">{std.bFormNumber}</span>
                          </Col>
                        )}
                        {std.admissionClass && (
                          <Col md={6}>
                            <span className="small text-muted d-block">Class / Department</span>
                            <span className="fw-medium text-dark">{std.admissionClass} / {std.admissionDepartment || 'N/A'}</span>
                          </Col>
                        )}
                        {(std.formalEducation || std.religiousEducation) && (
                          <Col md={12} className="small">
                            <span className="small text-muted d-block">Education Background</span>
                            <strong>Formal:</strong> {std.formalEducation || 'N/A'} | <strong>Religious:</strong> {std.religiousEducation || 'N/A'}
                          </Col>
                        )}
                        {std.previousInstitution && (
                          <Col md={12} className="small text-muted">
                            <strong>Prev School:</strong> {std.previousInstitution} (Reason: {std.previousInstitutionReason || 'N/A'})
                          </Col>
                        )}
                        {std.notes && (
                          <Col md={12} className="small bg-warning-subtle p-2 rounded text-dark">
                            <strong>Remarks/Health Constraints:</strong> {std.notes}
                          </Col>
                        )}
                      </Row>

                      {/* Requested Subjects */}
                      <h6 className="fw-bold mb-3 text-primary">Class Assignments & Schedule Setup</h6>
                      {std.subjects.map((sub, subIdx) => (
                        <div key={sub.courseId} className="border p-3 rounded bg-light mb-3">
                          <Row className="g-3">
                            <Col md={6}>
                              <span className="d-block small fw-bold text-dark mb-1">Subject / Course</span>
                              <span className="fs-6 fw-semibold text-primary">{getCourseName(sub.courseId)}</span>
                            </Col>
                            
                            <Col md={6}>
                              <Form.Group>
                                <Form.Label className="small fw-semibold text-dark mb-1">Assign Teacher *</Form.Label>
                                {selectedRequest.status === 'PENDING' ? (
                                  <Form.Select
                                    size="sm"
                                    required
                                    value={sub.teacherId}
                                    onChange={(e) => handleStudentTeacherChange(sIdx, subIdx, e.target.value)}
                                  >
                                    <option value="">Select Teacher...</option>
                                    {teachers.map(t => (
                                      <option key={t.id} value={t.id}>{t.name} ({t.email})</option>
                                    ))}
                                  </Form.Select>
                                ) : (
                                  <Form.Control
                                    size="sm"
                                    readOnly
                                    value={sub.teacherId ? (teachers.find(t => t.id === sub.teacherId)?.name || 'Assigned') : 'None'}
                                  />
                                )}
                              </Form.Group>
                            </Col>

                            <Col md={4}>
                              <Form.Group>
                                <Form.Label className="small fw-semibold">Monthly Tuition Fee</Form.Label>
                                <Form.Control
                                  size="sm"
                                  type="number"
                                  readOnly={selectedRequest.status !== 'PENDING'}
                                  value={sub.monthlyFee || 0}
                                  onChange={(e) => handleStudentSubjectFieldChange(sIdx, subIdx, 'monthlyFee', parseFloat(e.target.value) || 0)}
                                />
                              </Form.Group>
                            </Col>

                            <Col md={4}>
                              <Form.Group>
                                <Form.Label className="small fw-semibold">Currency</Form.Label>
                                <Form.Control
                                  size="sm"
                                  type="text"
                                  readOnly={selectedRequest.status !== 'PENDING'}
                                  value={sub.currency || 'PKR'}
                                  onChange={(e) => handleStudentSubjectFieldChange(sIdx, subIdx, 'currency', e.target.value)}
                                />
                              </Form.Group>
                            </Col>

                            <Col md={4}>
                              <Form.Group>
                                <Form.Label className="small fw-semibold">Timezone</Form.Label>
                                {selectedRequest.status === 'PENDING' ? (
                                  <Form.Select
                                    size="sm"
                                    value={sub.timezone}
                                    onChange={(e) => handleStudentSubjectFieldChange(sIdx, subIdx, 'timezone', e.target.value)}
                                  >
                                    {timezones.map(tz => (
                                      <option key={tz} value={tz}>{tz}</option>
                                    ))}
                                  </Form.Select>
                                ) : (
                                  <Form.Control size="sm" readOnly value={sub.timezone} />
                                )}
                              </Form.Group>
                            </Col>

                            <Col md={4}>
                              <Form.Group>
                                <Form.Label className="small fw-semibold">Preferred Start Time</Form.Label>
                                <Form.Control
                                  size="sm"
                                  type="time"
                                  readOnly={selectedRequest.status !== 'PENDING'}
                                  value={sub.startTime}
                                  onChange={(e) => handleStudentSubjectFieldChange(sIdx, subIdx, 'startTime', e.target.value)}
                                />
                              </Form.Group>
                            </Col>

                            <Col md={4}>
                              <Form.Group>
                                <Form.Label className="small fw-semibold">Duration (minutes)</Form.Label>
                                <Form.Control
                                  size="sm"
                                  type="number"
                                  readOnly={selectedRequest.status !== 'PENDING'}
                                  value={sub.duration}
                                  onChange={(e) => handleStudentSubjectFieldChange(sIdx, subIdx, 'duration', parseInt(e.target.value) || 60)}
                                />
                              </Form.Group>
                            </Col>

                            <Col md={12}>
                              <Form.Label className="small fw-semibold">Class Days</Form.Label>
                              <div className="d-flex flex-wrap gap-2">
                                {classDaysList.map(day => {
                                  const isSelected = sub.classDays.includes(day.value);
                                  const toggleDay = () => {
                                    if (selectedRequest.status !== 'PENDING') return;
                                    const copy = [...sub.classDays];
                                    const idx = copy.indexOf(day.value);
                                    if (idx > -1) {
                                      copy.splice(idx, 1);
                                    } else {
                                      copy.push(day.value);
                                    }
                                    handleStudentSubjectFieldChange(sIdx, subIdx, 'classDays', copy);
                                  };
                                  return (
                                    <Button
                                      key={day.value}
                                      size="sm"
                                      variant={isSelected ? 'primary' : 'outline-secondary'}
                                      onClick={toggleDay}
                                      style={{ padding: '2px 10px', fontSize: '0.8rem' }}
                                    >
                                      {day.label}
                                    </Button>
                                  );
                                })}
                              </div>
                            </Col>
                          </Row>
                        </div>
                      ))}
                    </Card.Body>
                  </Card>
                ))}
              </Col>

            </Row>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowReviewModal(false)}>Close</Button>
          {selectedRequest?.status === 'PENDING' && (
            <>
              <Button variant="danger" onClick={handleOpenReject}>Reject Request</Button>
              <Button variant="success" onClick={handleApprove}>Approve Admission</Button>
            </>
          )}
        </Modal.Footer>
      </Modal>

      {/* Reject Reason modal */}
      <Modal show={showRejectModal} onHide={() => setShowRejectModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Reject Registration Request</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group>
            <Form.Label>Please provide a reason for rejecting this request (optional):</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Incomplete details, selected course timing unavailable, etc."
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRejectModal(false)}>Cancel</Button>
          <Button variant="danger" onClick={handleReject}>Reject Request</Button>
        </Modal.Footer>
      </Modal>

      {/* Success Confirmation Modal (Show Credentials & Welcome message to Admin) */}
      <Modal show={showSuccessModal} onHide={() => setShowSuccessModal(false)} size="lg">
        <Modal.Header closeButton className="bg-success text-white">
          <Modal.Title>
            <i className="bi bi-check-circle-fill me-2"></i>
            Admission Approved Successfully!
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {successDetails && (
            <div>
              <Alert variant="info" className="mb-4">
                <i className="bi bi-info-circle-fill me-2"></i>
                Notification Dispatch Method: <strong>{
                  successDetails.notificationSent === 'WHATSAPP' ? 'Sent automatically via WhatsApp' :
                  successDetails.notificationSent === 'EMAIL' ? 'Sent automatically via Email (SMTP)' :
                  'Must be sent manually (no WhatsApp/Email settings configured)'
                }</strong>
              </Alert>

              <h5 className="fw-bold mb-3 text-dark border-bottom pb-2">Parent Credentials:</h5>
              <Row className="mb-4 bg-light p-3 rounded">
                <Col sm={6}><strong>Username:</strong> {successDetails.parentEmail}</Col>
                <Col sm={6}><strong>Password:</strong> {successDetails.parentPassword}</Col>
              </Row>

              <h5 className="fw-bold mb-3 text-dark border-bottom pb-2">Students Credentials:</h5>
              {successDetails.students.map((std: any, idx: number) => (
                <Row key={idx} className="mb-2 bg-light p-2 rounded mx-0">
                  <Col sm={4}><strong>Child:</strong> {std.name}</Col>
                  <Col sm={4}><strong>Username:</strong> {std.email}</Col>
                  <Col sm={4}><strong>Password:</strong> {std.password}</Col>
                </Row>
              ))}

              <h5 className="fw-bold mb-3 text-dark border-bottom pb-2 mt-4">Welcome Message Content:</h5>
              <Form.Control
                as="textarea"
                rows={12}
                readOnly
                value={successDetails.welcomeMessageText}
                className="bg-white font-monospace small mb-3"
              />

              <div className="d-flex justify-content-end">
                <Button variant="outline-primary" onClick={() => {
                  navigator.clipboard.writeText(successDetails.welcomeMessageText);
                  alert('Welcome message copied to clipboard!');
                }}>
                  <i className="bi bi-clipboard me-1"></i> Copy Welcome Message
                </Button>
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="success" onClick={() => setShowSuccessModal(false)}>Close & Refresh</Button>
        </Modal.Footer>
      </Modal>

    </>
  );
}

export const getStaticProps = async ({ locale }: any) => ({
  props: {
    ...(await serverSideTranslations(locale ?? 'en', ['common'])),
  },
});

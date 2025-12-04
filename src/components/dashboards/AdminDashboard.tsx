import FeeSubform from './FeeSubform';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import ParentAssociationSubform from '../ParentAssociationSubform';
import { Form, Button, Table, Card, Row, Col, Tabs, Tab, Alert, Spinner, Badge, Modal, InputGroup } from 'react-bootstrap';
import { Role, FeeStatus, AttendanceStatus, SalaryStatus, ClassDay, PayType, AssessmentType } from '@prisma/client';
import { timezones, getTimezonesByRegion, findTimezone } from '../../utils/timezones';
import AdminSubscriptionTab from './AdminSubscriptionTab';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import RemarkThreadModal from '../remarks/RemarkThreadModal';
import DirectMessageModal from '../messages/DirectMessageModal';
import AdminMenu from './AdminMenu';
import menuStyles from './AdminMenu.module.css';

interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
  mobile?: string;
  dateOfBirth?: string;
  address?: string;
  qualification?: string;
  payRate?: number;
  payType?: PayType;
  payCurrency?: string;
}

interface Course {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  _count?: {
    studentCourses: number;
  };
}

interface Assignment {
  id: string;
  studentId: string;
  courseId: string;
  teacherId: string;
  assignmentDate: string;
  startTime?: string;
  duration?: number;
  classDays: ClassDay[];
  timezone: string;
  monthlyFee?: number;
  currency: string;
  isActive: boolean;
  student: {
    id: string;
    name: string;
    email: string;
  };
  course: {
    id: string;
    name: string;
    description?: string;
  };
  teacher: {
    id: string;
    name: string;
    email: string;
  };
}

interface Fee {
  id: string;
  title: string;
  description?: string;
  amount: number;
  currency: string;
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
  course?: {
    id: string;
    name: string;
  };
}

interface Salary {
  id: string;
  title: string;
  description?: string;
  amount: number;
  currency: string;
  dueDate: string;
  status: SalaryStatus;
  paidDate?: string;
  teacher: {
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

interface AdminTestRecord {
  id: string;
  title: string;
  type: AssessmentType;
  performedAt: string;
  maxMarks: number;
  obtainedMarks: number;
  percentage: number;
  performanceNote?: string | null;
  remarks?: string | null;
  student: {
    id: string;
    name: string;
    email: string;
  };
  course: {
    id: string;
    name: string;
  };
  teacher: {
    id: string;
    name: string;
  };
}

interface Progress {
  id: string;
  date: string;
  lesson?: string;
  homework?: string;
  lessonProgress?: number;
  remarks?: string;
  attendance: AttendanceStatus;
  student: {
    id: string;
    name: string;
    email: string;
  };
  course: {
    id: string;
    name: string;
  };
  teacher: {
    id: string;
    name: string;
  };
  parentRemarks?: Array<{
    id: string;
    remark: string;
    createdAt: string;
    parent: {
      name: string;
    };
  }>;
}

const currencies = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'PKR', symbol: '₨', name: 'Pakistani Rupee' },
];

const roleConfig = {
  TEACHER: { icon: 'bi-person-workspace', color: 'success', title: 'Teachers' },
  PARENT: { icon: 'bi-people', color: 'info', title: 'Parents' },
  STUDENT: { icon: 'bi-mortarboard', color: 'warning', title: 'Students' },
  DEVELOPER: { icon: 'bi-code-slash', color: 'secondary', title: 'Developers' },
  ADMIN: { icon: 'bi-gear-fill', color: 'primary', title: 'Admins' }
} as const;

const daysOfWeek = [
  { value: 'MONDAY', label: 'Monday' },
  { value: 'TUESDAY', label: 'Tuesday' },
  { value: 'WEDNESDAY', label: 'Wednesday' },
  { value: 'THURSDAY', label: 'Thursday' },
  { value: 'FRIDAY', label: 'Friday' },
  { value: 'SATURDAY', label: 'Saturday' },
  { value: 'SUNDAY', label: 'Sunday' },
];

// Global getCurrencySymbol function for the main component
const getCurrencySymbol = (currencyCode: string) => {
  const currency = currencies.find(c => c.code === currencyCode);
  return currency ? currency.symbol : currencyCode;
};

// Assignment Subform Component
function AssignmentSubform({ 
  studentId, 
  assignments, 
  onAssignmentChange 
}: { 
  studentId: string;
  assignments: Assignment[];
  onAssignmentChange: () => void;
}) {
  const [teachers, setTeachers] = useState<User[]>([]);
  const [subjects, setSubjects] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Assignment form states
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [assignmentDate, setAssignmentDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [duration, setDuration] = useState('');
  const [classDays, setClassDays] = useState<string[]>([]);
  const [timezone, setTimezone] = useState('UTC');
  const [monthlyFee, setMonthlyFee] = useState('');
  const [currency, setCurrency] = useState('USD');

  const timezonesByRegion = getTimezonesByRegion();

  useEffect(() => {
    if (studentId) {
      fetchData();
    }
  }, [studentId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [teachersRes, subjectsRes] = await Promise.all([
        fetch('/api/users?role=TEACHER'),
        fetch('/api/subjects'),
      ]);
      
      if (teachersRes.ok) setTeachers(await teachersRes.json());
      if (subjectsRes.ok) setSubjects(await subjectsRes.json());
    } catch (error) {
      setError('Error fetching data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError('');
    setSuccess('');

    const payload: any = {
      studentId,
      courseId: selectedSubject,
      teacherId: selectedTeacher,
      assignmentDate: assignmentDate ? new Date(assignmentDate).toISOString() : new Date().toISOString(),
      startTime,
      duration: duration ? parseInt(duration) : null,
      classDays,
      timezone,
      monthlyFee: monthlyFee ? parseFloat(monthlyFee) : null,
      currency,
    };

    try {
      const res = await fetch('/api/assignments', {
        method: editingAssignment ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          editingAssignment
            ? { id: editingAssignment.id, ...payload }
            : payload
        ),
      });

      if (res.ok) {
        setSuccess(editingAssignment ? 'Assignment updated successfully!' : 'Assignment created successfully!');
        onAssignmentChange();
        resetForm();
        setShowCreateForm(false);
      } else {
        const errorData = await res.json();
        setError(errorData.message || `Failed to ${editingAssignment ? 'update' : 'create'} assignment`);
      }
    } catch (error) {
      setError(`Error ${editingAssignment ? 'updating' : 'creating'} assignment`);
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setSelectedSubject('');
    setSelectedTeacher('');
    setAssignmentDate('');
    setStartTime('');
    setDuration('');
    setClassDays([]);
    setTimezone('UTC');
    setMonthlyFee('');
    setCurrency('USD');
    setEditingAssignment(null);
  };

  const handleDayToggle = (day: string) => {
    setClassDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  const toggleForm = () => {
    setShowCreateForm(prev => {
      if (prev) {
        resetForm();
      }
      return !prev;
    });
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    if (!confirm('Are you sure you want to delete this assignment?')) return;

    try {
      const res = await fetch('/api/assignments', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: assignmentId }),
      });

      if (res.ok) {
        setSuccess('Assignment deleted successfully!');
        if (editingAssignment?.id === assignmentId) {
          resetForm();
          setShowCreateForm(false);
        }
        onAssignmentChange();
      } else {
        const errorData = await res.json();
        setError(errorData.message || 'Failed to delete assignment');
      }
    } catch (error) {
      setError('Error deleting assignment');
    }
  };

  const handleEditAssignment = (assignment: Assignment) => {
    setEditingAssignment(assignment);
    setSelectedSubject(assignment.courseId || '');
    setSelectedTeacher(assignment.teacherId || '');
    setAssignmentDate(
      assignment.assignmentDate
        ? new Date(assignment.assignmentDate).toISOString().slice(0, 10)
        : ''
    );
    setStartTime(assignment.startTime || '');
    setDuration(assignment.duration?.toString() || '');
    setClassDays(assignment.classDays || []);
    setTimezone(assignment.timezone || 'UTC');
    setMonthlyFee(assignment.monthlyFee?.toString() || '');
    setCurrency(assignment.currency || 'USD');
    setShowCreateForm(true);
  };

  if (loading) {
    return (
      <div className="text-center py-3">
        <Spinner animation="border" size="sm" />
        <p className="mt-2 text-muted small">Loading assignment data...</p>
      </div>
    );
  }

  return (
    <div>
      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

      <div className="d-flex justify-content-between align-items-center mb-3">
        <div className="d-flex align-items-center gap-2">
          <h6 className="mb-0">
            <i className="bi bi-list-task me-2"></i>
            Current Assignments
          </h6>
          <Badge bg="primary">{assignments.length}</Badge>
        </div>
        <Button
          variant={showCreateForm ? 'outline-secondary' : 'primary'}
          size="sm"
          onClick={toggleForm}
        >
          <i className="bi bi-plus-circle me-2"></i>
          {editingAssignment ? 'Cancel Edit' : showCreateForm ? 'Cancel' : 'Add New Assignment'}
        </Button>
      </div>

      {showCreateForm && (
        <Card className="mb-3">
          <Card.Body>
            {editingAssignment && (
              <Alert variant="info" className="py-2">
                <i className="bi bi-pencil-square me-2"></i>
                Editing assignment for {editingAssignment.course?.name || 'subject'}
              </Alert>
            )}
            <Form onSubmit={handleCreateAssignment}>
              <Row className="g-3">
                <Col lg={4} md={6}>
                  <Form.Group>
                    <Form.Label>Subject *</Form.Label>
                    <Form.Select 
                      value={selectedSubject}
                      onChange={(e) => setSelectedSubject(e.target.value)}
                      required
                      size="sm"
                    >
                      <option value="">Choose a subject...</option>
                      {subjects.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col lg={4} md={6}>
                  <Form.Group>
                    <Form.Label>Teacher *</Form.Label>
                    <Form.Select 
                      value={selectedTeacher}
                      onChange={(e) => setSelectedTeacher(e.target.value)}
                      required
                      size="sm"
                    >
                      <option value="">Choose a teacher...</option>
                      {teachers.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col lg={4} md={6}>
                  <Form.Group>
                    <Form.Label>Assignment Date</Form.Label>
                    <Form.Control 
                      type="date"
                      value={assignmentDate}
                      onChange={(e) => setAssignmentDate(e.target.value)}
                      size="sm"
                    />
                  </Form.Group>
                </Col>
                <Col lg={4} md={6}>
                  <Form.Group>
                    <Form.Label>Start Time</Form.Label>
                    <Form.Control 
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      size="sm"
                    />
                  </Form.Group>
                </Col>
                <Col lg={4} md={6}>
                  <Form.Group>
                    <Form.Label>Duration (minutes)</Form.Label>
                    <Form.Control 
                      type="number"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      placeholder="60"
                      size="sm"
                    />
                  </Form.Group>
                </Col>
                <Col lg={4} md={6}>
                  <Form.Group>
                    <Form.Label>Timezone</Form.Label>
                    <Form.Select 
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      size="sm"
                    >
                      {Object.entries(timezonesByRegion).map(([region, tzList]) => (
                        <optgroup key={region} label={region}>
                          {tzList.map(tz => (
                            <option key={tz.value} value={tz.value}>
                              {tz.label} ({tz.offset})
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col lg={4} md={6}>
                  <Form.Group>
                    <Form.Label>Monthly Fee</Form.Label>
                    <Form.Control 
                      type="number"
                      step="0.01"
                      value={monthlyFee}
                      onChange={(e) => setMonthlyFee(e.target.value)}
                      placeholder="0.00"
                      size="sm"
                    />
                  </Form.Group>
                </Col>
                <Col lg={4} md={6}>
                  <Form.Group>
                    <Form.Label>Currency</Form.Label>
                    <Form.Select 
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      size="sm"
                    >
                      {currencies.map(curr => (
                        <option key={curr.code} value={curr.code}>
                          {curr.code}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col lg={4} md={12}>
                  <Form.Group>
                    <Form.Label>Class Days</Form.Label>
                    <div className="d-flex flex-wrap gap-2">
                      {daysOfWeek.map(day => (
                        <Form.Check
                          key={day.value}
                          type="checkbox"
                          id={`day-${day.value}`}
                          label={day.label}
                          checked={classDays.includes(day.value)}
                          onChange={() => handleDayToggle(day.value)}
                          className="me-2"
                        />
                      ))}
                    </div>
                  </Form.Group>
                </Col>
              </Row>

              <div className="d-flex justify-content-end gap-2 mt-3">
                <Button
                  variant="secondary"
                  size="sm"
                  type="button"
                  onClick={() => {
                    resetForm();
                    setShowCreateForm(false);
                  }}
                  disabled={creating}
                >
                  Cancel
                </Button>
                <Button 
                  variant="primary" 
                  type="submit" 
                  disabled={creating}
                  size="sm"
                >
                  {creating ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      {editingAssignment ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    <>
                      <i className={`bi ${editingAssignment ? 'bi-check2-circle' : 'bi-plus-circle'} me-2`}></i>
                      {editingAssignment ? 'Update Assignment' : 'Save Assignment'}
                    </>
                  )}
                </Button>
              </div>
            </Form>
          </Card.Body>
        </Card>
      )}

      <Card className="shadow-sm">
        <Card.Header className="bg-light">
          <div className="d-flex justify-content-between align-items-center">
            <h6 className="mb-0">
              <i className="bi bi-list-task me-2"></i>
              Current Assignments
            </h6>
            <Badge bg="primary">{assignments.length}</Badge>
          </div>
        </Card.Header>
        <Card.Body className="p-0">
          {assignments.length === 0 ? (
            <div className="text-center py-4">
              <i className="bi bi-list-task display-6 text-muted"></i>
              <p className="mt-2 text-muted small">No assignments found</p>
            </div>
          ) : (
            <div className="table-responsive">
              <Table hover size="sm" className="mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Subject</th>
                    <th>Teacher</th>
                    <th>Schedule</th>
                    <th>Fee</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.map((assignment) => (
                    <tr key={assignment.id}>
                      <td className="fw-medium">{assignment.course?.name}</td>
                      <td className="text-muted">{assignment.teacher?.name}</td>
                      <td className="small">
                        {assignment.startTime && (
                          <div>{assignment.startTime}</div>
                        )}
                        {assignment.duration && (
                          <div className="text-muted">{assignment.duration}min</div>
                        )}
                        {assignment.classDays && assignment.classDays.length > 0 && (
                          <div className="text-muted">
                            {assignment.classDays.join(', ')}
                          </div>
                        )}
                        {assignment.timezone && (
                          <div className="text-muted small">
                            {findTimezone(assignment.timezone)?.label || assignment.timezone}
                          </div>
                        )}
                      </td>
                      <td>
                        {assignment.monthlyFee ? (
                          <Badge bg="success">
                            {getCurrencySymbol(assignment.currency)}{assignment.monthlyFee}
                          </Badge>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                      <td>
                        <div className="d-flex gap-2">
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={() => handleEditAssignment(assignment)}
                            title="Edit Assignment"
                          >
                            <i className="bi bi-pencil"></i>
                          </Button>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => handleDeleteAssignment(assignment.id)}
                            title="Delete Assignment"
                          >
                            <i className="bi bi-trash"></i>
                          </Button>
                        </div>
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
  );
}

// Detail View Modal Component
function DetailViewModal({ show, onHide, title, data }: { show: boolean; onHide: () => void; title: string; data: any }) {
  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="bi bi-eye me-2"></i>
          {title}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="row">
          {Object.entries(data || {}).map(([key, value]) => (
            <div key={key} className="col-md-6 mb-3">
              <strong className="text-capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</strong>
              <div className="mt-1">
                {(() => {
                  if (value && typeof value === 'object') {
                    if (Array.isArray(value)) {
                      return `${value.length} item(s)`;
                    }
                    // Show human-friendly info for common nested objects (e.g., student, teacher, course)
                    // Prefer name and optional email when available; fallback to pretty JSON for other objects
                    // @ts-ignore
                    const v: any = value;
                    if (v.name) {
                      return <span>{v.name}{v.email ? ` (${v.email})` : ''}</span>;
                    }
                    return <pre className="mb-0 small bg-light p-2 rounded">{JSON.stringify(value, null, 2)}</pre>;
                  }
                  return String(value ?? '-');
                })()}
              </div>
            </div>
          ))}
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
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

export function UserManagementTab({ role }: { role: Role }) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  // Create form state
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newMobile, setNewMobile] = useState('');
  const [newDateOfBirth, setNewDateOfBirth] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newQualification, setNewQualification] = useState('');
  const [newPayRate, setNewPayRate] = useState('');
  const [newPayType, setNewPayType] = useState<PayType>('MONTHLY');
  const [newPayCurrency, setNewPayCurrency] = useState('USD');
  const [showCreateForm, setShowCreateForm] = useState(false);
  // Edit form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mobile, setMobile] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [address, setAddress] = useState('');
  
  // Teacher-specific fields
  const [qualification, setQualification] = useState('');
  const [payRate, setPayRate] = useState('');
  const [payType, setPayType] = useState<PayType>('MONTHLY');
  const [payCurrency, setPayCurrency] = useState('USD');

  // Salary management states for teacher edit
  const [teacherPayments, setTeacherPayments] = useState<any[]>([]);
  const [teacherAdvances, setTeacherAdvances] = useState<any[]>([]);
  const [recordingPayment, setRecordingPayment] = useState(false);
  const [creatingAdvance, setCreatingAdvance] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [paymentDetails, setPaymentDetails] = useState('');
  const [advancePrincipal, setAdvancePrincipal] = useState('');
  const [advanceInstallments, setAdvanceInstallments] = useState('');
  const [advancePayType, setAdvancePayType] = useState<PayType>('MONTHLY');
  const [advanceCurrency, setAdvanceCurrency] = useState('USD');
  const [advanceDetails, setAdvanceDetails] = useState('');
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailData, setDetailData] = useState<any>(null);

  // Student-specific states
  const [studentAssignments, setStudentAssignments] = useState<Assignment[]>([]);
  const [studentFees, setStudentFees] = useState<Fee[]>([]);
  const [parentAssociations, setParentAssociations] = useState<any[]>([]);
  const [studentProgress, setStudentProgress] = useState<Progress[]>([]);
  const [studentTests, setStudentTests] = useState<AdminTestRecord[]>([]);
  const [studentProgressLoading, setStudentProgressLoading] = useState(false);
  const [studentTestsLoading, setStudentTestsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');

  const config = roleConfig[role as keyof typeof roleConfig];
  const roleLabel = role.charAt(0) + role.slice(1).toLowerCase();

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/users?role=${role}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(Array.isArray(data) ? data : []);
      } else {
        setError('Failed to fetch users');
        setUsers([]);
      }
    } catch (error) {
      setError('Error fetching users');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError('');
    setSuccess('');

    try {
      const userData: any = { 
        name: newName, 
        email: newEmail, 
        password: newPassword, 
        role,
        mobile: newMobile || undefined,
        dateOfBirth: newDateOfBirth || undefined,
        address: newAddress || undefined
      };

      // Only add teacher-specific fields for teachers
      if (role === 'TEACHER') {
        userData.qualification = newQualification || undefined;
        userData.payRate = newPayRate ? parseFloat(newPayRate) : undefined;
        userData.payType = newPayType;
        userData.payCurrency = newPayCurrency;
      }

      const res = await fetch('/api/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      if (res.ok) {
        setSuccess(`${role.toLowerCase()} created successfully!`);
        fetchUsers();
        resetCreateForm();
        setShowCreateForm(false);
      } else {
        const errorData = await res.json();
        setError(errorData.message || `Failed to create ${role.toLowerCase()}`);
      }
    } catch (error) {
      setError(`Error creating ${role.toLowerCase()}`);
    } finally {
      setCreating(false);
    }
  };

  const resetCreateForm = () => {
    setNewName('');
    setNewEmail('');
    setNewPassword('');
    setNewMobile('');
    setNewDateOfBirth('');
    setNewAddress('');
    setNewQualification('');
    setNewPayRate('');
    setNewPayType('MONTHLY');
    setNewPayCurrency('USD');
  };

  const resetEditForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setMobile('');
    setDateOfBirth('');
    setAddress('');
    setQualification('');
    setPayRate('');
    setPayType('MONTHLY');
    setPayCurrency('USD');
    setActiveTab('basic');
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingUser(null);
    resetEditForm();
    setStudentAssignments([]);
    setStudentFees([]);
    setParentAssociations([]);
    setStudentProgress([]);
    setStudentTests([]);
    setStudentProgressLoading(false);
    setStudentTestsLoading(false);
    setTeacherPayments([]);
    setTeacherAdvances([]);
    setRecordingPayment(false);
    setCreatingAdvance(false);
    setPaymentAmount('');
    setPaymentDate('');
    setPaymentDetails('');
    setAdvancePrincipal('');
    setAdvanceInstallments('');
    setAdvanceDetails('');
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setName(user.name);
    setEmail(user.email);
    setPassword('');
    setMobile(user.mobile || '');
    setDateOfBirth(user.dateOfBirth ? user.dateOfBirth.split('T')[0] : '');
    setAddress(user.address || '');
    setQualification(user.qualification || '');
    setPayRate(user.payRate?.toString() || '');
    setPayType(user.payType || 'MONTHLY');
    setPayCurrency(user.payCurrency || 'USD');
    setActiveTab('basic');
    
    if (role === 'STUDENT') {
      fetchStudentData(user.id);
    }
    if (role === 'TEACHER') {
      fetchTeacherSalaryData(user.id);
    }
    
    if (role !== 'STUDENT' && role !== 'TEACHER' && role !== 'PARENT') {
      setShowEditModal(true);
    }
  };

  const fetchStudentData = async (studentId: string) => {
    try {
      setLoading(true);
      setStudentProgressLoading(true);
      setStudentTestsLoading(true);
      const [assignmentsRes, feesRes, associationsRes, progressRes, testsRes] = await Promise.all([
        fetch('/api/assignments'),
        fetch('/api/fees'),
        fetch(`/api/users/parent-associations?studentId=${studentId}`),
        fetch('/api/progress'),
        fetch('/api/tests/records'),
      ]);

      if (assignmentsRes.ok) {
        const assignmentsData = await assignmentsRes.json();
        setStudentAssignments(assignmentsData.filter((a: Assignment) => a.studentId === studentId));
      } else {
        setError('Failed to fetch assignments');
        setStudentAssignments([]);
      }

      if (feesRes.ok) {
        const feesData = await feesRes.json();
        setStudentFees(feesData.filter((f: Fee) => f.student.id === studentId));
      } else {
        setError('Failed to fetch student data');
        setStudentFees([]);
      }

      if (associationsRes.ok) {
        const associationsData = await associationsRes.json();
        setParentAssociations(associationsData);
      } else {
        setError('Failed to fetch parent associations');
        setParentAssociations([]);
      }

      if (progressRes.ok) {
        const progressData = await progressRes.json();
        setStudentProgress(progressData.filter((p: Progress) => p.student.id === studentId));
      } else {
        setError('Failed to fetch progress data');
        setStudentProgress([]);
      }

      if (testsRes.ok) {
        const testsData = await testsRes.json();
        setStudentTests(testsData.filter((t: AdminTestRecord) => t.student.id === studentId));
      } else {
        setError('Failed to fetch test records');
        setStudentTests([]);
      }
    } catch (error) {
      console.error('Error fetching student data:', error);
    } finally {
      setLoading(false);
      setStudentProgressLoading(false);
      setStudentTestsLoading(false);
    }
  };

  const fetchTeacherSalaryData = async (teacherId: string) => {
    try {
      const res = await fetch(`/api/salaries/payments?teacherId=${teacherId}`);
      if (res.ok) {
        const data = await res.json();
        setTeacherPayments(data.payments || []);
        setTeacherAdvances(data.advances || []);
      }
    } catch (e) {
      // ignore
    }
  };

  const handleRecordPayment = async () => {
    if (!editingUser) return;
    setRecordingPayment(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/salaries/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId: editingUser.id,
          amount: parseFloat(paymentAmount),
          paidDate: paymentDate || undefined,
          paymentDetails: paymentDetails || undefined
        })
      });
      if (res.ok) {
        setSuccess('Salary payment recorded');
        setPaymentAmount('');
        setPaymentDate('');
        setPaymentDetails('');
        fetchTeacherSalaryData(editingUser.id);
      } else {
        const errorData = await res.json();
        setError(errorData.message || 'Failed to record payment');
      }
    } catch (error) {
      setError('Error recording payment');
    } finally {
      setRecordingPayment(false);
    }
  };

  const handleCreateAdvance = async () => {
    if (!editingUser) return;
    setCreatingAdvance(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/salaries/advance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId: editingUser.id,
          principal: parseFloat(advancePrincipal),
          installments: parseInt(advanceInstallments || '1', 10),
          payType: advancePayType,
          currency: advanceCurrency,
          details: advanceDetails || undefined
        })
      });
      if (res.ok) {
        setSuccess('Salary advance created');
        setAdvancePrincipal('');
        setAdvanceInstallments('');
        setAdvanceDetails('');
        fetchTeacherSalaryData(editingUser.id);
      } else {
        const errorData = await res.json();
        setError(errorData.message || 'Failed to create salary advance');
      }
    } catch (error) {
      setError('Error creating salary advance');
    } finally {
      setCreatingAdvance(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setEditing(true);
    setError('');
    setSuccess('');

    try {
      const updateData: any = { 
        id: editingUser.id,
        name, 
        email, 
        ...(password && { password }),
        mobile: mobile || undefined,
        dateOfBirth: dateOfBirth || undefined,
        address: address || undefined
      };

      // Only add teacher-specific fields for teachers
      if (role === 'TEACHER') {
        updateData.qualification = qualification || undefined;
        updateData.payRate = payRate ? parseFloat(payRate) : undefined;
        updateData.payType = payType;
        updateData.payCurrency = payCurrency;
      }

      const res = await fetch('/api/users/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      if (res.ok) {
        setSuccess(`${role.toLowerCase()} updated successfully!`);
        fetchUsers();
        closeEditModal();
      } else {
        const errorData = await res.json();
        setError(errorData.message || `Failed to update ${role.toLowerCase()}`);
      }
    } catch (error) {
      setError(`Error updating ${role.toLowerCase()}`);
    } finally {
      setEditing(false);
    }
  };

  const handleViewDetails = (user: User) => {
    // Hide teacher-only fields from Student and Parent detail views
    const data: any = { ...user };
    if (role !== 'TEACHER') {
      delete data.qualification;
      delete data.payRate;
      delete data.payType;
    }
    setDetailData(data);
    setShowDetailModal(true);
  };

  const handleAssignmentChange = () => {
    if (editingUser) {
      fetchStudentData(editingUser.id);
    }
  };

  const handleFeeChange = () => {
    if (editingUser) {
      fetchStudentData(editingUser.id);
    }
  };

  const handleAssociationChange = () => {
    if (editingUser) {
      fetchStudentData(editingUser.id);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Delete this user and related records? This cannot be undone.')) return;
    setDeletingId(userId);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/users/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId }),
      });
      if (res.ok) {
        setSuccess('User deleted successfully');
        fetchUsers();
        if (editingUser && editingUser.id === userId) {
          closeEditModal();
        }
      } else {
        const err = await res.json();
        setError(err.message || 'Failed to delete user');
      }
    } catch (e) {
      setError('Error deleting user');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

      {role === 'TEACHER' && !editingUser && (
        <>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div className="d-flex align-items-center gap-2">
              <i className={`${config.icon} text-${config.color}`}></i>
              <h6 className="mb-0">{config.title}</h6>
            </div>
            <Button
              size="sm"
              variant={showCreateForm ? 'secondary' : 'primary'}
              onClick={() => setShowCreateForm((v) => !v)}
            >
              {showCreateForm ? 'Hide Form' : 'Add New Teacher'}
            </Button>
          </div>

          {showCreateForm && (
            <Card className="shadow-sm mb-3">
              <Card.Header className={`bg-${config.color} text-white`}>
                <h6 className="mb-0">
                  <i className={`${config.icon} me-2`}></i>
                  Create New Teacher
                </h6>
              </Card.Header>
              <Card.Body>
                <Form onSubmit={handleCreateUser}>
                  <Row className="g-3">
                    <Col md={4}>
                      <Form.Group className="mb-0">
                        <Form.Label>Full Name</Form.Label>
                        <Form.Control
                          type="text"
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          required
                          placeholder="Enter full name"
                          size="sm"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group className="mb-0">
                        <Form.Label>Email Address</Form.Label>
                        <Form.Control
                          type="email"
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value)}
                          required
                          placeholder="Enter email address"
                          size="sm"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group className="mb-0">
                        <Form.Label>Password</Form.Label>
                        <Form.Control
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          required
                          placeholder="Enter password"
                          minLength={6}
                          size="sm"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group className="mb-0">
                        <Form.Label>Mobile Number</Form.Label>
                        <Form.Control
                          type="tel"
                          value={newMobile}
                          onChange={(e) => setNewMobile(e.target.value)}
                          placeholder="Enter mobile number"
                          size="sm"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group className="mb-0">
                        <Form.Label>Date of Birth</Form.Label>
                        <Form.Control
                          type="date"
                          value={newDateOfBirth}
                          onChange={(e) => setNewDateOfBirth(e.target.value)}
                          size="sm"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group className="mb-0">
                        <Form.Label>Qualification</Form.Label>
                        <Form.Control
                          type="text"
                          value={newQualification}
                          onChange={(e) => setNewQualification(e.target.value)}
                          placeholder="Enter qualification"
                          size="sm"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group className="mb-0">
                        <Form.Label>Pay Rate</Form.Label>
                        <Form.Control
                          type="number"
                          step="0.01"
                          value={newPayRate}
                          onChange={(e) => setNewPayRate(e.target.value)}
                          placeholder="0.00"
                          size="sm"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group className="mb-0">
                        <Form.Label>Salary Type</Form.Label>
                        <Form.Select
                          value={newPayType}
                          onChange={(e) => setNewPayType(e.target.value as PayType)}
                          size="sm"
                        >
                          <option value="DAILY">Daily</option>
                          <option value="WEEKLY">Weekly</option>
                          <option value="FORTNIGHTLY">Fortnightly</option>
                          <option value="MONTHLY">Monthly</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group className="mb-0">
                        <Form.Label>Pay Currency</Form.Label>
                        <Form.Select
                          value={newPayCurrency}
                          onChange={(e) => setNewPayCurrency(e.target.value)}
                          size="sm"
                        >
                          {currencies.map((currency) => (
                            <option key={currency.code} value={currency.code}>
                              {currency.code} - {currency.name}
                            </option>
                          ))}
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={12}>
                      <Form.Group className="mb-0">
                        <Form.Label>Address</Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={2}
                          value={newAddress}
                          onChange={(e) => setNewAddress(e.target.value)}
                          placeholder="Enter address"
                          size="sm"
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                  <div className="d-flex justify-content-end gap-2">
                    <Button
                      variant="secondary"
                      type="button"
                      size="sm"
                      onClick={() => setShowCreateForm(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant={config.color}
                      type="submit"
                      disabled={creating}
                      size="sm"
                    >
                      {creating ? (
                        <>
                          <Spinner animation="border" size="sm" className="me-2" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-plus-circle me-2"></i>
                          Create
                        </>
                      )}
                    </Button>
                  </div>
                </Form>
              </Card.Body>
            </Card>
          )}

          <Card className="shadow-sm">
            <Card.Header className="bg-light">
              <div className="d-flex justify-content-between align-items-center">
                <h6 className="mb-0">
                  <i className={`${config.icon} me-2`}></i>
                  {config.title}
                </h6>
                <Badge bg={config.color}>{users.length} Total</Badge>
              </div>
            </Card.Header>
            <Card.Body className="p-0">
              {loading ? (
                <div className="text-center py-4">
                  <Spinner animation="border" size="sm" />
                  <p className="mt-2 text-muted small">Loading {config.title.toLowerCase()}...</p>
                </div>
              ) : users.length === 0 ? (
                <div className="text-center py-4">
                  <i className={`${config.icon} display-6 text-muted`}></i>
                  <p className="mt-2 text-muted small">No {config.title.toLowerCase()} found</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <Table hover size="sm" className="mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Mobile</th>
                        <th>Pay Rate</th>
                        <th>Created</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user.id}>
                          <td className="fw-medium">{user.name}</td>
                          <td className="text-muted">{user.email}</td>
                          <td className="text-muted">{user.mobile || '-'}</td>
                          <td className="text-muted">
                            {user.payRate ? (
                              <Badge bg="success">
                                {getCurrencySymbol(user.payCurrency || 'USD')}
                                {user.payRate}
                                <small className="ms-1">/{user.payType?.toLowerCase()}</small>
                              </Badge>
                            ) : (
                              <Badge bg="secondary">N/A</Badge>
                            )}
                          </td>
                          <td className="text-muted small">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </td>
                          <td>
                            <div className="d-flex gap-1">
                              <Button
                                variant="outline-info"
                                size="sm"
                                onClick={() => handleViewDetails(user)}
                                title="View Details"
                              >
                                <i className="bi bi-eye"></i>
                              </Button>
                              <Button
                                variant="outline-warning"
                                size="sm"
                                onClick={() => handleEditUser(user)}
                                title="Edit User"
                              >
                                <i className="bi bi-pencil"></i>
                              </Button>
                              <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={() => handleDeleteUser(user.id)}
                                title="Delete User"
                                disabled={deletingId === user.id}
                              >
                                <i className="bi bi-trash"></i>
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </Card.Body>
          </Card>
        </>
      )}

      {role !== 'TEACHER' && (
        <>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div className="d-flex align-items-center gap-2">
              <i className={`${config.icon} text-${config.color}`}></i>
              <h6 className="mb-0">{config.title}</h6>
              <Badge bg={config.color}>{users.length} Total</Badge>
            </div>
            <Button
              size="sm"
              variant={showCreateForm ? 'secondary' : config.color}
              onClick={() => setShowCreateForm((v) => !v)}
            >
              {showCreateForm ? 'Hide Form' : `Add New ${role === 'STUDENT' ? 'Student' : role === 'PARENT' ? 'Parent' : roleLabel}`}
            </Button>
          </div>

          {showCreateForm && (
            <Card className="shadow-sm mb-3">
              <Card.Header className={`bg-${config.color} text-white`}>
                <h6 className="mb-0">
                  <i className={`${config.icon} me-2`}></i>
                  Create New {roleLabel}
                </h6>
              </Card.Header>
              <Card.Body>
                <Form onSubmit={handleCreateUser}>
                  <Row className="g-3">
                    <Col md={4}>
                      <Form.Group className="mb-0">
                        <Form.Label>Full Name</Form.Label>
                        <Form.Control
                          type="text"
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          required
                          placeholder="Enter full name"
                          size="sm"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group className="mb-0">
                        <Form.Label>Email Address</Form.Label>
                        <Form.Control
                          type="email"
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value)}
                          required
                          placeholder="Enter email address"
                          size="sm"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group className="mb-0">
                        <Form.Label>Password</Form.Label>
                        <Form.Control
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          required
                          placeholder="Enter password"
                          minLength={6}
                          size="sm"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group className="mb-0">
                        <Form.Label>Mobile Number</Form.Label>
                        <Form.Control
                          type="tel"
                          value={newMobile}
                          onChange={(e) => setNewMobile(e.target.value)}
                          placeholder="Enter mobile number"
                          size="sm"
                        />
                      </Form.Group>
                    </Col>
                    {role === 'STUDENT' && (
                      <Col md={4}>
                        <Form.Group className="mb-0">
                          <Form.Label>Date of Birth</Form.Label>
                          <Form.Control
                            type="date"
                            value={newDateOfBirth}
                            onChange={(e) => setNewDateOfBirth(e.target.value)}
                            size="sm"
                          />
                        </Form.Group>
                      </Col>
                    )}
                    <Col md={4}>
                      <Form.Group className="mb-0">
                        <Form.Label>Address</Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={2}
                          value={newAddress}
                          onChange={(e) => setNewAddress(e.target.value)}
                          placeholder="Enter address"
                          size="sm"
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  <div className="d-flex justify-content-end gap-2 mt-3">
                    <Button
                      variant="secondary"
                      type="button"
                      size="sm"
                      onClick={() => {
                        resetCreateForm();
                        setShowCreateForm(false);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant={config.color}
                      type="submit"
                      disabled={creating}
                      size="sm"
                    >
                      {creating ? (
                        <>
                          <Spinner animation="border" size="sm" className="me-2" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-plus-circle me-2"></i>
                          Create
                        </>
                      )}
                    </Button>
                  </div>
                </Form>
              </Card.Body>
            </Card>
          )}

        </>
      )}

          {role === 'STUDENT' && editingUser ? (
            <Card className="shadow-sm">
              <Card.Header className="bg-light d-flex flex-wrap justify-content-between align-items-center gap-2">
                <div className="d-flex align-items-center gap-2">
                  <i className="bi bi-pencil text-warning"></i>
                  <div>
                    <h6 className="mb-0">Editing Student</h6>
                    <small className="text-muted">{editingUser.name}</small>
                  </div>
                </div>
                <Button variant="outline-secondary" size="sm" onClick={closeEditModal}>
                  <i className="bi bi-arrow-left me-2"></i>
                  Back to List
                </Button>
              </Card.Header>
              <Card.Body className="p-3">
                <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k || 'basic')} className="mb-3">
                  <Tab eventKey="basic" title={
                    <span>
                      <i className="bi bi-person me-2"></i>
                      Basic Info
                    </span>
                  }>
                    <Form onSubmit={handleUpdateUser} className="mt-3">
                      <Row>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Full Name</Form.Label>
                            <Form.Control 
                              type="text" 
                              value={name} 
                              onChange={(e) => setName(e.target.value)} 
                              required 
                              placeholder="Enter full name"
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Email Address</Form.Label>
                            <Form.Control 
                              type="email" 
                              value={email} 
                              onChange={(e) => setEmail(e.target.value)} 
                              required 
                              placeholder="Enter email address"
                            />
                          </Form.Group>
                        </Col>
                      </Row>
                      <Row>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Mobile Number</Form.Label>
                            <Form.Control 
                              type="tel" 
                              value={mobile} 
                              onChange={(e) => setMobile(e.target.value)} 
                              placeholder="Enter mobile number"
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Date of Birth</Form.Label>
                            <Form.Control 
                              type="date" 
                              value={dateOfBirth} 
                              onChange={(e) => setDateOfBirth(e.target.value)} 
                            />
                          </Form.Group>
                        </Col>
                      </Row>
                      <Form.Group className="mb-3">
                        <Form.Label>Address</Form.Label>
                        <Form.Control 
                          as="textarea"
                          rows={3}
                          value={address} 
                          onChange={(e) => setAddress(e.target.value)} 
                          placeholder="Enter address"
                        />
                      </Form.Group>
                      <Form.Group className="mb-4">
                        <Form.Label>Password</Form.Label>
                        <Form.Control 
                          type="password" 
                          value={password} 
                          onChange={(e) => setPassword(e.target.value)} 
                          placeholder="Leave blank to keep current password"
                          minLength={6}
                        />
                        <Form.Text className="text-muted">
                          Leave blank to keep current password
                        </Form.Text>
                      </Form.Group>
                      <div className="d-flex justify-content-end gap-2">
                        <Button variant="secondary" onClick={closeEditModal}>
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          variant="warning"
                          disabled={editing}
                        >
                          {editing ? (
                            <>
                              <Spinner animation="border" size="sm" className="me-2" />
                              Updating...
                            </>
                          ) : (
                            <>
                              <i className="bi bi-check-circle me-2"></i>
                              Update
                            </>
                          )}
                        </Button>
                      </div>
                    </Form>
                  </Tab>
                  
                  <Tab eventKey="parents" title={
                    <span>
                      <i className="bi bi-people me-2"></i>
                      Parent Associations
                      {parentAssociations.length > 0 && (
                        <Badge bg="info" className="ms-2">{parentAssociations.length}</Badge>
                      )}
                    </span>
                  }>
                    {editingUser && (
                      <ParentAssociationSubform 
                        studentId={editingUser.id}
                        onAssociationChange={handleAssociationChange}
                      />
                    )}
                  </Tab>              
                  <Tab eventKey="assignments" title={
                    <span>
                      <i className="bi bi-diagram-3 me-2"></i>
                      Assignments
                      {studentAssignments.length > 0 && (
                        <Badge bg="primary" className="ms-2">{studentAssignments.length}</Badge>
                      )}
                    </span>
                  }>
                    {editingUser && (
                      <AssignmentSubform 
                        studentId={editingUser.id}
                        assignments={studentAssignments}
                        onAssignmentChange={handleAssignmentChange}
                      />
                    )}
                  </Tab>
                  
                  <Tab eventKey="progress" title={
                    <span>
                      <i className="bi bi-graph-up me-2"></i>
                      Progress
                      {studentProgress.length > 0 && (
                        <Badge bg="info" className="ms-2">{studentProgress.length}</Badge>
                      )}
                    </span>
                  }>
                    {editingUser && (
                      <StudentProgressTabContent
                        progress={studentProgress}
                        loading={studentProgressLoading}
                      />
                    )}
                  </Tab>

                  <Tab eventKey="tests" title={
                    <span>
                      <i className="bi bi-clipboard-data me-2"></i>
                      Tests & Exams
                      {studentTests.length > 0 && (
                        <Badge bg="success" className="ms-2">{studentTests.length}</Badge>
                      )}
                    </span>
                  }>
                    {editingUser && (
                      <StudentTestsTabContent
                        tests={studentTests}
                        loading={studentTestsLoading}
                      />
                    )}
                  </Tab>

                  <Tab eventKey="fees" title={
                    <span>
                      <i className="bi bi-cash-stack me-2"></i>
                      Fees
                      {studentFees.length > 0 && (
                        <Badge bg="success" className="ms-2">{studentFees.length}</Badge>
                      )}
                    </span>
                  }>
                    {editingUser && (
                      <FeeSubform
                        studentId={editingUser.id}
                        onFeeChange={handleFeeChange}
                      />
                    )}
                  </Tab>
                </Tabs>
              </Card.Body>
            </Card>
          ) : role === 'TEACHER' && editingUser ? (
            <Card className="shadow-sm">
              <Card.Header className="bg-light d-flex flex-wrap justify-content-between align-items-center gap-2">
                <div className="d-flex align-items-center gap-2">
                  <i className="bi bi-pencil text-warning"></i>
                  <div>
                    <h6 className="mb-0">Editing Teacher</h6>
                    <small className="text-muted">{editingUser.name}</small>
                  </div>
                </div>
                <Button variant="outline-secondary" size="sm" onClick={closeEditModal}>
                  <i className="bi bi-arrow-left me-2"></i>
                  Back to List
                </Button>
              </Card.Header>
              <Card.Body className="p-3">
                <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k || 'basic')} className="mb-3">
                  <Tab eventKey="basic" title={<span><i className="bi bi-person me-2"></i>Basic Info</span>}>
                    <Form onSubmit={handleUpdateUser} className="mt-3">
                      <Row className="g-3">
                        <Col md={4}>
                          <Form.Group>
                            <Form.Label>Full Name</Form.Label>
                            <Form.Control 
                              type="text" 
                              value={name} 
                              onChange={(e) => setName(e.target.value)} 
                              required 
                              placeholder="Enter full name"
                            />
                          </Form.Group>
                        </Col>
                        <Col md={4}>
                          <Form.Group>
                            <Form.Label>Email Address</Form.Label>
                            <Form.Control 
                              type="email" 
                              value={email} 
                              onChange={(e) => setEmail(e.target.value)} 
                              required 
                              placeholder="Enter email address"
                            />
                          </Form.Group>
                        </Col>
                        <Col md={4}>
                          <Form.Group>
                            <Form.Label>Mobile Number</Form.Label>
                            <Form.Control 
                              type="tel" 
                              value={mobile} 
                              onChange={(e) => setMobile(e.target.value)} 
                              placeholder="Enter mobile number"
                            />
                          </Form.Group>
                        </Col>
                        <Col md={4}>
                          <Form.Group>
                            <Form.Label>Date of Birth</Form.Label>
                            <Form.Control 
                              type="date" 
                              value={dateOfBirth} 
                              onChange={(e) => setDateOfBirth(e.target.value)} 
                            />
                          </Form.Group>
                        </Col>
                        <Col md={4}>
                          <Form.Group>
                            <Form.Label>Address</Form.Label>
                            <Form.Control 
                              as="textarea"
                              rows={2}
                              value={address} 
                              onChange={(e) => setAddress(e.target.value)} 
                              placeholder="Enter address"
                            />
                          </Form.Group>
                        </Col>
                        <Col md={4}>
                          <Form.Group>
                            <Form.Label>Qualification</Form.Label>
                            <Form.Control 
                              type="text" 
                              value={qualification} 
                              onChange={(e) => setQualification(e.target.value)} 
                              placeholder="Enter qualification"
                            />
                          </Form.Group>
                        </Col>
                        <Col md={4}>
                          <Form.Group>
                            <Form.Label>Pay Rate</Form.Label>
                            <Form.Control 
                              type="number" 
                              step="0.01"
                              value={payRate} 
                              onChange={(e) => setPayRate(e.target.value)} 
                              placeholder="0.00"
                            />
                          </Form.Group>
                        </Col>
                        <Col md={4}>
                          <Form.Group>
                            <Form.Label>Salary Type</Form.Label>
                            <Form.Select 
                              value={payType}
                              onChange={(e) => setPayType(e.target.value as PayType)}
                            >
                              <option value="DAILY">Daily</option>
                              <option value="WEEKLY">Weekly</option>
                              <option value="FORTNIGHTLY">Fortnightly</option>
                              <option value="MONTHLY">Monthly</option>
                            </Form.Select>
                          </Form.Group>
                        </Col>
                        <Col md={4}>
                          <Form.Group>
                            <Form.Label>Pay Currency</Form.Label>
                            <Form.Select 
                              value={payCurrency}
                              onChange={(e) => setPayCurrency(e.target.value)}
                            >
                              {currencies.map(currency => (
                                <option key={currency.code} value={currency.code}>
                                  {currency.code} - {currency.name}
                                </option>
                              ))}
                            </Form.Select>
                          </Form.Group>
                        </Col>
                        <Col md={4}>
                          <Form.Group className="mb-1">
                            <Form.Label>Password</Form.Label>
                            <Form.Control 
                              type="password" 
                              value={password} 
                              onChange={(e) => setPassword(e.target.value)} 
                              placeholder="Leave blank to keep current password"
                              minLength={6}
                            />
                            <Form.Text className="text-muted">
                              Leave blank to keep current password
                            </Form.Text>
                          </Form.Group>
                        </Col>
                      </Row>
                      <div className="d-flex justify-content-end gap-2 mt-3">
                        <Button variant="secondary" onClick={closeEditModal}>
                          Cancel
                        </Button>
                        <Button type="submit" variant="warning" disabled={editing}>
                          {editing ? (
                            <><Spinner animation="border" size="sm" className="me-2" />Updating...</>
                          ) : (
                            <><i className="bi bi-check-circle me-2"></i>Update</>
                          )}
                        </Button>
                      </div>
                    </Form>
                  </Tab>
                  <Tab eventKey="salaries" title={<span><i className="bi bi-cash-stack me-2"></i>Salary</span>}>
                    <Row className="g-3">
                      <Col md={6}>
                        <Card>
                          <Card.Header className="bg-light"><strong>Record Salary Payment</strong></Card.Header>
                          <Card.Body>
                            <Row>
                              <Col md={6}>
                                <Form.Group className="mb-3">
                                  <Form.Label>Amount</Form.Label>
                                  <Form.Control type="number" step="0.01" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} />
                                </Form.Group>
                              </Col>
                              <Col md={6}>
                                <Form.Group className="mb-3">
                                  <Form.Label>Paid Date</Form.Label>
                                  <Form.Control type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
                                </Form.Group>
                              </Col>
                            </Row>
                            <Form.Group className="mb-3">
                              <Form.Label>Payment Details/Remarks</Form.Label>
                              <Form.Control as="textarea" rows={2} value={paymentDetails} onChange={(e) => setPaymentDetails(e.target.value)} />
                            </Form.Group>
                            <div className="d-flex justify-content-end">
                              <Button variant="primary" size="sm" onClick={handleRecordPayment} disabled={recordingPayment}>
                                {recordingPayment ? 'Recording...' : 'Record Payment'}
                              </Button>
                            </div>
                          </Card.Body>
                        </Card>
                      </Col>
                      <Col md={6}>
                        <Card>
                          <Card.Header className="bg-light"><strong>Create Salary Advance/Loan</strong></Card.Header>
                          <Card.Body>
                            <Row>
                              <Col md={6}>
                                <Form.Group className="mb-3">
                                  <Form.Label>Principal</Form.Label>
                                  <Form.Control type="number" step="0.01" value={advancePrincipal} onChange={(e) => setAdvancePrincipal(e.target.value)} />
                                </Form.Group>
                              </Col>
                              <Col md={6}>
                                <Form.Group className="mb-3">
                                  <Form.Label>Installments</Form.Label>
                                  <Form.Control type="number" value={advanceInstallments} onChange={(e) => setAdvanceInstallments(e.target.value)} />
                                </Form.Group>
                              </Col>
                            </Row>
                            <Row>
                              <Col md={6}>
                                <Form.Group className="mb-3">
                                  <Form.Label>Repayment Frequency</Form.Label>
                                  <Form.Select value={advancePayType} onChange={(e) => setAdvancePayType(e.target.value as PayType)}>
                                    <option value="DAILY">Daily</option>
                                    <option value="WEEKLY">Weekly</option>
                                    <option value="FORTNIGHTLY">Fortnightly</option>
                                    <option value="MONTHLY">Monthly</option>
                                  </Form.Select>
                                </Form.Group>
                              </Col>
                              <Col md={6}>
                                <Form.Group className="mb-3">
                                  <Form.Label>Currency</Form.Label>
                                  <Form.Select value={advanceCurrency} onChange={(e) => setAdvanceCurrency(e.target.value)}>
                                    {currencies.map(currency => (
                                      <option key={currency.code} value={currency.code}>{currency.code}</option>
                                    ))}
                                  </Form.Select>
                                </Form.Group>
                              </Col>
                            </Row>
                            <Form.Group className="mb-3">
                              <Form.Label>Details/Remarks</Form.Label>
                              <Form.Control as="textarea" rows={2} value={advanceDetails} onChange={(e) => setAdvanceDetails(e.target.value)} />
                            </Form.Group>
                            <div className="d-flex justify-content-end">
                              <Button variant="warning" size="sm" onClick={handleCreateAdvance} disabled={creatingAdvance}>
                                {creatingAdvance ? 'Creating...' : 'Create Advance'}
                              </Button>
                            </div>
                          </Card.Body>
                        </Card>
                      </Col>
                    </Row>

                    <Row className="g-3 mt-2">
                      <Col md={6}>
                        <Card>
                          <Card.Header className="bg-light"><strong>Payment History</strong></Card.Header>
                          <Card.Body className="p-0">
                            <div className="table-responsive">
                              <Table size="sm" className="mb-0">
                                <thead className="table-light">
                                  <tr>
                                    <th>Amount</th>
                                    <th>Date</th>
                                    <th>Details</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {teacherPayments.length === 0 ? (
                                    <tr><td colSpan={3} className="text-center text-muted small py-3">No records</td></tr>
                                  ) : teacherPayments.map((p) => (
                                    <tr key={p.id}>
                                      <td className="fw-bold text-success">{getCurrencySymbol(p.currency)}{p.amount.toFixed(2)}</td>
                                      <td className="small">{new Date(p.paidDate).toLocaleDateString()}</td>
                                      <td className="small">{p.paymentDetails || '-'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </Table>
                            </div>
                          </Card.Body>
                        </Card>
                      </Col>
                      <Col md={6}>
                        <Card>
                          <Card.Header className="bg-light"><strong>Advances/Loans</strong></Card.Header>
                          <Card.Body className="p-0">
                            <div className="table-responsive">
                              <Table size="sm" className="mb-0">
                                <thead className="table-light">
                                  <tr>
                                    <th>Principal</th>
                                    <th>Balance</th>
                                    <th>Installments</th>
                                    <th>Status</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {teacherAdvances.length === 0 ? (
                                    <tr><td colSpan={4} className="text-center text-muted small py-3">No records</td></tr>
                                  ) : teacherAdvances.map((a) => (
                                    <tr key={a.id}>
                                      <td className="fw-bold">{getCurrencySymbol(a.currency)}{a.principal.toFixed(2)}</td>
                                      <td>{getCurrencySymbol(a.currency)}{a.balance.toFixed(2)}</td>
                                      <td>{a.installments} x {a.installmentAmount}</td>
                                      <td><Badge bg={a.status === 'ACTIVE' ? 'warning' : a.status === 'COMPLETED' ? 'success' : 'secondary'}>{a.status}</Badge></td>
                                    </tr>
                                  ))}
                                </tbody>
                              </Table>
                            </div>
                          </Card.Body>
                        </Card>
                      </Col>
                    </Row>
                  </Tab>
                </Tabs>
              </Card.Body>
            </Card>
          ) : role === 'PARENT' && editingUser ? (
            <Card className="shadow-sm">
              <Card.Header className="bg-light d-flex flex-wrap justify-content-between align-items-center gap-2">
                <div className="d-flex align-items-center gap-2">
                  <i className="bi bi-pencil text-warning"></i>
                  <div>
                    <h6 className="mb-0">Editing Parent</h6>
                    <small className="text-muted">{editingUser.name}</small>
                  </div>
                </div>
                <Button variant="outline-secondary" size="sm" onClick={closeEditModal}>
                  <i className="bi bi-arrow-left me-2"></i>
                  Back to List
                </Button>
              </Card.Header>
              <Card.Body>
                <Form onSubmit={handleUpdateUser}>
                  <Row className="g-3">
                    <Col md={4}>
                      <Form.Group>
                        <Form.Label>Full Name</Form.Label>
                        <Form.Control 
                          type="text" 
                          value={name} 
                          onChange={(e) => setName(e.target.value)} 
                          required 
                          placeholder="Enter full name"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group>
                        <Form.Label>Email Address</Form.Label>
                        <Form.Control 
                          type="email" 
                          value={email} 
                          onChange={(e) => setEmail(e.target.value)} 
                          required 
                          placeholder="Enter email address"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group>
                        <Form.Label>Mobile Number</Form.Label>
                        <Form.Control 
                          type="tel" 
                          value={mobile} 
                          onChange={(e) => setMobile(e.target.value)} 
                          placeholder="Enter mobile number"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group>
                        <Form.Label>Date of Birth</Form.Label>
                        <Form.Control 
                          type="date" 
                          value={dateOfBirth} 
                          onChange={(e) => setDateOfBirth(e.target.value)} 
                        />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group>
                        <Form.Label>Address</Form.Label>
                        <Form.Control 
                          as="textarea"
                          rows={2}
                          value={address} 
                          onChange={(e) => setAddress(e.target.value)} 
                          placeholder="Enter address"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group>
                        <Form.Label>Qualification</Form.Label>
                        <Form.Control 
                          type="text" 
                          value={qualification} 
                          onChange={(e) => setQualification(e.target.value)} 
                          placeholder="Enter qualification"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group>
                        <Form.Label>Pay Rate</Form.Label>
                        <Form.Control 
                          type="number" 
                          step="0.01"
                          value={payRate} 
                          onChange={(e) => setPayRate(e.target.value)} 
                          placeholder="0.00"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group>
                        <Form.Label>Salary Type</Form.Label>
                        <Form.Select 
                          value={payType}
                          onChange={(e) => setPayType(e.target.value as PayType)}
                        >
                          <option value="DAILY">Daily</option>
                          <option value="WEEKLY">Weekly</option>
                          <option value="FORTNIGHTLY">Fortnightly</option>
                          <option value="MONTHLY">Monthly</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group>
                        <Form.Label>Pay Currency</Form.Label>
                        <Form.Select 
                          value={payCurrency}
                          onChange={(e) => setPayCurrency(e.target.value)}
                        >
                          {currencies.map(currency => (
                            <option key={currency.code} value={currency.code}>
                              {currency.code} - {currency.name}
                            </option>
                          ))}
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group className="mb-1">
                        <Form.Label>Password</Form.Label>
                        <Form.Control 
                          type="password" 
                          value={password} 
                          onChange={(e) => setPassword(e.target.value)} 
                          placeholder="Leave blank to keep current password"
                          minLength={6}
                        />
                        <Form.Text className="text-muted">
                          Leave blank to keep current password
                        </Form.Text>
                      </Form.Group>
                    </Col>
                  </Row>
                  <div className="d-flex justify-content-end gap-2 mt-3">
                    <Button variant="secondary" onClick={closeEditModal}>
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="warning"
                      disabled={editing}
                    >
                      {editing ? (
                        <>
                          <Spinner animation="border" size="sm" className="me-2" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-check-circle me-2"></i>
                          Update
                        </>
                      )}
                    </Button>
                  </div>
                </Form>
              </Card.Body>
            </Card>
          ) : role !== 'TEACHER' ? (
            <Card className="shadow-sm">
              <Card.Header className="bg-light">
                <div className="d-flex justify-content-between align-items-center">
                  <h6 className="mb-0">
                    <i className={`${config.icon} me-2`}></i>
                    {config.title}
                  </h6>
                  <Badge bg={config.color}>{users.length} Total</Badge>
                </div>
              </Card.Header>
              <Card.Body className="p-0">
                {loading ? (
                  <div className="text-center py-4">
                    <Spinner animation="border" size="sm" />
                    <p className="mt-2 text-muted small">Loading {config.title.toLowerCase()}...</p>
                  </div>
                ) : users.length === 0 ? (
                  <div className="text-center py-4">
                    <i className={`${config.icon} display-6 text-muted`}></i>
                    <p className="mt-2 text-muted small">No {config.title.toLowerCase()} found</p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <Table hover size="sm" className="mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Mobile</th>
                          <th>Created</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((user) => (
                          <tr key={user.id}>
                            <td className="fw-medium">{user.name}</td>
                            <td className="text-muted">{user.email}</td>
                            <td className="text-muted">{user.mobile || '-'}</td>
                            <td className="text-muted small">
                              {new Date(user.createdAt).toLocaleDateString()}
                            </td>
                            <td>
                              <div className="d-flex gap-1">
                                <Button
                                  variant="outline-info"
                                  size="sm"
                                  onClick={() => handleViewDetails(user)}
                                  title="View Details"
                                >
                                  <i className="bi bi-eye"></i>
                                </Button>
                                <Button
                                  variant="outline-warning"
                                  size="sm"
                                  onClick={() => handleEditUser(user)}
                                  title="Edit User"
                                >
                                  <i className="bi bi-pencil"></i>
                                </Button>
                                <Button
                                  variant="outline-danger"
                                  size="sm"
                                  onClick={() => handleDeleteUser(user.id)}
                                  title="Delete User"
                                  disabled={deletingId === user.id}
                                >
                                  <i className="bi bi-trash"></i>
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                )}
              </Card.Body>
            </Card>
          ) : null}

      {/* Enhanced Edit User Modal for non-student roles */}
      {role !== 'STUDENT' && (
      <Modal show={showEditModal} onHide={closeEditModal} size={role === 'TEACHER' ? 'xl' : 'lg'}>
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-pencil me-2"></i>
            Edit {roleLabel}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {role === 'TEACHER' ? (
            <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k || 'basic')} className="mb-3">
              <Tab eventKey="basic" title={<span><i className="bi bi-person me-2"></i>Basic Info</span>}>
                <Form onSubmit={handleUpdateUser}>
                  <Form.Group className="mb-3">
                    <Form.Label>Full Name</Form.Label>
                    <Form.Control 
                      type="text" 
                      value={name} 
                      onChange={(e) => setName(e.target.value)} 
                      required 
                      placeholder="Enter full name"
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Email Address</Form.Label>
                    <Form.Control 
                      type="email" 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)} 
                      required 
                      placeholder="Enter email address"
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Mobile Number</Form.Label>
                    <Form.Control 
                      type="tel" 
                      value={mobile} 
                      onChange={(e) => setMobile(e.target.value)} 
                      placeholder="Enter mobile number"
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Date of Birth</Form.Label>
                    <Form.Control 
                      type="date" 
                      value={dateOfBirth} 
                      onChange={(e) => setDateOfBirth(e.target.value)} 
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Address</Form.Label>
                    <Form.Control 
                      as="textarea"
                      rows={2}
                      value={address} 
                      onChange={(e) => setAddress(e.target.value)} 
                      placeholder="Enter address"
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Qualification</Form.Label>
                    <Form.Control 
                      type="text" 
                      value={qualification} 
                      onChange={(e) => setQualification(e.target.value)} 
                      placeholder="Enter qualification"
                    />
                  </Form.Group>
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Pay Rate</Form.Label>
                        <Form.Control 
                          type="number" 
                          step="0.01"
                          value={payRate} 
                          onChange={(e) => setPayRate(e.target.value)} 
                          placeholder="0.00"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Salary Type</Form.Label>
                        <Form.Select 
                          value={payType}
                          onChange={(e) => setPayType(e.target.value as PayType)}
                        >
                          <option value="DAILY">Daily</option>
                          <option value="WEEKLY">Weekly</option>
                          <option value="FORTNIGHTLY">Fortnightly</option>
                          <option value="MONTHLY">Monthly</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                  </Row>
                  <Form.Group className="mb-3">
                    <Form.Label>Pay Currency</Form.Label>
                    <Form.Select 
                      value={payCurrency}
                      onChange={(e) => setPayCurrency(e.target.value)}
                    >
                      {currencies.map(currency => (
                        <option key={currency.code} value={currency.code}>
                          {currency.code} - {currency.name}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                  <Form.Group className="mb-4">
                    <Form.Label>Password</Form.Label>
                    <Form.Control 
                      type="password" 
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)} 
                      placeholder="Leave blank to keep current password"
                      minLength={6}
                    />
                    <Form.Text className="text-muted">
                      Leave blank to keep current password
                    </Form.Text>
                  </Form.Group>
                  <div className="d-flex justify-content-end gap-2">
                    <Button variant="secondary" onClick={closeEditModal}>
                      Cancel
                    </Button>
                    <Button type="submit" variant="warning" disabled={editing}>
                      {editing ? (
                        <><Spinner animation="border" size="sm" className="me-2" />Updating...</>
                      ) : (
                        <><i className="bi bi-check-circle me-2"></i>Update</>
                      )}
                    </Button>
                  </div>
                </Form>
              </Tab>
              <Tab eventKey="salaries" title={<span><i className="bi bi-cash-stack me-2"></i>Salary</span>}>
                <Row className="g-3">
                  <Col md={6}>
                    <Card>
                      <Card.Header className="bg-light"><strong>Record Salary Payment</strong></Card.Header>
                      <Card.Body>
                        <Row>
                          <Col md={6}>
                            <Form.Group className="mb-3">
                              <Form.Label>Amount</Form.Label>
                              <Form.Control type="number" step="0.01" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} />
                            </Form.Group>
                          </Col>
                          <Col md={6}>
                            <Form.Group className="mb-3">
                              <Form.Label>Paid Date</Form.Label>
                              <Form.Control type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
                            </Form.Group>
                          </Col>
                        </Row>
                        <Form.Group className="mb-3">
                          <Form.Label>Payment Details/Remarks</Form.Label>
                          <Form.Control as="textarea" rows={2} value={paymentDetails} onChange={(e) => setPaymentDetails(e.target.value)} />
                        </Form.Group>
                        <div className="d-flex justify-content-end">
                          <Button variant="primary" size="sm" onClick={handleRecordPayment} disabled={recordingPayment}>
                            {recordingPayment ? 'Recording...' : 'Record Payment'}
                          </Button>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={6}>
                    <Card>
                      <Card.Header className="bg-light"><strong>Create Salary Advance/Loan</strong></Card.Header>
                      <Card.Body>
                        <Row>
                          <Col md={6}>
                            <Form.Group className="mb-3">
                              <Form.Label>Principal</Form.Label>
                              <Form.Control type="number" step="0.01" value={advancePrincipal} onChange={(e) => setAdvancePrincipal(e.target.value)} />
                            </Form.Group>
                          </Col>
                          <Col md={6}>
                            <Form.Group className="mb-3">
                              <Form.Label>Installments</Form.Label>
                              <Form.Control type="number" value={advanceInstallments} onChange={(e) => setAdvanceInstallments(e.target.value)} />
                            </Form.Group>
                          </Col>
                        </Row>
                        <Row>
                          <Col md={6}>
                            <Form.Group className="mb-3">
                              <Form.Label>Repayment Frequency</Form.Label>
                              <Form.Select value={advancePayType} onChange={(e) => setAdvancePayType(e.target.value as PayType)}>
                                <option value="DAILY">Daily</option>
                                <option value="WEEKLY">Weekly</option>
                                <option value="FORTNIGHTLY">Fortnightly</option>
                                <option value="MONTHLY">Monthly</option>
                              </Form.Select>
                            </Form.Group>
                          </Col>
                          <Col md={6}>
                            <Form.Group className="mb-3">
                              <Form.Label>Currency</Form.Label>
                              <Form.Select value={advanceCurrency} onChange={(e) => setAdvanceCurrency(e.target.value)}>
                                {currencies.map(currency => (
                                  <option key={currency.code} value={currency.code}>{currency.code}</option>
                                ))}
                              </Form.Select>
                            </Form.Group>
                          </Col>
                        </Row>
                        <Form.Group className="mb-3">
                          <Form.Label>Details/Remarks</Form.Label>
                          <Form.Control as="textarea" rows={2} value={advanceDetails} onChange={(e) => setAdvanceDetails(e.target.value)} />
                        </Form.Group>
                        <div className="d-flex justify-content-end">
                          <Button variant="warning" size="sm" onClick={handleCreateAdvance} disabled={creatingAdvance}>
                            {creatingAdvance ? 'Creating...' : 'Create Advance'}
                          </Button>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>

                <Row className="g-3 mt-2">
                  <Col md={6}>
                    <Card>
                      <Card.Header className="bg-light"><strong>Payment History</strong></Card.Header>
                      <Card.Body className="p-0">
                        <div className="table-responsive">
                          <Table size="sm" className="mb-0">
                            <thead className="table-light">
                              <tr>
                                <th>Amount</th>
                                <th>Date</th>
                                <th>Details</th>
                              </tr>
                            </thead>
                            <tbody>
                              {teacherPayments.length === 0 ? (
                                <tr><td colSpan={3} className="text-center text-muted small py-3">No records</td></tr>
                              ) : teacherPayments.map((p) => (
                                <tr key={p.id}>
                                  <td className="fw-bold text-success">{getCurrencySymbol(p.currency)}{p.amount.toFixed(2)}</td>
                                  <td className="small">{new Date(p.paidDate).toLocaleDateString()}</td>
                                  <td className="small">{p.paymentDetails || '-'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </Table>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={6}>
                    <Card>
                      <Card.Header className="bg-light"><strong>Advances/Loans</strong></Card.Header>
                      <Card.Body className="p-0">
                        <div className="table-responsive">
                          <Table size="sm" className="mb-0">
                            <thead className="table-light">
                              <tr>
                                <th>Principal</th>
                                <th>Balance</th>
                                <th>Installments</th>
                                <th>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {teacherAdvances.length === 0 ? (
                                <tr><td colSpan={4} className="text-center text-muted small py-3">No records</td></tr>
                              ) : teacherAdvances.map((a) => (
                                <tr key={a.id}>
                                  <td className="fw-bold">{getCurrencySymbol(a.currency)}{a.principal.toFixed(2)}</td>
                                  <td>{getCurrencySymbol(a.currency)}{a.balance.toFixed(2)}</td>
                                  <td>{a.installments} x {a.installmentAmount}</td>
                                  <td><Badge bg={a.status === 'ACTIVE' ? 'warning' : a.status === 'COMPLETED' ? 'success' : 'secondary'}>{a.status}</Badge></td>
                                </tr>
                              ))}
                            </tbody>
                          </Table>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
              </Tab>
            </Tabs>
          ) : (
            <Form onSubmit={handleUpdateUser}>
              <Form.Group className="mb-3">
                <Form.Label>Full Name</Form.Label>
                <Form.Control 
                  type="text" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  required 
                  placeholder="Enter full name"
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Email Address</Form.Label>
                <Form.Control 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  required 
                  placeholder="Enter email address"
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Mobile Number</Form.Label>
                <Form.Control 
                  type="tel" 
                  value={mobile} 
                  onChange={(e) => setMobile(e.target.value)} 
                  placeholder="Enter mobile number"
                />
              </Form.Group>
                            <Form.Group className="mb-3">
                <Form.Label>Address</Form.Label>
                <Form.Control 
                  as="textarea"
                  rows={2}
                  value={address} 
                  onChange={(e) => setAddress(e.target.value)} 
                  placeholder="Enter address"
                />
              </Form.Group>
              
                            
              <Form.Group className="mb-4">
                <Form.Label>Password</Form.Label>
                <Form.Control 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  placeholder="Leave blank to keep current password"
                  minLength={6}
                />
                <Form.Text className="text-muted">
                  Leave blank to keep current password
                </Form.Text>
              </Form.Group>
              <div className="d-flex justify-content-end gap-2">
                <Button variant="secondary" onClick={closeEditModal}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="warning"
                  disabled={editing}
                >
                  {editing ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check-circle me-2"></i>
                      Update
                    </>
                  )}
                </Button>
              </div>
            </Form>
          )}
        </Modal.Body>
      </Modal>
      )}

      {/* Detail View Modal */}
      <DetailViewModal
        show={showDetailModal}
        onHide={() => setShowDetailModal(false)}
        title={`${roleLabel} Details`}
        data={detailData}
      />
    </div>
  );
}

function SubjectManagementTab() {
  const [subjects, setSubjects] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Course | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailData, setDetailData] = useState<any>(null);

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/subjects');
      if (res.ok) {
        const data = await res.json();
        setSubjects(data);
      } else {
        setError('Failed to fetch subjects');
      }
    } catch (error) {
      setError('Error fetching subjects');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/subjects/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description }),
      });

      if (res.ok) {
        setSuccess('Subject created successfully!');
        fetchSubjects();
        setName('');
        setDescription('');
      } else {
        const errorData = await res.json();
        setError(errorData.message || 'Failed to create subject');
      }
    } catch (error) {
      setError('Error creating subject');
    } finally {
      setCreating(false);
    }
  };

  const handleEditSubject = (subject: Course) => {
    setEditingSubject(subject);
    setName(subject.name);
    setDescription(subject.description || '');
    setShowEditModal(true);
  };

  const handleUpdateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubject) return;

    setEditing(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/subjects/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: editingSubject.id,
          name, 
          description
        }),
      });

      if (res.ok) {
        setSuccess('Subject updated successfully!');
        fetchSubjects();
        setShowEditModal(false);
        setEditingSubject(null);
      } else {
        const errorData = await res.json();
        setError(errorData.message || 'Failed to update subject');
      }
    } catch (error) {
      setError('Error updating subject');
    } finally {
      setEditing(false);
    }
  };

  const handleViewDetails = (subject: Course) => {
    setDetailData(subject);
    setShowDetailModal(true);
  };

  return (
    <div>
      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

      <Row className="g-4">
        <Col lg={4}>
          <Card className="h-100 shadow-sm">
            <Card.Header className="bg-primary text-white">
              <h6 className="mb-0">
                <i className="bi bi-book me-2"></i>
                Create New Subject
              </h6>
            </Card.Header>
            <Card.Body>
              <Form onSubmit={handleCreateSubject}>
                <Form.Group className="mb-3">
                  <Form.Label>Subject Name</Form.Label>
                  <Form.Control 
                    type="text" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    required 
                    placeholder="Enter subject name"
                    size="sm"
                  />
                </Form.Group>
                <Form.Group className="mb-4">
                  <Form.Label>Description</Form.Label>
                  <Form.Control 
                    as="textarea" 
                    rows={3} 
                    value={description} 
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Enter subject description"
                    size="sm"
                  />
                </Form.Group>
                <Button 
                  variant="primary" 
                  type="submit" 
                  disabled={creating}
                  className="w-100"
                  size="sm"
                >
                  {creating ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-plus-circle me-2"></i>
                      Create Subject
                    </>
                  )}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={8}>
          <Card className="shadow-sm">
            <Card.Header className="bg-light">
              <div className="d-flex justify-content-between align-items-center">
                <h6 className="mb-0">
                  <i className="bi bi-book me-2"></i>
                  Subjects
                </h6>
                <Badge bg="primary">{subjects.length} Total</Badge>
              </div>
            </Card.Header>
            <Card.Body className="p-0">
              {loading ? (
                <div className="text-center py-4">
                  <Spinner animation="border" size="sm" />
                  <p className="mt-2 text-muted small">Loading subjects...</p>
                </div>
              ) : subjects.length === 0 ? (
                <div className="text-center py-4">
                  <i className="bi bi-book display-6 text-muted"></i>
                  <p className="mt-2 text-muted small">No subjects found</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <Table hover size="sm" className="mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Name</th>
                        <th>Description</th>
                        <th>Students</th>
                        <th>Created</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subjects.map((subject) => (
                        <tr key={subject.id}>
                          <td className="fw-medium">{subject.name}</td>
                          <td className="text-muted">
                            <ExpandableText 
                              text={subject.description || 'No description'} 
                              maxLength={50} 
                            />
                          </td>
                          <td>
                            <Badge bg="secondary">
                              {subject._count?.studentCourses || 0}
                            </Badge>
                          </td>
                          <td className="text-muted small">
                            {new Date(subject.createdAt).toLocaleDateString()}
                          </td>
                          <td>
                            <div className="d-flex gap-1">
                              <Button
                                variant="outline-info"
                                size="sm"
                                onClick={() => handleViewDetails(subject)}
                                title="View Details"
                              >
                                <i className="bi bi-eye"></i>
                              </Button>
                              <Button
                                variant="outline-warning"
                                size="sm"
                                onClick={() => handleEditSubject(subject)}
                                title="Edit Subject"
                              >
                                <i className="bi bi-pencil"></i>
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Edit Subject Modal */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-pencil me-2"></i>
            Edit Subject
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleUpdateSubject}>
            <Form.Group className="mb-3">
              <Form.Label>Subject Name</Form.Label>
              <Form.Control 
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                required 
                placeholder="Enter subject name"
              />
            </Form.Group>
            <Form.Group className="mb-4">
              <Form.Label>Description</Form.Label>
              <Form.Control 
                as="textarea" 
                rows={3} 
                value={description} 
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter subject description"
              />
            </Form.Group>
            <div className="d-flex justify-content-end gap-2">
              <Button variant="secondary" onClick={() => setShowEditModal(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="warning"
                disabled={editing}
              >
                {editing ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Updating...
                  </>
                ) : (
                  <>
                    <i className="bi bi-check-circle me-2"></i>
                    Update
                  </>
                )}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      {/* Detail View Modal */}
      <DetailViewModal
        show={showDetailModal}
        onHide={() => setShowDetailModal(false)}
        title="Subject Details"
        data={detailData}
      />
    </div>
  );
}

function AssignmentsTab() {
  const [students, setStudents] = useState<User[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [subjects, setSubjects] = useState<Course[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Unified assignment form states
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [assignmentDate, setAssignmentDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [duration, setDuration] = useState('');
  const [classDays, setClassDays] = useState<string[]>([]);
  const [monthlyFee, setMonthlyFee] = useState('');
  const [currency, setCurrency] = useState('USD');

  // Edit assignment modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [updating, setUpdating] = useState(false);

  const currencies = [
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'GBP', symbol: '£', name: 'British Pound' },
    { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
    { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
    { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
    { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
    { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
    { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
    { code: 'PKR', symbol: '₨', name: 'Pakistani Rupee' },
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [studentsRes, teachersRes, subjectsRes, assignmentsRes] = await Promise.all([
        fetch('/api/users?role=STUDENT'),
        fetch('/api/users?role=TEACHER'),
        fetch('/api/subjects'),
        fetch('/api/assignments'),
      ]);
      
      if (studentsRes.ok) setStudents(await studentsRes.json());
      if (teachersRes.ok) setTeachers(await teachersRes.json());
      if (subjectsRes.ok) setSubjects(await subjectsRes.json());
      if (assignmentsRes.ok) setAssignments(await assignmentsRes.json());
    } catch (error) {
      setError('Error fetching data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: selectedStudent,
          courseId: selectedSubject,
          teacherId: selectedTeacher,
          assignmentDate: assignmentDate || new Date().toISOString(),
          startTime,
          duration: duration ? parseInt(duration) : null,
          classDays,
          monthlyFee: monthlyFee ? parseFloat(monthlyFee) : null,
          currency,
        }),
      });

      if (res.ok) {
        setSuccess('Assignment created successfully!');
        fetchData();
        resetForm();
      } else {
        const errorData = await res.json();
        setError(errorData.message || 'Failed to create assignment');
      }
    } catch (error) {
      setError('Error creating assignment');
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setSelectedStudent('');
    setSelectedSubject('');
    setSelectedTeacher('');
    setAssignmentDate('');
    setStartTime('');
    setDuration('');
    setClassDays([]);
    setMonthlyFee('');
    setCurrency('USD');
  };

  const handleEditAssignment = (assignment: Assignment) => {
    setEditingAssignment(assignment);
    setSelectedStudent(assignment.studentId);
    setSelectedSubject(assignment.courseId);
    setSelectedTeacher(assignment.teacherId);
    setAssignmentDate(assignment.assignmentDate ? assignment.assignmentDate.split('T')[0] : '');
    setStartTime(assignment.startTime || '');
    setDuration(assignment.duration?.toString() || '');
    setClassDays(assignment.classDays || []);
    setMonthlyFee(assignment.monthlyFee?.toString() || '');
    setCurrency(assignment.currency || 'USD');
    setShowEditModal(true);
  };

  const handleUpdateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAssignment) return;

    setUpdating(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/assignments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingAssignment.id,
          startTime,
          duration: duration ? parseInt(duration) : null,
          classDays,
          monthlyFee: monthlyFee ? parseFloat(monthlyFee) : null,
          currency,
        }),
      });

      if (res.ok) {
        setSuccess('Assignment updated successfully!');
        fetchData();
        setShowEditModal(false);
        setEditingAssignment(null);
      } else {
        const errorData = await res.json();
        setError(errorData.message || 'Failed to update assignment');
      }
    } catch (error) {
      setError('Error updating assignment');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    if (!confirm('Are you sure you want to delete this assignment?')) return;

    try {
      const res = await fetch('/api/assignments', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: assignmentId }),
      });

      if (res.ok) {
        setSuccess('Assignment deleted successfully!');
        fetchData();
      } else {
        const errorData = await res.json();
        setError(errorData.message || 'Failed to delete assignment');
      }
    } catch (error) {
      setError('Error deleting assignment');
    } finally {
      setCreating(false);
    }
  };

  const handleDayToggle = (day: string) => {
    setClassDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  const getCurrencySymbol = (currencyCode: string) => {
    const currency = currencies.find(c => c.code === currencyCode);
    return currency ? currency.symbol : currencyCode;
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" />
        <p className="mt-2 text-muted">Loading assignment data...</p>
      </div>
    );
  }

  return (
    <div>
      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

      <Row className="g-4">
        <Col lg={5}>
          <Card className="shadow-sm">
            <Card.Header className="bg-primary text-white">
              <h6 className="mb-0">
                <i className="bi bi-plus-circle me-2"></i>
                Create New Assignment
              </h6>
            </Card.Header>
            <Card.Body>
              <Form onSubmit={handleCreateAssignment}>
                <Form.Group className="mb-3">
                  <Form.Label>Select Student *</Form.Label>
                  <Form.Select 
                    value={selectedStudent}
                    onChange={(e) => setSelectedStudent(e.target.value)}
                    required
                    size="sm"
                  >
                    <option value="">Choose a student...</option>
                    {students.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </Form.Select>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Select Subject *</Form.Label>
                  <Form.Select 
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    required
                    size="sm"
                  >
                    <option value="">Choose a subject...</option>
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </Form.Select>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Select Teacher *</Form.Label>
                  <Form.Select 
                    value={selectedTeacher}
                    onChange={(e) => setSelectedTeacher(e.target.value)}
                    required
                    size="sm"
                  >
                    <option value="">Choose a teacher...</option>
                    {teachers.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </Form.Select>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Assignment Date</Form.Label>
                  <Form.Control 
                    type="date"
                    value={assignmentDate}
                    onChange={(e) => setAssignmentDate(e.target.value)}
                    size="sm"
                  />
                </Form.Group>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Start Time</Form.Label>
                      <Form.Control 
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        size="sm"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Duration (minutes)</Form.Label>
                      <Form.Control 
                        type="number"
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                        placeholder="60"
                        size="sm"
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Form.Group className="mb-3">
                  <Form.Label>Class Days</Form.Label>
                  <div className="d-flex flex-wrap gap-2">
                    {daysOfWeek.map(day => (
                      <Form.Check
                        key={day.value}
                        type="checkbox"
                        id={`day-${day.value}`}
                        label={day.label}
                        checked={classDays.includes(day.value)}
                        onChange={() => handleDayToggle(day.value)}
                        className="me-3"
                      />
                    ))}
                  </div>
                </Form.Group>

                <Row>
                  <Col md={8}>
                    <Form.Group className="mb-3">
                      <Form.Label>Monthly Fee</Form.Label>
                      <Form.Control 
                        type="number"
                        step="0.01"
                        value={monthlyFee}
                        onChange={(e) => setMonthlyFee(e.target.value)}
                        placeholder="0.00"
                        size="sm"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Currency</Form.Label>
                      <Form.Select 
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        size="sm"
                      >
                        {currencies.map(curr => (
                          <option key={curr.code} value={curr.code}>
                            {curr.code} - {curr.name}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>

                <Button 
                  variant="primary" 
                  type="submit" 
                  disabled={creating}
                  className="w-100"
                  size="sm"
                >
                  {creating ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-plus-circle me-2"></i>
                      Create Assignment
                    </>
                  )}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={7}>
          <Card className="shadow-sm">
            <Card.Header className="bg-light">
              <div className="d-flex justify-content-between align-items-center">
                <h6 className="mb-0">
                  <i className="bi bi-list-task me-2"></i>
                  Current Assignments
                </h6>
                <Badge bg="primary">{assignments.length} Total</Badge>
              </div>
            </Card.Header>
            <Card.Body className="p-0">
              {assignments.length === 0 ? (
                <div className="text-center py-4">
                  <i className="bi bi-list-task display-6 text-muted"></i>
                  <p className="mt-2 text-muted small">No assignments found</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <Table hover size="sm" className="mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Student</th>
                        <th>Subject</th>
                        <th>Teacher</th>
                        <th>Schedule</th>
                        <th>Fee</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assignments.map((assignment) => (
                        <tr key={assignment.id}>
                          <td className="fw-medium">{assignment.student?.name}</td>
                          <td>{assignment.course?.name}</td>
                          <td className="text-muted">{assignment.teacher?.name}</td>
                          <td className="small">
                            {assignment.startTime && (
                              <div>{assignment.startTime}</div>
                            )}
                            {assignment.duration && (
                              <div className="text-muted">{assignment.duration}min</div>
                            )}
                            {assignment.classDays && assignment.classDays.length > 0 && (
                              <div className="text-muted">
                                {assignment.classDays.join(', ')}
                              </div>
                            )}
                            {assignment.timezone && (
                              <div className="text-muted small">
                                {findTimezone(assignment.timezone)?.label || assignment.timezone}
                              </div>
                            )}
                          </td>
                          <td>
                            {assignment.monthlyFee ? (
                              <Badge bg="success">
                                {getCurrencySymbol(assignment.currency)}{assignment.monthlyFee}
                              </Badge>
                            ) : (
                              <span className="text-muted">-</span>
                            )}
                          </td>
                          <td>
                            <div className="d-flex gap-1">
                              <Button
                                variant="outline-warning"
                                size="sm"
                                onClick={() => handleEditAssignment(assignment)}
                                title="Edit Assignment"
                              >
                                <i className="bi bi-pencil"></i>
                              </Button>
                              <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={() => handleDeleteAssignment(assignment.id)}
                                title="Delete Assignment"
                              >
                                <i className="bi bi-trash"></i>
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Edit Assignment Modal */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-pencil me-2"></i>
            Edit Assignment
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleUpdateAssignment}>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Start Time</Form.Label>
                  <Form.Control 
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Duration (minutes)</Form.Label>
                  <Form.Control 
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="60"
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Class Days</Form.Label>
              <div className="d-flex flex-wrap gap-2">
                {daysOfWeek.map(day => (
                  <Form.Check
                    key={day.value}
                    type="checkbox"
                    id={`edit-day-${day.value}`}
                    label={day.label}
                    checked={classDays.includes(day.value)}
                    onChange={() => handleDayToggle(day.value)}
                    className="me-3"
                  />
                ))}
              </div>
            </Form.Group>

            <Row>
              <Col md={8}>
                <Form.Group className="mb-3">
                  <Form.Label>Monthly Fee</Form.Label>
                  <Form.Control 
                    type="number"
                    step="0.01"
                    value={monthlyFee}
                    onChange={(e) => setMonthlyFee(e.target.value)}
                    placeholder="0.00"
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Currency</Form.Label>
                  <Form.Select 
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    size="sm"
                  >
                    {currencies.map(curr => (
                      <option key={curr.code} value={curr.code}>
                        {curr.code} - {curr.name}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <div className="d-flex justify-content-end gap-2">
              <Button variant="secondary" onClick={() => setShowEditModal(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={updating}
              >
                {updating ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Updating...
                  </>
                ) : (
                  <>
                    <i className="bi bi-check-circle me-2"></i>
                    Update Assignment
                  </>
                )}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
}

export function SalaryManagementTab() {
  const [salaries, setSalaries] = useState<Salary[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Salary creation states
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [salaryTitle, setSalaryTitle] = useState('');
  const [salaryDescription, setSalaryDescription] = useState('');
  const [salaryAmount, setSalaryAmount] = useState('');
  const [salaryCurrency, setSalaryCurrency] = useState('USD');
  const [salaryDueDate, setSalaryDueDate] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Edit states
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSalary, setEditingSalary] = useState<Salary | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailData, setDetailData] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [salariesRes, teachersRes] = await Promise.all([
        fetch('/api/salaries'),
        fetch('/api/users?role=TEACHER'),
      ]);
      
      if (salariesRes.ok) {
        const salariesData = await salariesRes.json();
        setSalaries(salariesData);
      } else {
        setError('Failed to fetch salary data');
      }

      if (teachersRes.ok) {
        const teachersData = await teachersRes.json();
        setTeachers(teachersData);
      }
    } catch (error) {
      setError('Error fetching salary data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/salaries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId: selectedTeacher,
          title: salaryTitle,
          description: salaryDescription,
          amount: parseFloat(salaryAmount),
          currency: salaryCurrency,
          dueDate: salaryDueDate,
        }),
      });

      if (res.ok) {
        setSuccess('Salary created successfully!');
        fetchData();
        setSelectedTeacher('');
        setSalaryTitle('');
        setSalaryDescription('');
        setSalaryAmount('');
        setSalaryCurrency('USD');
        setSalaryDueDate('');
        setShowCreateForm(false);
      } else {
        const errorData = await res.json();
        setError(errorData.message || 'Failed to create salary');
      }
    } catch (error) {
      setError('Error creating salary');
    } finally {
      setCreating(false);
    }
  };

  const handleEditSalary = (salary: Salary) => {
    setEditingSalary(salary);
    setSalaryTitle(salary.title);
    setSalaryDescription(salary.description || '');
    setSalaryAmount(salary.amount.toString());
    setSalaryCurrency(salary.currency);
    setSalaryDueDate(new Date(salary.dueDate).toISOString().split('T')[0]);
    setShowEditModal(true);
  };

  const handleUpdateSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSalary) return;

    setEditing(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/salaries/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: editingSalary.id,
          title: salaryTitle,
          description: salaryDescription,
          amount: parseFloat(salaryAmount),
          currency: salaryCurrency,
          dueDate: salaryDueDate,
        }),
      });

      if (res.ok) {
        setSuccess('Salary updated successfully!');
        fetchData();
        setShowEditModal(false);
        setEditingSalary(null);
      } else {
        const errorData = await res.json();
        setError(errorData.message || 'Failed to update salary');
      }
    } catch (error) {
      setError('Error updating salary');
    } finally {
      setEditing(false);
    }
  };

  const handleViewDetails = (salary: Salary) => {
    setDetailData(salary);
    setShowDetailModal(true);
  };

  const getStatusBadge = (status: SalaryStatus) => {
    switch (status) {
      case 'PAID':
        return <Badge bg="success">Paid</Badge>;
      case 'PENDING':
        return <Badge bg="warning">Pending</Badge>;
      case 'OVERDUE':
        return <Badge bg="danger">Overdue</Badge>;
      case 'CANCELLED':
        return <Badge bg="secondary">Cancelled</Badge>;
      default:
        return <Badge bg="secondary">{status}</Badge>;
    }
  };

  const getCurrencySymbol = (currencyCode: string) => {
    const currency = currencies.find(c => c.code === currencyCode);
    return currency ? currency.symbol : currencyCode;
  };

  return (
    <div>
      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

      <div className="d-flex justify-content-between align-items-center mb-3">
        <div className="d-flex align-items-center gap-2">
          <i className="bi bi-cash-coin text-success"></i>
          <h6 className="mb-0">Salary Management</h6>
          <Badge bg="success">{salaries.length} Total</Badge>
        </div>
        <Button
          size="sm"
          variant={showCreateForm ? 'secondary' : 'success'}
          onClick={() => setShowCreateForm((v) => !v)}
        >
          {showCreateForm ? 'Hide Form' : 'Add New Salary'}
        </Button>
      </div>

      {showCreateForm && (
        <Card className="shadow-sm mb-3">
          <Card.Header className="bg-success text-white">
            <h6 className="mb-0">
              <i className="bi bi-wallet2 me-2"></i>
              Create New Salary
            </h6>
          </Card.Header>
          <Card.Body>
            <Form onSubmit={handleCreateSalary}>
              <Row className="g-3">
                <Col md={4}>
                  <Form.Group className="mb-0">
                    <Form.Label>Select Teacher</Form.Label>
                    <Form.Select 
                      value={selectedTeacher}
                      onChange={(e) => setSelectedTeacher(e.target.value)}
                      required
                      size="sm"
                    >
                      <option value="">Choose a teacher...</option>
                      {teachers.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-0">
                    <Form.Label>Salary Title</Form.Label>
                    <Form.Control 
                      type="text" 
                      value={salaryTitle} 
                      onChange={(e) => setSalaryTitle(e.target.value)} 
                      required 
                      placeholder="Enter salary title"
                      size="sm"
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-0">
                    <Form.Label>Due Date</Form.Label>
                    <Form.Control 
                      type="date" 
                      value={salaryDueDate} 
                      onChange={(e) => setSalaryDueDate(e.target.value)} 
                      required 
                      size="sm"
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-0">
                    <Form.Label>Amount</Form.Label>
                    <Form.Control 
                      type="number" 
                      step="0.01"
                      value={salaryAmount} 
                      onChange={(e) => setSalaryAmount(e.target.value)} 
                      required 
                      placeholder="0.00"
                      size="sm"
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-0">
                    <Form.Label>Currency</Form.Label>
                    <Form.Select 
                      value={salaryCurrency}
                      onChange={(e) => setSalaryCurrency(e.target.value)}
                      size="sm"
                    >
                      {currencies.map(currency => (
                        <option key={currency.code} value={currency.code}>
                          {currency.code} - {currency.name}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={12}>
                  <Form.Group className="mb-0">
                    <Form.Label>Description</Form.Label>
                    <Form.Control 
                      as="textarea" 
                      rows={2} 
                      value={salaryDescription} 
                      onChange={(e) => setSalaryDescription(e.target.value)}
                      placeholder="Optional description"
                      size="sm"
                    />
                  </Form.Group>
                </Col>
              </Row>
              <div className="d-flex justify-content-end gap-2 mt-3">
                <Button
                  variant="secondary"
                  type="button"
                  size="sm"
                  onClick={() => {
                    setSelectedTeacher('');
                    setSalaryTitle('');
                    setSalaryDescription('');
                    setSalaryAmount('');
                    setSalaryCurrency('USD');
                    setSalaryDueDate('');
                    setShowCreateForm(false);
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  variant="success" 
                  type="submit" 
                  disabled={creating}
                  size="sm"
                >
                  {creating ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-plus-circle me-2"></i>
                      Create Salary
                    </>
                  )}
                </Button>
              </div>
            </Form>
          </Card.Body>
        </Card>
      )}

      <Card className="shadow-sm">
        <Card.Header className="bg-light">
          <div className="d-flex justify-content-between align-items-center">
            <h6 className="mb-0">
              <i className="bi bi-cash-coin me-2"></i>
              Salary Management
            </h6>
            <Badge bg="success">{salaries.length} Total</Badge>
          </div>
        </Card.Header>
        <Card.Body className="p-0">
          {loading ? (
            <div className="text-center py-4">
              <Spinner animation="border" size="sm" />
              <p className="mt-2 text-muted small">Loading salaries...</p>
            </div>
          ) : salaries.length === 0 ? (
            <div className="text-center py-4">
              <i className="bi bi-wallet2 display-6 text-muted"></i>
              <p className="mt-2 text-muted small">No salaries found</p>
            </div>
          ) : (
            <div className="table-responsive">
              <Table hover size="sm" className="mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Teacher</th>
                    <th>Title</th>
                    <th>Amount</th>
                    <th>Due Date</th>
                    <th>Status</th>
                    <th>Paid By</th>
                  </tr>
                </thead>
                <tbody>
                  {salaries.map((salary) => (
                    <tr key={salary.id}>
                      <td className="fw-medium">{salary.teacher.name}</td>
                      <td>{salary.title}</td>
                      <td className="fw-bold text-success">
                        {getCurrencySymbol(salary.currency)}{salary.amount.toFixed(2)}
                      </td>
                      <td className="text-muted small">
                        {new Date(salary.dueDate).toLocaleDateString()}
                      </td>
                      <td>{getStatusBadge(salary.status)}</td>
                      <td className="text-muted small">
                        {salary.paidBy ? salary.paidBy.name : '-'}
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
  );
}

function StudentProgressTabContent({ progress, loading }: { progress: Progress[]; loading: boolean }) {
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailData, setDetailData] = useState<Progress | null>(null);
  const [showParentRemarksModal, setShowParentRemarksModal] = useState(false);
  const [selectedParentRemarks, setSelectedParentRemarks] = useState<any[]>([]);
  const [threadTitle, setThreadTitle] = useState('');

  const getAttendanceBadge = (status: AttendanceStatus) => {
    switch (status) {
      case 'PRESENT':
        return <Badge bg="success">Present</Badge>;
      case 'ABSENT':
        return <Badge bg="danger">Absent</Badge>;
      case 'LATE':
        return <Badge bg="warning">Late</Badge>;
      case 'EXCUSED':
        return <Badge bg="info">Excused</Badge>;
      default:
        return <Badge bg="secondary">{status}</Badge>;
    }
  };

  const handleViewDetails = (progressItem: Progress) => {
    setDetailData(progressItem);
    setShowDetailModal(true);
  };

  const buildThreadTitle = (progressItem: Progress) => {
    const teacherName = progressItem.teacher?.name || 'Teacher';
    const courseName = progressItem.course?.name || 'Subject';
    const dateLabel = progressItem.date ? new Date(progressItem.date).toLocaleDateString() : '';
    const studentLabel = progressItem.student?.name || 'Student';
    return `${teacherName}: Progress of ${studentLabel} for ${courseName}${dateLabel ? ` on ${dateLabel}` : ''}`;
  };

  const handleViewParentRemarks = (progressItem: Progress) => {
    setSelectedParentRemarks(progressItem.parentRemarks || []);
    setThreadTitle(buildThreadTitle(progressItem));
    setShowParentRemarksModal(true);
  };

  return (
    <div>
      <Card className="shadow-sm">
        <Card.Header className="bg-light">
          <div className="d-flex justify-content-between align-items-center">
            <h6 className="mb-0">
              <i className="bi bi-graph-up me-2"></i>
              Student Progress Overview
            </h6>
            <Badge bg="info">{progress.length} Records</Badge>
          </div>
        </Card.Header>
        <Card.Body className="p-0">
          {loading ? (
            <div className="text-center py-4">
              <Spinner animation="border" size="sm" />
              <p className="mt-2 text-muted small">Loading progress data...</p>
            </div>
          ) : progress.length === 0 ? (
            <div className="text-center py-4">
              <i className="bi bi-graph-up display-6 text-muted"></i>
              <p className="mt-2 text-muted small">No progress records found</p>
            </div>
          ) : (
            <div className="table-responsive">
              <Table hover size="sm" className="mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Date</th>
                    <th>Student</th>
                    <th>Subject</th>
                    <th>Teacher</th>
                    <th>Lesson</th>
                    <th>Progress</th>
                    <th>Attendance</th>
                    <th>Parent Remarks</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {progress.map((item) => (
                    <tr key={item.id}>
                      <td className="text-muted small">
                        {new Date(item.date).toLocaleDateString()}
                      </td>
                      <td className="fw-medium">{item.student.name}</td>
                      <td>{item.course.name}</td>
                      <td className="text-muted">{item.teacher.name}</td>
                      <td className="text-muted">
                        <ExpandableText text={item.lesson || 'No lesson'} maxLength={30} />
                      </td>
                      <td>
                        {item.lessonProgress !== null ? (
                          <div className="d-flex align-items-center">
                            <div className="progress me-2" style={{ width: '60px', height: '8px' }}>
                              <div 
                                className="progress-bar bg-success" 
                                style={{ width: `${item.lessonProgress}%` }}
                              ></div>
                            </div>
                            <small className="text-muted">{item.lessonProgress}%</small>
                          </div>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                      <td>{getAttendanceBadge(item.attendance)}</td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <div className="small text-muted">
                            {item.parentRemarks && item.parentRemarks.length > 0 ? (() => {
                              const replyCount = item.parentRemarks.reduce(
                                (sum: number, r: any) => sum + (r.replies?.length || 0),
                                0
                              );
                              return (
                                <>
                                  Remark with{' '}
                                  <span className={replyCount > 0 ? 'text-success' : 'text-danger'}>
                                    {replyCount > 0 ? replyCount : 'no'}
                                  </span>{' '}
                                  comment{replyCount === 1 ? '' : 's'}
                                </>
                              );
                            })() : 'No parent remark'}
                          </div>
                          {item.parentRemarks && item.parentRemarks.length > 0 && (
                            <Button
                              variant="outline-secondary"
                              size="sm"
                              onClick={() => handleViewParentRemarks(item)}
                              title="View parent remarks"
                            >
                              <i className="bi bi-chat-dots"></i>
                            </Button>
                          )}
                        </div>
                      </td>
                      <td>
                        <Button
                          variant="outline-info"
                          size="sm"
                          onClick={() => handleViewDetails(item)}
                          title="View Details"
                        >
                          <i className="bi bi-eye"></i>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>

      <DetailViewModal
        show={showDetailModal}
        onHide={() => setShowDetailModal(false)}
        title="Progress Details"
        data={detailData}
      />
      <RemarkThreadModal
        show={showParentRemarksModal}
        onHide={() => setShowParentRemarksModal(false)}
        remarks={selectedParentRemarks}
        title={threadTitle || 'Parent Remarks'}
        emptyMessage="No parent remarks"
      />
    </div>
  );
}

function StudentTestsTabContent({ tests, loading }: { tests: AdminTestRecord[]; loading: boolean }) {
  return (
    <div>
      <Card className="shadow-sm">
        <Card.Header className="bg-light d-flex justify-content-between align-items-center">
          <h6 className="mb-0">
            <i className="bi bi-clipboard-data me-2"></i>
            Latest Test Records
          </h6>
          <Badge bg="success">{tests.length}</Badge>
        </Card.Header>
        <Card.Body className="p-0">
          {loading ? (
            <div className="text-center py-4">
              <Spinner animation="border" size="sm" />
              <p className="mt-2 text-muted small">Loading records...</p>
            </div>
          ) : tests.length === 0 ? (
            <div className="text-center py-4">
              <i className="bi bi-clipboard-check display-6 text-muted"></i>
              <p className="mt-2 text-muted small">No test records found</p>
            </div>
          ) : (
            <div className="table-responsive">
              <Table hover size="sm" className="mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Date</th>
                    <th>Student</th>
                    <th>Subject</th>
                    <th>Title</th>
                    <th>Type</th>
                    <th>Score</th>
                    <th>%</th>
                    <th>Teacher</th>
                  </tr>
                </thead>
                <tbody>
                  {tests.map((rec) => (
                    <tr key={rec.id}>
                      <td className="text-muted small">
                        {new Date(rec.performedAt).toLocaleDateString()}
                      </td>
                      <td className="fw-medium small">{rec.student.name}</td>
                      <td className="small">{rec.course.name}</td>
                      <td className="small">{rec.title}</td>
                      <td>
                        <Badge bg={
                          rec.type === 'EXAM'
                            ? 'danger'
                            : rec.type === 'HOMEWORK'
                              ? 'secondary'
                              : rec.type === 'OTHER'
                                ? 'info'
                                : 'info'
                        }>
                          {rec.type === 'EXAM'
                            ? 'Exam'
                            : rec.type === 'HOMEWORK'
                              ? 'Homework'
                              : rec.type === 'OTHER'
                                ? 'Other'
                                : 'Quiz'}
                        </Badge>
                      </td>
                      <td>
                        <Badge bg="dark">{rec.obtainedMarks}/{rec.maxMarks}</Badge>
                      </td>
                      <td>
                        <Badge bg={rec.percentage >= 80 ? 'success' : rec.percentage >= 60 ? 'warning' : 'danger'}>
                          {rec.percentage}%
                        </Badge>
                      </td>
                      <td className="small">{rec.teacher.name}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>
    </div>
  );
}

export function ProgressTab() {
  const [progress, setProgress] = useState<Progress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailData, setDetailData] = useState<any>(null);

  useEffect(() => {
    fetchProgress();
  }, []);

  const fetchProgress = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/progress');
      if (res.ok) {
        const data = await res.json();
        setProgress(data);
      } else {
        setError('Failed to fetch progress data');
      }
    } catch (error) {
      setError('Error fetching progress data');
    } finally {
      setLoading(false);
    }
  };

  const getAttendanceBadge = (status: AttendanceStatus) => {
    switch (status) {
      case 'PRESENT':
        return <Badge bg="success">Present</Badge>;
      case 'ABSENT':
        return <Badge bg="danger">Absent</Badge>;
      case 'LATE':
        return <Badge bg="warning">Late</Badge>;
      case 'EXCUSED':
        return <Badge bg="info">Excused</Badge>;
      default:
        return <Badge bg="secondary">{status}</Badge>;
    }
  };

  const handleViewDetails = (progressItem: Progress) => {
    setDetailData(progressItem);
    setShowDetailModal(true);
  };

  return (
    <div>
      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

      <Card className="shadow-sm">
        <Card.Header className="bg-light">
          <div className="d-flex justify-content-between align-items-center">
            <h6 className="mb-0">
              <i className="bi bi-graph-up me-2"></i>
              Student Progress Overview
            </h6>
            <Badge bg="info">{progress.length} Records</Badge>
          </div>
        </Card.Header>
        <Card.Body className="p-0">
          {loading ? (
            <div className="text-center py-4">
              <Spinner animation="border" size="sm" />
              <p className="mt-2 text-muted small">Loading progress data...</p>
            </div>
          ) : progress.length === 0 ? (
            <div className="text-center py-4">
              <i className="bi bi-graph-up display-6 text-muted"></i>
              <p className="mt-2 text-muted small">No progress records found</p>
            </div>
          ) : (
            <div className="table-responsive">
              <Table hover size="sm" className="mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Date</th>
                    <th>Student</th>
                    <th>Subject</th>
                    <th>Teacher</th>
                    <th>Lesson</th>
                    <th>Progress</th>
                    <th>Attendance</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {progress.map((item) => (
                    <tr key={item.id}>
                      <td className="text-muted small">
                        {new Date(item.date).toLocaleDateString()}
                      </td>
                      <td className="fw-medium">{item.student.name}</td>
                      <td>{item.course.name}</td>
                      <td className="text-muted">{item.teacher.name}</td>
                      <td className="text-muted">
                        <ExpandableText text={item.lesson || 'No lesson'} maxLength={30} />
                      </td>
                      <td>
                        {item.lessonProgress !== null ? (
                          <div className="d-flex align-items-center">
                            <div className="progress me-2" style={{ width: '60px', height: '8px' }}>
                              <div 
                                className="progress-bar bg-success" 
                                style={{ width: `${item.lessonProgress}%` }}
                              ></div>
                            </div>
                            <small className="text-muted">{item.lessonProgress}%</small>
                          </div>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                      <td>{getAttendanceBadge(item.attendance)}</td>
                      <td>
                        <Button
                          variant="outline-info"
                          size="sm"
                          onClick={() => handleViewDetails(item)}
                          title="View Details"
                        >
                          <i className="bi bi-eye"></i>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Detail View Modal */}
      <DetailViewModal
        show={showDetailModal}
        onHide={() => setShowDetailModal(false)}
        title="Progress Details"
        data={detailData}
      />
    </div>
  );
}

export function RemarksTab() {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;
  const [remarks, setRemarks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showThreadModal, setShowThreadModal] = useState(false);
  const [activeRemark, setActiveRemark] = useState<any | null>(null);
  const [threadTitle, setThreadTitle] = useState('');
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageTargetId, setMessageTargetId] = useState<string | null>(null);
  const [messageTargetName, setMessageTargetName] = useState('');

  const fetchRemarks = async (options?: { silent?: boolean }) => {
    const silent = options?.silent;
    try {
      if (!silent) setLoading(true);
      const res = await fetch('/api/remarks');
      if (res.ok) {
        const data = await res.json();
        setRemarks(Array.isArray(data) ? data : []);
        return Array.isArray(data) ? data : [];
      } else {
        setError('Failed to fetch remarks');
      }
    } catch (err) {
      setError('Failed to fetch remarks');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchRemarks();
  }, []);

  const handleReply = async (remarkId: string, content: string) => {
    if (!content.trim()) return false;
    try {
      const res = await fetch('/api/remarks/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remarkId, content: content.trim() }),
      });
      if (res.ok) {
        const newReply = await res.json();
        setRemarks((prev) =>
          prev.map((r) =>
            r.id === remarkId
              ? { ...r, replies: [...(r.replies || []), newReply] }
              : r
          )
        );
        setSuccess('Reply posted');
        const list = await fetchRemarks({ silent: true });
        const match = (list || []).find((r: any) => r.id === remarkId);
        if (match) {
          setRemarks((prev) =>
            prev.map((r) => (r.id === remarkId ? match : r))
          );
        }
        if (activeRemark && activeRemark.id === remarkId) {
          setActiveRemark(match || null);
        }
        return true;
      } else {
        const err = await res.json();
        setError(err.message || 'Failed to reply');
        return false;
      }
    } catch (err) {
      setError('Failed to reply');
      return false;
    }
  };

  const handleDelete = async (type: 'remark' | 'reply', id: string) => {
    try {
      const res = await fetch('/api/remarks/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(type === 'remark' ? { remarkId: id } : { replyId: id }),
      });
      if (res.ok) {
        setSuccess('Deleted successfully');
        const list = await fetchRemarks();
        if (type === 'remark' && activeRemark?.id === id) {
          setActiveRemark(null);
          setShowThreadModal(false);
        } else if (activeRemark) {
          const match = (list || []).find((r: any) => r.id === activeRemark.id);
          if (match) {
            setActiveRemark(match);
          }
        }
      } else {
        const err = await res.json();
        setError(err.message || 'Failed to delete');
      }
    } catch (err) {
      setError('Failed to delete');
    }
  };

  const handleRefreshThread = async (remarkId: string) => {
    const list = await fetchRemarks({ silent: true });
    const match = (list || []).find((r: any) => r.id === remarkId);
    if (match) {
      setRemarks((prev) =>
        prev.map((r) => (r.id === remarkId ? match : r))
      );
      if (activeRemark && activeRemark.id === remarkId) {
        setActiveRemark(match);
        setThreadTitle(buildThreadTitle(match));
      }
    }
  };

  const buildThreadTitle = (remark: any) => {
    const teacher = remark?.progress?.teacher?.name || 'Teacher';
    const student = remark?.progress?.student?.name || 'Student';
    const course = remark?.progress?.course?.name || 'Subject';
    const date = remark?.progress?.date ? new Date(remark.progress.date).toLocaleDateString() : '';
    return `${teacher}: Progress of ${student} for ${course}${date ? ` on ${date}` : ''}`;
  };

  const openMessage = (id?: string, name?: string) => {
    if (!id) return;
    setMessageTargetId(id);
    setMessageTargetName(name || '');
    setShowMessageModal(true);
  };

  return (
    <div>
      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}
      <Card className="shadow-sm">
        <Card.Header className="bg-light d-flex justify-content-between align-items-center">
          <h6 className="mb-0">
            <i className="bi bi-chat-dots me-2"></i>
            Parent Remarks & Threads
          </h6>
          <Badge bg="info">{remarks.length}</Badge>
        </Card.Header>
        <Card.Body>
          {loading ? (
            <div className="text-center py-4">
              <Spinner animation="border" size="sm" />
            </div>
          ) : remarks.length === 0 ? (
            <div className="text-center text-muted py-4">No remarks</div>
          ) : (
            <div className="d-flex flex-column gap-3">
              {remarks.map((remark) => (
                <Card key={remark.id} className="border-0 shadow-sm">
                  <Card.Body>
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <div>
                        <div className="d-flex align-items-center gap-2">
                          <strong
                            className="text-primary"
                            role="button"
                            onClick={() => openMessage(remark.parent.id, remark.parent.name)}
                          >
                            {remark.parent.name}
                          </strong>
                        </div>
                        <div className="small text-muted">
                          <span
                            role="button"
                            className="text-decoration-underline text-primary"
                            onClick={() => openMessage(remark.progress.student.id, remark.progress.student.name)}
                          >
                            {remark.progress.student.name}
                          </span>{' '}
                          -{' '}
                          <span
                            role="button"
                            className="text-decoration-underline text-primary"
                            onClick={() => openMessage(remark.progress.teacher.id, remark.progress.teacher.name)}
                          >
                            {remark.progress.course.name}
                          </span>
                        </div>
                        <div className="small mt-1 text-muted">
                          Remark with{' '}
                          <span className={(remark.replies?.length || 0) > 0 ? 'text-success' : 'text-danger'}>
                            {(remark.replies?.length || 0) > 0 ? remark.replies?.length : 'no'}
                          </span>{' '}
                          comment{(remark.replies?.length || 0) === 1 ? '' : 's'}
                        </div>
                      </div>
                      <div className="d-flex align-items-center gap-2">
                        <small className="text-muted">{new Date(remark.createdAt).toLocaleString()}</small>
                      </div>
                    </div>
                    <div className="mb-2 text-muted small">{remark.remark}</div>
                    <div className="d-flex justify-content-end gap-2 mt-3">
                      <Button variant="outline-secondary" size="sm" onClick={() => handleRefreshThread(remark.id)}>
                        <i className="bi bi-arrow-repeat me-1"></i>
                        Refresh
                      </Button>
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => { 
                          setActiveRemark(remark); 
                          setThreadTitle(buildThreadTitle(remark));
                          setShowThreadModal(true); 
                        }}
                      >
                        <i className="bi bi-chat-dots me-1"></i>
                        View Thread
                      </Button>
                      <Button variant="outline-danger" size="sm" onClick={() => handleDelete('remark', remark.id)}>
                        <i className="bi bi-trash"></i>
                        Delete
                      </Button>
                    </div>
                  </Card.Body>
                </Card>
              ))}
            </div>
          )}
        </Card.Body>
      </Card>
      <RemarkThreadModal
        show={showThreadModal}
        onHide={() => setShowThreadModal(false)}
        remarks={activeRemark ? [activeRemark] : []}
        currentUserId={currentUserId}
        onReply={handleReply}
        onDeleteRemark={(id) => handleDelete('remark', id)}
        onDeleteReply={(id) => handleDelete('reply', id)}
        onRefresh={handleRefreshThread}
        title={threadTitle || 'Remarks for this progress'}
        emptyMessage="No remarks"
        loading={loading}
        onMessageParent={openMessage}
        onMessageUser={openMessage}
      />
      <DirectMessageModal
        show={showMessageModal}
        onHide={() => setShowMessageModal(false)}
        targetId={messageTargetId}
        targetName={messageTargetName}
        onSent={() => setSuccess('Message sent')}
      />
    </div>
  );
}
export function TestsTab() {
  const [records, setRecords] = useState<AdminTestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    await loadRecords();
    setLoading(false);
  };

  const loadRecords = async () => {
    try {
      const res = await fetch('/api/tests/records');
      if (res.ok) {
        const data = await res.json();
        setRecords(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error fetching test records', err);
    }
  };

  return (
    <div>
      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

      <Card className="shadow-sm">
        <Card.Header className="bg-light d-flex justify-content-between align-items-center">
          <h6 className="mb-0">
            <i className="bi bi-clipboard-data me-2"></i>
            Latest Test Records
          </h6>
          <Badge bg="success">{records.length}</Badge>
        </Card.Header>
        <Card.Body className="p-0">
          {loading ? (
            <div className="text-center py-4">
              <Spinner animation="border" size="sm" />
              <p className="mt-2 text-muted small">Loading records...</p>
            </div>
          ) : records.length === 0 ? (
            <div className="text-center py-4">
              <i className="bi bi-clipboard-check display-6 text-muted"></i>
              <p className="mt-2 text-muted small">No test records found</p>
            </div>
          ) : (
            <div className="table-responsive">
              <Table hover size="sm" className="mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Date</th>
                    <th>Student</th>
                    <th>Subject</th>
                    <th>Title</th>
                    <th>Type</th>
                    <th>Score</th>
                    <th>%</th>
                    <th>Teacher</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((rec) => (
                    <tr key={rec.id}>
                      <td className="text-muted small">
                        {new Date(rec.performedAt).toLocaleDateString()}
                      </td>
                      <td className="fw-medium small">{rec.student.name}</td>
                      <td className="small">{rec.course.name}</td>
                      <td className="small">{rec.title}</td>
                      <td>
                        <Badge bg={
                          rec.type === 'EXAM'
                            ? 'danger'
                            : rec.type === 'HOMEWORK'
                              ? 'secondary'
                              : rec.type === 'OTHER'
                                ? 'info'
                                : 'info'
                        }>
                          {rec.type === 'EXAM'
                            ? 'Exam'
                            : rec.type === 'HOMEWORK'
                              ? 'Homework'
                              : rec.type === 'OTHER'
                                ? 'Other'
                                : 'Quiz'}
                        </Badge>
                      </td>
                      <td>
                        <Badge bg="dark">{rec.obtainedMarks}/{rec.maxMarks}</Badge>
                      </td>
                      <td>
                        <Badge bg={rec.percentage >= 80 ? 'success' : rec.percentage >= 60 ? 'warning' : 'danger'}>
                          {rec.percentage}%
                        </Badge>
                      </td>
                      <td className="small">{rec.teacher.name}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>
    </div>
  );
}

export default function AdminDashboard() {
  const router = useRouter();
  const disallowedTabs = new Set([
    'teachers',
    'parents',
    'students',
    'progress',
    'tests',
    'remarks',
    'parent-remarks',
    'fees',
    'fee-verification',
    'salaries',
  ]);
  const initialTab = typeof router.query.tab === 'string' && !disallowedTabs.has(router.query.tab)
    ? router.query.tab
    : 'home';
  const [activeTab, setActiveTab] = useState(initialTab);
  const showHome = activeTab === 'home';
  const tabActiveKey = showHome ? 'subjects' : activeTab;
  const [homeLoading, setHomeLoading] = useState(false);
  const [homeError, setHomeError] = useState('');
  const [homeSnapshot, setHomeSnapshot] = useState<{
    counts: { students: number; teachers: number; parents: number };
    fees: { total: number; pending: number; overdue: number; paid: number };
    salaries: { pending: number; paid: number };
    progress: {
      records: number;
      avgLessonProgress: number;
      recent: Progress[];
      topTeachers: Array<{ name: string; avg: number; count: number }>;
    };
    remarks: { total: number };
  } | null>(null);

  useEffect(() => {
    const qTab = router.query.tab;
    if (typeof qTab === 'string') {
      if (disallowedTabs.has(qTab)) {
        router.push(`/dashboard/${qTab}`);
        return;
      }
      if (qTab !== activeTab) {
        setActiveTab(qTab);
      }
    }
  }, [router.query.tab, activeTab]);

  const fetchHomeSnapshot = useCallback(async () => {
    try {
      setHomeLoading(true);
      setHomeError('');
      const [studentsRes, teachersRes, parentsRes, feesRes, salariesRes, progressRes, remarksRes] = await Promise.all([
        fetch('/api/users?role=STUDENT'),
        fetch('/api/users?role=TEACHER'),
        fetch('/api/users?role=PARENT'),
        fetch('/api/fees'),
        fetch('/api/salaries'),
        fetch('/api/progress'),
        fetch('/api/remarks'),
      ]);

      const students = studentsRes.ok ? await studentsRes.json() : [];
      const teachers = teachersRes.ok ? await teachersRes.json() : [];
      const parents = parentsRes.ok ? await parentsRes.json() : [];
      const fees = feesRes.ok ? await feesRes.json() : [];
      const salaries = salariesRes.ok ? await salariesRes.json() : [];
      const progressData: Progress[] = progressRes.ok ? await progressRes.json() : [];
      const remarks = remarksRes.ok ? await remarksRes.json() : [];

      const feeTotals = fees.reduce(
        (acc: { total: number; pending: number; overdue: number; paid: number }, fee: any) => {
          const amount = Number(fee.amount) || 0;
          acc.total += amount;
          if (fee.status === 'PAID') acc.paid += amount;
          else if (fee.status === 'OVERDUE') acc.overdue += amount;
          else acc.pending += amount;
          return acc;
        },
        { total: 0, pending: 0, overdue: 0, paid: 0 }
      );

      const salaryTotals = salaries.reduce(
        (acc: { pending: number; paid: number }, salary: any) => {
          const amount = Number(salary.amount) || 0;
          if (salary.status === 'PAID') acc.paid += amount;
          else acc.pending += amount;
          return acc;
        },
        { pending: 0, paid: 0 }
      );

      const lessonProgressValues = progressData
        .map((p) => p.lessonProgress)
        .filter((p): p is number => typeof p === 'number');
      const avgLessonProgress =
        lessonProgressValues.length > 0
          ? Math.round(
              lessonProgressValues.reduce((sum, val) => sum + val, 0) / lessonProgressValues.length
            )
          : 0;

      const recentProgress = [...progressData]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5);

      const teacherProgressMap: Record<string, { total: number; count: number }> = {};
      progressData.forEach((p) => {
        const name = p.teacher?.name || 'Unknown';
        if (!teacherProgressMap[name]) {
          teacherProgressMap[name] = { total: 0, count: 0 };
        }
        if (typeof p.lessonProgress === 'number') {
          teacherProgressMap[name].total += p.lessonProgress;
          teacherProgressMap[name].count += 1;
        }
      });
      const topTeachers = Object.entries(teacherProgressMap)
        .map(([name, data]) => ({
          name,
          avg: data.count ? Math.round(data.total / data.count) : 0,
          count: data.count,
        }))
        .sort((a, b) => b.avg - a.avg)
        .slice(0, 4);

      setHomeSnapshot({
        counts: { students: students.length, teachers: teachers.length, parents: parents.length },
        fees: feeTotals,
        salaries: salaryTotals,
        progress: {
          records: progressData.length,
          avgLessonProgress,
          recent: recentProgress,
          topTeachers,
        },
        remarks: { total: Array.isArray(remarks) ? remarks.length : 0 },
      });
    } catch (err) {
      setHomeError('Failed to load dashboard overview');
    } finally {
      setHomeLoading(false);
    }
  }, []);

  useEffect(() => {
    if (showHome) {
      fetchHomeSnapshot();
    }
  }, [showHome, fetchHomeSnapshot]);

  const handleSelect = (key?: string | null) => {
    const next = key || 'subjects';
    const routeMap: Record<string, string> = {
      teachers: '/dashboard/teachers',
      parents: '/dashboard/parents',
      students: '/dashboard/students',
      progress: '/dashboard/progress',
      tests: '/dashboard/tests',
      remarks: '/dashboard/parent-remarks',
      'parent-remarks': '/dashboard/parent-remarks',
      fees: '/dashboard/fees',
      'fee-verification': '/dashboard/fee-verification',
      salaries: '/dashboard/salaries',
    };

    if (routeMap[next]) {
      router.push(routeMap[next]);
      return;
    }
    setActiveTab(next);
    const query = next === 'home' ? {} : { tab: next };
    router.replace({ pathname: '/dashboard', query }, undefined, { shallow: true });
  };

  return (
    <div className={menuStyles.menuShell}>
      <div className={menuStyles.menuLayout}>
        <AdminMenu activeKey={activeTab} onSelect={(key) => handleSelect(key)} />
        <div className={menuStyles.mainContent}>
          <div className="container-fluid py-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <div>
                <h2 className="h4 mb-1">
                  <i className="bi bi-gear-fill me-2 text-primary"></i>
                  Admin Dashboard
                </h2>
              </div>
            </div>

            {showHome ? (
              <div className={`${menuStyles.homePanel} p-3 p-md-4`}>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <div>
                    <h3 className="h5 mb-1">Overview</h3>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <Button variant="outline-secondary" size="sm" onClick={fetchHomeSnapshot} disabled={homeLoading}>
                      <i className="bi bi-arrow-repeat me-1"></i>
                      Refresh
                    </Button>
                  </div>
                </div>

                {homeError && (
                  <Alert variant="danger" className="mb-3" dismissible onClose={() => setHomeError('')}>
                    {homeError}
                  </Alert>
                )}

                {homeLoading || !homeSnapshot ? (
                  <div className="text-center py-5">
                    <Spinner animation="border" />
                    <p className="text-muted mt-2 mb-0">Loading overview...</p>
                  </div>
                ) : (
                  <>
                    <Row className="g-3 mb-3">
                      <Col md={3} sm={6}>
                        <Card className="shadow-sm h-100">
                          <Card.Body>
                            <div className="d-flex justify-content-between align-items-center">
                              <div>
                                <p className="text-muted mb-1 small">Students</p>
                                <h3 className="mb-0">{homeSnapshot.counts.students}</h3>
                              </div>
                              <span className="badge bg-primary-subtle text-primary">
                                <i className="bi bi-mortarboard-fill"></i>
                              </span>
                            </div>
                          </Card.Body>
                        </Card>
                      </Col>
                      <Col md={3} sm={6}>
                        <Card className="shadow-sm h-100">
                          <Card.Body>
                            <div className="d-flex justify-content-between align-items-center">
                              <div>
                                <p className="text-muted mb-1 small">Teachers</p>
                                <h3 className="mb-0">{homeSnapshot.counts.teachers}</h3>
                              </div>
                              <span className="badge bg-success-subtle text-success">
                                <i className="bi bi-person-workspace"></i>
                              </span>
                            </div>
                          </Card.Body>
                        </Card>
                      </Col>
                      <Col md={3} sm={6}>
                        <Card className="shadow-sm h-100">
                          <Card.Body>
                            <div className="d-flex justify-content-between align-items-center">
                              <div>
                                <p className="text-muted mb-1 small">Parents</p>
                                <h3 className="mb-0">{homeSnapshot.counts.parents}</h3>
                              </div>
                              <span className="badge bg-info-subtle text-info">
                                <i className="bi bi-people-fill"></i>
                              </span>
                            </div>
                          </Card.Body>
                        </Card>
                      </Col>
                      <Col md={3} sm={6}>
                        <Card className="shadow-sm h-100">
                          <Card.Body>
                            <div className="d-flex justify-content-between align-items-center">
                              <div>
                                <p className="text-muted mb-1 small">Avg Lesson Progress</p>
                                <h3 className="mb-0">{homeSnapshot.progress.avgLessonProgress}%</h3>
                              </div>
                              <span className="badge bg-warning-subtle text-warning">
                                <i className="bi bi-graph-up-arrow"></i>
                              </span>
                            </div>
                            <div className="progress mt-3" style={{ height: '6px' }}>
                              <div
                                className="progress-bar bg-warning"
                                style={{ width: `${homeSnapshot.progress.avgLessonProgress}%` }}
                                role="progressbar"
                                aria-valuenow={homeSnapshot.progress.avgLessonProgress}
                                aria-valuemin={0}
                                aria-valuemax={100}
                              ></div>
                            </div>
                          </Card.Body>
                        </Card>
                      </Col>
                    </Row>

                    <Row className="g-3 mb-3">
                      <Col lg={4}>
                        <Card className="shadow-sm h-100">
                          <Card.Header className="bg-light d-flex justify-content-between align-items-center">
                            <div>
                              <h6 className="mb-0">Fee Summary</h6>
                              <small className="text-muted">Paid vs pending</small>
                            </div>
                            <Badge bg="primary">
                              {getCurrencySymbol('USD')}
                              {homeSnapshot.fees.total.toFixed(0)} total
                            </Badge>
                          </Card.Header>
                          <Card.Body>
                            <div className="mb-3">
                              <div className="d-flex justify-content-between small text-muted mb-1">
                                <span>Paid</span>
                                <span>
                                  {getCurrencySymbol('USD')}
                                  {homeSnapshot.fees.paid.toFixed(0)}
                                </span>
                              </div>
                              <div className="progress" style={{ height: '8px' }}>
                                <div
                                  className="progress-bar bg-success"
                                  style={{
                                    width: `${homeSnapshot.fees.total ? (homeSnapshot.fees.paid / homeSnapshot.fees.total) * 100 : 0}%`,
                                  }}
                                ></div>
                              </div>
                            </div>
                            <div className="mb-3">
                              <div className="d-flex justify-content-between small text-muted mb-1">
                                <span>Pending</span>
                                <span>
                                  {getCurrencySymbol('USD')}
                                  {homeSnapshot.fees.pending.toFixed(0)}
                                </span>
                              </div>
                              <div className="progress" style={{ height: '8px' }}>
                                <div
                                  className="progress-bar bg-warning"
                                  style={{
                                    width: `${homeSnapshot.fees.total ? (homeSnapshot.fees.pending / homeSnapshot.fees.total) * 100 : 0}%`,
                                  }}
                                ></div>
                              </div>
                            </div>
                            <div>
                              <div className="d-flex justify-content-between small text-muted mb-1">
                                <span>Overdue</span>
                                <span>
                                  {getCurrencySymbol('USD')}
                                  {homeSnapshot.fees.overdue.toFixed(0)}
                                </span>
                              </div>
                              <div className="progress" style={{ height: '8px' }}>
                                <div
                                  className="progress-bar bg-danger"
                                  style={{
                                    width: `${homeSnapshot.fees.total ? (homeSnapshot.fees.overdue / homeSnapshot.fees.total) * 100 : 0}%`,
                                  }}
                                ></div>
                              </div>
                            </div>
                          </Card.Body>
                          <Card.Footer className="bg-light">
                            <div className="d-flex gap-2">
                              <Button size="sm" variant="outline-primary" onClick={() => handleSelect('fees')}>
                                Manage Fees
                              </Button>
                              <Button size="sm" variant="outline-secondary" onClick={() => handleSelect('fee-verification')}>
                                Verify Payments
                              </Button>
                            </div>
                          </Card.Footer>
                        </Card>
                      </Col>
                      <Col lg={4}>
                        <Card className="shadow-sm h-100">
                          <Card.Header className="bg-light d-flex justify-content-between align-items-center">
                            <div>
                              <h6 className="mb-0">Salary Snapshot</h6>
                              <small className="text-muted">Upcoming teacher payouts</small>
                            </div>
                            <Badge bg="success">
                              {getCurrencySymbol('USD')}
                              {(homeSnapshot.salaries.pending + homeSnapshot.salaries.paid).toFixed(0)}
                            </Badge>
                          </Card.Header>
                          <Card.Body>
                            <div className="mb-3">
                              <div className="d-flex justify-content-between small text-muted mb-1">
                                <span>Pending</span>
                                <span>
                                  {getCurrencySymbol('USD')}
                                  {homeSnapshot.salaries.pending.toFixed(0)}
                                </span>
                              </div>
                              <div className="progress" style={{ height: '8px' }}>
                                <div
                                  className="progress-bar bg-warning"
                                  style={{
                                    width: `${homeSnapshot.salaries.pending + homeSnapshot.salaries.paid ? (homeSnapshot.salaries.pending / (homeSnapshot.salaries.pending + homeSnapshot.salaries.paid)) * 100 : 0}%`,
                                  }}
                                ></div>
                              </div>
                            </div>
                            <div>
                              <div className="d-flex justify-content-between small text-muted mb-1">
                                <span>Paid</span>
                                <span>
                                  {getCurrencySymbol('USD')}
                                  {homeSnapshot.salaries.paid.toFixed(0)}
                                </span>
                              </div>
                              <div className="progress" style={{ height: '8px' }}>
                                <div
                                  className="progress-bar bg-success"
                                  style={{
                                    width: `${homeSnapshot.salaries.pending + homeSnapshot.salaries.paid ? (homeSnapshot.salaries.paid / (homeSnapshot.salaries.pending + homeSnapshot.salaries.paid)) * 100 : 0}%`,
                                  }}
                                ></div>
                              </div>
                            </div>
                          </Card.Body>
                          <Card.Footer className="bg-light">
                            <Button size="sm" variant="outline-success" onClick={() => handleSelect('salaries')}>
                              Go to Salaries
                            </Button>
                          </Card.Footer>
                        </Card>
                      </Col>
                      <Col lg={4}>
                        <Card className="shadow-sm h-100">
                          <Card.Header className="bg-light d-flex justify-content-between align-items-center">
                            <h6 className="mb-0">Remarks & Threads</h6>
                            <Badge bg="info">{homeSnapshot.remarks.total}</Badge>
                          </Card.Header>
                          <Card.Body>
                            <p className="text-muted small mb-3">
                              Keep an eye on parent conversations and follow-ups.
                            </p>
                            <div className="d-flex flex-column gap-2">
                              <Button size="sm" variant="outline-primary" onClick={() => handleSelect('parent-remarks')}>
                                View Remarks
                              </Button>
                              <Button size="sm" variant="outline-secondary" onClick={() => handleSelect('tests')}>
                                Tests & Exams
                              </Button>
                            </div>
                          </Card.Body>
                        </Card>
                      </Col>
                    </Row>

                    <Row className="g-3">
                      <Col lg={7}>
                        <Card className="shadow-sm h-100">
                          <Card.Header className="bg-light d-flex justify-content-between align-items-center">
                            <h6 className="mb-0">Recent Progress</h6>
                            <Badge bg="info">{homeSnapshot.progress.records} records</Badge>
                          </Card.Header>
                          <Card.Body className="p-0">
                            {homeSnapshot.progress.recent.length === 0 ? (
                              <div className="text-center text-muted py-4">No recent progress</div>
                            ) : (
                              <div className="table-responsive">
                                <Table hover size="sm" className="mb-0">
                                  <thead className="table-light">
                                    <tr>
                                      <th>Date</th>
                                      <th>Student</th>
                                      <th>Subject</th>
                                      <th>Teacher</th>
                                      <th>Progress</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {homeSnapshot.progress.recent.map((item) => (
                                      <tr key={item.id}>
                                        <td className="text-muted small">
                                          {new Date(item.date).toLocaleDateString()}
                                        </td>
                                        <td>{item.student.name}</td>
                                        <td className="text-muted small">{item.course.name}</td>
                                        <td className="text-muted small">{item.teacher.name}</td>
                                        <td>
                                          <div className="d-flex align-items-center">
                                            <div className="progress me-2" style={{ width: '80px', height: '6px' }}>
                                              <div
                                                className="progress-bar bg-success"
                                                style={{ width: `${item.lessonProgress ?? 0}%` }}
                                              ></div>
                                            </div>
                                            <small className="text-muted">{item.lessonProgress ?? 0}%</small>
                                          </div>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </Table>
                              </div>
                            )}
                          </Card.Body>
                          <Card.Footer className="bg-light">
                            <Button size="sm" variant="outline-info" onClick={() => handleSelect('progress')}>
                              View Full Progress
                            </Button>
                          </Card.Footer>
                        </Card>
                      </Col>
                      <Col lg={5}>
                        <Card className="shadow-sm h-100">
                          <Card.Header className="bg-light d-flex justify-content-between align-items-center">
                            <h6 className="mb-0">Top Teacher Progress</h6>
                            <Badge bg="secondary">Avg %</Badge>
                          </Card.Header>
                          <Card.Body>
                            {homeSnapshot.progress.topTeachers.length === 0 ? (
                              <div className="text-muted text-center py-3">No progress data yet</div>
                            ) : (
                              <div className="d-flex flex-column gap-3">
                                {homeSnapshot.progress.topTeachers.map((teacher) => (
                                  <div key={teacher.name}>
                                    <div className="d-flex justify-content-between align-items-center mb-1">
                                      <strong>{teacher.name}</strong>
                                      <small className="text-muted">{teacher.count} sessions</small>
                                    </div>
                                    <div className="progress" style={{ height: '8px' }}>
                                      <div
                                        className={`progress-bar ${teacher.avg >= 80 ? 'bg-success' : teacher.avg >= 60 ? 'bg-warning' : 'bg-danger'}`}
                                        style={{ width: `${teacher.avg}%` }}
                                      ></div>
                                    </div>
                                    <small className="text-muted">{teacher.avg}% average lesson progress</small>
                                  </div>
                                ))}
                              </div>
                            )}
                          </Card.Body>
                        </Card>
                      </Col>
                    </Row>
                  </>
                )}
              </div>
            ) : (
              <Tabs
                id="admin-dashboard-tabs"
                activeKey={tabActiveKey}
                onSelect={(k) => handleSelect(k)}
                className={`${menuStyles.hiddenTabsNav} mb-4`}
                variant="pills"
              >
                
                <Tab 
                  eventKey="subjects" 
                  title={
                    <span>
                      <i className="bi bi-book me-2"></i>
                      Subjects
                    </span>
                  }
                >
                  <SubjectManagementTab />
                </Tab>
                
                <Tab 
                  eventKey="assignments" 
                  title={
                    <span>
                      <i className="bi bi-diagram-3 me-2"></i>
                      Assignments
                    </span>
                  }
                >
                  <AssignmentsTab />
                </Tab>
                
              </Tabs>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

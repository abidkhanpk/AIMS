import FeeSubform from './FeeSubform';
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
import AdminAnalytics from '../analytics/AdminAnalytics';
import CalendarView from '../calendar/CalendarView';
import AttendanceReportsTab from './AttendanceReportsTab';
import ReportCardsTab from './ReportCardsTab';
import AuditLogsTab from './AuditLogsTab';
import AcademySettingsTab from './AcademySettingsTab';
import { useTranslation } from 'react-i18next';
import Papa from 'papaparse';
import Head from 'next/head';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
  mobile?: string;
  dateOfBirth?: string;
  address?: string;
  country?: string;
  qualification?: string;
  payRate?: number;
  payType?: PayType;
  payCurrency?: string;
  isActive?: boolean;
}

export interface Course {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  _count?: {
    studentCourses: number;
  };
}

export interface Assignment {
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

import { currencies, getCurrencySymbol } from '../../utils/currencies';

const countryOptions = [
  'Afghanistan','Albania','Algeria','Andorra','Angola','Antigua and Barbuda','Argentina','Armenia','Australia','Austria',
  'Azerbaijan','Bahamas','Bahrain','Bangladesh','Barbados','Belarus','Belgium','Belize','Benin','Bhutan','Bolivia',
  'Bosnia and Herzegovina','Botswana','Brazil','Brunei','Bulgaria','Burkina Faso','Burundi','Cabo Verde','Cambodia','Cameroon',
  'Canada','Central African Republic','Chad','Chile','China','Colombia','Comoros','Congo (Congo-Brazzaville)','Costa Rica','Croatia',
  'Cuba','Cyprus','Czechia','Democratic Republic of the Congo','Denmark','Djibouti','Dominica','Dominican Republic','Ecuador','Egypt',
  'El Salvador','Equatorial Guinea','Eritrea','Estonia','Eswatini','Ethiopia','Fiji','Finland','France','Gabon',
  'Gambia','Georgia','Germany','Ghana','Greece','Grenada','Guatemala','Guinea','Guinea-Bissau','Guyana',
  'Haiti','Honduras','Hungary','Iceland','India','Indonesia','Iran','Iraq','Ireland','Israel',
  'Italy','Jamaica','Japan','Jordan','Kazakhstan','Kenya','Kiribati','Kuwait','Kyrgyzstan','Laos',
  'Latvia','Lebanon','Lesotho','Liberia','Libya','Liechtenstein','Lithuania','Luxembourg','Madagascar','Malawi',
  'Malaysia','Maldives','Mali','Malta','Marshall Islands','Mauritania','Mauritius','Mexico','Micronesia','Moldova',
  'Monaco','Mongolia','Montenegro','Morocco','Mozambique','Myanmar','Namibia','Nauru','Nepal','Netherlands',
  'New Zealand','Nicaragua','Niger','Nigeria','North Korea','North Macedonia','Norway','Oman','Pakistan','Palau',
  'Panama','Papua New Guinea','Paraguay','Peru','Philippines','Poland','Portugal','Qatar','Romania','Russia',
  'Rwanda','Saint Kitts and Nevis','Saint Lucia','Saint Vincent and the Grenadines','Samoa','San Marino','Sao Tome and Principe','Saudi Arabia','Senegal','Serbia',
  'Seychelles','Sierra Leone','Singapore','Slovakia','Slovenia','Solomon Islands','Somalia','South Africa','South Korea','South Sudan',
  'Spain','Sri Lanka','Sudan','Suriname','Sweden','Switzerland','Syria','Taiwan','Tajikistan','Tanzania',
  'Thailand','Timor-Leste','Togo','Tonga','Trinidad and Tobago','Tunisia','Turkey','Turkmenistan','Tuvalu','Uganda',
  'Ukraine','United Arab Emirates','United Kingdom','United States','Uruguay','Uzbekistan','Vanuatu','Vatican City','Venezuela','Vietnam',
  'Yemen','Zambia','Zimbabwe'
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

// Global getCurrencySymbol function imported from utils

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
    const { t } = useTranslation('common');
  const [teachers, setTeachers] = useState<User[]>([]);
  const [subjects, setSubjects] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [studentSearch, setStudentSearch] = useState('');

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
  const [isActive, setIsActive] = useState(true);

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
      isActive,
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
    setIsActive(true);
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
    setIsActive(assignment.isActive ?? true);
    setShowCreateForm(true);
  };

  if (loading) {
    return (
      <div className="text-center py-3">
        <Spinner animation="border" size="sm" />
        <p className="mt-2 text-muted small">{t('auto.loadingAssignmentData', `Loading assignment data...`)}</p>
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
            {t('auto.currentAssignments', `Current Assignments`)}
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
                {t('auto.editingAssignmentFor', `Editing assignment for`)} {editingAssignment.course?.name || 'subject'}
              </Alert>
            )}
            <Form onSubmit={handleCreateAssignment}>
              <Row className="g-3">
                <Col lg={4} md={6}>
                  <Form.Group>
                    <Form.Label>{t('auto.subject', `Subject *`)}</Form.Label>
                    <Form.Select 
                      value={selectedSubject}
                      onChange={(e) => setSelectedSubject(e.target.value)}
                      required
                      size="sm"
                    >
                      <option value="">{t('auto.chooseASubject', `Choose a subject...`)}</option>
                      {subjects.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col lg={4} md={6}>
                  <Form.Group>
                    <Form.Label>{t('auto.teacher', `Teacher *`)}</Form.Label>
                    <Form.Select 
                      value={selectedTeacher}
                      onChange={(e) => setSelectedTeacher(e.target.value)}
                      required
                      size="sm"
                    >
                      <option value="">{t('auto.chooseATeacher', `Choose a teacher...`)}</option>
                      {teachers.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col lg={4} md={6}>
                  <Form.Group>
                    <Form.Label>{t('auto.assignmentDate', `Assignment Date`)}</Form.Label>
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
                    <Form.Label>{t('auto.startTime', `Start Time`)}</Form.Label>
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
                    <Form.Label>{t('auto.durationMinutes', `Duration (minutes)`)}</Form.Label>
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
                    <Form.Label>{t('auto.timezone', `Timezone`)}</Form.Label>
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
                    <Form.Label>{t('auto.monthlyFee', `Monthly Fee`)}</Form.Label>
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
                    <Form.Label>{t('auto.currency', `Currency`)}</Form.Label>
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
                    <Form.Label>{t('auto.classDays', `Class Days`)}</Form.Label>
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
                <Col lg={4} md={6}>
                  <Form.Group>
                    <Form.Label>{t('auto.status', `Status`)}</Form.Label>
                    <div className="pt-2">
                      <Form.Check 
                        type="switch"
                        id="student-assignment-active-switch"
                        label={isActive ? t('auto.active', 'Active') : t('auto.inactive', 'Inactive')}
                        checked={isActive}
                        onChange={(e) => setIsActive(e.target.checked)}
                      />
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
                  {t('auto.cancel', `Cancel`)}
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
              {t('auto.currentAssignments', `Current Assignments`)}
                                      </h6>
            <Badge bg="primary">{assignments.length}</Badge>
          </div>
        </Card.Header>
        <Card.Body className="p-0">
          {assignments.length === 0 ? (
            <div className="text-center py-4">
              <i className="bi bi-list-task display-6 text-muted"></i>
              <p className="mt-2 text-muted small">{t('auto.noAssignmentsFound', `No assignments found`)}</p>
            </div>
          ) : (
            <div className="table-responsive">
              <Table hover size="sm" className="mb-0">
                <thead className="table-light">
                  <tr>
                    <th>{t('auto.subject', `Subject`)}</th>
                    <th>{t('auto.teacher', `Teacher`)}</th>
                    <th>{t('auto.schedule', `Schedule`)}</th>
                    <th>{t('auto.fee', `Fee`)}</th>
                    <th>{t('auto.actions', `Actions`)}</th>
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
                          <div className="text-muted">{assignment.duration}{t('auto.min', `min`)}</div>
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
                            title={t('auto.editAssignment', `Edit Assignment`)}
                          >
                            <i className="bi bi-pencil"></i>
                          </Button>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => handleDeleteAssignment(assignment.id)}
                            title={t('auto.deleteAssignment', `Delete Assignment`)}
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
export function DetailViewModal({ show, onHide, title, data }: { show: boolean; onHide: () => void; title: string; data: any }) {
    const { t } = useTranslation('common');
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
          {t('auto.close', `Close`)}
                          </Button>
      </Modal.Footer>
    </Modal>
  );
}

// Expandable Text Component
export function ExpandableText({ text, maxLength = 50 }: { text: string; maxLength?: number }) {
    const { t } = useTranslation('common');
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
    const { t } = useTranslation('common');
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
  const [newCountry, setNewCountry] = useState('');
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
  const [country, setCountry] = useState('');
  const [isActive, setIsActive] = useState(true);
  
  // Bulk import state
  const [importingCsv, setImportingCsv] = useState(false);
  const csvInputRef = useRef<HTMLInputElement>(null);
  
  // Teacher-specific fields
  const [qualification, setQualification] = useState('');
  const [payRate, setPayRate] = useState('');
  const [payType, setPayType] = useState<PayType>('MONTHLY');
  const [payCurrency, setPayCurrency] = useState('USD');

  // Salary management states for teacher edit
  const [teacherPayments, setTeacherPayments] = useState<any[]>([]);
  const [teacherAdvances, setTeacherAdvances] = useState<any[]>([]);
  const [teacherSalaries, setTeacherSalaries] = useState<any[]>([]);
  const [selectedPendingSalaryId, setSelectedPendingSalaryId] = useState<string>('');
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
  const [showSalaryPaymentForm, setShowSalaryPaymentForm] = useState(false);
  const [showSalaryAdvanceForm, setShowSalaryAdvanceForm] = useState(false);
  
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

  const roleValue = String(role) as keyof typeof roleConfig;
  const config = roleConfig[roleValue];
  const roleLabel = roleValue.charAt(0) + roleValue.slice(1).toLowerCase();
  const isTeacher = roleValue === 'TEACHER';
  const isParent = roleValue === 'PARENT';
  const isStudent = roleValue === 'STUDENT';

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
        address: newAddress || undefined,
        country: newCountry || undefined
      };

      // Only add teacher-specific fields for teachers
      if (isTeacher) {
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
    setNewCountry('');
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
    setCountry('');
    setQualification('');
    setPayRate('');
    setPayType('MONTHLY');
    setPayCurrency('USD');
    setIsActive(true);
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
    setTeacherSalaries([]);
    setSelectedPendingSalaryId('');
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
    setCountry(user.country || '');
    setQualification(user.qualification || '');
    setPayRate(user.payRate?.toString() || '');
    setPayType(user.payType || 'MONTHLY');
    setPayCurrency(user.payCurrency || 'USD');
    setIsActive(user.isActive ?? true);
    setActiveTab('basic');
    
    if (isStudent) {
      fetchStudentData(user.id);
    }
    if (isTeacher) {
      fetchTeacherSalaryData(user.id);
    }
    
    if (!isStudent && !isTeacher && !isParent) {
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
        setTeacherSalaries(data.salaries || []);
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
          salaryId: selectedPendingSalaryId || undefined,
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
        setSelectedPendingSalaryId('');
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
        isActive,
        ...(password && { password }),
        mobile: mobile || undefined,
        dateOfBirth: dateOfBirth || undefined,
        address: address || undefined,
        country: country || undefined
      };

      // Only add teacher-specific fields for teachers
      if (isTeacher) {
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
    if (!isTeacher) {
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

  const handleImportCsv = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportingCsv(true);
    setError('');
    setSuccess('');

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const res = await fetch('/api/bulk/students', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ students: results.data }),
          });
          if (res.ok) {
            const data = await res.json();
            setSuccess(data.message);
            if (data.errors && data.errors.length > 0) {
              setError(`Some rows failed: ${data.errors.join(', ')}`);
            }
            fetchUsers();
          } else {
            const err = await res.json();
            setError(err.message || 'Failed to import students');
          }
        } catch (e) {
          setError('Error importing CSV');
        } finally {
          setImportingCsv(false);
          if (csvInputRef.current) csvInputRef.current.value = '';
        }
      },
      error: (error) => {
        setError(`CSV Parse Error: ${error.message}`);
        setImportingCsv(false);
        if (csvInputRef.current) csvInputRef.current.value = '';
      }
    });
  };

  return (
    <div>
      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

      {isTeacher && !editingUser && (
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
                  {t('auto.createNewTeacher', `Create New Teacher`)}
                                                  </h6>
              </Card.Header>
              <Card.Body>
                <Form onSubmit={handleCreateUser}>
                  <Row className="g-3">
                    <Col md={4}>
                      <Form.Group className="mb-0">
                        <Form.Label>{t('auto.fullName', `Full Name`)}</Form.Label>
                        <Form.Control
                          type="text"
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          required
                          placeholder={t('auto.enterFullName', `Enter full name`)}
                          size="sm"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group className="mb-0">
                        <Form.Label>{t('auto.emailAddress', `Email Address`)}</Form.Label>
                        <Form.Control
                          type="email"
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value)}
                          required
                          placeholder={t('auto.enterEmailAddress', `Enter email address`)}
                          size="sm"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group className="mb-0">
                        <Form.Label>{t('auto.password', `Password`)}</Form.Label>
                        <Form.Control
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          required
                          placeholder={t('auto.enterPassword', `Enter password`)}
                          minLength={6}
                          size="sm"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group className="mb-0">
                        <Form.Label>{t('auto.mobileNumber', `Mobile Number`)}</Form.Label>
                        <Form.Control
                          type="tel"
                          value={newMobile}
                          onChange={(e) => setNewMobile(e.target.value)}
                          placeholder={t('auto.enterMobileNumber', `Enter mobile number`)}
                          size="sm"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group className="mb-0">
                        <Form.Label>{t('auto.dateOfBirth', `Date of Birth`)}</Form.Label>
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
                        <Form.Label>{t('auto.qualification', `Qualification`)}</Form.Label>
                        <Form.Control
                          type="text"
                          value={newQualification}
                          onChange={(e) => setNewQualification(e.target.value)}
                          placeholder={t('auto.enterQualification', `Enter qualification`)}
                          size="sm"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group className="mb-0">
                        <Form.Label>{t('auto.payRate', `Pay Rate`)}</Form.Label>
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
                        <Form.Label>{t('auto.salaryType', `Salary Type`)}</Form.Label>
                        <Form.Select
                          value={newPayType}
                          onChange={(e) => setNewPayType(e.target.value as PayType)}
                          size="sm"
                        >
                          <option value="DAILY">{t('auto.daily', `Daily`)}</option>
                          <option value="WEEKLY">{t('auto.weekly', `Weekly`)}</option>
                          <option value="FORTNIGHTLY">{t('auto.fortnightly', `Fortnightly`)}</option>
                          <option value="MONTHLY">{t('auto.monthly', `Monthly`)}</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group className="mb-0">
                        <Form.Label>{t('auto.payCurrency', `Pay Currency`)}</Form.Label>
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
                        <Form.Label>{t('auto.address', `Address`)}</Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={2}
                          value={newAddress}
                          onChange={(e) => setNewAddress(e.target.value)}
                          placeholder={t('auto.enterAddress', `Enter address`)}
                          size="sm"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group className="mb-0">
                        <Form.Label>{t('auto.country', `Country`)}</Form.Label>
                        <Form.Select
                          value={newCountry}
                          onChange={(e) => setNewCountry(e.target.value)}
                          size="sm"
                        >
                          <option value="">{t('auto.selectCountry', `Select country`)}</option>
                          {countryOptions.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </Form.Select>
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
                      {t('auto.cancel', `Cancel`)}
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
                          {t('auto.creating', `Creating...`)}
                                                                          </>
                      ) : (
                        <>
                          <i className="bi bi-plus-circle me-2"></i>
                          {t('auto.create', `Create`)}
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
                <Badge bg={config.color}>{users.length} {t('auto.total', `Total`)}</Badge>
              </div>
            </Card.Header>
            <Card.Body className="p-0">
              {loading ? (
                <div className="text-center py-4">
                  <Spinner animation="border" size="sm" />
                  <p className="mt-2 text-muted small">{t('auto.loading', `Loading`)} {config.title.toLowerCase()}...</p>
                </div>
              ) : users.length === 0 ? (
                <div className="text-center py-4">
                  <i className={`${config.icon} display-6 text-muted`}></i>
                  <p className="mt-2 text-muted small">{t('auto.no', `No`)} {config.title.toLowerCase()} {t('auto.found', `found`)}</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <Table hover size="sm" className="mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>{t('auto.name', `Name`)}</th>
                        <th>{t('auto.email', `Email`)}</th>
                        <th>{t('auto.mobile', `Mobile`)}</th>
                        <th>{t('auto.payRate', `Pay Rate`)}</th>
                        <th>{t('auto.created', `Created`)}</th>
                        <th>{t('auto.status', `Status`)}</th>
                        <th>{t('auto.actions', `Actions`)}</th>
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
                              <Badge bg="secondary">{t('auto.na', `N/A`)}</Badge>
                            )}
                          </td>
                          <td className="text-muted small">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </td>
                          <td>
                            {user.isActive ? (
                              <Badge bg="success">{t('auto.active', 'Active')}</Badge>
                            ) : (
                              <Badge bg="danger">{t('auto.inactive', 'Inactive')}</Badge>
                            )}
                          </td>
                          <td>
                            <div className="d-flex gap-1">
                              <Button
                                variant="outline-info"
                                size="sm"
                                onClick={() => handleViewDetails(user)}
                                title={t('auto.viewDetails', `View Details`)}
                              >
                                <i className="bi bi-eye"></i>
                              </Button>
                              <Button
                                variant="outline-warning"
                                size="sm"
                                onClick={() => handleEditUser(user)}
                                title={t('auto.editUser', `Edit User`)}
                              >
                                <i className="bi bi-pencil"></i>
                              </Button>
                              <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={() => handleDeleteUser(user.id)}
                                title={t('auto.deleteUser', `Delete User`)}
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

      {!isTeacher && (
        <>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div className="d-flex align-items-center gap-2">
              <i className={`${config.icon} text-${config.color}`}></i>
              <h6 className="mb-0">{config.title}</h6>
              <Badge bg={config.color}>{users.length} {t('auto.total', `Total`)}</Badge>
            </div>
            <div className="d-flex gap-2">
              {isStudent && (
                <>
                  <input
                    type="file"
                    accept=".csv"
                    ref={csvInputRef}
                    style={{ display: 'none' }}
                    onChange={handleImportCsv}
                  />
                  <Button
                    size="sm"
                    variant="outline-success"
                    onClick={() => csvInputRef.current?.click()}
                    disabled={importingCsv}
                  >
                    {importingCsv ? <Spinner size="sm" animation="border" /> : <><i className="bi bi-file-earmark-spreadsheet me-1"></i> {t('auto.importCsv', `Import CSV`)}</>}
                  </Button>
                </>
              )}
              <Button
                size="sm"
                variant={showCreateForm ? 'secondary' : config.color}
                onClick={() => setShowCreateForm((v) => !v)}
              >
                {showCreateForm ? 'Hide Form' : `Add New ${isStudent ? 'Student' : isParent ? 'Parent' : roleLabel}`}
              </Button>
            </div>
          </div>

          {showCreateForm && (
            <Card className="shadow-sm mb-3">
              <Card.Header className={`bg-${config.color} text-white`}>
                <h6 className="mb-0">
                  <i className={`${config.icon} me-2`}></i>
                  {t('auto.createNew', `Create New`)} {roleLabel}
                </h6>
              </Card.Header>
              <Card.Body>
                <Form onSubmit={handleCreateUser}>
                  <Row className="g-3">
                    <Col md={4}>
                      <Form.Group className="mb-0">
                        <Form.Label>{t('auto.fullName', `Full Name`)}</Form.Label>
                        <Form.Control
                          type="text"
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          required
                          placeholder={t('auto.enterFullName', `Enter full name`)}
                          size="sm"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group className="mb-0">
                        <Form.Label>{t('auto.emailAddress', `Email Address`)}</Form.Label>
                        <Form.Control
                          type="email"
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value)}
                          required
                          placeholder={t('auto.enterEmailAddress', `Enter email address`)}
                          size="sm"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group className="mb-0">
                        <Form.Label>{t('auto.password', `Password`)}</Form.Label>
                        <Form.Control
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          required
                          placeholder={t('auto.enterPassword', `Enter password`)}
                          minLength={6}
                          size="sm"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group className="mb-0">
                        <Form.Label>{t('auto.mobileNumber', `Mobile Number`)}</Form.Label>
                        <Form.Control
                          type="tel"
                          value={newMobile}
                          onChange={(e) => setNewMobile(e.target.value)}
                          placeholder={t('auto.enterMobileNumber', `Enter mobile number`)}
                          size="sm"
                        />
                      </Form.Group>
                    </Col>
                    {isStudent && (
                      <Col md={4}>
                        <Form.Group className="mb-0">
                          <Form.Label>{t('auto.dateOfBirth', `Date of Birth`)}</Form.Label>
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
                        <Form.Label>{t('auto.address', `Address`)}</Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={2}
                          value={newAddress}
                          onChange={(e) => setNewAddress(e.target.value)}
                          placeholder={t('auto.enterAddress', `Enter address`)}
                          size="sm"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group className="mb-0">
                        <Form.Label>{t('auto.country', `Country`)}</Form.Label>
                        <Form.Select
                          value={newCountry}
                          onChange={(e) => setNewCountry(e.target.value)}
                          size="sm"
                        >
                          <option value="">{t('auto.selectCountry', `Select country`)}</option>
                          {countryOptions.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </Form.Select>
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
                      {t('auto.cancel', `Cancel`)}
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
                          {t('auto.creating', `Creating...`)}
                                                                          </>
                      ) : (
                        <>
                          <i className="bi bi-plus-circle me-2"></i>
                          {t('auto.create', `Create`)}
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

          {isStudent && editingUser ? (
            <Card className="shadow-sm">
              <Card.Header className="bg-light d-flex flex-wrap justify-content-between align-items-center gap-2">
                <div className="d-flex align-items-center gap-2">
                  <i className="bi bi-pencil text-warning"></i>
                  <div>
                    <h6 className="mb-0">{t('auto.editingStudent', `Editing Student`)}</h6>
                    <small className="text-muted">{editingUser.name}</small>
                  </div>
                </div>
                <Button variant="outline-secondary" size="sm" onClick={closeEditModal}>
                  <i className="bi bi-arrow-left me-2"></i>
                  {t('auto.backToList', `Back to List`)}
                                          </Button>
              </Card.Header>
              <Card.Body className="p-3">
                <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k || 'basic')} className="mb-3">
                  <Tab eventKey="basic" title={
                    <span>
                      <i className="bi bi-person me-2"></i>
                      {t('auto.basicInfo', `Basic Info`)}
                                                      </span>
                  }>
                    <Form onSubmit={handleUpdateUser} className="mt-3">
                      <Row>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>{t('auto.fullName', `Full Name`)}</Form.Label>
                            <Form.Control 
                              type="text" 
                              value={name} 
                              onChange={(e) => setName(e.target.value)} 
                              required 
                              placeholder={t('auto.enterFullName', `Enter full name`)}
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>{t('auto.emailAddress', `Email Address`)}</Form.Label>
                            <Form.Control 
                              type="email" 
                              value={email} 
                              onChange={(e) => setEmail(e.target.value)} 
                              required 
                              placeholder={t('auto.enterEmailAddress', `Enter email address`)}
                            />
                          </Form.Group>
                        </Col>
                      </Row>
                      <Row>
                        <Col md={4}>
                          <Form.Group className="mb-3">
                            <Form.Label>{t('auto.mobileNumber', `Mobile Number`)}</Form.Label>
                            <Form.Control 
                              type="tel" 
                              value={mobile} 
                              onChange={(e) => setMobile(e.target.value)} 
                              placeholder={t('auto.enterMobileNumber', `Enter mobile number`)}
                            />
                          </Form.Group>
                        </Col>
                        <Col md={4}>
                          <Form.Group className="mb-3">
                            <Form.Label>{t('auto.dateOfBirth', `Date of Birth`)}</Form.Label>
                            <Form.Control 
                              type="date" 
                              value={dateOfBirth} 
                              onChange={(e) => setDateOfBirth(e.target.value)} 
                            />
                          </Form.Group>
                        </Col>
                      </Row>
                      <Row className="g-3">
                        <Col md={8}>
                          <Form.Group className="mb-3">
                            <Form.Label>{t('auto.address', `Address`)}</Form.Label>
                            <Form.Control 
                              as="textarea"
                              rows={3}
                              value={address} 
                              onChange={(e) => setAddress(e.target.value)} 
                              placeholder={t('auto.enterAddress', `Enter address`)}
                            />
                          </Form.Group>
                        </Col>
                        <Col md={4}>
                          <Form.Group className="mb-3">
                            <Form.Label>{t('auto.country', `Country`)}</Form.Label>
                            <Form.Select 
                              value={country} 
                              onChange={(e) => setCountry(e.target.value)} 
                            >
                              <option value="">{t('auto.selectCountry', `Select country`)}</option>
                              {countryOptions.map((c) => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </Form.Select>
                          </Form.Group>
                        </Col>
                      </Row>
                      <Form.Group className="mb-3">
                        <Form.Check
                          type="switch"
                          id="edit-student-active"
                          label={isActive ? t('auto.active', 'Active') : t('auto.inactive', 'Inactive')}
                          checked={isActive}
                          onChange={(e) => setIsActive(e.target.checked)}
                        />
                      </Form.Group>
                      <Form.Group className="mb-4">
                        <Form.Label>{t('auto.password', `Password`)}</Form.Label>
                        <Form.Control 
                          type="password" 
                          value={password} 
                          onChange={(e) => setPassword(e.target.value)} 
                          placeholder={t('auto.leaveBlankToKeepCurrentPasswor', `Leave blank to keep current password`)}
                          minLength={6}
                        />
                        <Form.Text className="text-muted">
                          {t('auto.leaveBlankToKeepCurrentPasswor', `Leave blank to keep current password`)}
                                                                  </Form.Text>
                      </Form.Group>
                      <div className="d-flex justify-content-end gap-2">
                        <Button variant="secondary" onClick={closeEditModal}>
                          {t('auto.cancel', `Cancel`)}
                                                                  </Button>
                        <Button
                          type="submit"
                          variant="warning"
                          disabled={editing}
                        >
                          {editing ? (
                            <>
                              <Spinner animation="border" size="sm" className="me-2" />
                              {t('auto.updating', `Updating...`)}
                                                                              </>
                          ) : (
                            <>
                              <i className="bi bi-check-circle me-2"></i>
                              {t('auto.update', `Update`)}
                                                                                  </>
                          )}
                        </Button>
                      </div>
                    </Form>
                  </Tab>
                  
                  <Tab eventKey="parents" title={
                    <span>
                      <i className="bi bi-people me-2"></i>
                      {t('auto.parentAssociations', `Parent Associations`)}
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
                      {t('auto.assignments', `Assignments`)}
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
                      {t('auto.progress', `Progress`)}
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
                      {t('auto.testsExams', `Tests & Exams`)}
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
                      {t('auto.fees', `Fees`)}
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
          ) : isTeacher && editingUser ? (
            <Card className="shadow-sm">
              <Card.Header className="bg-light d-flex flex-wrap justify-content-between align-items-center gap-2">
                <div className="d-flex align-items-center gap-2">
                  <i className="bi bi-pencil text-warning"></i>
                  <div>
                    <h6 className="mb-0">{t('auto.editingTeacher', `Editing Teacher`)}</h6>
                    <small className="text-muted">{editingUser.name}</small>
                  </div>
                </div>
                <Button variant="outline-secondary" size="sm" onClick={closeEditModal}>
                  <i className="bi bi-arrow-left me-2"></i>
                  {t('auto.backToList', `Back to List`)}
                                              </Button>
              </Card.Header>
              <Card.Body className="p-3">
                <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k || 'basic')} className="mb-3">
                  <Tab eventKey="basic" title={<span><i className="bi bi-person me-2"></i>{t('auto.basicInfo', `Basic Info`)}</span>}>
                    <Form onSubmit={handleUpdateUser} className="mt-3">
                      <Row className="g-3">
                        <Col md={4}>
                          <Form.Group>
                            <Form.Label>{t('auto.fullName', `Full Name`)}</Form.Label>
                            <Form.Control 
                              type="text" 
                              value={name} 
                              onChange={(e) => setName(e.target.value)} 
                              required 
                              placeholder={t('auto.enterFullName', `Enter full name`)}
                            />
                          </Form.Group>
                        </Col>
                        <Col md={4}>
                          <Form.Group>
                            <Form.Label>{t('auto.emailAddress', `Email Address`)}</Form.Label>
                            <Form.Control 
                              type="email" 
                              value={email} 
                              onChange={(e) => setEmail(e.target.value)} 
                              required 
                              placeholder={t('auto.enterEmailAddress', `Enter email address`)}
                            />
                          </Form.Group>
                        </Col>
                        <Col md={4}>
                          <Form.Group>
                            <Form.Label>{t('auto.mobileNumber', `Mobile Number`)}</Form.Label>
                            <Form.Control 
                              type="tel" 
                              value={mobile} 
                              onChange={(e) => setMobile(e.target.value)} 
                              placeholder={t('auto.enterMobileNumber', `Enter mobile number`)}
                            />
                          </Form.Group>
                        </Col>
                        <Col md={4}>
                          <Form.Group>
                            <Form.Label>{t('auto.dateOfBirth', `Date of Birth`)}</Form.Label>
                            <Form.Control 
                              type="date" 
                              value={dateOfBirth} 
                              onChange={(e) => setDateOfBirth(e.target.value)} 
                            />
                          </Form.Group>
                        </Col>
                        <Col md={4}>
                          <Form.Group>
                            <Form.Label>{t('auto.address', `Address`)}</Form.Label>
                            <Form.Control 
                              as="textarea"
                              rows={2}
                              value={address} 
                              onChange={(e) => setAddress(e.target.value)} 
                              placeholder={t('auto.enterAddress', `Enter address`)}
                            />
                          </Form.Group>
                        </Col>
                        <Col md={4}>
                          <Form.Group>
                            <Form.Label>{t('auto.country', `Country`)}</Form.Label>
                            <Form.Select 
                              value={country} 
                              onChange={(e) => setCountry(e.target.value)} 
                            >
                              <option value="">{t('auto.selectCountry', `Select country`)}</option>
                              {countryOptions.map((c) => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </Form.Select>
                          </Form.Group>
                        </Col>
                        <Col md={4}>
                          <Form.Group>
                            <Form.Label>{t('auto.qualification', `Qualification`)}</Form.Label>
                            <Form.Control 
                              type="text" 
                              value={qualification} 
                              onChange={(e) => setQualification(e.target.value)} 
                              placeholder={t('auto.enterQualification', `Enter qualification`)}
                            />
                          </Form.Group>
                        </Col>
                        <Col md={4}>
                          <Form.Group>
                            <Form.Label>{t('auto.payRate', `Pay Rate`)}</Form.Label>
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
                            <Form.Label>{t('auto.salaryType', `Salary Type`)}</Form.Label>
                            <Form.Select 
                              value={payType}
                              onChange={(e) => setPayType(e.target.value as PayType)}
                            >
                              <option value="DAILY">{t('auto.daily', `Daily`)}</option>
                              <option value="WEEKLY">{t('auto.weekly', `Weekly`)}</option>
                              <option value="FORTNIGHTLY">{t('auto.fortnightly', `Fortnightly`)}</option>
                              <option value="MONTHLY">{t('auto.monthly', `Monthly`)}</option>
                            </Form.Select>
                          </Form.Group>
                        </Col>
                        <Col md={4}>
                          <Form.Group>
                            <Form.Label>{t('auto.payCurrency', `Pay Currency`)}</Form.Label>
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
                            <Form.Label>{t('auto.password', `Password`)}</Form.Label>
                            <Form.Control 
                              type="password" 
                              value={password} 
                              onChange={(e) => setPassword(e.target.value)} 
                              placeholder={t('auto.leaveBlankToKeepCurrentPasswor', `Leave blank to keep current password`)}
                              minLength={6}
                            />
                            <Form.Text className="text-muted">
                              {t('auto.leaveBlankToKeepCurrentPasswor', `Leave blank to keep current password`)}
                                                                                  </Form.Text>
                          </Form.Group>
                        </Col>
                      </Row>
                      <div className="d-flex justify-content-end gap-2 mt-3">
                        <Button variant="secondary" onClick={closeEditModal}>
                          {t('auto.cancel', `Cancel`)}
                                                                      </Button>
                        <Button type="submit" variant="warning" disabled={editing}>
                          {editing ? (
                            <><Spinner animation="border" size="sm" className="me-2" />{t('auto.updating', `Updating...`)}</>
                          ) : (
                            <><i className="bi bi-check-circle me-2"></i>{t('auto.update', `Update`)}</>
                          )}
                        </Button>
                      </div>
                    </Form>
                  </Tab>
                  <Tab eventKey="salaries" title={<span><i className="bi bi-cash-stack me-2"></i>{t('auto.salary', `Salary`)}</span>}>
                    <div className="d-flex justify-content-end gap-2 mb-3 mt-3">
                      <Button 
                        variant={showSalaryPaymentForm ? 'secondary' : 'primary'} 
                        size="sm" 
                        onClick={() => {
                          setShowSalaryPaymentForm(v => !v);
                          if (!showSalaryPaymentForm) setShowSalaryAdvanceForm(false);
                        }}
                      >
                        {showSalaryPaymentForm ? t('auto.hideForm', 'Hide Form') : (
                          <><i className="bi bi-cash me-1"></i> {t('auto.recordSalaryPayment', 'Record Salary Payment')}</>
                        )}
                      </Button>
                      <Button 
                        variant={showSalaryAdvanceForm ? 'secondary' : 'warning'} 
                        size="sm" 
                        onClick={() => {
                          setShowSalaryAdvanceForm(v => !v);
                          if (!showSalaryAdvanceForm) setShowSalaryPaymentForm(false);
                        }}
                      >
                        {showSalaryAdvanceForm ? t('auto.hideForm', 'Hide Form') : (
                          <><i className="bi bi-bank me-1"></i> {t('auto.createSalaryAdvanceloan', 'Create Salary Advance/Loan')}</>
                        )}
                      </Button>
                    </div>

                    {(showSalaryPaymentForm || showSalaryAdvanceForm) && (
                      <Row className="g-3 mb-3">
                        {showSalaryPaymentForm && (
                          <Col md={12}>
                            <Card className="shadow-sm border-primary">
                          <Card.Header className="bg-light"><strong>{t('auto.recordSalaryPayment', `Record Salary Payment`)}</strong></Card.Header>
                          <Card.Body>
                            <Row>
                              <Col md={12}>
                                <Form.Group className="mb-3">
                                  <Form.Label>{t('auto.linkToSalary', `Link to Pending Salary`)}</Form.Label>
                                  <Form.Select
                                    value={selectedPendingSalaryId}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setSelectedPendingSalaryId(val);
                                      if (val) {
                                        const s = teacherSalaries.find((item) => item.id === val);
                                        if (s) {
                                          setPaymentAmount(s.amount.toString());
                                          setPaymentDetails(`Paying salary: ${s.title}`);
                                        }
                                      } else {
                                        setPaymentAmount('');
                                        setPaymentDetails('');
                                      }
                                    }}
                                  >
                                    <option value="">{t('auto.noSpecificSalary', `General payment / No specific salary`)}</option>
                                    {teacherSalaries.filter(s => s.status !== 'PAID').map(s => (
                                      <option key={s.id} value={s.id}>
                                        {s.title} - {getCurrencySymbol(s.currency)}{s.amount.toFixed(2)} (Due: {new Date(s.dueDate).toLocaleDateString()})
                                      </option>
                                    ))}
                                  </Form.Select>
                                </Form.Group>
                              </Col>
                            </Row>
                            <Row>
                              <Col md={6}>
                                <Form.Group className="mb-3">
                                  <Form.Label>{t('auto.amount', `Amount`)}</Form.Label>
                                  <Form.Control type="number" step="0.01" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} />
                                </Form.Group>
                              </Col>
                              <Col md={6}>
                                <Form.Group className="mb-3">
                                  <Form.Label>{t('auto.paidDate', `Paid Date`)}</Form.Label>
                                  <Form.Control type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
                                </Form.Group>
                              </Col>
                            </Row>
                            <Form.Group className="mb-3">
                              <Form.Label>{t('auto.paymentDetailsremarks', `Payment Details/Remarks`)}</Form.Label>
                              <Form.Control as="textarea" rows={2} value={paymentDetails} onChange={(e) => setPaymentDetails(e.target.value)} />
                            </Form.Group>
                            
                            {(() => {
                              const activeAdvList = teacherAdvances.filter(a => a.status === 'ACTIVE');
                              if (activeAdvList.length > 0 && paymentAmount) {
                                const parsedAmt = parseFloat(paymentAmount) || 0;
                                let totalDeduction = 0;
                                for (const adv of activeAdvList) {
                                  totalDeduction += Math.min(adv.installmentAmount, adv.balance);
                                }
                                const netPay = Math.max(0, parsedAmt - totalDeduction);
                                return (
                                  <Alert variant="info" className="py-2 px-3 mb-3 small">
                                    <div className="d-flex justify-content-between">
                                      <span><strong>Gross Recorded:</strong></span>
                                      <span>{getCurrencySymbol(editingUser?.payCurrency || 'USD')}{parsedAmt.toFixed(2)}</span>
                                    </div>
                                    <div className="d-flex justify-content-between text-danger">
                                      <span><strong>Loan Deductions:</strong></span>
                                      <span>-{getCurrencySymbol(editingUser?.payCurrency || 'USD')}{totalDeduction.toFixed(2)}</span>
                                    </div>
                                    <hr className="my-1" />
                                    <div className="d-flex justify-content-between fw-bold text-success">
                                      <span><strong>Net Paid (Estimated Cash):</strong></span>
                                      <span>{getCurrencySymbol(editingUser?.payCurrency || 'USD')}{netPay.toFixed(2)}</span>
                                    </div>
                                  </Alert>
                                );
                              }
                              return null;
                            })()}

                            <div className="d-flex justify-content-end">
                              <Button variant="primary" size="sm" onClick={handleRecordPayment} disabled={recordingPayment}>
                                {recordingPayment ? 'Recording...' : 'Record Payment'}
                              </Button>
                            </div>
                          </Card.Body>
                        </Card>
                      </Col>
                    )}
                    {showSalaryAdvanceForm && (
                      <Col md={12}>
                        <Card className="shadow-sm border-warning">
                          <Card.Header className="bg-light"><strong>{t('auto.createSalaryAdvanceloan', `Create Salary Advance/Loan`)}</strong></Card.Header>
                          <Card.Body>
                            <Row>
                              <Col md={6}>
                                <Form.Group className="mb-3">
                                  <Form.Label>{t('auto.principal', `Principal`)}</Form.Label>
                                  <Form.Control type="number" step="0.01" value={advancePrincipal} onChange={(e) => setAdvancePrincipal(e.target.value)} />
                                </Form.Group>
                              </Col>
                              <Col md={6}>
                                <Form.Group className="mb-3">
                                  <Form.Label>{t('auto.installments', `Installments`)}</Form.Label>
                                  <Form.Control type="number" value={advanceInstallments} onChange={(e) => setAdvanceInstallments(e.target.value)} />
                                </Form.Group>
                              </Col>
                            </Row>
                            <Row>
                              <Col md={6}>
                                <Form.Group className="mb-3">
                                  <Form.Label>{t('auto.repaymentFrequency', `Repayment Frequency`)}</Form.Label>
                                  <Form.Select value={advancePayType} onChange={(e) => setAdvancePayType(e.target.value as PayType)}>
                                    <option value="DAILY">{t('auto.daily', `Daily`)}</option>
                                    <option value="WEEKLY">{t('auto.weekly', `Weekly`)}</option>
                                    <option value="FORTNIGHTLY">{t('auto.fortnightly', `Fortnightly`)}</option>
                                    <option value="MONTHLY">{t('auto.monthly', `Monthly`)}</option>
                                  </Form.Select>
                                </Form.Group>
                              </Col>
                              <Col md={6}>
                                <Form.Group className="mb-3">
                                  <Form.Label>{t('auto.currency', `Currency`)}</Form.Label>
                                  <Form.Select value={advanceCurrency} onChange={(e) => setAdvanceCurrency(e.target.value)}>
                                    {currencies.map(currency => (
                                      <option key={currency.code} value={currency.code}>{currency.code}</option>
                                    ))}
                                  </Form.Select>
                                </Form.Group>
                              </Col>
                            </Row>
                            <Form.Group className="mb-3">
                              <Form.Label>{t('auto.detailsremarks', `Details/Remarks`)}</Form.Label>
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
                    )}
                  </Row>
                )}

                <Row className="g-3 mt-2">
                      <Col md={12}>
                        <Card>
                          <Card.Header className="bg-light"><strong>{t('auto.salarySchedule', `Salary Schedule`)}</strong></Card.Header>
                          <Card.Body className="p-0">
                            <div className="table-responsive">
                              <Table size="sm" className="mb-0" hover>
                                <thead className="table-light">
                                  <tr>
                                    <th>{t('auto.title', `Title`)}</th>
                                    <th>{t('auto.amount', `Amount`)}</th>
                                    <th>{t('auto.dueDate', `Due Date`)}</th>
                                    <th>{t('auto.status', `Status`)}</th>
                                    <th>{t('auto.paidBy', `Paid By`)}</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {teacherSalaries.length === 0 ? (
                                    <tr><td colSpan={5} className="text-center text-muted small py-3">{t('auto.noRecords', `No records`)}</td></tr>
                                  ) : teacherSalaries.map((s) => (
                                    <tr key={s.id}>
                                      <td className="fw-medium">{s.title}</td>
                                      <td className="fw-bold">{getCurrencySymbol(s.currency)}{s.amount.toFixed(2)}</td>
                                      <td className="small">{new Date(s.dueDate).toLocaleDateString()}</td>
                                      <td>
                                        <Badge bg={s.status === 'PAID' ? 'success' : s.status === 'PENDING' ? 'warning' : 'danger'}>
                                          {s.status}
                                        </Badge>
                                      </td>
                                      <td className="small">{s.paidBy?.name || '-'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </Table>
                            </div>
                          </Card.Body>
                        </Card>
                      </Col>
                    </Row>

                    <Row className="g-3 mt-2">
                      <Col md={6}>
                        <Card>
                          <Card.Header className="bg-light"><strong>{t('auto.paymentHistory', `Payment History`)}</strong></Card.Header>
                          <Card.Body className="p-0">
                            <div className="table-responsive">
                              <Table size="sm" className="mb-0">
                                <thead className="table-light">
                                  <tr>
                                    <th>{t('auto.amount', `Amount`)}</th>
                                    <th>{t('auto.date', `Date`)}</th>
                                    <th>{t('auto.details', `Details`)}</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {teacherPayments.length === 0 ? (
                                    <tr><td colSpan={3} className="text-center text-muted small py-3">{t('auto.noRecords', `No records`)}</td></tr>
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
                          <Card.Header className="bg-light"><strong>{t('auto.advancesloans', `Advances/Loans`)}</strong></Card.Header>
                          <Card.Body className="p-0">
                            <div className="table-responsive">
                              <Table size="sm" className="mb-0">
                                <thead className="table-light">
                                  <tr>
                                    <th>{t('auto.principal', `Principal`)}</th>
                                    <th>{t('auto.balance', `Balance`)}</th>
                                    <th>{t('auto.installments', `Installments`)}</th>
                                    <th>{t('auto.status', `Status`)}</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {teacherAdvances.length === 0 ? (
                                    <tr><td colSpan={4} className="text-center text-muted small py-3">{t('auto.noRecords', `No records`)}</td></tr>
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
          ) : isParent && editingUser ? (
            <Card className="shadow-sm">
              <Card.Header className="bg-light d-flex flex-wrap justify-content-between align-items-center gap-2">
                <div className="d-flex align-items-center gap-2">
                  <i className="bi bi-pencil text-warning"></i>
                  <div>
                    <h6 className="mb-0">{t('auto.editingParent', `Editing Parent`)}</h6>
                    <small className="text-muted">{editingUser.name}</small>
                  </div>
                </div>
                <Button variant="outline-secondary" size="sm" onClick={closeEditModal}>
                  <i className="bi bi-arrow-left me-2"></i>
                  {t('auto.backToList', `Back to List`)}
                                                  </Button>
              </Card.Header>
              <Card.Body>
                <Form onSubmit={handleUpdateUser}>
                  <Row className="g-3">
                    <Col md={4}>
                      <Form.Group>
                        <Form.Label>{t('auto.fullName', `Full Name`)}</Form.Label>
                        <Form.Control 
                          type="text" 
                          value={name} 
                          onChange={(e) => setName(e.target.value)} 
                          required 
                          placeholder={t('auto.enterFullName', `Enter full name`)}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group>
                        <Form.Label>{t('auto.emailAddress', `Email Address`)}</Form.Label>
                        <Form.Control 
                          type="email" 
                          value={email} 
                          onChange={(e) => setEmail(e.target.value)} 
                          required 
                          placeholder={t('auto.enterEmailAddress', `Enter email address`)}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group>
                        <Form.Label>{t('auto.mobileNumber', `Mobile Number`)}</Form.Label>
                        <Form.Control 
                          type="tel" 
                          value={mobile} 
                          onChange={(e) => setMobile(e.target.value)} 
                          placeholder={t('auto.enterMobileNumber', `Enter mobile number`)}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group>
                        <Form.Label>{t('auto.dateOfBirth', `Date of Birth`)}</Form.Label>
                        <Form.Control 
                          type="date" 
                          value={dateOfBirth} 
                          onChange={(e) => setDateOfBirth(e.target.value)} 
                        />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group>
                        <Form.Label>{t('auto.address', `Address`)}</Form.Label>
                        <Form.Control 
                          as="textarea"
                          rows={2}
                          value={address} 
                          onChange={(e) => setAddress(e.target.value)} 
                          placeholder={t('auto.enterAddress', `Enter address`)}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group>
                        <Form.Label>{t('auto.country', `Country`)}</Form.Label>
                        <Form.Select 
                          value={country} 
                          onChange={(e) => setCountry(e.target.value)} 
                        >
                          <option value="">{t('auto.selectCountry', `Select country`)}</option>
                          {countryOptions.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group>
                        <Form.Label>{t('auto.qualification', `Qualification`)}</Form.Label>
                        <Form.Control 
                          type="text" 
                          value={qualification} 
                          onChange={(e) => setQualification(e.target.value)} 
                          placeholder={t('auto.enterQualification', `Enter qualification`)}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group>
                        <Form.Label>{t('auto.payRate', `Pay Rate`)}</Form.Label>
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
                        <Form.Label>{t('auto.salaryType', `Salary Type`)}</Form.Label>
                        <Form.Select 
                          value={payType}
                          onChange={(e) => setPayType(e.target.value as PayType)}
                        >
                          <option value="DAILY">{t('auto.daily', `Daily`)}</option>
                          <option value="WEEKLY">{t('auto.weekly', `Weekly`)}</option>
                          <option value="FORTNIGHTLY">{t('auto.fortnightly', `Fortnightly`)}</option>
                          <option value="MONTHLY">{t('auto.monthly', `Monthly`)}</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group>
                        <Form.Label>{t('auto.payCurrency', `Pay Currency`)}</Form.Label>
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
                        <Form.Label>{t('auto.password', `Password`)}</Form.Label>
                        <Form.Control 
                          type="password" 
                          value={password} 
                          onChange={(e) => setPassword(e.target.value)} 
                          placeholder={t('auto.leaveBlankToKeepCurrentPasswor', `Leave blank to keep current password`)}
                          minLength={6}
                        />
                        <Form.Text className="text-muted">
                          {t('auto.leaveBlankToKeepCurrentPasswor', `Leave blank to keep current password`)}
                                                                          </Form.Text>
                      </Form.Group>
                    </Col>
                  </Row>
                  <div className="d-flex justify-content-end gap-2 mt-3">
                    <Button variant="secondary" onClick={closeEditModal}>
                      {t('auto.cancel', `Cancel`)}
                                                              </Button>
                    <Button
                      type="submit"
                      variant="warning"
                      disabled={editing}
                    >
                      {editing ? (
                        <>
                          <Spinner animation="border" size="sm" className="me-2" />
                          {t('auto.updating', `Updating...`)}
                                                                          </>
                      ) : (
                        <>
                          <i className="bi bi-check-circle me-2"></i>
                          {t('auto.update', `Update`)}
                                                                              </>
                      )}
                    </Button>
                  </div>
                </Form>
              </Card.Body>
            </Card>
          ) : !isTeacher ? (
            <Card className="shadow-sm">
              <Card.Header className="bg-light">
                <div className="d-flex justify-content-between align-items-center">
                  <h6 className="mb-0">
                    <i className={`${config.icon} me-2`}></i>
                    {config.title}
                  </h6>
                  <Badge bg={config.color}>{users.length} {t('auto.total', `Total`)}</Badge>
                </div>
              </Card.Header>
              <Card.Body className="p-0">
                {loading ? (
                  <div className="text-center py-4">
                    <Spinner animation="border" size="sm" />
                    <p className="mt-2 text-muted small">{t('auto.loading', `Loading`)} {config.title.toLowerCase()}...</p>
                  </div>
                ) : users.length === 0 ? (
                  <div className="text-center py-4">
                    <i className={`${config.icon} display-6 text-muted`}></i>
                    <p className="mt-2 text-muted small">{t('auto.no', `No`)} {config.title.toLowerCase()} {t('auto.found', `found`)}</p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <Table hover size="sm" className="mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>{t('auto.name', `Name`)}</th>
                          <th>{t('auto.email', `Email`)}</th>
                          <th>{t('auto.mobile', `Mobile`)}</th>
                          <th>{t('auto.created', `Created`)}</th>
                          <th>{t('auto.status', `Status`)}</th>
                          <th>{t('auto.actions', `Actions`)}</th>
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
                              {user.isActive ? (
                                <Badge bg="success">{t('auto.active', 'Active')}</Badge>
                              ) : (
                                <Badge bg="danger">{t('auto.inactive', 'Inactive')}</Badge>
                              )}
                            </td>
                            <td>
                              <div className="d-flex gap-1">
                                <Button
                                  variant="outline-info"
                                  size="sm"
                                  onClick={() => handleViewDetails(user)}
                                  title={t('auto.viewDetails', `View Details`)}
                                >
                                  <i className="bi bi-eye"></i>
                                </Button>
                                <Button
                                  variant="outline-warning"
                                  size="sm"
                                  onClick={() => handleEditUser(user)}
                                  title={t('auto.editUser', `Edit User`)}
                                >
                                  <i className="bi bi-pencil"></i>
                                </Button>
                                <Button
                                  variant="outline-danger"
                                  size="sm"
                                  onClick={() => handleDeleteUser(user.id)}
                                  title={t('auto.deleteUser', `Delete User`)}
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
      {!isStudent && (
      <Modal show={showEditModal} onHide={closeEditModal} size={isTeacher ? 'xl' : 'lg'}>
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-pencil me-2"></i>
            {t('auto.edit', `Edit`)} {roleLabel}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {isTeacher ? (
            <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k || 'basic')} className="mb-3">
              <Tab eventKey="basic" title={<span><i className="bi bi-person me-2"></i>{t('auto.basicInfo', `Basic Info`)}</span>}>
                <Form onSubmit={handleUpdateUser}>
                  <Form.Group className="mb-3">
                    <Form.Label>{t('auto.fullName', `Full Name`)}</Form.Label>
                    <Form.Control 
                      type="text" 
                      value={name} 
                      onChange={(e) => setName(e.target.value)} 
                      required 
                      placeholder={t('auto.enterFullName', `Enter full name`)}
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>{t('auto.emailAddress', `Email Address`)}</Form.Label>
                    <Form.Control 
                      type="email" 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)} 
                      required 
                      placeholder={t('auto.enterEmailAddress', `Enter email address`)}
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>{t('auto.mobileNumber', `Mobile Number`)}</Form.Label>
                    <Form.Control 
                      type="tel" 
                      value={mobile} 
                      onChange={(e) => setMobile(e.target.value)} 
                      placeholder={t('auto.enterMobileNumber', `Enter mobile number`)}
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>{t('auto.dateOfBirth', `Date of Birth`)}</Form.Label>
                    <Form.Control 
                      type="date" 
                      value={dateOfBirth} 
                      onChange={(e) => setDateOfBirth(e.target.value)} 
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>{t('auto.address', `Address`)}</Form.Label>
                    <Form.Control 
                      as="textarea"
                      rows={2}
                      value={address} 
                      onChange={(e) => setAddress(e.target.value)} 
                      placeholder={t('auto.enterAddress', `Enter address`)}
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>{t('auto.qualification', `Qualification`)}</Form.Label>
                    <Form.Control 
                      type="text" 
                      value={qualification} 
                      onChange={(e) => setQualification(e.target.value)} 
                      placeholder={t('auto.enterQualification', `Enter qualification`)}
                    />
                  </Form.Group>
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>{t('auto.payRate', `Pay Rate`)}</Form.Label>
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
                        <Form.Label>{t('auto.salaryType', `Salary Type`)}</Form.Label>
                        <Form.Select 
                          value={payType}
                          onChange={(e) => setPayType(e.target.value as PayType)}
                        >
                          <option value="DAILY">{t('auto.daily', `Daily`)}</option>
                          <option value="WEEKLY">{t('auto.weekly', `Weekly`)}</option>
                          <option value="FORTNIGHTLY">{t('auto.fortnightly', `Fortnightly`)}</option>
                          <option value="MONTHLY">{t('auto.monthly', `Monthly`)}</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                  </Row>
                  <Form.Group className="mb-3">
                    <Form.Label>{t('auto.payCurrency', `Pay Currency`)}</Form.Label>
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
                  <Form.Group className="mb-3">
                    <Form.Check
                      type="switch"
                      id="edit-teacher-active"
                      label={isActive ? t('auto.active', 'Active') : t('auto.inactive', 'Inactive')}
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                    />
                  </Form.Group>
                  <Form.Group className="mb-4">
                    <Form.Label>{t('auto.password', `Password`)}</Form.Label>
                    <Form.Control 
                      type="password" 
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)} 
                      placeholder={t('auto.leaveBlankToKeepCurrentPasswor', `Leave blank to keep current password`)}
                      minLength={6}
                    />
                    <Form.Text className="text-muted">
                      {t('auto.leaveBlankToKeepCurrentPasswor', `Leave blank to keep current password`)}
                                                                  </Form.Text>
                  </Form.Group>
                  <div className="d-flex justify-content-end gap-2">
                    <Button variant="secondary" onClick={closeEditModal}>
                      {t('auto.cancel', `Cancel`)}
                                                                  </Button>
                    <Button type="submit" variant="warning" disabled={editing}>
                      {editing ? (
                        <><Spinner animation="border" size="sm" className="me-2" />{t('auto.updating', `Updating...`)}</>
                      ) : (
                        <><i className="bi bi-check-circle me-2"></i>{t('auto.update', `Update`)}</>
                      )}
                    </Button>
                  </div>
                </Form>
              </Tab>
              <Tab eventKey="salaries" title={<span><i className="bi bi-cash-stack me-2"></i>{t('auto.salary', `Salary`)}</span>}>
                <Row className="g-3">
                  <Col md={6}>
                    <Card>
                      <Card.Header className="bg-light"><strong>{t('auto.recordSalaryPayment', `Record Salary Payment`)}</strong></Card.Header>
                      <Card.Body>
                        <Row>
                          <Col md={6}>
                            <Form.Group className="mb-3">
                              <Form.Label>{t('auto.amount', `Amount`)}</Form.Label>
                              <Form.Control type="number" step="0.01" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} />
                            </Form.Group>
                          </Col>
                          <Col md={6}>
                            <Form.Group className="mb-3">
                              <Form.Label>{t('auto.paidDate', `Paid Date`)}</Form.Label>
                              <Form.Control type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
                            </Form.Group>
                          </Col>
                        </Row>
                        <Form.Group className="mb-3">
                          <Form.Label>{t('auto.paymentDetailsremarks', `Payment Details/Remarks`)}</Form.Label>
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
                      <Card.Header className="bg-light"><strong>{t('auto.createSalaryAdvanceloan', `Create Salary Advance/Loan`)}</strong></Card.Header>
                      <Card.Body>
                        <Row>
                          <Col md={6}>
                            <Form.Group className="mb-3">
                              <Form.Label>{t('auto.principal', `Principal`)}</Form.Label>
                              <Form.Control type="number" step="0.01" value={advancePrincipal} onChange={(e) => setAdvancePrincipal(e.target.value)} />
                            </Form.Group>
                          </Col>
                          <Col md={6}>
                            <Form.Group className="mb-3">
                              <Form.Label>{t('auto.installments', `Installments`)}</Form.Label>
                              <Form.Control type="number" value={advanceInstallments} onChange={(e) => setAdvanceInstallments(e.target.value)} />
                            </Form.Group>
                          </Col>
                        </Row>
                        <Row>
                          <Col md={6}>
                            <Form.Group className="mb-3">
                              <Form.Label>{t('auto.repaymentFrequency', `Repayment Frequency`)}</Form.Label>
                              <Form.Select value={advancePayType} onChange={(e) => setAdvancePayType(e.target.value as PayType)}>
                                <option value="DAILY">{t('auto.daily', `Daily`)}</option>
                                <option value="WEEKLY">{t('auto.weekly', `Weekly`)}</option>
                                <option value="FORTNIGHTLY">{t('auto.fortnightly', `Fortnightly`)}</option>
                                <option value="MONTHLY">{t('auto.monthly', `Monthly`)}</option>
                              </Form.Select>
                            </Form.Group>
                          </Col>
                          <Col md={6}>
                            <Form.Group className="mb-3">
                              <Form.Label>{t('auto.currency', `Currency`)}</Form.Label>
                              <Form.Select value={advanceCurrency} onChange={(e) => setAdvanceCurrency(e.target.value)}>
                                {currencies.map(currency => (
                                  <option key={currency.code} value={currency.code}>{currency.code}</option>
                                ))}
                              </Form.Select>
                            </Form.Group>
                          </Col>
                        </Row>
                        <Form.Group className="mb-3">
                          <Form.Label>{t('auto.detailsremarks', `Details/Remarks`)}</Form.Label>
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
                      <Card.Header className="bg-light"><strong>{t('auto.paymentHistory', `Payment History`)}</strong></Card.Header>
                      <Card.Body className="p-0">
                        <div className="table-responsive">
                          <Table size="sm" className="mb-0">
                            <thead className="table-light">
                              <tr>
                                <th>{t('auto.amount', `Amount`)}</th>
                                <th>{t('auto.date', `Date`)}</th>
                                <th>{t('auto.details', `Details`)}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {teacherPayments.length === 0 ? (
                                <tr><td colSpan={3} className="text-center text-muted small py-3">{t('auto.noRecords', `No records`)}</td></tr>
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
                      <Card.Header className="bg-light"><strong>{t('auto.advancesloans', `Advances/Loans`)}</strong></Card.Header>
                      <Card.Body className="p-0">
                        <div className="table-responsive">
                          <Table size="sm" className="mb-0">
                            <thead className="table-light">
                              <tr>
                                <th>{t('auto.principal', `Principal`)}</th>
                                <th>{t('auto.balance', `Balance`)}</th>
                                <th>{t('auto.installments', `Installments`)}</th>
                                <th>{t('auto.status', `Status`)}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {teacherAdvances.length === 0 ? (
                                <tr><td colSpan={4} className="text-center text-muted small py-3">{t('auto.noRecords', `No records`)}</td></tr>
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
                <Form.Label>{t('auto.fullName', `Full Name`)}</Form.Label>
                <Form.Control 
                  type="text" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  required 
                  placeholder={t('auto.enterFullName', `Enter full name`)}
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>{t('auto.emailAddress', `Email Address`)}</Form.Label>
                <Form.Control 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  required 
                  placeholder={t('auto.enterEmailAddress', `Enter email address`)}
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>{t('auto.mobileNumber', `Mobile Number`)}</Form.Label>
                <Form.Control 
                  type="tel" 
                  value={mobile} 
                  onChange={(e) => setMobile(e.target.value)} 
                  placeholder={t('auto.enterMobileNumber', `Enter mobile number`)}
                />
              </Form.Group>
                            <Form.Group className="mb-3">
                <Form.Label>{t('auto.address', `Address`)}</Form.Label>
                <Form.Control 
                  as="textarea"
                  rows={2}
                  value={address} 
                  onChange={(e) => setAddress(e.target.value)} 
                  placeholder={t('auto.enterAddress', `Enter address`)}
                />
              </Form.Group>
              
                            
              <Form.Group className="mb-3">
                <Form.Check
                  type="switch"
                  id="edit-parent-active"
                  label={isActive ? t('auto.active', 'Active') : t('auto.inactive', 'Inactive')}
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
              </Form.Group>
              <Form.Group className="mb-4">
                <Form.Label>{t('auto.password', `Password`)}</Form.Label>
                <Form.Control 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  placeholder={t('auto.leaveBlankToKeepCurrentPasswor', `Leave blank to keep current password`)}
                  minLength={6}
                />
                <Form.Text className="text-muted">
                  {t('auto.leaveBlankToKeepCurrentPasswor', `Leave blank to keep current password`)}
                                                          </Form.Text>
              </Form.Group>
              <div className="d-flex justify-content-end gap-2">
                <Button variant="secondary" onClick={closeEditModal}>
                  {t('auto.cancel', `Cancel`)}
                                                          </Button>
                <Button
                  type="submit"
                  variant="warning"
                  disabled={editing}
                >
                  {editing ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      {t('auto.updating', `Updating...`)}
                                                                      </>
                  ) : (
                    <>
                      <i className="bi bi-check-circle me-2"></i>
                      {t('auto.update', `Update`)}
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

export function SubjectManagementTab() {
    const { t } = useTranslation('common');
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
  const [showCreateForm, setShowCreateForm] = useState(false);

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
        setShowCreateForm(false);
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

      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h5 className="mb-0">
            <i className="bi bi-book me-2"></i>
            {t('auto.subjects', `Subjects`)}
          </h5>
        </div>
        <Button 
          size="sm" 
          variant={showCreateForm ? 'secondary' : 'primary'}
          onClick={() => setShowCreateForm(v => !v)}
        >
          {showCreateForm ? t('auto.cancel', `Cancel`) : t('auto.createNewSubject', `Create New Subject`)}
        </Button>
      </div>

      {showCreateForm && (
        <Card className="shadow-sm mb-4">
          <Card.Header className="bg-primary text-white">
            <h6 className="mb-0">
              <i className="bi bi-plus-circle me-2"></i>
              {t('auto.createNewSubject', `Create New Subject`)}
            </h6>
          </Card.Header>
          <Card.Body>
            <Form onSubmit={handleCreateSubject}>
              <Row className="g-3 mb-3">
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>{t('auto.subjectName', `Subject Name`)}</Form.Label>
                    <Form.Control 
                      type="text" 
                      value={name} 
                      onChange={(e) => setName(e.target.value)} 
                      required 
                      placeholder={t('auto.enterSubjectName', `Enter subject name`)}
                      size="sm"
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>{t('auto.description', `Description`)}</Form.Label>
                    <Form.Control 
                      as="textarea" 
                      rows={1} 
                      value={description} 
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder={t('auto.enterSubjectDescription', `Enter subject description`)}
                      size="sm"
                    />
                  </Form.Group>
                </Col>
              </Row>
              <div className="text-end">
                <Button 
                  variant="primary" 
                  type="submit" 
                  disabled={creating}
                  size="sm"
                  className="px-4"
                >
                  {creating ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      {t('auto.creating', `Creating...`)}
                    </>
                  ) : (
                    <>
                      <i className="bi bi-plus-circle me-2"></i>
                      {t('auto.createSubject', `Create Subject`)}
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
              <i className="bi bi-book me-2"></i>
              {t('auto.subjects', `Subjects`)}
            </h6>
            <Badge bg="primary">{subjects.length} {t('auto.total', `Total`)}</Badge>
          </div>
        </Card.Header>
        <Card.Body className="p-0">
          {loading ? (
            <div className="text-center py-4">
              <Spinner animation="border" size="sm" />
              <p className="mt-2 text-muted small">{t('auto.loadingSubjects', `Loading subjects...`)}</p>
            </div>
          ) : subjects.length === 0 ? (
            <div className="text-center py-4">
              <i className="bi bi-book display-6 text-muted"></i>
              <p className="mt-2 text-muted small">{t('auto.noSubjectsFound', `No subjects found`)}</p>
            </div>
          ) : (
            <div className="table-responsive">
              <Table hover size="sm" className="mb-0">
                <thead className="table-light">
                  <tr>
                    <th>{t('auto.name', `Name`)}</th>
                    <th>{t('auto.description', `Description`)}</th>
                    <th>{t('auto.students', `Students`)}</th>
                    <th>{t('auto.created', `Created`)}</th>
                    <th>{t('auto.actions', `Actions`)}</th>
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
                            title={t('auto.viewDetails', `View Details`)}
                          >
                            <i className="bi bi-eye"></i>
                          </Button>
                          <Button
                            variant="outline-warning"
                            size="sm"
                            onClick={() => handleEditSubject(subject)}
                            title={t('auto.editSubject', `Edit Subject`)}
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

      {/* Edit Subject Modal */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-pencil me-2"></i>
            {t('auto.editSubject', `Edit Subject`)}
                                </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleUpdateSubject}>
            <Form.Group className="mb-3">
              <Form.Label>{t('auto.subjectName', `Subject Name`)}</Form.Label>
              <Form.Control 
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                required 
                placeholder={t('auto.enterSubjectName', `Enter subject name`)}
              />
            </Form.Group>
            <Form.Group className="mb-4">
              <Form.Label>{t('auto.description', `Description`)}</Form.Label>
              <Form.Control 
                as="textarea" 
                rows={3} 
                value={description} 
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('auto.enterSubjectDescription', `Enter subject description`)}
              />
            </Form.Group>
            <div className="d-flex justify-content-end gap-2">
              <Button variant="secondary" onClick={() => setShowEditModal(false)}>
                {t('auto.cancel', `Cancel`)}
                                            </Button>
              <Button
                type="submit"
                variant="warning"
                disabled={editing}
              >
                {editing ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    {t('auto.updating', `Updating...`)}
                                                        </>
                ) : (
                  <>
                    <i className="bi bi-check-circle me-2"></i>
                    {t('auto.update', `Update`)}
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
        title={t('auto.subjectDetails', `Subject Details`)}
        data={detailData}
      />
    </div>
  );
}

export function AssignmentsTab() {
    const { t } = useTranslation('common');
  const [students, setStudents] = useState<User[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [subjects, setSubjects] = useState<Course[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

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
  const [isActive, setIsActive] = useState(true);

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

  const normalizedStudentSearch = studentSearch.trim().toLowerCase();

  const filteredStudents = !normalizedStudentSearch
    ? students
    : students.filter((s) =>
        (s.name || '').toLowerCase().includes(normalizedStudentSearch) ||
        (s.email || '').toLowerCase().includes(normalizedStudentSearch)
      );

  const filteredAssignments = !normalizedStudentSearch
    ? assignments
    : assignments.filter((a) =>
        (a.student.name || '').toLowerCase().includes(normalizedStudentSearch) ||
        (a.student.email || '').toLowerCase().includes(normalizedStudentSearch)
      );

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
          isActive,
        }),
      });

      if (res.ok) {
        setSuccess('Assignment created successfully!');
        fetchData();
        resetForm();
        setShowCreateForm(false);
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
    setIsActive(true);
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
    setIsActive(assignment.isActive ?? true);
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
          isActive,
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

  // Using global getCurrencySymbol

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" />
        <p className="mt-2 text-muted">{t('auto.loadingAssignmentData', `Loading assignment data...`)}</p>
      </div>
    );
  }

  return (
    <div>
      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

      <Row className="mb-4 align-items-center">
        <Col md={8}>
          <InputGroup>
            <InputGroup.Text><i className="bi bi-search"></i></InputGroup.Text>
            <Form.Control
              placeholder={t('auto.searchStudentsByNameOrEmail', `Search students by name or email`)}
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
            />
          </InputGroup>
        </Col>
        <Col md={4} className="text-end mt-2 mt-md-0">
          <Button 
            size="sm" 
            variant={showCreateForm ? 'secondary' : 'primary'}
            onClick={() => setShowCreateForm(v => !v)}
          >
            {showCreateForm ? t('auto.cancel', `Cancel`) : t('auto.createNewAssignment', `Create New Assignment`)}
          </Button>
        </Col>
      </Row>

      {showCreateForm && (
        <Card className="shadow-sm mb-4">
          <Card.Header className="bg-primary text-white">
            <h6 className="mb-0">
              <i className="bi bi-plus-circle me-2"></i>
              {t('auto.createNewAssignment', `Create New Assignment`)}
            </h6>
          </Card.Header>
          <Card.Body>
            <Form onSubmit={handleCreateAssignment}>
              <Row className="g-3 mb-3">
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>{t('auto.selectStudent', `Select Student *`)}</Form.Label>
                    <Form.Select 
                      value={selectedStudent}
                      onChange={(e) => setSelectedStudent(e.target.value)}
                      required
                      size="sm"
                    >
                      <option value="">{t('auto.chooseAStudent', `Choose a student...`)}</option>
                      {filteredStudents.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                      {filteredStudents.length === 0 && (
                        <option value="" disabled>{t('auto.noMatchingStudents', `No matching students`)}</option>
                      )}
                    </Form.Select>
                  </Form.Group>
                </Col>

                <Col md={4}>
                  <Form.Group>
                    <Form.Label>{t('auto.selectSubject', `Select Subject *`)}</Form.Label>
                    <Form.Select 
                      value={selectedSubject}
                      onChange={(e) => setSelectedSubject(e.target.value)}
                      required
                      size="sm"
                    >
                      <option value="">{t('auto.chooseASubject', `Choose a subject...`)}</option>
                      {subjects.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>

                <Col md={4}>
                  <Form.Group>
                    <Form.Label>{t('auto.selectTeacher', `Select Teacher *`)}</Form.Label>
                    <Form.Select 
                      value={selectedTeacher}
                      onChange={(e) => setSelectedTeacher(e.target.value)}
                      required
                      size="sm"
                    >
                      <option value="">{t('auto.chooseATeacher', `Choose a teacher...`)}</option>
                      {teachers.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>

              <Row className="g-3 mb-3">
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>{t('auto.assignmentDate', `Assignment Date`)}</Form.Label>
                    <Form.Control 
                      type="date"
                      value={assignmentDate}
                      onChange={(e) => setAssignmentDate(e.target.value)}
                      size="sm"
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>{t('auto.startTime', `Start Time`)}</Form.Label>
                    <Form.Control 
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      size="sm"
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>{t('auto.durationMinutes', `Duration (minutes)`)}</Form.Label>
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

              <Row className="g-3 mb-4">
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>{t('auto.monthlyFee', `Monthly Fee`)}</Form.Label>
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
                  <Form.Group>
                    <Form.Label>{t('auto.currency', `Currency`)}</Form.Label>
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
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>{t('auto.classDays', `Class Days`)}</Form.Label>
                    <div className="d-flex flex-wrap gap-2 pt-2">
                      {daysOfWeek.map(day => (
                        <Form.Check
                          key={day.value}
                          type="checkbox"
                          id={`day-${day.value}`}
                          label={day.label}
                          checked={classDays.includes(day.value)}
                          onChange={() => handleDayToggle(day.value)}
                          className="me-2 mb-1"
                        />
                      ))}
                    </div>
                  </Form.Group>
                </Col>
              </Row>
              
              <Row className="mb-4">
                <Col md={12}>
                  <Form.Group>
                    <Form.Label>{t('auto.status', `Status`)}</Form.Label>
                    <div className="pt-2">
                      <Form.Check 
                        type="switch"
                        id="tab-assignment-active-switch"
                        label={isActive ? t('auto.active', 'Active') : t('auto.inactive', 'Inactive')}
                        checked={isActive}
                        onChange={(e) => setIsActive(e.target.checked)}
                      />
                    </div>
                  </Form.Group>
                </Col>
              </Row>

              <div className="text-end">
                <Button 
                  variant="primary" 
                  type="submit" 
                  disabled={creating}
                  size="sm"
                  className="px-4"
                >
                  {creating ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      {t('auto.creating', `Creating...`)}
                    </>
                  ) : (
                    <>
                      <i className="bi bi-plus-circle me-2"></i>
                      {t('auto.createAssignment', `Create Assignment`)}
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
              {t('auto.currentAssignments', `Current Assignments`)}
            </h6>
            <Badge bg="primary">{assignments.length} {t('auto.total', `Total`)}</Badge>
          </div>
        </Card.Header>
        <Card.Body className="p-0">
          {assignments.length === 0 ? (
            <div className="text-center py-4">
              <i className="bi bi-list-task display-6 text-muted"></i>
              <p className="mt-2 text-muted small">{t('auto.noAssignmentsFound', `No assignments found`)}</p>
            </div>
          ) : (
            <div className="table-responsive">
              <Table hover size="sm" className="mb-0">
                <thead className="table-light">
                  <tr>
                    <th>{t('auto.student', `Student`)}</th>
                    <th>{t('auto.subject', `Subject`)}</th>
                    <th>{t('auto.teacher', `Teacher`)}</th>
                    <th>{t('auto.schedule', `Schedule`)}</th>
                    <th>{t('auto.fee', `Fee`)}</th>
                    <th>{t('auto.actions', `Actions`)}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAssignments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-3 text-muted">
                        {t('auto.noAssignmentsMatchYourSearch', `No assignments match your search`)}
                      </td>
                    </tr>
                  ) : (
                    filteredAssignments.map((assignment) => (
                      <tr key={assignment.id}>
                        <td className="fw-medium">{assignment.student.name}</td>
                        <td className="text-muted">{assignment.course.name}</td>
                        <td className="text-muted">{assignment.teacher.name}</td>
                        <td className="small">
                          {assignment.assignmentDate && (
                            <div>
                              <strong>{t('auto.created', `Created`)}:</strong>{' '}
                              {new Date(assignment.assignmentDate).toLocaleDateString()}
                            </div>
                          )}
                          {assignment.startTime && (
                            <div>{assignment.startTime}</div>
                          )}
                          {assignment.duration && (
                            <div className="text-muted">{assignment.duration}{t('auto.min', `min`)}</div>
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
                              title={t('auto.editAssignment', `Edit Assignment`)}
                            >
                              <i className="bi bi-pencil"></i>
                            </Button>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => handleDeleteAssignment(assignment.id)}
                              title={t('auto.deleteAssignment', `Delete Assignment`)}
                            >
                              <i className="bi bi-trash"></i>
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

      {/* Edit Assignment Modal */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-pencil me-2"></i>
            {t('auto.editAssignment', `Edit Assignment`)}
                                </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleUpdateAssignment}>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>{t('auto.startTime', `Start Time`)}</Form.Label>
                  <Form.Control 
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>{t('auto.durationMinutes', `Duration (minutes)`)}</Form.Label>
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
              <Form.Label>{t('auto.classDays', `Class Days`)}</Form.Label>
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
                  <Form.Label>{t('auto.monthlyFee', `Monthly Fee`)}</Form.Label>
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
                  <Form.Label>{t('auto.currency', `Currency`)}</Form.Label>
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

            <Row className="mt-2">
              <Col md={12}>
                <Form.Group className="mb-3">
                  <Form.Label>{t('auto.status', `Status`)}</Form.Label>
                  <div className="pt-2">
                    <Form.Check 
                      type="switch"
                      id="edit-assignment-active-switch"
                      label={isActive ? t('auto.active', 'Active') : t('auto.inactive', 'Inactive')}
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                    />
                  </div>
                </Form.Group>
              </Col>
            </Row>

            <div className="d-flex justify-content-end gap-2 mt-4">
              <Button variant="secondary" onClick={() => setShowEditModal(false)}>
                {t('auto.cancel', `Cancel`)}
                                            </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={updating}
              >
                {updating ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    {t('auto.updating', `Updating...`)}
                                                        </>
                ) : (
                  <>
                    <i className="bi bi-check-circle me-2"></i>
                    {t('auto.updateAssignment', `Update Assignment`)}
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
    const { t } = useTranslation('common');
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

  const [payingSalaryId, setPayingSalaryId] = useState<string | null>(null);

  const handlePaySalary = async (salaryId: string) => {
    if (!confirm('Are you sure you want to mark this salary as paid? This will deduct any active advance installments for this teacher.')) return;
    setPayingSalaryId(salaryId);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/salaries/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ salaryId })
      });
      if (res.ok) {
        setSuccess('Salary paid successfully and logged to payments.');
        fetchData();
      } else {
        const data = await res.json();
        setError(data.message || 'Failed to pay salary');
      }
    } catch (err) {
      setError('Error paying salary');
    } finally {
      setPayingSalaryId(null);
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
        return <Badge bg="success">{t('auto.paid', `Paid`)}</Badge>;
      case 'PENDING':
        return <Badge bg="warning">{t('auto.pending', `Pending`)}</Badge>;
      case 'OVERDUE':
        return <Badge bg="danger">{t('auto.overdue', `Overdue`)}</Badge>;
      case 'CANCELLED':
        return <Badge bg="secondary">{t('auto.cancelled', `Cancelled`)}</Badge>;
      default:
        return <Badge bg="secondary">{status}</Badge>;
    }
  };

  // Using global getCurrencySymbol

  return (
    <div>
      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

      <div className="d-flex justify-content-between align-items-center mb-3">
        <div className="d-flex align-items-center gap-2">
          <i className="bi bi-cash-coin text-success"></i>
          <h6 className="mb-0">{t('auto.salaryManagement', `Salary Management`)}</h6>
          <Badge bg="success">{salaries.length} {t('auto.total', `Total`)}</Badge>
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
              {t('auto.createNewSalary', `Create New Salary`)}
                                      </h6>
          </Card.Header>
          <Card.Body>
            <Form onSubmit={handleCreateSalary}>
              <Row className="g-3">
                <Col md={4}>
                  <Form.Group className="mb-0">
                    <Form.Label>{t('auto.selectTeacher', `Select Teacher`)}</Form.Label>
                    <Form.Select 
                      value={selectedTeacher}
                      onChange={(e) => setSelectedTeacher(e.target.value)}
                      required
                      size="sm"
                    >
                      <option value="">{t('auto.chooseATeacher', `Choose a teacher...`)}</option>
                      {teachers.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-0">
                    <Form.Label>{t('auto.salaryTitle', `Salary Title`)}</Form.Label>
                    <Form.Control 
                      type="text" 
                      value={salaryTitle} 
                      onChange={(e) => setSalaryTitle(e.target.value)} 
                      required 
                      placeholder={t('auto.enterSalaryTitle', `Enter salary title`)}
                      size="sm"
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-0">
                    <Form.Label>{t('auto.dueDate', `Due Date`)}</Form.Label>
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
                    <Form.Label>{t('auto.amount', `Amount`)}</Form.Label>
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
                    <Form.Label>{t('auto.currency', `Currency`)}</Form.Label>
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
                    <Form.Label>{t('auto.description', `Description`)}</Form.Label>
                    <Form.Control 
                      as="textarea" 
                      rows={2} 
                      value={salaryDescription} 
                      onChange={(e) => setSalaryDescription(e.target.value)}
                      placeholder={t('auto.optionalDescription', `Optional description`)}
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
                  {t('auto.cancel', `Cancel`)}
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
                      {t('auto.creating', `Creating...`)}
                                                              </>
                  ) : (
                    <>
                      <i className="bi bi-plus-circle me-2"></i>
                      {t('auto.createSalary', `Create Salary`)}
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
              {t('auto.salaryManagement', `Salary Management`)}
                                      </h6>
            <Badge bg="success">{salaries.length} {t('auto.total', `Total`)}</Badge>
          </div>
        </Card.Header>
        <Card.Body className="p-0">
          {loading ? (
            <div className="text-center py-4">
              <Spinner animation="border" size="sm" />
              <p className="mt-2 text-muted small">{t('auto.loadingSalaries', `Loading salaries...`)}</p>
            </div>
          ) : salaries.length === 0 ? (
            <div className="text-center py-4">
              <i className="bi bi-wallet2 display-6 text-muted"></i>
              <p className="mt-2 text-muted small">{t('auto.noSalariesFound', `No salaries found`)}</p>
            </div>
          ) : (
            <div className="table-responsive">
              <Table hover size="sm" className="mb-0">
                <thead className="table-light">
                  <tr>
                    <th>{t('auto.teacher', `Teacher`)}</th>
                    <th>{t('auto.title', `Title`)}</th>
                    <th>{t('auto.amount', `Amount`)}</th>
                    <th>{t('auto.dueDate', `Due Date`)}</th>
                    <th>{t('auto.status', `Status`)}</th>
                    <th>{t('auto.paidBy', `Paid By`)}</th>
                    <th>{t('auto.actions', `Actions`)}</th>
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
                      <td>
                        {salary.status !== 'PAID' && salary.status !== 'CANCELLED' && (
                          <Button
                            variant="success"
                            size="sm"
                            disabled={payingSalaryId === salary.id}
                            onClick={() => handlePaySalary(salary.id)}
                          >
                            {payingSalaryId === salary.id ? (
                              <Spinner animation="border" size="sm" />
                            ) : (
                              <>
                                <i className="bi bi-cash me-1"></i>
                                {t('auto.markPaid', `Mark Paid`)}
                              </>
                            )}
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
  );
}

function StudentProgressTabContent({ progress, loading }: { progress: Progress[]; loading: boolean }) {
    const { t } = useTranslation('common');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailData, setDetailData] = useState<Progress | null>(null);
  const [showParentRemarksModal, setShowParentRemarksModal] = useState(false);
  const [selectedParentRemarks, setSelectedParentRemarks] = useState<any[]>([]);
  const [threadTitle, setThreadTitle] = useState('');

  const getAttendanceBadge = (status: AttendanceStatus) => {
    switch (status) {
      case 'PRESENT':
        return <Badge bg="success">{t('auto.present', `Present`)}</Badge>;
      case 'ABSENT':
        return <Badge bg="danger">{t('auto.absent', `Absent`)}</Badge>;
      case 'LATE':
        return <Badge bg="warning">{t('auto.late', `Late`)}</Badge>;
      case 'EXCUSED':
        return <Badge bg="info">{t('auto.excused', `Excused`)}</Badge>;
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
              {t('auto.studentProgressOverview', `Student Progress Overview`)}
                                      </h6>
            <Badge bg="info">{progress.length} {t('auto.records', `Records`)}</Badge>
          </div>
        </Card.Header>
        <Card.Body className="p-0">
          {loading ? (
            <div className="text-center py-4">
              <Spinner animation="border" size="sm" />
              <p className="mt-2 text-muted small">{t('auto.loadingProgressData', `Loading progress data...`)}</p>
            </div>
          ) : progress.length === 0 ? (
            <div className="text-center py-4">
              <i className="bi bi-graph-up display-6 text-muted"></i>
              <p className="mt-2 text-muted small">{t('auto.noProgressRecordsFound', `No progress records found`)}</p>
            </div>
          ) : (
            <div className="table-responsive">
              <Table hover size="sm" className="mb-0">
                <thead className="table-light">
                  <tr>
                    <th>{t('auto.date', `Date`)}</th>
                    <th>{t('auto.student', `Student`)}</th>
                    <th>{t('auto.subject', `Subject`)}</th>
                    <th>{t('auto.teacher', `Teacher`)}</th>
                    <th>{t('auto.lesson', `Lesson`)}</th>
                    <th>{t('auto.progress', `Progress`)}</th>
                    <th>{t('auto.attendance', `Attendance`)}</th>
                    <th>{t('auto.parentRemarks', `Parent Remarks`)}</th>
                    <th>{t('auto.actions', `Actions`)}</th>
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
                                  {t('auto.remarkWith', `Remark with`)}{' '}
                                  <span className={replyCount > 0 ? 'text-success' : 'text-danger'}>
                                    {replyCount > 0 ? replyCount : 'no'}
                                  </span>{' '}
                                  {t('auto.comment', `comment`)}{replyCount === 1 ? '' : 's'}
                                </>
                              );
                            })() : 'No parent remark'}
                          </div>
                          {item.parentRemarks && item.parentRemarks.length > 0 && (
                            <Button
                              variant="outline-secondary"
                              size="sm"
                              onClick={() => handleViewParentRemarks(item)}
                              title={t('auto.viewParentRemarks', `View parent remarks`)}
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
                          title={t('auto.viewDetails', `View Details`)}
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
        title={t('auto.progressDetails', `Progress Details`)}
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
    const { t } = useTranslation('common');
  return (
    <div>
      <Card className="shadow-sm">
        <Card.Header className="bg-light d-flex justify-content-between align-items-center">
          <h6 className="mb-0">
            <i className="bi bi-clipboard-data me-2"></i>
            {t('auto.latestTestRecords', `Latest Test Records`)}
                                </h6>
          <Badge bg="success">{tests.length}</Badge>
        </Card.Header>
        <Card.Body className="p-0">
          {loading ? (
            <div className="text-center py-4">
              <Spinner animation="border" size="sm" />
              <p className="mt-2 text-muted small">{t('auto.loadingRecords', `Loading records...`)}</p>
            </div>
          ) : tests.length === 0 ? (
            <div className="text-center py-4">
              <i className="bi bi-clipboard-check display-6 text-muted"></i>
              <p className="mt-2 text-muted small">{t('auto.noTestRecordsFound', `No test records found`)}</p>
            </div>
          ) : (
            <div className="table-responsive">
              <Table hover size="sm" className="mb-0">
                <thead className="table-light">
                  <tr>
                    <th>{t('auto.date', `Date`)}</th>
                    <th>{t('auto.student', `Student`)}</th>
                    <th>{t('auto.subject', `Subject`)}</th>
                    <th>{t('auto.title', `Title`)}</th>
                    <th>{t('auto.type', `Type`)}</th>
                    <th>{t('auto.score', `Score`)}</th>
                    <th>%</th>
                    <th>{t('auto.teacher', `Teacher`)}</th>
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
    const { t } = useTranslation('common');
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
        return <Badge bg="success">{t('auto.present', `Present`)}</Badge>;
      case 'ABSENT':
        return <Badge bg="danger">{t('auto.absent', `Absent`)}</Badge>;
      case 'LATE':
        return <Badge bg="warning">{t('auto.late', `Late`)}</Badge>;
      case 'EXCUSED':
        return <Badge bg="info">{t('auto.excused', `Excused`)}</Badge>;
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
              {t('auto.studentProgressOverview', `Student Progress Overview`)}
                                      </h6>
            <Badge bg="info">{progress.length} {t('auto.records', `Records`)}</Badge>
          </div>
        </Card.Header>
        <Card.Body className="p-0">
          {loading ? (
            <div className="text-center py-4">
              <Spinner animation="border" size="sm" />
              <p className="mt-2 text-muted small">{t('auto.loadingProgressData', `Loading progress data...`)}</p>
            </div>
          ) : progress.length === 0 ? (
            <div className="text-center py-4">
              <i className="bi bi-graph-up display-6 text-muted"></i>
              <p className="mt-2 text-muted small">{t('auto.noProgressRecordsFound', `No progress records found`)}</p>
            </div>
          ) : (
            <div className="table-responsive">
              <Table hover size="sm" className="mb-0">
                <thead className="table-light">
                  <tr>
                    <th>{t('auto.date', `Date`)}</th>
                    <th>{t('auto.student', `Student`)}</th>
                    <th>{t('auto.subject', `Subject`)}</th>
                    <th>{t('auto.teacher', `Teacher`)}</th>
                    <th>{t('auto.lesson', `Lesson`)}</th>
                    <th>{t('auto.progress', `Progress`)}</th>
                    <th>{t('auto.attendance', `Attendance`)}</th>
                    <th>{t('auto.actions', `Actions`)}</th>
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
                          title={t('auto.viewDetails', `View Details`)}
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
        title={t('auto.progressDetails', `Progress Details`)}
        data={detailData}
      />
    </div>
  );
}

export function RemarksTab() {
    const { t } = useTranslation('common');
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
    const message =
      type === 'remark'
        ? 'Delete this remark and all of its replies? This cannot be undone.'
        : 'Delete this reply? This cannot be undone.';
    if (!confirm(message)) return;

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
            {t('auto.parentRemarksThreads', `Parent Remarks & Threads`)}
                                </h6>
          <Badge bg="info">{remarks.length}</Badge>
        </Card.Header>
        <Card.Body>
          {loading ? (
            <div className="text-center py-4">
              <Spinner animation="border" size="sm" />
            </div>
          ) : remarks.length === 0 ? (
            <div className="text-center text-muted py-4">{t('auto.noRemarks', `No remarks`)}</div>
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
                          {t('auto.remarkWith', `Remark with`)}{' '}
                          <span className={(remark.replies?.length || 0) > 0 ? 'text-success' : 'text-danger'}>
                            {(remark.replies?.length || 0) > 0 ? remark.replies?.length : 'no'}
                          </span>{' '}
                          {t('auto.comment', `comment`)}{(remark.replies?.length || 0) === 1 ? '' : 's'}
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
                        {t('auto.refresh', `Refresh`)}
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
                        {t('auto.viewThread', `View Thread`)}
                                                        </Button>
                      <Button variant="outline-danger" size="sm" onClick={() => handleDelete('remark', remark.id)}>
                        <i className="bi bi-trash"></i>
                        {t('auto.delete', `Delete`)}
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
    const { t } = useTranslation('common');
  const [records, setRecords] = useState<AdminTestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadRecords = useCallback(async () => {
    try {
      const res = await fetch('/api/tests/records');
      if (res.ok) {
        const data = await res.json();
        setRecords(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error fetching test records', err);
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    await loadRecords();
    setLoading(false);
  }, [loadRecords]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div>
      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

      <Card className="shadow-sm">
        <Card.Header className="bg-light d-flex justify-content-between align-items-center">
          <h6 className="mb-0">
            <i className="bi bi-clipboard-data me-2"></i>
            {t('auto.latestTestRecords', `Latest Test Records`)}
                                </h6>
          <Badge bg="success">{records.length}</Badge>
        </Card.Header>
        <Card.Body className="p-0">
          {loading ? (
            <div className="text-center py-4">
              <Spinner animation="border" size="sm" />
              <p className="mt-2 text-muted small">{t('auto.loadingRecords', `Loading records...`)}</p>
            </div>
          ) : records.length === 0 ? (
            <div className="text-center py-4">
              <i className="bi bi-clipboard-check display-6 text-muted"></i>
              <p className="mt-2 text-muted small">{t('auto.noTestRecordsFound', `No test records found`)}</p>
            </div>
          ) : (
            <div className="table-responsive">
              <Table hover size="sm" className="mb-0">
                <thead className="table-light">
                  <tr>
                    <th>{t('auto.date', `Date`)}</th>
                    <th>{t('auto.student', `Student`)}</th>
                    <th>{t('auto.subject', `Subject`)}</th>
                    <th>{t('auto.title', `Title`)}</th>
                    <th>{t('auto.type', `Type`)}</th>
                    <th>{t('auto.score', `Score`)}</th>
                    <th>%</th>
                    <th>{t('auto.teacher', `Teacher`)}</th>
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
  const { t } = useTranslation('common');
  const router = useRouter();
  const disallowedTabs = useMemo(() => new Set([
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
    'subjects',
    'assignments',
    'attendance-reports',
    'report-cards',
  ]), []);
  const initialTab = typeof router.query.tab === 'string' && !disallowedTabs.has(router.query.tab)
    ? router.query.tab
    : 'home';
  const [activeTab, setActiveTab] = useState(initialTab);
  const showHome = activeTab === 'home';
  const tabActiveKey = showHome ? 'subjects' : activeTab;
  const [homeLoading, setHomeLoading] = useState(false);
  const [homeError, setHomeError] = useState('');
  const [defaultCurrency, setDefaultCurrency] = useState('USD');
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
    teacherActivity: {
      activeThisWeek: number;
      totalTeachers: number;
      activeRate: number;
      entriesThisWeek: number;
    };
    subscription: {
      plan: string | null;
      status: string | null;
      startDate: string | null;
      endDate: string | null;
      amount: number | null;
      currency: string | null;
      daysLeft: number | null;
      warning: boolean;
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
  }, [router, router.query.tab, activeTab, disallowedTabs]);

  const fetchHomeSnapshot = useCallback(async () => {
    try {
      setHomeLoading(true);
      setHomeError('');
      const [studentsRes, teachersRes, parentsRes, feesRes, salariesRes, progressRes, remarksRes, subscriptionsRes, currencyRes] = await Promise.all([
        fetch('/api/users?role=STUDENT'),
        fetch('/api/users?role=TEACHER'),
        fetch('/api/users?role=PARENT'),
        fetch('/api/fees'),
        fetch('/api/salaries'),
        fetch('/api/progress'),
        fetch('/api/remarks'),
        fetch('/api/subscriptions'),
        fetch('/api/settings/currency'),
      ]);

      const students = studentsRes.ok ? await studentsRes.json() : [];
      const teachers = teachersRes.ok ? await teachersRes.json() : [];
      const parents = parentsRes.ok ? await parentsRes.json() : [];
      const fees = feesRes.ok ? await feesRes.json() : [];
      const salaries = salariesRes.ok ? await salariesRes.json() : [];
      const progressData: Progress[] = progressRes.ok ? await progressRes.json() : [];
      const subscriptions = subscriptionsRes.ok ? await subscriptionsRes.json() : [];
      const remarks = remarksRes.ok ? await remarksRes.json() : [];
      const currencyData = currencyRes.ok ? await currencyRes.json() : { defaultCurrency: 'USD' };
      setDefaultCurrency(currencyData.defaultCurrency || 'USD');

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

      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const activeTeacherIds = new Set<string>();
      const entriesThisWeek = progressData.filter((p) => {
        const d = new Date(p.date);
        const inRange = d >= weekAgo;
        if (inRange && p.teacher?.id) {
          activeTeacherIds.add(p.teacher.id);
        }
        return inRange;
      }).length;
      const activeThisWeek = activeTeacherIds.size;
      const activeRate = teachers.length ? Math.round((activeThisWeek / teachers.length) * 100) : 0;

      const getSubEffectiveDate = (sub: any) => {
        if (sub?.plan === 'LIFETIME') {
          return new Date('9999-12-31');
        }
        return new Date(sub?.endDate || sub?.startDate || 0);
      };

      const activeSubs = Array.isArray(subscriptions) ? subscriptions.filter((s) => s.status === 'ACTIVE') : [];
      
      const latestSubscription = activeSubs.length > 0
        ? activeSubs.reduce((latest: any, sub: any) =>
            getSubEffectiveDate(sub) > getSubEffectiveDate(latest) ? sub : latest,
          activeSubs[0])
        : (Array.isArray(subscriptions) && subscriptions.length
            ? subscriptions.reduce((latest: any, sub: any) =>
                getSubEffectiveDate(sub) > getSubEffectiveDate(latest) ? sub : latest,
              subscriptions[0])
            : null);

      const hasPendingOrExpired = Array.isArray(subscriptions)
        ? subscriptions.some((s) => s.id !== latestSubscription?.id && (s.status === 'PENDING' || s.status === 'PROCESSING' || s.status === 'EXPIRED'))
        : false;

      const now = new Date();
      const subEndDate = latestSubscription?.endDate ? new Date(latestSubscription.endDate) : null;
      const daysLeft = subEndDate ? Math.ceil((subEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;

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
        teacherActivity: {
          activeThisWeek,
          totalTeachers: teachers.length,
          activeRate,
          entriesThisWeek,
        },
        subscription: {
          plan: latestSubscription?.plan || null,
          status: latestSubscription?.status || null,
          startDate: latestSubscription?.startDate || null,
          endDate: latestSubscription?.endDate || null,
          amount: latestSubscription?.amount ?? null,
          currency: latestSubscription?.currency || null,
          daysLeft,
          warning: latestSubscription?.plan === 'LIFETIME' ? false : (typeof daysLeft === 'number' ? daysLeft <= 7 : false),
          hasPendingOrExpired,
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
      subjects: '/dashboard/subjects',
      assignments: '/dashboard/assignments',
      'attendance-reports': '/dashboard/attendance-reports',
      'report-cards': '/dashboard/report-cards',
    };

    if (routeMap[next]) {
      router.push(routeMap[next]);
      return;
    }
    setActiveTab(next);
    const query = next === 'home' ? {} : { tab: next };
    router.replace({ pathname: '/dashboard/admin', query }, undefined, { shallow: true });
  };

  const pageTitle = showHome 
    ? t('auto.adminDashboardAims', 'Admin Dashboard | AIMS')
    : `${t('menu.system', 'System')} ${t('settings', 'Settings')} | AIMS`;

  return (
    <div className={menuStyles.menuShell}>
      <Head>
        <title>{pageTitle}</title>
      </Head>
      <div className={menuStyles.menuLayout}>
        <AdminMenu activeKey={activeTab} onSelect={(key) => handleSelect(key)} />
        <div className={menuStyles.mainContent}>
          <div className="container-fluid py-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <div>
                <h2 className="h4 mb-1">
                  <i className={`bi ${showHome ? 'bi-house' : 'bi-shield-lock'} me-2 text-primary`}></i>
                  {showHome 
                    ? t('adminDashboard', 'Admin Dashboard') 
                    : `${t('menu.system', 'System')} ${t('settings', 'Settings')}`}
                </h2>
              </div>
            </div>

            {showHome ? (
              <div className={`${menuStyles.homePanel} p-3 p-md-4`}>
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <div className="d-flex align-items-center">
                    <h3 className="h5 mb-1">{t('dashboard.overview', 'Overview')}</h3>
                  </div>
                  <div>
                    <Button variant="outline-secondary" size="sm" onClick={fetchHomeSnapshot} disabled={homeLoading}>
                      <i className="bi bi-arrow-clockwise me-1"></i>
                      {t('dashboard.refresh', 'Refresh')}
                    </Button>
                  </div>
                </div>

                {homeError && (
                  <Alert variant="danger" className="mb-3" dismissible onClose={() => setHomeError('')}>
                    {homeError}
                  </Alert>
                )}

                <AdminAnalytics />
                <CalendarView />

                {homeLoading || !homeSnapshot ? (
                  <div className="text-center py-5">
                    <Spinner animation="border" />
                    <p className="text-muted mt-2 mb-0">{t('auto.loadingOverview', `Loading overview...`)}</p>
                  </div>
                ) : (
                  <>
                    <Row className="g-3 mb-3">
                      <Col md={3} sm={6}>
                        <Card 
                          className="shadow-sm h-100 interactive-card" 
                          onClick={() => handleSelect('students')}
                        >
                          <Card.Body>
                            <div className="d-flex justify-content-between align-items-center">
                              <div>
                                <p className="text-muted mb-1 small">{t('menu.students', 'Students')}</p>
                                <h4 className="mb-0 fw-bold">{homeSnapshot.counts.students}</h4>
                              </div>
                              <span className="badge bg-primary-subtle text-primary">
                                <i className="bi bi-mortarboard-fill"></i>
                              </span>
                            </div>
                          </Card.Body>
                        </Card>
                      </Col>
                      <Col md={3} sm={6}>
                        <Card 
                          className="shadow-sm h-100 interactive-card"
                          onClick={() => handleSelect('teachers')}
                        >
                          <Card.Body>
                            <div className="d-flex justify-content-between align-items-center">
                              <div>
                                <p className="text-muted mb-1 small">{t('menu.teachers', 'Teachers')}</p>
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
                        <Card 
                          className="shadow-sm h-100 interactive-card"
                          onClick={() => handleSelect('parents')}
                        >
                          <Card.Body>
                            <div className="d-flex justify-content-between align-items-center">
                              <div>
                                <p className="text-muted mb-1 small">{t('menu.parents', 'Parents')}</p>
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
                        <Card 
                          className="shadow-sm h-100 interactive-card"
                          onClick={() => handleSelect('progress')}
                        >
                          <Card.Body>
                            <div className="d-flex justify-content-between align-items-center">
                              <div>
                                <p className="text-muted mb-1 small">{t('avgLessonProgress', 'Avg Lesson Progress')}</p>
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
                      <Col lg={6}>
                        <Card className="shadow-sm h-100">
                          <Card.Body>
                            <div className="d-flex justify-content-between align-items-center">
                              <div>
                                <p className="text-muted mb-1 small">{t('dashboard.teacherActivity', 'Teacher Activity (7d)')}</p>
                                <h5 className="mb-0">
                                  {homeSnapshot.teacherActivity.activeThisWeek} {t('dashboard.activeThisWeek', 'active')}
                                  <small className="text-muted ms-2">
                                    / {homeSnapshot.teacherActivity.totalTeachers} {t('dashboard.teachers', 'teachers')}
                                  </small>
                                </h5>
                              </div>
                              <Badge bg={homeSnapshot.teacherActivity.activeRate >= 70 ? 'success' : homeSnapshot.teacherActivity.activeRate >= 40 ? 'warning' : 'danger'}>
                                {homeSnapshot.teacherActivity.activeRate}%
                              </Badge>
                            </div>
                            <div className="progress mt-3" style={{ height: '8px' }}>
                              <div
                                className={`progress-bar ${homeSnapshot.teacherActivity.activeRate >= 70 ? 'bg-success' : homeSnapshot.teacherActivity.activeRate >= 40 ? 'bg-warning' : 'bg-danger'}`}
                                style={{ width: `${homeSnapshot.teacherActivity.activeRate}%` }}
                              ></div>
                            </div>
                            <small className="text-muted d-block mt-2">
                              {homeSnapshot.teacherActivity.entriesThisWeek} {t('dashboard.progressEntriesLogged', 'progress entries logged this week.')}
                            </small>
                          </Card.Body>
                        </Card>
                      </Col>
                      <Col lg={6}>
                        <Card 
                          className="shadow-sm h-100 interactive-card"
                          onClick={() => handleSelect('subscription-management')}
                        >
                          <Card.Body>
                            <div className="d-flex justify-content-between align-items-center">
                              <div>
                                <p className="text-muted mb-1 small">{t('dashboard.subscription', 'Subscription')}</p>
                                <h5 className="mb-0">
                                  {homeSnapshot.subscription.plan ? homeSnapshot.subscription.plan : t('dashboard.noPlan', 'No plan')}
                                  {homeSnapshot.subscription.status && (
                                    <Badge
                                      bg={homeSnapshot.subscription.status === 'ACTIVE' ? 'success' : homeSnapshot.subscription.warning ? 'danger' : 'secondary'}
                                      className="ms-2"
                                    >
                                      {homeSnapshot.subscription.status}
                                    </Badge>
                                  )}
                                </h5>
                              </div>
                              {homeSnapshot.subscription.amount && (
                                <span className="badge bg-primary-subtle text-primary">
                                  {getCurrencySymbol(homeSnapshot.subscription.currency || 'USD')}
                                  {homeSnapshot.subscription.amount}
                                </span>
                              )}
                            </div>
                            <div className="mt-2">
                              <small className="text-muted d-block">
                                {homeSnapshot.subscription.endDate
                                  ? `${t('dashboard.renewsOn', 'Renews on')} ${new Date(homeSnapshot.subscription.endDate).toLocaleDateString()}`
                                  : t('dashboard.noExpiryDateSet', 'No expiry date set')}
                              </small>
                              {typeof homeSnapshot.subscription.daysLeft === 'number' && (
                                <small className={homeSnapshot.subscription.warning ? 'text-danger' : 'text-success'}>
                                  {homeSnapshot.subscription.daysLeft >= 0
                                    ? `${homeSnapshot.subscription.daysLeft} ${t('dashboard.daysLeft', 'day(s) left')}`
                                    : t('dashboard.expiredDaysAgo', 'Expired day(s) ago').replace('day(s)', Math.abs(homeSnapshot.subscription.daysLeft).toString())}
                                </small>
                              )}
                              {homeSnapshot.subscription.warning && (
                               <div className="alert alert-warning py-2 px-3 mt-3 mb-0">
                                 <i className="bi bi-exclamation-triangle me-1"></i>
                                 {t('dashboard.subscriptionEndsSoon', 'Subscription ends soon. Please renew within 7 days.')}
                               </div>
                             )}
                             {homeSnapshot.subscription.hasPendingOrExpired && !homeSnapshot.subscription.warning && (
                               <div className="alert alert-info py-2 px-3 mt-3 mb-0" style={{ fontSize: '0.85rem' }}>
                                 <i className="bi bi-info-circle me-1"></i>
                                 {t('auto.hasPendingOrExpiredAlert', 'Note: You have pending or expired payment records. Please review them in Subscriptions.')}
                               </div>
                             )}
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
                              <h6 className="mb-0">{t('dashboard.feeSummary', 'Fee Summary')}</h6>
                              <small className="text-muted">{t('dashboard.paidVsPending', 'Paid vs pending')}</small>
                            </div>
                            <Badge bg="primary">
                              {getCurrencySymbol(defaultCurrency)}
                              {homeSnapshot.fees.total.toFixed(0)} {t('auto.total', `total`)}
                            </Badge>
                          </Card.Header>
                          <Card.Body>
                            <div className="mb-3">
                              <div className="d-flex justify-content-between small text-muted mb-1">
                                <span>{t('dashboard.paid', 'Paid')}</span>
                                <span>
                                  {getCurrencySymbol(defaultCurrency)}
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
                                <span>{t('dashboard.pending', 'Pending')}</span>
                                <span>
                                  {getCurrencySymbol(defaultCurrency)}
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
                                <span>{t('dashboard.overdue', 'Overdue')}</span>
                                <span>
                                  {getCurrencySymbol(defaultCurrency)}
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
                                {t('dashboard.manageFees', 'Manage Fees')}
                              </Button>
                              <Button size="sm" variant="outline-secondary" onClick={() => handleSelect('fee-verification')}>
                                {t('dashboard.verifyPayments', 'Verify Payments')}
                              </Button>
                            </div>
                          </Card.Footer>
                        </Card>
                      </Col>
                      <Col lg={4}>
                        <Card className="shadow-sm h-100">
                          <Card.Header className="bg-light d-flex justify-content-between align-items-center">
                            <div>
                              <h6 className="mb-0">{t('dashboard.salarySnapshot', 'Salary Snapshot')}</h6>
                              <small className="text-muted">{t('dashboard.upcomingTeacherPayouts', 'Upcoming teacher payouts')}</small>
                            </div>
                            <Badge bg="success">
                              {getCurrencySymbol(defaultCurrency)}
                              {(homeSnapshot.salaries.pending + homeSnapshot.salaries.paid).toFixed(0)}
                            </Badge>
                          </Card.Header>
                          <Card.Body>
                            <div className="mb-3">
                              <div className="d-flex justify-content-between small text-muted mb-1">
                                <span>{t('dashboard.pending', 'Pending')}</span>
                                <span>
                                  {getCurrencySymbol(defaultCurrency)}
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
                                <span>{t('dashboard.paid', 'Paid')}</span>
                                <span>
                                  {getCurrencySymbol(defaultCurrency)}
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
                              {t('dashboard.goToSalaries', 'Go to Salaries')}
                            </Button>
                          </Card.Footer>
                        </Card>
                      </Col>
                      <Col lg={4}>
                        <Card className="shadow-sm h-100">
                          <Card.Header className="bg-light d-flex justify-content-between align-items-center">
                            <h6 className="mb-0">{t('dashboard.remarksAndThreads', 'Remarks & Threads')}</h6>
                            <Badge bg="info">{homeSnapshot.remarks.total}</Badge>
                          </Card.Header>
                          <Card.Body>
                            <p className="text-muted small mb-3">
                              {t('dashboard.keepAnEyeOnConversations', 'Keep an eye on parent conversations and follow-ups.')}
                            </p>
                            <div className="d-flex flex-column gap-2">
                              <Button size="sm" variant="outline-primary" onClick={() => handleSelect('parent-remarks')}>
                                {t('dashboard.viewRemarks', 'View Remarks')}
                              </Button>
                              <Button size="sm" variant="outline-secondary" onClick={() => handleSelect('tests')}>
                                {t('dashboard.testsAndExams', 'Tests & Exams')}
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
                            <h6 className="mb-0">{t('dashboard.recentProgress', 'Recent Progress')}</h6>
                            <Badge bg="info">{homeSnapshot.progress.records} {t('dashboard.records', 'records')}</Badge>
                          </Card.Header>
                          <Card.Body className="p-0">
                            {homeSnapshot.progress.recent.length === 0 ? (
                              <div className="text-center text-muted py-4">{t('dashboard.noRecentProgress', 'No recent progress')}</div>
                            ) : (
                              <div className="table-responsive">
                                <Table hover size="sm" className="mb-0">
                                  <thead className="table-light">
                                    <tr>
                                      <th>{t('dashboard.date', 'Date')}</th>
                                      <th>{t('menu.students', 'Student')}</th>
                                      <th>{t('dashboard.subject', 'Subject')}</th>
                                      <th>{t('menu.teachers', 'Teacher')}</th>
                                      <th>{t('dashboard.progress', 'Progress')}</th>
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
                              {t('dashboard.viewFullProgress', 'View Full Progress')}
                            </Button>
                          </Card.Footer>
                        </Card>
                      </Col>
                      <Col lg={5}>
                        <Card className="shadow-sm h-100">
                          <Card.Header className="bg-light d-flex justify-content-between align-items-center">
                            <h6 className="mb-0">{t('dashboard.topTeacherProgress', 'Top Teacher Progress')}</h6>
                            <Badge bg="secondary">{t('dashboard.avgPercentage', 'Avg %')}</Badge>
                          </Card.Header>
                          <Card.Body>
                            {homeSnapshot.progress.topTeachers.length === 0 ? (
                              <div className="text-muted text-center py-3">{t('auto.noProgressDataYet', `No progress data yet`)}</div>
                            ) : (
                              <div className="d-flex flex-column gap-3">
                                {homeSnapshot.progress.topTeachers.map((teacher) => (
                                  <div key={teacher.name}>
                                    <div className="d-flex justify-content-between align-items-center mb-1">
                                      <strong>{teacher.name}</strong>
                                      <small className="text-muted">{teacher.count} {t('auto.sessions', `sessions`)}</small>
                                    </div>
                                    <div className="progress" style={{ height: '8px' }}>
                                      <div
                                        className={`progress-bar ${teacher.avg >= 80 ? 'bg-success' : teacher.avg >= 60 ? 'bg-warning' : 'bg-danger'}`}
                                        style={{ width: `${teacher.avg}%` }}
                                      ></div>
                                    </div>
                                    <small className="text-muted">{teacher.avg}{t('auto.averageLessonProgress', `% average lesson progress`)}</small>
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
                <Tab eventKey="audit-logs" title={<span><i className="bi bi-file-earmark-code me-2"></i>{t('menu.auditLogs', 'Audit Logs')}</span>}>
                  <AuditLogsTab />
                </Tab>
                <Tab eventKey="academy-settings" title={<span><i className="bi bi-gear-fill me-2"></i>{t('menu.academySettings')}</span>}>
                  <AcademySettingsTab />
                </Tab>
                <Tab eventKey="subscription-management" title={<span><i className="bi bi-credit-card me-2"></i>{t('menu.subscriptionManagement')}</span>}>
                  <AdminSubscriptionTab />
                </Tab>
              </Tabs>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

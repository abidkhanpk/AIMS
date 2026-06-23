import { serverSideTranslations } from 'next-i18next/pages/serverSideTranslations';
import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { Container, Row, Col, Card, Form, Button, Modal, Spinner, Offcanvas, Badge, ListGroup, InputGroup } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import Head from 'next/head';

// Import Admin Menu and Styles
import AdminMenu from '../../components/dashboards/AdminMenu';
import menuStyles from '../../components/dashboards/AdminMenu.module.css';

// Import Vidstack components
import { MediaPlayer, MediaProvider } from '@vidstack/react';
import { DefaultVideoLayout, defaultLayoutIcons } from '@vidstack/react/player/layouts/default';

// Import Vidstack styles
import '@vidstack/react/player/styles/default/theme.css';
import '@vidstack/react/player/styles/default/layouts/video.css';

interface VideoTutorial {
  id: string;
  titleEn: string;
  titleUr: string;
  keywordsEn: string;
  keywordsUr: string;
  youtubeUrl: string;
  roles: string[];
  createdAt: string;
}

export default function VideosPage() {
  const { t } = useTranslation('common');
  const { data: session, status } = useSession();
  const router = useRouter();
  const currentLocale = router.locale || 'en';

  const [videos, setVideos] = useState<VideoTutorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Search & Filtering States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('ALL');

  // Player Drawer States
  const [showDrawer, setShowDrawer] = useState(false);
  const [activeVideo, setActiveVideo] = useState<VideoTutorial | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  // Form / Modal States for Admin/Developer
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingVideo, setEditingVideo] = useState<VideoTutorial | null>(null);
  const [formTitleEn, setFormTitleEn] = useState('');
  const [formTitleUr, setFormTitleUr] = useState('');
  const [formKeywordsEn, setFormKeywordsEn] = useState('');
  const [formKeywordsUr, setFormKeywordsUr] = useState('');
  const [formYoutubeUrl, setFormYoutubeUrl] = useState('');
  const [formRoles, setFormRoles] = useState<string[]>([]);
  const [formSubmitting, setFormSubmitting] = useState(false);

  const availableRoles = ['ADMIN', 'TEACHER', 'STUDENT', 'PARENT'];

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated') {
      fetchVideos();
    }
  }, [status, selectedRoleFilter]);

  const fetchVideos = async () => {
    try {
      setLoading(true);
      setError('');
      // If Admin or Developer wants to see filtered videos, append filterRole
      let url = '/api/tutorials';
      if (selectedRoleFilter !== 'ALL') {
        url += `?filterRole=${selectedRoleFilter}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setVideos(data);
      } else {
        setError(t('auto.errorFetchingData', 'Error fetching data'));
      }
    } catch (err) {
      setError(t('auto.errorFetchingData', 'Error fetching data'));
    } finally {
      setLoading(false);
    }
  };

  // Helper to extract YouTube ID
  const getYoutubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : '';
  };

  // Check if current user is Admin or Developer
  const canManage = useMemo(() => {
    return session?.user?.role === 'ADMIN' || session?.user?.role === 'DEVELOPER';
  }, [session]);

  // Filter videos on frontend based on search query
  const filteredVideos = useMemo(() => {
    if (!searchQuery.trim()) return videos;
    const query = searchQuery.toLowerCase().trim();

    return videos.filter((video) => {
      const matchTitleEn = video.titleEn.toLowerCase().includes(query);
      const matchTitleUr = video.titleUr.includes(query);
      const matchKeywordsEn = video.keywordsEn ? video.keywordsEn.toLowerCase().includes(query) : false;
      const matchKeywordsUr = video.keywordsUr ? video.keywordsUr.includes(query) : false;
      return matchTitleEn || matchTitleUr || matchKeywordsEn || matchKeywordsUr;
    });
  }, [videos, searchQuery]);

  // Playlist of other videos matching the current visibility (except active video)
  const playlistVideos = useMemo(() => {
    if (!activeVideo) return [];
    return filteredVideos.filter((v) => v.id !== activeVideo.id);
  }, [filteredVideos, activeVideo]);

  const handleOpenAddModal = () => {
    setEditingVideo(null);
    setFormTitleEn('');
    setFormTitleUr('');
    setFormKeywordsEn('');
    setFormKeywordsUr('');
    setFormYoutubeUrl('');
    setFormRoles([]);
    setShowFormModal(true);
  };

  const handleOpenEditModal = (video: VideoTutorial) => {
    setEditingVideo(video);
    setFormTitleEn(video.titleEn);
    setFormTitleUr(video.titleUr);
    setFormKeywordsEn(video.keywordsEn || '');
    setFormKeywordsUr(video.keywordsUr || '');
    setFormYoutubeUrl(video.youtubeUrl);
    setFormRoles(video.roles);
    setShowFormModal(true);
  };

  const handleRoleCheckboxChange = (role: string) => {
    setFormRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleSelectAllRoles = () => {
    if (formRoles.length === availableRoles.length) {
      setFormRoles([]);
    } else {
      setFormRoles([...availableRoles]);
    }
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitleEn || !formTitleUr || !formYoutubeUrl || formRoles.length === 0) {
      setError(t('auto.titleAmountAndDueDate', 'Missing required fields'));
      return;
    }

    const ytId = getYoutubeId(formYoutubeUrl);
    if (!ytId) {
      setError(t('auto.invalidFileTypePleaseUpload', 'Invalid YouTube URL'));
      return;
    }

    setFormSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const method = editingVideo ? 'PUT' : 'POST';
      const body = {
        id: editingVideo?.id,
        titleEn: formTitleEn,
        titleUr: formTitleUr,
        keywordsEn: formKeywordsEn,
        keywordsUr: formKeywordsUr,
        youtubeUrl: formYoutubeUrl,
        roles: formRoles,
      };

      const res = await fetch('/api/tutorials', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setSuccess(editingVideo ? t('auto.videoUpdated', 'Video tutorial updated successfully!') : t('auto.videoAdded', 'Video tutorial added successfully!'));
        setShowFormModal(false);
        fetchVideos();
      } else {
        const data = await res.json();
        setError(data.message || 'Failed to save video tutorial');
      }
    } catch (err) {
      setError('Error saving video tutorial');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteVideo = async (id: string) => {
    if (!confirm(t('auto.confirmDeleteVideo', 'Are you sure you want to delete this video tutorial?'))) {
      return;
    }

    try {
      setError('');
      setSuccess('');
      const res = await fetch(`/api/tutorials?id=${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setSuccess(t('auto.videoDeleted', 'Video tutorial deleted successfully!'));
        fetchVideos();
        if (activeVideo?.id === id) {
          setShowDrawer(false);
          setActiveVideo(null);
        }
      } else {
        const data = await res.json();
        setError(data.message || 'Failed to delete video tutorial');
      }
    } catch (err) {
      setError('Error deleting video tutorial');
    }
  };

  const handlePlayVideo = (video: VideoTutorial) => {
    setActiveVideo(video);
    setShowDrawer(true);
  };

  const handleSelect = (key?: string | null) => {
    if (!key || key === 'tutorials') return;
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

  if (status === 'loading') {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '80vh' }}>
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  const pageContent = (
    <Container className="py-4">
      {/* Page Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h1 className="h3 mb-1 font-weight-bold d-flex align-items-center gap-2">
            <i className="bi bi-play-btn-fill text-danger"></i>
            {t('menu.tutorials', 'Tutorial Videos')}
          </h1>
          <p className="text-muted mb-0">{t('auto.everythingYouNeedToManageYourE', 'Educational video guides for using the application')}</p>
        </div>
        {canManage && (
          <Button
            variant="danger"
            className="d-flex align-items-center justify-content-center gap-2 shadow-sm rounded-pill px-4 py-2"
            onClick={handleOpenAddModal}
            style={{ transition: 'all 0.2s ease-in-out' }}
          >
            <i className="bi bi-plus-circle-fill"></i>
            <span>{t('auto.addVideo', 'Add Video')}</span>
          </Button>
        )}
      </div>

      {/* Search and Filters */}
      <Row className="mb-4 g-3">
        <Col md={canManage ? 8 : 12}>
          <InputGroup className="shadow-sm rounded-pill overflow-hidden border">
            <InputGroup.Text className="bg-white border-0 ps-3 pe-2">
              <i className="bi bi-search text-muted"></i>
            </InputGroup.Text>
            <Form.Control
              type="text"
              placeholder={t('auto.searchVideos', 'Search videos by title or keyword...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-0 py-2 shadow-none"
              dir={currentLocale === 'ur' ? 'rtl' : 'ltr'}
            />
            {searchQuery && (
              <Button 
                variant="white" 
                className="border-0 pe-3 text-muted" 
                onClick={() => setSearchQuery('')}
              >
                <i className="bi bi-x-circle-fill"></i>
              </Button>
            )}
          </InputGroup>
        </Col>
        {canManage && (
          <Col md={4}>
            <Form.Select
              value={selectedRoleFilter}
              onChange={(e) => setSelectedRoleFilter(e.target.value)}
              className="shadow-sm rounded-pill border py-2 ps-3"
            >
              <option value="ALL">{t('auto.allRoles', 'All Roles (Filter)')}</option>
              {availableRoles.map((role) => (
                <option key={role} value={role}>
                  {t(`auto.roles.${role}`, role)}
                </option>
              ))}
            </Form.Select>
          </Col>
        )}
      </Row>

      {error && <div className="alert alert-danger shadow-sm rounded-3 mb-4">{error}</div>}
      {success && <div className="alert alert-success shadow-sm rounded-3 mb-4">{success}</div>}

      {/* Video Cards Grid */}
      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" variant="danger" />
          <p className="text-muted mt-2">{t('auto.loading', 'Loading...')}</p>
        </div>
      ) : filteredVideos.length === 0 ? (
        <div className="text-center py-5 border rounded-3 bg-white shadow-sm">
          <i className="bi bi-camera-video display-4 text-muted"></i>
          <h5 className="mt-3 text-muted">{t('auto.noRecords', 'No videos found')}</h5>
          <p className="text-muted mb-0">{t('auto.noProgressRecordsFound', 'Try modifying your search or filters.')}</p>
        </div>
      ) : (
        <Row className="g-4">
          {filteredVideos.map((video) => {
            const ytId = getYoutubeId(video.youtubeUrl);
            const thumbnail = ytId 
              ? `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`
              : '/assets/default-logo.png';
            
            const title = currentLocale === 'ur' ? video.titleUr : video.titleEn;

            return (
              <Col key={video.id} xs={12} sm={6} lg={4}>
                <Card 
                  className="h-100 border-0 shadow-sm overflow-hidden video-card"
                  style={{
                    borderRadius: '16px',
                    background: 'rgba(255, 255, 255, 0.8)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    cursor: 'pointer'
                  }}
                  onClick={() => handlePlayVideo(video)}
                >
                  <div 
                    className="position-relative overflow-hidden"
                    style={{ aspectRatio: '16/9', backgroundColor: '#000' }}
                  >
                    <Card.Img
                      variant="top"
                      src={thumbnail}
                      alt={title}
                      className="w-100 h-100 object-fit-cover"
                      style={{ transition: 'transform 0.3s ease' }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/assets/default-logo.png';
                      }}
                    />
                    <div 
                      className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center card-play-overlay"
                      style={{
                        background: 'rgba(0,0,0,0.3)',
                        transition: 'background 0.2s ease'
                      }}
                    >
                      <div 
                        className="d-flex align-items-center justify-content-center bg-danger text-white rounded-circle shadow-lg play-btn-circle"
                        style={{
                          width: '50px',
                          height: '50px',
                          transition: 'transform 0.2s ease, background-color 0.2s ease'
                        }}
                      >
                        <i className="bi bi-play-fill fs-4 ms-1"></i>
                      </div>
                    </div>
                  </div>

                  <Card.Body className="d-flex flex-column p-3">
                    <div className="d-flex flex-wrap gap-1 mb-2">
                      {video.roles.map((role) => (
                        <Badge 
                          key={role} 
                          bg="secondary" 
                          className="text-capitalize"
                          style={{ 
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            background: role === 'ADMIN' ? 'rgba(13, 110, 253, 0.1)' :
                                        role === 'TEACHER' ? 'rgba(25, 135, 84, 0.1)' :
                                        role === 'STUDENT' ? 'rgba(255, 193, 7, 0.1)' : 'rgba(108, 117, 125, 0.1)',
                            color: role === 'ADMIN' ? '#0d6efd' :
                                   role === 'TEACHER' ? '#198754' :
                                   role === 'STUDENT' ? '#ffc107' : '#6c757d',
                            border: role === 'ADMIN' ? '1px solid rgba(13, 110, 253, 0.2)' :
                                    role === 'TEACHER' ? '1px solid rgba(25, 135, 84, 0.2)' :
                                    role === 'STUDENT' ? '1px solid rgba(255, 193, 7, 0.2)' : '1px solid rgba(108, 117, 125, 0.2)'
                          }}
                        >
                          {t(`auto.roles.${role}`, role)}
                        </Badge>
                      ))}
                    </div>

                    <Card.Title 
                      className="h6 mb-2 text-truncate-2 fw-bold text-dark flex-grow-1"
                      style={{ 
                        fontSize: '1rem', 
                        lineHeight: '1.4', 
                        height: '2.8em',
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical'
                      }}
                    >
                      {title}
                    </Card.Title>

                    <div className="d-flex justify-content-between align-items-center mt-3 pt-2 border-top">
                      <small className="text-muted">
                        <i className="bi bi-clock me-1"></i>
                        {new Date(video.createdAt).toLocaleDateString()}
                      </small>

                      {canManage && (
                        <div className="d-flex gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="outline-secondary"
                            size="sm"
                            className="border-0 px-2 py-1 rounded-circle"
                            onClick={() => handleOpenEditModal(video)}
                            title={t('auto.edit', 'Edit')}
                          >
                            <i className="bi bi-pencil-square text-primary"></i>
                          </Button>
                          <Button
                            variant="outline-secondary"
                            size="sm"
                            className="border-0 px-2 py-1 rounded-circle"
                            onClick={() => handleDeleteVideo(video.id)}
                            title={t('auto.delete', 'Delete')}
                          >
                            <i className="bi bi-trash3-fill text-danger"></i>
                          </Button>
                        </div>
                      )}
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}
    </Container>
  );

  return (
    <>
      <Head>
        <title>{t('menu.tutorials', 'Tutorial Videos') + ' | AIMS'}</title>
      </Head>

      {session?.user?.role === 'ADMIN' ? (
        <div className={menuStyles.menuShell}>
          <div className={menuStyles.menuLayout}>
            <AdminMenu activeKey="tutorials" onSelect={handleSelect} />
            <div className={menuStyles.mainContent}>
              {pageContent}
            </div>
          </div>
        </div>
      ) : (
        pageContent
      )}

      {/* Side Sliding Offcanvas Drawer for Playing Video */}
      <Offcanvas
        show={showDrawer}
        onHide={() => setShowDrawer(false)}
        placement={currentLocale === 'ur' ? 'start' : 'end'}
        style={{ 
          width: '500px', 
          maxWidth: '100%',
          borderLeft: currentLocale === 'ur' ? 'none' : '1px solid rgba(0,0,0,0.1)',
          borderRight: currentLocale === 'ur' ? '1px solid rgba(0,0,0,0.1)' : 'none',
          boxShadow: '-4px 0 24px rgba(0,0,0,0.15)'
        }}
      >
        <Offcanvas.Header closeButton className="border-bottom">
          <Offcanvas.Title className="fw-bold fs-5">
            {t('auto.playVideo', 'Play Tutorial')}
          </Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body className="p-0 d-flex flex-column h-100 bg-light">
          {activeVideo && (
            <div className="d-flex flex-column h-100">
              <div 
                className="w-100 position-relative shadow-sm"
                style={{ aspectRatio: '16/9', backgroundColor: '#000' }}
              >
                {isMounted && (
                  <MediaPlayer
                    title={currentLocale === 'ur' ? activeVideo.titleUr : activeVideo.titleEn}
                    src={`youtube/${getYoutubeId(activeVideo.youtubeUrl)}`}
                    autoplay
                    style={{ width: '100%', height: '100%' }}
                  >
                    <MediaProvider />
                    <DefaultVideoLayout icons={defaultLayoutIcons} />
                  </MediaPlayer>
                )}
              </div>

              <div className="p-3 bg-white border-bottom shadow-sm">
                <h2 className="h6 fw-bold mb-2" style={{ lineHeight: '1.4' }}>
                  {currentLocale === 'ur' ? activeVideo.titleUr : activeVideo.titleEn}
                </h2>
                <div className="d-flex flex-wrap gap-1 mb-2">
                  {activeVideo.roles.map((role) => (
                    <Badge key={role} bg="light" className="text-muted text-capitalize border small">
                      {t(`auto.roles.${role}`, role)}
                    </Badge>
                  ))}
                </div>
                <small className="text-muted d-block">
                  <i className="bi bi-calendar3 me-1"></i>
                  {new Date(activeVideo.createdAt).toLocaleDateString()}
                </small>
              </div>

              <div className="flex-grow-1 overflow-auto p-3">
                <h3 className="h6 fw-bold text-muted mb-3 uppercase tracking-wider small">
                  <i className="bi bi-collection-play-fill me-2 text-danger"></i>
                  {t('auto.playlist', 'Playlist')} ({playlistVideos.length + 1})
                </h3>
                <ListGroup variant="flush" className="rounded-3 overflow-hidden shadow-sm">
                  <ListGroup.Item 
                    className="p-2 border-bottom d-flex gap-2 align-items-center active bg-danger bg-opacity-10 border-danger border-opacity-20"
                    style={{ cursor: 'default' }}
                  >
                    <div className="position-relative" style={{ width: '80px', aspectRatio: '16/9' }}>
                      <img 
                        src={`https://img.youtube.com/vi/${getYoutubeId(activeVideo.youtubeUrl)}/mqdefault.jpg`}
                        className="w-100 h-100 object-fit-cover rounded"
                        alt="Current Thumbnail"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/assets/default-logo.png';
                        }}
                      />
                      <div className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center rounded bg-dark bg-opacity-40">
                        <i className="bi bi-volume-up-fill text-white"></i>
                      </div>
                    </div>
                    <div className="flex-grow-1 min-width-0">
                      <div className="text-danger fw-bold small text-truncate">
                        {currentLocale === 'ur' ? activeVideo.titleUr : activeVideo.titleEn}
                      </div>
                      <small className="text-muted block mt-1" style={{ fontSize: '0.7rem' }}>
                        {t('auto.playVideo', 'Playing')}
                      </small>
                    </div>
                  </ListGroup.Item>

                  {playlistVideos.map((video) => {
                    const ytId = getYoutubeId(video.youtubeUrl);
                    const thumb = `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`;
                    const vTitle = currentLocale === 'ur' ? video.titleUr : video.titleEn;

                    return (
                      <ListGroup.Item 
                        key={video.id}
                        action
                        onClick={() => handlePlayVideo(video)}
                        className="p-2 border-bottom d-flex gap-2 align-items-center bg-white"
                      >
                        <div style={{ width: '80px', aspectRatio: '16/9' }}>
                          <img 
                            src={thumb} 
                            className="w-100 h-100 object-fit-cover rounded"
                            alt={vTitle}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/assets/default-logo.png';
                            }}
                          />
                        </div>
                        <div className="flex-grow-1 min-width-0">
                          <div className="text-dark fw-medium small text-truncate-2" style={{ maxHeight: '2.8em', overflow: 'hidden' }}>
                            {vTitle}
                          </div>
                        </div>
                      </ListGroup.Item>
                    );
                  })}
                </ListGroup>
              </div>
            </div>
          )}
        </Offcanvas.Body>
      </Offcanvas>

      {/* Sleek Modal Form to Add/Edit Video (Admin/Developer Only) */}
      <Modal 
        show={showFormModal} 
        onHide={() => setShowFormModal(false)}
        centered
        size="lg"
        style={{ backdropFilter: 'blur(4px)' }}
      >
        <Modal.Header closeButton className="border-bottom-0">
          <Modal.Title className="fw-bold text-dark">
            {editingVideo ? t('auto.editVideo', 'Edit Video Tutorial') : t('auto.addVideo', 'Add Video Tutorial')}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmitForm}>
          <Modal.Body className="pt-0">
            {error && <div className="alert alert-danger rounded-3">{error}</div>}

            <Row className="g-3">
              <Col md={6}>
                <Form.Group controlId="formTitleEn">
                  <Form.Label className="fw-bold small text-muted uppercase">{t('auto.videoTitleEn', 'English Title')}</Form.Label>
                  <Form.Control
                    type="text"
                    value={formTitleEn}
                    onChange={(e) => setFormTitleEn(e.target.value)}
                    placeholder="Enter tutorial English title"
                    className="py-2"
                    required
                  />
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group controlId="formTitleUr">
                  <Form.Label className="fw-bold small text-muted uppercase">{t('auto.videoTitleUr', 'Urdu Title')}</Form.Label>
                  <Form.Control
                    type="text"
                    value={formTitleUr}
                    onChange={(e) => setFormTitleUr(e.target.value)}
                    placeholder="ٹائٹل اردو میں درج کریں"
                    className="py-2"
                    dir="rtl"
                    required
                  />
                </Form.Group>
              </Col>

              <Col md={12}>
                <Form.Group controlId="formYoutubeUrl">
                  <Form.Label className="fw-bold small text-muted uppercase">{t('auto.youtubeUrl', 'YouTube Link')}</Form.Label>
                  <Form.Control
                    type="url"
                    value={formYoutubeUrl}
                    onChange={(e) => setFormYoutubeUrl(e.target.value)}
                    placeholder="e.g. https://www.youtube.com/watch?v=dQw4w9WgXcQ"
                    className="py-2"
                    required
                  />
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group controlId="formKeywordsEn">
                  <Form.Label className="fw-bold small text-muted uppercase">
                    {t('auto.keywordsEn', 'English Search Keywords')}
                  </Form.Label>
                  <Form.Control
                    type="text"
                    value={formKeywordsEn}
                    onChange={(e) => setFormKeywordsEn(e.target.value)}
                    placeholder="keywords, comma, separated"
                    className="py-2"
                  />
                  <Form.Text className="text-muted" style={{ fontSize: '0.75rem' }}>
                    Used for search. Not visible to end-users.
                  </Form.Text>
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group controlId="formKeywordsUr">
                  <Form.Label className="fw-bold small text-muted uppercase">
                    {t('auto.keywordsUr', 'Urdu Search Keywords')}
                  </Form.Label>
                  <Form.Control
                    type="text"
                    value={formKeywordsUr}
                    onChange={(e) => setFormKeywordsUr(e.target.value)}
                    placeholder="کی ورڈز، کوما، سے، علیحدہ، کریں"
                    className="py-2"
                    dir="rtl"
                  />
                  <Form.Text className="text-muted" style={{ fontSize: '0.75rem' }}>
                    سرچ کے لیے استعمال ہوں گے، صارفین کو نظر نہیں آئیں گے۔
                  </Form.Text>
                </Form.Group>
              </Col>

              <Col md={12}>
                <Form.Group>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <Form.Label className="fw-bold small text-muted uppercase mb-0">
                      {t('auto.roles', 'Target Roles')}
                    </Form.Label>
                    <Button 
                      variant="link" 
                      className="p-0 text-decoration-none small text-danger" 
                      onClick={handleSelectAllRoles}
                      type="button"
                    >
                      {formRoles.length === availableRoles.length ? t('auto.cancel', 'Deselect All') : t('auto.allRoles', 'Select All')}
                    </Button>
                  </div>
                  <div className="d-flex flex-wrap gap-4 border rounded-3 p-3 bg-light">
                    {availableRoles.map((role) => (
                      <Form.Check
                        key={role}
                        type="checkbox"
                        id={`role-${role}`}
                        label={t(`auto.roles.${role}`, role)}
                        checked={formRoles.includes(role)}
                        onChange={() => handleRoleCheckboxChange(role)}
                        className="text-capitalize fw-medium"
                      />
                    ))}
                  </div>
                  <Form.Text className="text-muted" style={{ fontSize: '0.75rem' }}>
                    Select at least one role. If Select All is used, the video is visible to all roles.
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer className="border-top-0">
            <Button variant="outline-secondary" className="px-4" onClick={() => setShowFormModal(false)}>
              {t('auto.cancel', 'Cancel')}
            </Button>
            <Button 
              variant="danger" 
              type="submit" 
              disabled={formSubmitting} 
              className="px-4 shadow-sm"
              style={{ background: '#dc3545', border: 'none' }}
            >
              {formSubmitting ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  {t('auto.creating', 'Saving...')}
                </>
              ) : (
                t('auto.create', 'Save')
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <style jsx global>{`
        .video-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 20px rgba(0,0,0,0.08) !important;
        }
        .card-play-overlay {
          opacity: 0;
        }
        .video-card:hover .card-play-overlay {
          opacity: 1;
          background: rgba(0,0,0,0.4) !important;
        }
        .video-card:hover .play-btn-circle {
          transform: scale(1.1);
        }
        .video-card:hover img {
          transform: scale(1.05);
        }
        .text-truncate-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </>
  );
}

export const getStaticProps = async ({ locale }: any) => ({
  props: {
    ...(await serverSideTranslations(locale ?? 'en', ['common'])),
  },
});

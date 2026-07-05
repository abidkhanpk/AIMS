import { serverSideTranslations } from 'next-i18next/pages/serverSideTranslations';
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { Container, Row, Col, Card, Form, Button, Modal, Spinner, Badge, InputGroup } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import Head from 'next/head';

// Import Admin Menu and Styles
import AdminMenu from '../../components/dashboards/AdminMenu';
import menuStyles from '../../components/dashboards/AdminMenu.module.css';

// Import Vidstack components
import { MediaPlayer, MediaProvider, type MediaPlayerInstance, useMediaStore } from '@vidstack/react';
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
  const [drawerCollapsed, setDrawerCollapsed] = useState(false);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [shouldAutoPlay, setShouldAutoPlay] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isCollapsedDown, setIsCollapsedDown] = useState(false);

  // Playback Progress Ref (in-memory, until page reload)
  const videoProgressRef = useRef<Record<string, number>>({});
  const playerRef = useRef<MediaPlayerInstance>(null);
  const hasSeekedRef = useRef(false);

  // Refs for tracking open/close logic
  const isFirstOpenRef = useRef(true);
  const hasStartedPlayingRef = useRef(false);
  const playlistWasOpenRef = useRef(false);

  // Subscribe to Vidstack player state
  const { fullscreen, volume, muted } = useMediaStore(playerRef);

  const safePlay = () => {
    if (playerRef.current) {
      try {
        playerRef.current.play().catch(err => {
          console.warn("Vidstack safePlay catch:", err);
        });
      } catch (err) {
        console.warn("Vidstack safePlay try-catch:", err);
      }
    }
  };

  const safePause = () => {
    if (playerRef.current) {
      try {
        playerRef.current.pause();
      } catch (err) {
        console.warn("Vidstack safePause try-catch:", err);
      }
    }
  };

  const toggleDrawerCollapsed = () => {
    const nextCollapsed = !drawerCollapsed;
    setDrawerCollapsed(nextCollapsed);

    if (nextCollapsed) {
      // Save playlist state before collapse
      playlistWasOpenRef.current = showPlaylist;
      setIsMaximized(false);
      setIsCollapsedDown(false);
    } else {
      // Opening
      if (isFirstOpenRef.current) {
        isFirstOpenRef.current = false;
        setShouldAutoPlay(false);
        setShowPlaylist(true);
      } else {
        if (hasStartedPlayingRef.current) {
          setShouldAutoPlay(true);
          setTimeout(() => {
            safePlay();
          }, 50);
        }
        setShowPlaylist(playlistWasOpenRef.current);
      }
    }
  };

  // Auto-detect audio, video, or YouTube links on the page to show the arrow button
  const hasDetectedRef = useRef(false);
  useEffect(() => {
    if (!isMounted || hasDetectedRef.current) return;

    const detectMediaAndShowArrow = () => {
      const hasAudio = document.querySelector('audio') !== null;
      const hasVideo = document.querySelector('video') !== null;

      const hasYtIframe = Array.from(document.querySelectorAll('iframe')).some(iframe => {
        const src = iframe.src || '';
        return src.includes('youtube.com') || src.includes('youtu.be');
      });

      const hasYtLink = Array.from(document.querySelectorAll('a')).some(a => {
        const href = a.href || '';
        return href.includes('youtube.com') || href.includes('youtu.be');
      });

      const hasTutorials = videos.length > 0;

      if (hasAudio || hasVideo || hasYtIframe || hasYtLink || hasTutorials) {
        hasDetectedRef.current = true;
        if (!activeVideo && videos.length > 0) {
          setActiveVideo(videos[0]);
        }
        setShowDrawer(true);
        setDrawerCollapsed(true);
      }
    };

    detectMediaAndShowArrow();
  }, [isMounted, videos, activeVideo]);

  // Pause playback when player is collapsed (pushed back)
  useEffect(() => {
    if (drawerCollapsed) {
      safePause();
      document.querySelectorAll('audio, video').forEach((el) => {
        if (el instanceof HTMLMediaElement) {
          el.pause();
        }
      });
    }
  }, [drawerCollapsed]);

  useEffect(() => {
    hasSeekedRef.current = false;
  }, [activeVideo?.id]);

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

  // Check if current user is Developer
  const canManage = useMemo(() => {
    return session?.user?.role === 'DEVELOPER';
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
    setDrawerCollapsed(false);
    setShowPlaylist(false);
    setShouldAutoPlay(true);
    hasStartedPlayingRef.current = true;
    isFirstOpenRef.current = false;
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
            <i className="bi bi-question-circle-fill text-danger"></i>
            {t('menu.help', 'Help')}
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
        <title>{t('menu.help', 'Help') + ' | AIMS'}</title>
      </Head>

      {session?.user?.role === 'ADMIN' || session?.user?.role === 'DEVELOPER' ? (
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

      {/* ABSONS WebPlayer Bottom-Right Panel */}
      {showDrawer && activeVideo && (
        <div
          className={`absons-webplayer-drawer ${drawerCollapsed ? 'absons-webplayer-collapsed' : ''} ${!drawerCollapsed && showPlaylist ? 'absons-wp-with-playlist' : ''} ${isMaximized ? 'absons-wp-maximized' : ''} ${isCollapsedDown ? 'absons-wp-collapsed-down' : ''}`}
          style={{ direction: 'ltr' }}
        >
          {/* Left-edge slide tab — WebPlayer-style arrow to slide in/out */}
          <button
            className="absons-wp-edge-tab"
            onClick={toggleDrawerCollapsed}
            title={drawerCollapsed ? 'Open Player' : 'Close Player'}
          >
            <svg width="10" height="20" viewBox="0 0 10 20">
              {drawerCollapsed ? (
                <polygon points="10,2 0,10 10,18" fill="#ccc" />
              ) : (
                <polygon points="0,2 10,10 0,18" fill="#ccc" />
              )}
            </svg>
          </button>

          {/* Top Header Bar */}
          <div className="absons-wp-header">
            <div className="absons-wp-header-left">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#7B2BFC" style={{ marginRight: '5px' }}>
                <circle cx="12" cy="12" r="11" fill="#7B2BFC" />
                <polygon points="9,7 17,12 9,17" fill="#fff" />
              </svg>
              <span className="absons-wp-brand">ABSONS Webplayer</span>
            </div>
          </div>

          {/* Main Content: Video + Playlist */}
          <div className="absons-wp-main">
            {/* Video Area */}
            <div className="absons-wp-video-area">
              {isMounted && (
                <MediaPlayer
                  ref={playerRef}
                  title={currentLocale === 'ur' ? activeVideo.titleUr : activeVideo.titleEn}
                  src={`youtube/${getYoutubeId(activeVideo.youtubeUrl)}`}
                  viewType="video"
                  streamType="on-demand"
                  autoplay={shouldAutoPlay}
                  playsInline
                  style={{ width: '100%', height: '100%' }}
                  onPlay={() => {
                    hasStartedPlayingRef.current = true;
                    setIsPlaying(true);
                  }}
                  onPause={() => {
                    setIsPlaying(false);
                  }}
                  onTimeUpdate={(detail) => {
                    const { currentTime } = detail;
                    if (activeVideo) {
                      videoProgressRef.current[activeVideo.id] = currentTime;
                    }
                  }}
                  onCanPlay={() => {
                    if (activeVideo && playerRef.current && !hasSeekedRef.current) {
                      const savedTime = videoProgressRef.current[activeVideo.id];
                      if (savedTime && savedTime > 2) {
                        playerRef.current.currentTime = savedTime;
                      }
                      hasSeekedRef.current = true;
                    }
                  }}
                >
                  <MediaProvider />
                  {/* smallLayoutWhen (true) pins vidstack to its small layout,
                      which has exactly one centered circular translucent
                      play/pause button. */}
                  <DefaultVideoLayout icons={defaultLayoutIcons} smallLayoutWhen />
                </MediaPlayer>
              )}
            </div>

            {/* Playlist Panel */}
            {showPlaylist && (
              <div className="absons-wp-playlist">
                <div className="absons-wp-playlist-header">
                  <span className="absons-wp-playlist-title">
                    {t('auto.playlist', 'PLAYLIST')} ({filteredVideos.length})
                  </span>
                  <button
                    className="absons-wp-playlist-close"
                    onClick={() => setShowPlaylist(false)}
                  >
                    Close <i className="bi bi-x-circle-fill" style={{ fontSize: '0.85rem', marginLeft: '4px' }}></i>
                  </button>
                </div>
                <div className="absons-wp-playlist-items">
                  {filteredVideos.map((video, index) => {
                    const isActive = video.id === activeVideo.id;
                    const vTitle = currentLocale === 'ur' ? video.titleUr : video.titleEn;
                    return (
                      <div
                        key={video.id}
                        className={`absons-wp-playlist-item ${isActive ? 'absons-wp-playlist-item-active' : ''}`}
                        onClick={() => {
                          if (!isActive) {
                            setActiveVideo(video);
                            setDrawerCollapsed(false);
                            hasStartedPlayingRef.current = true;
                            setShouldAutoPlay(true);
                          }
                        }}
                      >
                        <span className="absons-wp-playlist-num">{index + 1}.</span>
                        <span className="absons-wp-playlist-item-title">{vTitle}</span>
                        {isActive && (
                          <i className="bi bi-disc" style={{ fontSize: '0.7rem', color: '#aaa', marginLeft: 'auto', animation: 'absons-spin 2s linear infinite' }}></i>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Control Bar */}
          <div className="absons-wp-controls">
            <div className="absons-wp-controls-left">
              {/* Prev */}
              <button
                className="absons-wp-ctrl-btn"
                title="Previous"
                onClick={() => {
                  const idx = filteredVideos.findIndex(v => v.id === activeVideo.id);
                  if (idx > 0) {
                    setActiveVideo(filteredVideos[idx - 1]);
                    setDrawerCollapsed(false);
                    hasStartedPlayingRef.current = true;
                    setShouldAutoPlay(true);
                  }
                }}
              >
                <i className="bi bi-skip-start-fill"></i>
              </button>
              {/* Play/Pause */}
              <button
                className="absons-wp-ctrl-btn"
                title="Play/Pause"
                onClick={() => {
                  if (playerRef.current) {
                    if (playerRef.current.paused) {
                      safePlay();
                    } else {
                      safePause();
                    }
                  }
                }}
              >
                {isPlaying ? (
                  <i className="bi bi-pause-fill"></i>
                ) : (
                  <i className="bi bi-play-fill"></i>
                )}
              </button>
              {/* Next */}
              <button
                className="absons-wp-ctrl-btn"
                title="Next"
                onClick={() => {
                  const idx = filteredVideos.findIndex(v => v.id === activeVideo.id);
                  if (idx < filteredVideos.length - 1) {
                    setActiveVideo(filteredVideos[idx + 1]);
                    setDrawerCollapsed(false);
                    hasStartedPlayingRef.current = true;
                    setShouldAutoPlay(true);
                  }
                }}
              >
                <i className="bi bi-skip-end-fill"></i>
              </button>
            </div>

            <div className="absons-wp-controls-center">
              <span className="absons-wp-now-playing">
                {currentLocale === 'ur' ? activeVideo.titleUr : activeVideo.titleEn}
              </span>
            </div>

            <div className="absons-wp-controls-right">
              {/* Volume Controls */}
              <div className="absons-wp-vol-container">
                <button
                  className="absons-wp-ctrl-btn"
                  title={muted ? 'Unmute' : 'Mute'}
                  onClick={() => {
                    if (playerRef.current) {
                      playerRef.current.muted = !playerRef.current.muted;
                    }
                  }}
                >
                  {muted || volume === 0 ? (
                    <i className="bi bi-volume-mute-fill"></i>
                  ) : volume > 0.5 ? (
                    <i className="bi bi-volume-up-fill"></i>
                  ) : (
                    <i className="bi bi-volume-down-fill"></i>
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  className="absons-wp-vol-slider"
                  value={muted ? 0 : volume}
                  onChange={(e) => {
                    if (playerRef.current) {
                      playerRef.current.volume = parseFloat(e.target.value);
                      playerRef.current.muted = false;
                    }
                  }}
                  title={`Volume: ${Math.round((muted ? 0 : volume) * 100)}%`}
                />
              </div>

              {/* Open in YouTube */}
              {getYoutubeId(activeVideo.youtubeUrl) && (
                <a
                  href={activeVideo.youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absons-wp-ctrl-btn absons-wp-yt-btn"
                  title={t('auto.openInYouTube', 'Open in YouTube')}
                  onClick={(e) => e.stopPropagation()}
                >
                  <i className="bi bi-youtube"></i>
                </a>
              )}
              {/* Playlist toggle */}
              <button
                className="absons-wp-ctrl-btn"
                title="Playlist"
                onClick={() => setShowPlaylist(!showPlaylist)}
              >
                <i className="bi bi-list-ul"></i>
              </button>
              {/* Collapse Down / Expand Up Button */}
              <button
                className="absons-wp-ctrl-btn"
                title={isCollapsedDown ? 'Expand Player' : 'Collapse Player'}
                onClick={() => {
                  const nextVal = !isCollapsedDown;
                  setIsCollapsedDown(nextVal);
                  if (nextVal) {
                    setIsMaximized(false);
                  }
                }}
              >
                <i className={`bi ${isCollapsedDown ? 'bi-chevron-up' : 'bi-chevron-down'}`}></i>
              </button>
              {/* Maximize Button */}
              <button
                className="absons-wp-ctrl-btn"
                title={isMaximized ? 'Restore Size' : 'Maximize'}
                onClick={() => {
                  const nextVal = !isMaximized;
                  setIsMaximized(nextVal);
                  if (nextVal) {
                    setIsCollapsedDown(false);
                  }
                }}
              >
                <i className={`bi ${isMaximized ? 'bi-arrows-angle-contract' : 'bi-arrows-angle-expand'}`}></i>
              </button>
            </div>
          </div>
        </div>
      )}

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

        /* ====== Vidstack Player Overrides ====== */
        [data-media-player] {
          --media-focus-ring: none !important;
          --media-focus-ring-color: transparent !important;
        }
        /* 1) Keep the video area pure black until playback starts.
           YouTube's iframe in its unstarted state is what renders the native
           red play button — hiding the iframe until [data-started] means the
           red button can never be seen, and no thumbnail preview shows.
           vidstack resets data-started on every src change, so switching
           videos in the playlist goes back to black automatically. */
        .absons-wp-video-area [data-media-player]:not([data-started]) iframe.vds-youtube {
          opacity: 0 !important;
        }

        /* 2) Remove the keyboard-action bezel — the rounded-SQUARE badge
           vidstack flashes in the center with a play/pause icon. This was
           the second centered button. */
        .absons-wp-video-area .vds-kb-action {
          display: none !important;
        }

        /* 3) Hard-enforce the single centered play/pause button as circular
           translucent (vidstack styles it via zero-specificity :where()
           rules, so any global stylesheet can accidentally square it). */
        .absons-wp-video-area .vds-video-layout[data-sm] .vds-controls .vds-play-button {
          border-radius: 50% !important;
          background-color: rgba(0, 0, 0, 0.6) !important;
        }

        /* ====== WebPlayer-Style Floating Panel (Bottom-Right) ====== */
        .absons-webplayer-drawer {
          position: fixed;
          bottom: 0;
          right: 0;
          z-index: 1060;
          --player-width: 50vw;
          --playlist-width: 25vw;
          width: var(--player-width) !important;
          min-width: 320px;
          max-width: 95vw;
          display: flex;
          flex-direction: column;
          background: #1a1a1a;
          box-shadow: 0 -2px 20px rgba(0,0,0,0.45), -4px 0 12px rgba(0,0,0,0.25);
          border-top-left-radius: 5px;
          border-left: 1px solid #444;
          border-top: 1px solid #444;
          overflow: visible;
          transition: transform 0.3s ease, width 0.3s ease;
          transform: translateX(0);
        }
        .absons-webplayer-drawer.absons-wp-with-playlist {
          width: calc(var(--player-width) + var(--playlist-width)) !important;
        }
        /* Collapsed: slide off-screen to the right, only the edge tab remains visible */
        .absons-webplayer-collapsed {
          transform: translateX(100%);
        }

        /* Maximized states (viewport-filling) */
        .absons-webplayer-drawer.absons-wp-maximized {
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          width: 100vw !important;
          height: 100vh !important;
          max-width: 100vw !important;
          max-height: 100vh !important;
          border-radius: 0 !important;
          border: none !important;
          z-index: 1070 !important;
          transform: none !important;
          transition: none !important;
        }
        .absons-webplayer-drawer.absons-wp-maximized .absons-wp-main {
          flex: 1 !important;
          height: auto !important;
        }
        .absons-webplayer-drawer.absons-wp-maximized .absons-wp-video-area {
          width: auto !important;
          flex: 1 !important;
        }
        .absons-webplayer-drawer.absons-wp-maximized .absons-wp-playlist {
          width: 300px !important;
          height: 100% !important;
        }
        .absons-webplayer-drawer.absons-wp-maximized .absons-wp-edge-tab {
          display: none !important;
        }

        /* Collapsed down audio-only mode styles */
        .absons-webplayer-drawer.absons-wp-collapsed-down {
          height: 45px !important;
          min-height: 45px !important;
          border-top-left-radius: 5px !important;
          box-shadow: 0 -2px 10px rgba(0,0,0,0.3) !important;
        }
        .absons-webplayer-drawer.absons-wp-collapsed-down .absons-wp-header,
        .absons-webplayer-drawer.absons-wp-collapsed-down .absons-wp-main {
          display: none !important;
        }

        /* Left-edge slide tab — arrow to slide panel in/out */
        .absons-wp-edge-tab {
          position: absolute;
          left: -22px;
          bottom: 0; /* Aligned exactly at the bottom */
          width: 22px;
          height: 45px;
          background: linear-gradient(to bottom, #6b6b6b, #3c3c3c); /* Sleek vertical gradient contrasting with player */
          border: 1px solid #777; /* Premium light grey border outline */
          border-right: none;
          border-radius: 5px 0 0 5px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          box-shadow: -2px 0 8px rgba(0, 0, 0, 0.3);
          transition: background 0.2s ease, border-color 0.2s ease;
          z-index: 1;
        }
        .absons-wp-edge-tab:hover {
          background: linear-gradient(to bottom, #7a7a7a, #4a4a4a);
          border-color: #888;
        }
        .absons-wp-edge-tab svg polygon {
          fill: #eaeaea; /* Light grey arrow fill */
          transition: fill 0.2s ease;
        }
        .absons-wp-edge-tab:hover svg polygon {
          fill: #ffffff; /* Brighter white arrow on hover */
        }

        /* Header bar */
        .absons-wp-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 3px 10px;
          background: #222;
          border-bottom: 1px solid #333;
          min-height: 26px;
          flex-shrink: 0;
        }
        .absons-wp-header-left {
          display: flex;
          align-items: center;
        }
        .absons-wp-brand {
          color: #bbb;
          font-size: 0.72rem;
          font-weight: 500;
          letter-spacing: 0.5px;
        }

        /* Main content area: video left, playlist right */
        .absons-wp-main {
          display: flex;
          flex-shrink: 0;
          overflow: hidden;
          height: calc(var(--player-width) * 9 / 16);
        }

        /* Video area — fills drawer width, height from aspect-ratio */
        .absons-wp-video-area {
          width: var(--player-width) !important;
          height: 100%;
          background: #000;
          position: relative;
          flex-shrink: 0;
        }
        .absons-wp-video-area [data-media-player] {
          width: 100% !important;
          height: 100% !important;
        }
        /* Playlist panel — right side, light background */
        .absons-wp-playlist {
          width: var(--playlist-width) !important;
          display: flex;
          flex-direction: column;
          background: #f5f5f5;
          border-left: 1px solid #ddd;
          height: 100%;
          flex-shrink: 0;
        }
        .absons-wp-playlist-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 7px 12px;
          background: #eee;
          border-bottom: 1px solid #ddd;
          flex-shrink: 0;
        }
        .absons-wp-playlist-title {
          font-size: 0.82rem;
          font-weight: 700;
          color: #333;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .absons-wp-playlist-close {
          background: none;
          border: none;
          color: #666;
          font-size: 0.78rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 3px;
          padding: 2px 6px;
          border-radius: 3px;
          transition: background 0.15s;
        }
        .absons-wp-playlist-close:hover {
          background: rgba(0,0,0,0.08);
          color: #333;
        }
        .absons-wp-playlist-items {
          flex: 1;
          overflow-y: auto;
          padding: 2px 0;
        }
        .absons-wp-playlist-item {
          display: flex;
          align-items: center;
          padding: 6px 12px;
          cursor: pointer;
          transition: background 0.15s;
          gap: 6px;
          border-bottom: 1px solid rgba(0,0,0,0.05);
        }
        .absons-wp-playlist-item:hover {
          background: rgba(0,0,0,0.06);
        }
        .absons-wp-playlist-item-active {
          background: #dce7f5 !important;
          font-weight: 600;
        }
        .absons-wp-playlist-num {
          color: #999;
          font-size: 0.78rem;
          min-width: 20px;
          flex-shrink: 0;
        }
        .absons-wp-playlist-item-title {
          font-size: 0.8rem;
          color: #333;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          flex: 1;
          min-width: 0;
        }
        .absons-wp-playlist-item-active .absons-wp-playlist-item-title {
          color: #1a1a1a;
        }

        /* Volume controls container & sleek expanding slider range */
        .absons-wp-vol-container {
          display: flex;
          align-items: center;
          gap: 2px;
          margin-right: 4px;
        }
        .absons-wp-vol-slider {
          width: 50px;
          height: 3px;
          background: #555;
          outline: none;
          border-radius: 2px;
          cursor: pointer;
          accent-color: #7B2BFC;
          transition: width 0.15s ease;
          border: none;
          -webkit-appearance: none;
        }
        .absons-wp-vol-slider::-webkit-slider-runnable-track {
          background: transparent;
        }
        .absons-wp-vol-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #fff;
          cursor: pointer;
          margin-top: -2.5px;
        }
        .absons-wp-vol-container:hover .absons-wp-vol-slider {
          width: 70px;
        }

        /* Bottom control bar */
        .absons-wp-controls {
          display: flex;
          align-items: center;
          padding: 0 8px;
          background: #222;
          border-top: 1px solid #333;
          min-height: 45px;
          flex-shrink: 0;
          gap: 2px;
        }
        .absons-wp-controls-left {
          display: flex;
          align-items: center;
          gap: 1px;
          flex-shrink: 0;
        }
        .absons-wp-controls-center {
          flex: 1;
          min-width: 0;
          display: flex;
          align-items: center;
          padding: 0 8px;
        }
        .absons-wp-controls-right {
          display: flex;
          align-items: center;
          gap: 1px;
          flex-shrink: 0;
        }
        .absons-wp-ctrl-btn {
          background: none;
          border: none;
          color: #ccc;
          font-size: 1rem;
          padding: 4px 6px;
          cursor: pointer;
          border-radius: 3px;
          transition: color 0.15s, background 0.15s;
          display: flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
        }
        .absons-wp-ctrl-btn:hover {
          color: #fff;
          background: rgba(255,255,255,0.1);
        }
        .absons-wp-yt-btn {
          color: #ff4444;
        }
        .absons-wp-yt-btn:hover {
          color: #ff0000;
          background: rgba(255,0,0,0.1);
        }
        .absons-wp-now-playing {
          color: #ccc;
          font-size: 0.78rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        @keyframes absons-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* Responsive */
        @media (max-width: 768px) {
          .absons-webplayer-drawer {
            --player-width: 60vw;
            --playlist-width: 35vw;
            min-width: 280px;
          }
          .absons-wp-main {
            flex-direction: row;
            height: calc(var(--player-width) * 9 / 16);
          }
          .absons-wp-video-area {
            width: var(--player-width) !important;
            height: 100% !important;
          }
          .absons-wp-playlist {
            width: var(--playlist-width) !important;
            height: 100% !important;
            border-left: 1px solid #ddd;
            border-top: none;
          }
        }
        @media (max-width: 480px) {
          .absons-webplayer-drawer {
            --player-width: 100vw;
            --playlist-width: 100vw;
            max-width: 100vw;
            border-top-left-radius: 0;
            border-left: none;
          }
          .absons-webplayer-drawer.absons-wp-with-playlist {
            width: 100vw !important;
          }
          .absons-wp-main {
            flex-direction: column;
            height: calc(var(--player-width) * 9 / 16 + 140px);
          }
          .absons-wp-with-playlist .absons-wp-video-area {
            height: calc(var(--player-width) * 9 / 16) !important;
            width: 100% !important;
          }
          .absons-wp-playlist {
            width: 100% !important;
            height: 140px !important;
          }
          .absons-wp-edge-tab {
            display: none;
          }
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
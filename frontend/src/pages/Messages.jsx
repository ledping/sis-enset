import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Archive,
  Camera,
  Check,
  CheckCheck,
  Download,
  File as FileIcon,
  FileAudio,
  FileImage,
  FileText,
  Image as ImageIcon,
  MessageCircle,
  Mic,
  MicOff,
  Phone,
  PhoneCall,
  PhoneOff,
  Paperclip,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Send,
  Smile,
  Square,
  Video,
  VideoOff,
  Trash2,
  X,
} from 'lucide-react';
import api from '../api';
import Spinner from '../components/Spinner';
import '../messages-whatsapp.css';

const MAX_ATTACHMENTS = 5;
const ACCEPTS = {
  documents: '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt',
  images: '.jpg,.jpeg,.png,.webp,.gif',
  audios: '.webm,.mp3,.wav,.ogg,.m4a,.mp4',
  archives: '.zip,.rar,.7z',
};
const EMOJI_GROUPS = [
  ['😀', '😁', '😂', '🤣', '😊', '😍', '😘', '😎', '😢', '😡', '😅', '😇'],
  ['👍', '👎', '👏', '🙏', '🤝', '💪', '✍️', '👌', '🙌', '🤔', '😴', '🤩'],
  ['🎓', '📚', '📌', '💡', '✅', '⚠️', '📎', '📄', '📢', '🔥', '❤️', '⭐'],
];

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}');
  } catch {
    return {};
  }
}

function asList(payload) {
  return payload?.results || payload || [];
}

function displayName(user) {
  if (!user) return 'Utilisateur';
  return user.nom_complet || user.username || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Utilisateur';
}

function initials(user) {
  const name = displayName(user);
  return name.split(' ').filter(Boolean).slice(0, 2).map((item) => item[0]?.toUpperCase()).join('') || 'U';
}

function avatarUrl(user) {
  return user?.photo_url || user?.photo || '';
}

function userIdFromMessage(message, field) {
  if (field === 'expediteur') return String(message.expediteur_detail?.id || message.expediteur || '');
  return String(message.destinataire_detail?.id || message.destinataire || '');
}

const DOUALA_TIME_ZONE = 'Africa/Douala';

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatTime(value) {
  const date = parseDate(value);
  if (!date) return '';
  return new Intl.DateTimeFormat('fr-CM', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: DOUALA_TIME_ZONE,
  }).format(date);
}

function formatFullDate(value) {
  const date = parseDate(value);
  if (!date) return '';
  return new Intl.DateTimeFormat('fr-CM', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: DOUALA_TIME_ZONE,
  }).format(date);
}

function formatDateTime(value) {
  const date = parseDate(value);
  if (!date) return '';
  return `${formatFullDate(date)} à ${formatTime(date)}`;
}

function localDayKey(value) {
  const date = parseDate(value);
  if (!date) return '';
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: DOUALA_TIME_ZONE,
  }).format(date);
}

function presenceLabel(value) {
  const date = parseDate(value);
  if (!date) return 'Aucune activité récente';
  const today = localDayKey(new Date());
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = localDayKey(yesterdayDate);
  const target = localDayKey(date);
  const time = formatTime(date);
  if (target === today) return `Vu aujourd’hui à ${time}`;
  if (target === yesterday) return `Vu hier à ${time}`;
  return `Vu le ${formatFullDate(date)} à ${time}`;
}

function contactPresence(contact) {
  if (!contact) return 'Utilisateur SIS ENSET';
  if (contact.en_ligne) return 'En ligne maintenant';
  if (contact.dernier_acces) return presenceLabel(contact.dernier_acces);
  return contact.role || 'Aucune activité récente';
}

function formatFileSize(bytes = 0) {
  if (!bytes) return '0 Ko';
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function isAudioAttachment(piece) {
  const extension = piece.extension?.toLowerCase();
  return piece.est_vocal || piece.type_fichier?.startsWith('audio/') || ['.webm', '.mp3', '.wav', '.ogg', '.m4a', '.mp4'].includes(extension);
}

function isImageAttachment(piece) {
  const extension = piece.extension?.toLowerCase();
  return piece.type_fichier?.startsWith('image/') || ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(extension);
}

function messagePreview(message) {
  if (!message) return '';
  if (message.contenu) return message.contenu;
  const hasAudio = message.pieces_jointes?.some((piece) => isAudioAttachment(piece));
  if (hasAudio) return '🎤 Message vocal';
  if (message.nombre_pieces_jointes || message.pieces_jointes?.length) return '📎 Pièce jointe';
  return '';
}

function getSupportedAudioType() {
  if (!window.MediaRecorder) return { mimeType: '', extension: 'webm' };
  const candidates = [
    { mimeType: 'audio/webm;codecs=opus', extension: 'webm' },
    { mimeType: 'audio/webm', extension: 'webm' },
    { mimeType: 'audio/ogg;codecs=opus', extension: 'ogg' },
    { mimeType: 'audio/mp4', extension: 'm4a' },
  ];
  return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate.mimeType)) || { mimeType: '', extension: 'webm' };
}

function Avatar({ user }) {
  const photo = avatarUrl(user);
  const statusClass = user?.en_ligne ? ' online' : '';
  return (
    <span className={`chat-avatar-wrap${statusClass}`}>
      {photo ? <img className="chat-avatar" src={photo} alt="" /> : <div className="chat-avatar chat-avatar-fallback">{initials(user)}</div>}
    </span>
  );
}

function AttachmentPreview({ file, onRemove }) {
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : ''), [file]);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const isAudio = file?.type?.startsWith('audio/');
  const isImage = file?.type?.startsWith('image/');

  return (
    <div className={`chat-attachment-chip ${isAudio ? 'voice' : ''}`}>
      {isAudio ? <FileAudio size={16} /> : isImage ? <FileImage size={16} /> : <FileIcon size={16} />}
      <div className="chat-attachment-chip-main">
        <span>{file.name} · {formatFileSize(file.size)}</span>
        {isImage && previewUrl && <img className="chat-mini-image" src={previewUrl} alt="" />}
        {isAudio && previewUrl && <audio controls preload="metadata" src={previewUrl} />}
      </div>
      <button type="button" onClick={onRemove} aria-label="Retirer"><X size={14} /></button>
    </div>
  );
}

function VoiceRecorder({ recording, elapsed, voiceFile, voicePreviewUrl, onStart, onStop, onCancel }) {
  if (recording) {
    return (
      <div className="voice-composer recording">
        <span className="pulse-dot" />
        <strong>Enregistrement...</strong>
        <span className="voice-timer">{elapsed}s</span>
        <button type="button" className="danger" onClick={onStop}><Square size={16} /> Arrêter</button>
      </div>
    );
  }

  if (voiceFile && voicePreviewUrl) {
    return (
      <div className="voice-composer ready">
        <FileAudio size={18} />
        <div className="voice-preview-main">
          <strong>Vocal prêt à envoyer</strong>
          <audio controls preload="metadata" src={voicePreviewUrl} />
        </div>
        <button type="button" className="ghost" onClick={onCancel} title="Supprimer le vocal"><Trash2 size={16} /></button>
      </div>
    );
  }

  return (
    <button type="button" className="chat-mic-button" onClick={onStart} title="Enregistrer un vocal">
      <Mic size={22} />
    </button>
  );
}


function buildPeerConnection({ onRemoteStream, onIceCandidate, onConnectionState }) {
  const peer = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
  peer.onicecandidate = (event) => {
    if (event.candidate) onIceCandidate(event.candidate.toJSON());
  };
  peer.ontrack = (event) => {
    const [stream] = event.streams;
    if (stream) onRemoteStream(stream);
  };
  peer.onconnectionstatechange = () => onConnectionState(peer.connectionState);
  return peer;
}

function CallPanel({
  callState,
  selectedContact,
  currentUserId,
  localVideoRef,
  remoteVideoRef,
  remoteAudioRef,
  onStart,
  onAccept,
  onRefuse,
  onEnd,
  onToggleMute,
  onToggleVideo,
}) {
  const active = callState.visible && callState.appel;
  const contact = callState.contact || selectedContact;
  const incoming = callState.direction === 'incoming';
  const videoCall = callState.type_appel === 'video';

  return (
    <>
      <div className="chat-call-actions">
        <button type="button" onClick={() => onStart('audio')} title="Appel audio"><Phone size={20} /></button>
        <button type="button" onClick={() => onStart('video')} title="Appel vidéo"><Video size={20} /></button>
      </div>
      {active && (
        <div className="call-overlay" role="dialog" aria-modal="true">
          <div className={`call-card ${videoCall ? 'video' : 'audio'}`}>
            <div className="call-card-header">
              <Avatar user={contact} />
              <div>
                <span>{incoming && callState.status === 'ringing' ? 'Appel entrant' : callState.statusText}</span>
                <strong>{displayName(contact)}</strong>
                <small>{videoCall ? 'Vidéo interne SIS ENSET' : 'Audio interne SIS ENSET'}</small>
              </div>
            </div>

            <audio ref={remoteAudioRef} autoPlay playsInline className="call-remote-audio" />

            {videoCall ? (
              <div className="call-video-grid">
                <video ref={remoteVideoRef} autoPlay playsInline className="remote-video" />
                <video ref={localVideoRef} autoPlay muted playsInline className="local-video" />
              </div>
            ) : (
              <div className="call-audio-stage">
                <div className="call-avatar-large"><Avatar user={contact} /></div>
                <p>{callState.statusText}</p>
              </div>
            )}

            {incoming && callState.status === 'ringing' ? (
              <div className="call-controls incoming">
                <button type="button" className="danger" onClick={onRefuse}><PhoneOff size={20} /> Refuser</button>
                <button type="button" className="success" onClick={onAccept}><PhoneCall size={20} /> Accepter</button>
              </div>
            ) : (
              <div className="call-controls">
                <button type="button" onClick={onToggleMute} className={callState.muted ? 'active' : ''} title="Micro">
                  {callState.muted ? <MicOff size={20} /> : <Mic size={20} />}
                </button>
                {videoCall && (
                  <button type="button" onClick={onToggleVideo} className={callState.videoOff ? 'active' : ''} title="Caméra">
                    {callState.videoOff ? <VideoOff size={20} /> : <Video size={20} />}
                  </button>
                )}
                <button type="button" className="danger round" onClick={onEnd}><PhoneOff size={22} /></button>
              </div>
            )}
            <div className="call-note">
              Les appels WebRTC fonctionnent idéalement sur localhost ou HTTPS. Sur simple HTTP réseau, le navigateur peut limiter micro/caméra.
            </div>
            <span className="call-user-id">Session utilisateur : {currentUserId}</span>
          </div>
        </div>
      )}
    </>
  );
}

export default function Messages() {
  const currentUser = useMemo(() => getCurrentUser(), []);
  const currentUserId = String(currentUser?.id || '');
  const [messages, setMessages] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [selectedContactId, setSelectedContactId] = useState('');
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [sidebarMode, setSidebarMode] = useState('discussions');
  const [reloadKey, setReloadKey] = useState(0);
  const [attachments, setAttachments] = useState([]);
  const [voiceFile, setVoiceFile] = useState(null);
  const [voicePreviewUrl, setVoicePreviewUrl] = useState('');
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [sending, setSending] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraStreamReady, setCameraStreamReady] = useState(false);
  const [cameraFacing, setCameraFacing] = useState('environment');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const documentInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const audioInputRef = useRef(null);
  const archiveInputRef = useRef(null);
  const cameraVideoRef = useRef(null);
  const cameraCanvasRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const audioChunksRef = useRef([]);
  const cameraStreamRef = useRef(null);
  const bottomRef = useRef(null);
  const draftInputRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const callPeerRef = useRef(null);
  const callLocalStreamRef = useRef(null);
  const callRemoteStreamRef = useRef(null);
  const activeCallRef = useRef(null);
  const makingOfferRef = useRef(false);
  const audioContextRef = useRef(null);
  const incomingRingtoneRef = useRef(null);
  const outgoingRingtoneRef = useRef(null);
  const firstMessageLoadRef = useRef(true);
  const lastMessageSoundAtRef = useRef(0);
  const [callState, setCallState] = useState({
    visible: false,
    appel: null,
    contact: null,
    direction: '',
    type_appel: 'audio',
    status: 'idle',
    statusText: '',
    muted: false,
    videoOff: false,
  });

  useEffect(() => () => {
    if (voicePreviewUrl) URL.revokeObjectURL(voicePreviewUrl);
  }, [voicePreviewUrl]);

  useEffect(() => {
    let ignore = false;
    api.get('/messages/contacts/')
      .then((response) => { if (!ignore) setContacts(asList(response.data)); })
      .catch(() => { if (!ignore) setNotice('Impossible de charger les contacts.'); });
    return () => { ignore = true; };
  }, []);

  useEffect(() => {
    if (!recording) return undefined;
    const timer = window.setInterval(() => {
      setElapsed((value) => value + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [recording]);

  const ensureAudioContext = async () => {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!audioContextRef.current) audioContextRef.current = new AudioContextClass();
    if (audioContextRef.current.state === 'suspended') {
      try { await audioContextRef.current.resume(); } catch { /* le navigateur peut encore bloquer le son */ }
    }
    return audioContextRef.current;
  };

  const playTone = async (frequency, duration = 0.12, volume = 0.08, delay = 0) => {
    const context = await ensureAudioContext();
    if (!context) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const startAt = context.currentTime + delay;
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, startAt);
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(startAt);
    oscillator.stop(startAt + duration + 0.04);
  };

  const playMessageSound = () => {
    const now = Date.now();
    if (now - lastMessageSoundAtRef.current < 1200) return;
    lastMessageSoundAtRef.current = now;
    void playTone(880, 0.08, 0.06, 0);
    void playTone(1174, 0.09, 0.05, 0.12);
    if (navigator.vibrate) navigator.vibrate(80);
  };

  const playRingPattern = () => {
    void playTone(740, 0.16, 0.07, 0);
    void playTone(930, 0.16, 0.06, 0.22);
    void playTone(740, 0.16, 0.07, 0.44);
  };

  const startIncomingRingtone = () => {
    if (incomingRingtoneRef.current) return;
    playRingPattern();
    if (navigator.vibrate) navigator.vibrate([260, 120, 260]);
    incomingRingtoneRef.current = window.setInterval(() => {
      playRingPattern();
      if (navigator.vibrate) navigator.vibrate([260, 120, 260]);
    }, 1600);
  };

  const stopIncomingRingtone = () => {
    if (incomingRingtoneRef.current) {
      window.clearInterval(incomingRingtoneRef.current);
      incomingRingtoneRef.current = null;
    }
  };

  const startOutgoingTone = () => {
    if (outgoingRingtoneRef.current) return;
    const ringOut = () => { void playTone(520, 0.12, 0.045, 0); };
    ringOut();
    outgoingRingtoneRef.current = window.setInterval(ringOut, 1800);
  };

  const stopOutgoingTone = () => {
    if (outgoingRingtoneRef.current) {
      window.clearInterval(outgoingRingtoneRef.current);
      outgoingRingtoneRef.current = null;
    }
  };

  const stopAllCallSounds = () => {
    stopIncomingRingtone();
    stopOutgoingTone();
  };

  useEffect(() => {
    let cancelled = false;

    const fetchMessages = async ({ silent = false } = {}) => {
      try {
        const response = await api.get('/messages/', { params: { box: 'all' } });
        const nextMessages = asList(response.data);
        if (cancelled) return;

        setMessages((currentMessages) => {
          const knownIds = new Set(currentMessages.map((item) => String(item.id)));
          const hasNewIncoming = nextMessages.some((item) => (
            !knownIds.has(String(item.id)) && userIdFromMessage(item, 'expediteur') !== currentUserId
          ));
          if (!firstMessageLoadRef.current && hasNewIncoming) {
            playMessageSound();
            window.dispatchEvent(new Event('sis:messages-updated'));
            window.dispatchEvent(new Event('sis:notifications-updated'));
          }
          firstMessageLoadRef.current = false;
          return nextMessages;
        });
        setLoading(false);
      } catch {
        if (!cancelled && !silent) setNotice('Impossible de charger les messages.');
        if (!cancelled) setLoading(false);
      }
    };

    const first = window.setTimeout(() => { void fetchMessages(); }, 0);
    const timer = window.setInterval(() => { void fetchMessages({ silent: true }); }, 2200);
    const refreshNow = () => { void fetchMessages({ silent: true }); };
    window.addEventListener('sis:force-messages-refresh', refreshNow);

    return () => {
      cancelled = true;
      window.clearTimeout(first);
      window.clearInterval(timer);
      window.removeEventListener('sis:force-messages-refresh', refreshNow);
    };
    // Polling leger: les sons et compteurs utilisent des refs pour eviter de relancer l'intervalle a chaque rendu.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId, reloadKey]);

  useEffect(() => {
    const unlock = () => { void ensureAudioContext(); };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    // L'audio est initialisé après la première interaction utilisateur pour respecter les règles du navigateur.
  }, []);

  const contactById = useMemo(() => {
    const map = new Map();
    contacts.forEach((contact) => map.set(String(contact.id), contact));
    return map;
  }, [contacts]);

  const conversations = useMemo(() => {
    const map = new Map();
    messages.forEach((item) => {
      const senderId = userIdFromMessage(item, 'expediteur');
      const receiverId = userIdFromMessage(item, 'destinataire');
      const other = senderId === currentUserId ? item.destinataire_detail : item.expediteur_detail;
      const otherId = String(other?.id || (senderId === currentUserId ? receiverId : senderId));
      if (!otherId) return;
      const previous = map.get(otherId);
      const unreadIncrement = senderId !== currentUserId && !item.lu ? 1 : 0;
      const lastTime = new Date(item.created_at).getTime();
      const previousTime = previous?.lastMessage ? new Date(previous.lastMessage.created_at).getTime() : 0;
      map.set(otherId, {
        contact: contactById.get(otherId) || other,
        lastMessage: !previous || lastTime > previousTime ? item : previous.lastMessage,
        unread: (previous?.unread || 0) + unreadIncrement,
      });
    });
    contacts.forEach((contact) => {
      const key = String(contact.id);
      if (!map.has(key)) map.set(key, { contact, lastMessage: null, unread: 0 });
    });
    return Array.from(map.entries())
      .map(([id, value]) => ({ id, ...value }))
      .filter((item) => {
        const text = `${displayName(item.contact)} ${messagePreview(item.lastMessage)} ${item.contact?.role || ''}`.toLowerCase();
        const matchesSearch = text.includes(search.trim().toLowerCase());
        const matchesFilter = filter === 'unread' ? item.unread > 0 : true;
        return matchesSearch && matchesFilter;
      })
      .sort((a, b) => {
        const at = a.lastMessage ? new Date(a.lastMessage.created_at).getTime() : 0;
        const bt = b.lastMessage ? new Date(b.lastMessage.created_at).getTime() : 0;
        return bt - at;
      });
  }, [contactById, contacts, currentUserId, filter, messages, search]);

  const contactDirectory = useMemo(() => contacts
    .filter((contact) => {
      const text = `${displayName(contact)} ${contact.role || ''} ${contact.username || ''} ${contact.email || ''}`.toLowerCase();
      return text.includes(search.trim().toLowerCase());
    })
    .map((contact) => ({
      id: String(contact.id),
      contact,
      lastMessage: null,
      unread: 0,
      directory: true,
    }))
    .sort((a, b) => Number(Boolean(b.contact?.en_ligne)) - Number(Boolean(a.contact?.en_ligne)) || displayName(a.contact).localeCompare(displayName(b.contact))), [contacts, search]);

  const sidebarItems = sidebarMode === 'contacts' ? contactDirectory : conversations;

  const selectedConversation = conversations.find((item) => item.id === selectedContactId) || null;
  const selectedContact = selectedConversation?.contact || contactById.get(selectedContactId) || null;

  const conversationMessages = useMemo(() => messages
    .filter((item) => {
      if (!selectedContactId) return false;
      const senderId = userIdFromMessage(item, 'expediteur');
      const receiverId = userIdFromMessage(item, 'destinataire');
      return (senderId === selectedContactId && receiverId === currentUserId) || (senderId === currentUserId && receiverId === selectedContactId);
    })
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()), [currentUserId, messages, selectedContactId]);

  const unreadTotal = useMemo(() => conversations.reduce((total, item) => total + item.unread, 0), [conversations]);

  useEffect(() => {
    if (!selectedContactId) return undefined;
    const unreadIds = conversationMessages
      .filter((item) => userIdFromMessage(item, 'expediteur') === selectedContactId && !item.lu)
      .map((item) => item.id);
    if (!unreadIds.length) return undefined;

    const timer = window.setTimeout(() => {
      setMessages((current) => current.map((item) => (unreadIds.includes(item.id) ? { ...item, lu: true } : item)));
      api.post(`/messages/conversations/${selectedContactId}/read/`)
        .then(() => {
          window.dispatchEvent(new Event('sis:messages-updated'));
          window.dispatchEvent(new Event('sis:notifications-updated'));
          window.setTimeout(() => {
            window.dispatchEvent(new Event('sis:messages-updated'));
            window.dispatchEvent(new Event('sis:notifications-updated'));
          }, 300);
        })
        .catch(() => {
          setReloadKey((current) => current + 1);
        });
    }, 250);

    return () => window.clearTimeout(timer);
  }, [conversationMessages, selectedContactId]);

  useEffect(() => {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [conversationMessages.length, selectedContactId]);

  const selectConversation = (id) => {
    setSelectedContactId(id);
    setNotice('');
    setShowAttachMenu(false);
    setShowEmojiPicker(false);
  };

  const addFiles = (files, kind = 'pieces_jointes') => {
    const selectedFiles = Array.from(files || []);
    if (!selectedFiles.length) return;
    const tagged = selectedFiles.map((file) => ({ file, kind }));
    const nextFiles = [...attachments, ...tagged].slice(0, MAX_ATTACHMENTS);
    setAttachments(nextFiles);
    if (selectedFiles.length + attachments.length > MAX_ATTACHMENTS) {
      setNotice(`Maximum ${MAX_ATTACHMENTS} fichiers par message.`);
    } else {
      setNotice('');
    }
    setShowAttachMenu(false);
  };


  const attachCameraStream = useCallback(() => {
    const video = cameraVideoRef.current;
    const stream = cameraStreamRef.current;
    if (!video || !stream) return;
    if (video.srcObject !== stream) video.srcObject = stream;
    const playPromise = video.play?.();
    if (playPromise?.catch) playPromise.catch(() => {});
  }, []);

  useEffect(() => {
    if (cameraOpen && cameraStreamReady) attachCameraStream();
  }, [attachCameraStream, cameraOpen, cameraStreamReady]);

  const stopCameraCapture = () => {
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;
    setCameraStreamReady(false);
    if (cameraVideoRef.current) cameraVideoRef.current.srcObject = null;
  };

  const openCameraCapture = async (facing = cameraFacing) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setNotice("Ce navigateur ne supporte pas la prise de photo directe.");
      return;
    }
    try {
      setShowAttachMenu(false);
      stopCameraCapture();
      setCameraOpen(true);
      setCameraFacing(facing);
      setNotice('Ouverture de la caméra...');
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }
      cameraStreamRef.current = stream;
      setCameraStreamReady(true);
      window.setTimeout(attachCameraStream, 80);
      setNotice(facing === 'user' ? 'Caméra avant prête. Cadre la photo puis capture.' : 'Caméra arrière prête. Cadre la photo puis capture.');
    } catch {
      stopCameraCapture();
      setCameraOpen(false);
      setNotice("Caméra inaccessible. Autorise la caméra ou utilise l'option Image pour choisir une photo.");
    }
  };

  const switchCameraFacing = () => {
    const nextFacing = cameraFacing === 'user' ? 'environment' : 'user';
    void openCameraCapture(nextFacing);
  };

  const closeCameraCapture = () => {
    stopCameraCapture();
    setCameraOpen(false);
    setNotice('');
  };

  const capturePhoto = () => {
    const video = cameraVideoRef.current;
    const canvas = cameraCanvasRef.current;
    if (!video || !canvas || !cameraStreamReady) {
      setNotice('La caméra n’est pas encore prête. Patiente une seconde puis réessaie.');
      return;
    }
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    if (!width || !height) {
      setNotice('Image caméra indisponible. Réessaie ou choisis une photo depuis ton téléphone.');
      return;
    }
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, width, height);
    canvas.toBlob((blob) => {
      if (!blob) {
        setNotice('Impossible de générer la photo. Réessaie.');
        return;
      }
      const file = new File([blob], `photo_message_${Date.now()}.jpg`, { type: 'image/jpeg' });
      addFiles([file], 'images');
      closeCameraCapture();
      setNotice('Photo prête à envoyer. Ajoute un message si besoin puis clique sur envoyer.');
    }, 'image/jpeg', 0.9);
  };

  const removeAttachment = (index) => {
    setAttachments((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const insertEmoji = (emoji) => {
    const input = draftInputRef.current;
    const start = input?.selectionStart ?? draft.length;
    const end = input?.selectionEnd ?? draft.length;
    const next = `${draft.slice(0, start)}${emoji}${draft.slice(end)}`;
    setDraft(next);
    setShowEmojiPicker(false);
    window.setTimeout(() => {
      draftInputRef.current?.focus();
      draftInputRef.current?.setSelectionRange(start + emoji.length, start + emoji.length);
    }, 0);
  };

  const stopMediaTracks = () => {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
  };

  const resetRecorder = () => {
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
    setRecording(false);
    stopMediaTracks();
  };

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setNotice("Ce navigateur ne supporte pas l'enregistrement vocal.");
      return;
    }
    try {
      setNotice('Autorisation du micro...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      const supported = getSupportedAudioType();
      const recorder = supported.mimeType ? new MediaRecorder(stream, { mimeType: supported.mimeType }) : new MediaRecorder(stream);
      audioChunksRef.current = [];
      mediaStreamRef.current = stream;
      mediaRecorderRef.current = recorder;
      setVoiceFile(null);
      if (voicePreviewUrl) URL.revokeObjectURL(voicePreviewUrl);
      setVoicePreviewUrl('');

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      recorder.onerror = () => {
        resetRecorder();
        setNotice("Erreur pendant l'enregistrement vocal. Réessaie ou vérifie l'autorisation du micro.");
      };

      recorder.onstop = () => {
        const mimeType = supported.mimeType || recorder.mimeType || 'audio/webm';
        const extension = supported.extension || 'webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        resetRecorder();
        if (audioBlob.size < 300) {
          setNotice('Aucun son exploitable enregistré. Clique sur le micro, parle 2 secondes, puis arrête.');
          return;
        }
        const file = new File([audioBlob], `vocal_${Date.now()}.${extension}`, { type: mimeType });
        const url = URL.createObjectURL(file);
        setVoiceFile(file);
        setVoicePreviewUrl(url);
        setElapsed(0);
        setNotice('Vocal prêt : écoute-le puis clique sur envoyer.');
      };

      recorder.start();
      setElapsed(0);
      setRecording(true);
      setNotice('Enregistrement vocal en cours...');
    } catch {
      resetRecorder();
      setNotice("Micro inaccessible. Sur Chrome, ouvre localhost, clique sur l'icône micro/cadenas puis autorise le microphone.");
    }
  };

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') {
      resetRecorder();
      return;
    }
    try {
      if (recorder.state === 'recording') recorder.requestData();
      window.setTimeout(() => {
        if (recorder.state !== 'inactive') recorder.stop();
      }, 150);
    } catch {
      resetRecorder();
      setNotice("Impossible de finaliser le vocal. Réessaie l'enregistrement.");
    }
  };

  const cancelVoice = () => {
    if (voicePreviewUrl) URL.revokeObjectURL(voicePreviewUrl);
    setVoicePreviewUrl('');
    setVoiceFile(null);
    setElapsed(0);
    setNotice('');
  };

  const updateVideoElements = () => {
    window.setTimeout(() => {
      if (localVideoRef.current && callLocalStreamRef.current) localVideoRef.current.srcObject = callLocalStreamRef.current;
      if (remoteVideoRef.current && callRemoteStreamRef.current) remoteVideoRef.current.srcObject = callRemoteStreamRef.current;
      if (remoteAudioRef.current && callRemoteStreamRef.current) {
        remoteAudioRef.current.srcObject = callRemoteStreamRef.current;
        const playPromise = remoteAudioRef.current.play?.();
        if (playPromise?.catch) playPromise.catch(() => { /* lecture audio bloquee tant que la page n a pas recu d interaction */ });
      }
    }, 0);
  };

  const closeLocalCallMedia = () => {
    callLocalStreamRef.current?.getTracks().forEach((track) => track.stop());
    callLocalStreamRef.current = null;
    callRemoteStreamRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
  };

  const cleanupPeerConnection = () => {
    try { callPeerRef.current?.close(); } catch { /* ignore */ }
    callPeerRef.current = null;
    makingOfferRef.current = false;
  };

  const resetCallUi = (message = '') => {
    stopAllCallSounds();
    cleanupPeerConnection();
    closeLocalCallMedia();
    activeCallRef.current = null;
    setCallState({
      visible: false,
      appel: null,
      contact: null,
      direction: '',
      type_appel: 'audio',
      status: 'idle',
      statusText: '',
      muted: false,
      videoOff: false,
    });
    if (message) setNotice(message);
  };

  const sendCallSignal = async (appelId, type_signal, payload) => {
    await api.post(`/appels/${appelId}/signal/`, { type_signal, payload });
  };

  const ensureLocalCallStream = async (typeAppel) => {
    if (callLocalStreamRef.current) return callLocalStreamRef.current;
    const constraints = typeAppel === 'video'
      ? { audio: { echoCancellation: true, noiseSuppression: true }, video: { width: { ideal: 960 }, height: { ideal: 540 } } }
      : { audio: { echoCancellation: true, noiseSuppression: true }, video: false };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    callLocalStreamRef.current = stream;
    updateVideoElements();
    return stream;
  };

  const createCallPeer = async (appel, typeAppel) => {
    cleanupPeerConnection();
    const peer = buildPeerConnection({
      onRemoteStream: (stream) => {
        callRemoteStreamRef.current = stream;
        updateVideoElements();
        setCallState((current) => ({ ...current, status: 'connected', statusText: 'Appel connecté' }));
      },
      onIceCandidate: (candidate) => {
        void sendCallSignal(appel.id, 'ice', { candidate });
      },
      onConnectionState: (state) => {
        if (['failed', 'disconnected', 'closed'].includes(state)) {
          setCallState((current) => ({ ...current, statusText: state === 'failed' ? 'Connexion instable' : current.statusText }));
        }
      },
    });
    const stream = await ensureLocalCallStream(typeAppel);
    stream.getTracks().forEach((track) => peer.addTrack(track, stream));
    callPeerRef.current = peer;
    return peer;
  };

  const startInternalCall = async (typeAppel) => {
    if (!selectedContactId || !selectedContact) {
      setNotice('Choisis un contact avant de lancer un appel.');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection) {
      setNotice('Ce navigateur ne supporte pas les appels WebRTC.');
      return;
    }
    try {
      setNotice('Préparation de l’appel...');
      const response = await api.post('/appels/start/', { destinataire: selectedContactId, type_appel: typeAppel });
      const appel = response.data;
      activeCallRef.current = appel;
      setCallState({
        visible: true,
        appel,
        contact: selectedContact,
        direction: 'outgoing',
        type_appel: typeAppel,
        status: 'ringing',
        statusText: 'Appel en cours...',
        muted: false,
        videoOff: false,
      });
      startOutgoingTone();
      setNotice('Appel lancé. En attente de réponse.');
    } catch (error) {
      setNotice(error.response?.data?.detail || 'Impossible de lancer l’appel.');
    }
  };

  const acceptIncomingCall = async () => {
    const appel = activeCallRef.current;
    if (!appel) return;
    try {
      setCallState((current) => ({ ...current, statusText: 'Activation du micro et de la caméra...' }));
      await ensureLocalCallStream(appel.type_appel);
      await api.post(`/appels/${appel.id}/respond/`, { action: 'accept' });
      stopIncomingRingtone();
      setCallState((current) => ({ ...current, status: 'accepted', statusText: 'Appel accepté. Connexion en cours...' }));
    } catch (error) {
      setNotice(error.response?.data?.detail || "Impossible d'accepter l'appel. Vérifie l'autorisation du micro/caméra.");
    }
  };

  const refuseIncomingCall = async () => {
    const appel = activeCallRef.current;
    if (!appel) return;
    try {
      await api.post(`/appels/${appel.id}/respond/`, { action: 'refuse' });
    } catch { /* ignore */ }
    stopIncomingRingtone();
    resetCallUi('Appel refusé.');
  };

  const endInternalCall = async () => {
    const appel = activeCallRef.current;
    if (appel?.id) {
      try { await api.post(`/appels/${appel.id}/end/`); } catch { /* ignore */ }
    }
    resetCallUi('Appel terminé.');
  };

  const toggleCallMute = () => {
    const stream = callLocalStreamRef.current;
    if (!stream) return;
    const nextMuted = !callState.muted;
    stream.getAudioTracks().forEach((track) => { track.enabled = !nextMuted; });
    setCallState((current) => ({ ...current, muted: nextMuted }));
  };

  const toggleCallVideo = () => {
    const stream = callLocalStreamRef.current;
    if (!stream) return;
    const nextVideoOff = !callState.videoOff;
    stream.getVideoTracks().forEach((track) => { track.enabled = !nextVideoOff; });
    setCallState((current) => ({ ...current, videoOff: nextVideoOff }));
  };

  const handleIncomingCallSignal = (signal) => {
    const appel = signal.appel_detail;
    if (!appel || activeCallRef.current?.id) return;
    const contact = appel.appelant_detail;
    activeCallRef.current = appel;
    setSelectedContactId(String(contact?.id || appel.appelant));
    setCallState({
      visible: true,
      appel,
      contact,
      direction: 'incoming',
      type_appel: appel.type_appel,
      status: 'ringing',
      statusText: 'Appel entrant',
      muted: false,
      videoOff: false,
    });
    startIncomingRingtone();
    setNotice(`${displayName(contact)} vous appelle.`);
  };

  const handleAcceptedCallSignal = async (signal) => {
    const appel = signal.appel_detail;
    if (!appel || activeCallRef.current?.id !== appel.id) return;
    try {
      stopOutgoingTone();
      setCallState((current) => ({ ...current, appel, status: 'accepted', statusText: 'Appel accepté. Connexion...' }));
      const peer = await createCallPeer(appel, appel.type_appel);
      makingOfferRef.current = true;
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      await sendCallSignal(appel.id, 'offer', peer.localDescription.toJSON());
    } catch {
      setNotice('Impossible de créer la connexion WebRTC. Vérifie le micro/caméra.');
    } finally {
      makingOfferRef.current = false;
    }
  };

  const handleOfferSignal = async (signal) => {
    const appel = signal.appel_detail;
    if (!appel) return;
    try {
      activeCallRef.current = appel;
      const peer = callPeerRef.current || await createCallPeer(appel, appel.type_appel);
      await peer.setRemoteDescription(new RTCSessionDescription(signal.payload));
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      await sendCallSignal(appel.id, 'answer', peer.localDescription.toJSON());
      setCallState((current) => ({ ...current, appel, status: 'connecting', statusText: 'Connexion en cours...' }));
    } catch {
      setNotice('Impossible de répondre à l’appel WebRTC.');
    }
  };

  const handleAnswerSignal = async (signal) => {
    if (!callPeerRef.current) return;
    try {
      await callPeerRef.current.setRemoteDescription(new RTCSessionDescription(signal.payload));
      setCallState((current) => ({ ...current, status: 'connecting', statusText: 'Connexion en cours...' }));
    } catch {
      setNotice('Réponse WebRTC invalide.');
    }
  };

  const handleIceSignal = async (signal) => {
    if (!callPeerRef.current || !signal.payload?.candidate) return;
    try {
      await callPeerRef.current.addIceCandidate(new RTCIceCandidate(signal.payload.candidate));
    } catch { /* ignore invalid candidates */ }
  };

  const processCallSignal = async (signal) => {
    if (signal.type_signal === 'incoming') return handleIncomingCallSignal(signal);
    if (signal.type_signal === 'accepted') return handleAcceptedCallSignal(signal);
    if (signal.type_signal === 'refused') return resetCallUi('Appel refusé.');
    if (signal.type_signal === 'cancelled') return resetCallUi('Appel annulé.');
    if (signal.type_signal === 'ended') return resetCallUi('Appel terminé.');
    if (signal.type_signal === 'offer') return handleOfferSignal(signal);
    if (signal.type_signal === 'answer') return handleAnswerSignal(signal);
    if (signal.type_signal === 'ice') return handleIceSignal(signal);
    return undefined;
  };

  const processGlobalCallPayload = async (payload) => {
    if (!payload) return;
    const signal = payload.signal || payload;
    const autoAccept = Boolean(payload.autoAccept);
    await processCallSignal(signal);
    if (autoAccept && signal.type_signal === 'incoming') {
      window.setTimeout(() => { void acceptIncomingCall(); }, 220);
    }
  };

  useEffect(() => {
    const handleGlobalSignal = (event) => {
      if (event.detail) void processGlobalCallPayload(event.detail);
    };
    window.addEventListener('sis:call-signal', handleGlobalSignal);
    try {
      const raw = sessionStorage.getItem('sis_pending_call_signal');
      if (raw) {
        const payload = JSON.parse(raw);
        sessionStorage.removeItem('sis_pending_call_signal');
        window.setTimeout(() => { void processGlobalCallPayload(payload); }, 180);
      }
    } catch {
      sessionStorage.removeItem('sis_pending_call_signal');
    }
    return () => window.removeEventListener('sis:call-signal', handleGlobalSignal);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const response = await api.get('/appels/poll/');
        const signals = response.data?.signals || [];
        for (const signal of signals) {
          if (!cancelled) await processCallSignal(signal);
        }
      } catch {
        // silence: la messagerie reste utilisable même si le module appels est indisponible.
      }
    };
    const first = window.setTimeout(() => { void poll(); }, 700);
    const timer = window.setInterval(() => { void poll(); }, 1800);
    return () => {
      cancelled = true;
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
    // La signalisation WebRTC est volontairement pollée par minuteur interne.
    // Les handlers lisent l'état courant via refs et setState fonctionnel pour éviter de redémarrer le polling à chaque rendu.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => {
    stopAllCallSounds();
    stopCameraCapture();
    cleanupPeerConnection();
    closeLocalCallMedia();
    // Nettoyage unique au démontage: les refs internes gardent l'état courant des sons et flux WebRTC.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearComposer = () => {
    setDraft('');
    setAttachments([]);
    cancelVoice();
    setShowAttachMenu(false);
    setShowEmojiPicker(false);
  };

  const sendMessage = async (event) => {
    event.preventDefault();
    if (!selectedContactId) {
      setNotice('Choisis un destinataire avant d’envoyer.');
      return;
    }
    if (recording) {
      setNotice('Arrête d’abord l’enregistrement vocal avant d’envoyer.');
      return;
    }
    if (!draft.trim() && attachments.length === 0 && !voiceFile) {
      setNotice('Écris un message, ajoute un fichier ou enregistre un vocal.');
      return;
    }
    const payload = new FormData();
    payload.append('destinataire', selectedContactId);
    payload.append('objet', `Discussion avec ${displayName(selectedContact)}`);
    payload.append('contenu', draft.trim());
    attachments.forEach(({ file, kind }) => payload.append(kind || 'pieces_jointes', file));
    if (voiceFile) payload.append('vocaux', voiceFile);

    try {
      setSending(true);
      const response = await api.post('/messages/', payload);
      const created = response.data;
      clearComposer();
      setNotice('Message envoyé.');
      if (created?.id) {
        setMessages((current) => [created, ...current.filter((item) => item.id !== created.id)]);
      } else {
        setLoading(true);
        setReloadKey((current) => current + 1);
      }
      window.dispatchEvent(new Event('sis:messages-updated'));
      window.dispatchEvent(new Event('sis:notifications-updated'));
      window.dispatchEvent(new Event('sis:force-messages-refresh'));
    } catch (error) {
      const data = error.response?.data;
      setNotice(data?.detail || data?.non_field_errors?.[0] || (data ? JSON.stringify(data) : 'Envoi impossible.'));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="chat-page">
      <div className={`chat-shell ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <aside className="chat-sidebar-panel">
          <div className="chat-sidebar-header">
            <div className="chat-sidebar-title">
              <h2>Discussions</h2>
              <span>{sidebarMode === 'contacts' ? `${contacts.length} contact(s)` : `${conversations.length} discussion(s)`}</span>
            </div>
            <div className="chat-sidebar-tools">
              {unreadTotal > 0 && <strong className="chat-total-unread">{unreadTotal}</strong>}
              <button
                type="button"
                className="chat-sidebar-toggle"
                onClick={() => setSidebarCollapsed((value) => !value)}
                title={sidebarCollapsed ? 'Afficher les discussions' : 'Réduire les discussions'}
                aria-label={sidebarCollapsed ? 'Afficher les discussions' : 'Réduire les discussions'}
              >
                {sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
              </button>
            </div>
          </div>

          <div className="chat-search-box">
            <Search size={18} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher ou démarrer une discussion" />
          </div>

          <div className="chat-filter-row">
            <button type="button" className={sidebarMode === 'discussions' && filter === 'all' ? 'active' : ''} onClick={() => { setSidebarMode('discussions'); setFilter('all'); }}>Discussions</button>
            <button type="button" className={sidebarMode === 'discussions' && filter === 'unread' ? 'active' : ''} onClick={() => { setSidebarMode('discussions'); setFilter('unread'); }}>Non lues {unreadTotal}</button>
            <button type="button" className={sidebarMode === 'contacts' ? 'active' : ''} onClick={() => { setSidebarMode('contacts'); setFilter('all'); }}>Contacts {contacts.length}</button>
          </div>

          <div className="chat-conversation-list">
            {loading ? <Spinner label="Chargement des discussions..." /> : sidebarItems.map((conversation) => (
              <button
                type="button"
                key={conversation.id}
                className={`chat-contact-row ${selectedContactId === conversation.id ? 'active' : ''}`}
                onClick={() => selectConversation(conversation.id)}
              >
                <Avatar user={conversation.contact} />
                <div className="chat-contact-main">
                  <div className="chat-contact-title">
                    <strong>{displayName(conversation.contact)}</strong>
                    <time>{formatTime(conversation.lastMessage?.created_at)}</time>
                  </div>
                  <div className="chat-contact-preview">
                    <span>{conversation.directory ? contactPresence(conversation.contact) : (messagePreview(conversation.lastMessage) || contactPresence(conversation.contact))}</span>
                    {conversation.unread > 0 && <b>{conversation.unread}</b>}
                  </div>
                </div>
              </button>
            ))}
            {!loading && sidebarItems.length === 0 && <div className="chat-empty-side">Aucun utilisateur trouvé.</div>}
          </div>
        </aside>

        <section className="chat-room-panel">
          {selectedContact ? (
            <>
              <header className="chat-room-header">
                <div className="chat-room-user">
                  <Avatar user={selectedContact} />
                  <div>
                    <strong>{displayName(selectedContact)}</strong>
                    <span>{contactPresence(selectedContact)}</span>
                  </div>
                </div>
                <div className="chat-room-actions">
                  <CallPanel
                    callState={callState}
                    selectedContact={selectedContact}
                    currentUserId={currentUserId}
                    localVideoRef={localVideoRef}
                    remoteVideoRef={remoteVideoRef}
                    remoteAudioRef={remoteAudioRef}
                    onStart={(typeAppel) => void startInternalCall(typeAppel)}
                    onAccept={() => void acceptIncomingCall()}
                    onRefuse={() => void refuseIncomingCall()}
                    onEnd={() => void endInternalCall()}
                    onToggleMute={toggleCallMute}
                    onToggleVideo={toggleCallVideo}
                  />
                  <button
                    type="button"
                    className="chat-room-sidebar-toggle"
                    onClick={() => setSidebarCollapsed((value) => !value)}
                    title={sidebarCollapsed ? 'Afficher la liste' : 'Réduire la liste'}
                    aria-label={sidebarCollapsed ? 'Afficher la liste' : 'Réduire la liste'}
                  >
                    {sidebarCollapsed ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}
                  </button>
                </div>
              </header>

              {notice && <div className="chat-notice">{notice}</div>}

              <main className="chat-messages-area">
                {conversationMessages.map((item) => {
                  const mine = userIdFromMessage(item, 'expediteur') === currentUserId;
                  return (
                    <article key={item.id} className={`chat-bubble-row ${mine ? 'mine' : 'theirs'}`}>
                      <div className="chat-bubble">
                        {item.contenu && <p>{item.contenu}</p>}
                        {item.pieces_jointes?.map((piece) => (
                          <div className={`chat-file-card ${isAudioAttachment(piece) ? 'audio' : ''}`} key={piece.id}>
                            {isAudioAttachment(piece) ? <FileAudio size={20} /> : isImageAttachment(piece) ? <FileImage size={20} /> : <FileIcon size={20} />}
                            <div>
                              <strong>{piece.nom_original}</strong>
                              <span>{formatFileSize(piece.taille)}</span>
                              {isImageAttachment(piece) && piece.url && <img className="chat-image-preview" src={piece.url} alt={piece.nom_original} />}
                              {isAudioAttachment(piece) && piece.url && <audio controls preload="metadata" src={piece.url} />}
                            </div>
                            {piece.url && <a href={piece.url} download target="_blank" rel="noreferrer" title="Télécharger"><Download size={18} /></a>}
                          </div>
                        ))}
                        <footer>
                          <time title={formatDateTime(item.created_at)}>{formatTime(item.created_at)}</time>
                          {mine && (item.lu ? <CheckCheck className="read" size={15} /> : <Check size={15} />)}
                        </footer>
                      </div>
                    </article>
                  );
                })}
                {conversationMessages.length === 0 && (
                  <div className="chat-empty-room">
                    <MessageCircle size={42} />
                    <h3>Nouvelle discussion</h3>
                    <p>Écris un message, joins un fichier ou enregistre un vocal.</p>
                  </div>
                )}
                <div ref={bottomRef} />
              </main>

              <div className="chat-composer-preview">
                {attachments.map(({ file }, index) => (
                  <AttachmentPreview file={file} key={`${file.name}-${index}`} onRemove={() => removeAttachment(index)} />
                ))}
              </div>

              <form className={`chat-composer ${recording ? 'recording-active' : ''} ${voiceFile ? 'voice-ready-active' : ''}`} onSubmit={sendMessage}>
                <input ref={documentInputRef} className="d-none" type="file" multiple accept={ACCEPTS.documents} onChange={(event) => { addFiles(event.target.files, 'documents'); event.target.value = ''; }} />
                <input ref={imageInputRef} className="d-none" type="file" multiple accept={ACCEPTS.images} onChange={(event) => { addFiles(event.target.files, 'images'); event.target.value = ''; }} />
                <input ref={audioInputRef} className="d-none" type="file" multiple accept={ACCEPTS.audios} onChange={(event) => { addFiles(event.target.files, 'audios'); event.target.value = ''; }} />
                <input ref={archiveInputRef} className="d-none" type="file" multiple accept={ACCEPTS.archives} onChange={(event) => { addFiles(event.target.files, 'archives'); event.target.value = ''; }} />

                <div className="chat-menu-anchor">
                  <button type="button" onClick={() => setShowAttachMenu((value) => !value)} title="Joindre"><Paperclip size={22} /></button>
                  {showAttachMenu && (
                    <div className="chat-popover attachment-popover">
                      <button type="button" onClick={() => documentInputRef.current?.click()}><FileText size={18} /> Document</button>
                      <button type="button" onClick={() => void openCameraCapture()}><Camera size={18} /> Caméra</button>
                      <button type="button" onClick={() => imageInputRef.current?.click()}><ImageIcon size={18} /> Image</button>
                      <button type="button" onClick={() => audioInputRef.current?.click()}><FileAudio size={18} /> Audio</button>
                      <button type="button" onClick={() => archiveInputRef.current?.click()}><Archive size={18} /> Archive</button>
                    </div>
                  )}
                </div>

                <div className="chat-menu-anchor">
                  <button type="button" onClick={() => setShowEmojiPicker((value) => !value)} title="Emoji"><Smile size={22} /></button>
                  {showEmojiPicker && (
                    <div className="chat-popover emoji-popover">
                      {EMOJI_GROUPS.map((group, groupIndex) => (
                        <div className="emoji-row" key={`emoji-group-${groupIndex}`}>
                          {group.map((emoji) => <button type="button" key={emoji} onClick={() => insertEmoji(emoji)}>{emoji}</button>)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <input ref={draftInputRef} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Entrez un message" />
                <VoiceRecorder
                  recording={recording}
                  elapsed={elapsed}
                  voiceFile={voiceFile}
                  voicePreviewUrl={voicePreviewUrl}
                  onStart={() => void startRecording()}
                  onStop={stopRecording}
                  onCancel={cancelVoice}
                />
                {!recording && <button className="send" type="submit" disabled={sending} title="Envoyer"><Send size={21} /></button>}
              </form>
            </>
          ) : (
            <div className="chat-no-selection">
              <MessageCircle size={64} />
              <h2>Messagerie SIS ENSET</h2>
              <p>Ouvre l’onglet Contacts pour démarrer une nouvelle discussion avec un utilisateur connecté ou hors ligne.</p>
            </div>
          )}
        </section>

        {cameraOpen && (
          <div className="camera-capture-overlay" role="dialog" aria-modal="true">
            <div className="camera-capture-card">
              <div className="camera-capture-header">
                <div>
                  <strong>Prendre une photo</strong>
                  <span>La photo sera ajoutée comme image dans le message.</span>
                </div>
                <button type="button" onClick={closeCameraCapture} aria-label="Fermer"><X size={20} /></button>
              </div>
              <div className="camera-capture-preview">
                {!cameraStreamReady && <div className="camera-capture-loading">Activation de la caméra...</div>}
                <video
                  ref={cameraVideoRef}
                  autoPlay
                  muted
                  playsInline
                  onLoadedMetadata={attachCameraStream}
                  className="camera-capture-video"
                />
              </div>
              <canvas ref={cameraCanvasRef} className="d-none" />
              <div className="camera-capture-switch">
                <button type="button" onClick={() => void openCameraCapture('user')} className={cameraFacing === 'user' ? 'active' : ''}>Caméra avant</button>
                <button type="button" onClick={() => void openCameraCapture('environment')} className={cameraFacing === 'environment' ? 'active' : ''}>Caméra arrière</button>
              </div>
              <div className="camera-capture-actions">
                <button type="button" className="ghost" onClick={closeCameraCapture}>Annuler</button>
                <button type="button" className="ghost" onClick={switchCameraFacing}>Changer</button>
                <button type="button" className="capture" onClick={capturePhoto} disabled={!cameraStreamReady}><Camera size={18} /> Capturer</button>
              </div>
              <p className="camera-capture-note">Sur smartphone, choisis caméra avant ou arrière. La prise directe fonctionne sur localhost ou HTTPS ; sinon utilise l’option Image.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

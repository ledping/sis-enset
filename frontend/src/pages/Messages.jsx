import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Archive,
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
  Paperclip,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Send,
  Smile,
  Square,
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

function formatTime(value) {
  if (!value) return '';
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
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
  return photo ? <img className="chat-avatar" src={photo} alt="" /> : <div className="chat-avatar chat-avatar-fallback">{initials(user)}</div>;
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
  const [reloadKey, setReloadKey] = useState(0);
  const [attachments, setAttachments] = useState([]);
  const [voiceFile, setVoiceFile] = useState(null);
  const [voicePreviewUrl, setVoicePreviewUrl] = useState('');
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [sending, setSending] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const documentInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const audioInputRef = useRef(null);
  const archiveInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const audioChunksRef = useRef([]);
  const bottomRef = useRef(null);
  const draftInputRef = useRef(null);

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
    let ignore = false;
    api.get('/messages/', { params: { box: 'all' } })
      .then((response) => { if (!ignore) setMessages(asList(response.data)); })
      .catch(() => { if (!ignore) setNotice('Impossible de charger les messages.'); })
      .finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };
  }, [reloadKey]);

  useEffect(() => {
    if (!recording) return undefined;
    const timer = window.setInterval(() => {
      setElapsed((value) => value + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [recording]);

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
              <span>{conversations.length} discussion(s)</span>
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
            <button type="button" className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>Toutes</button>
            <button type="button" className={filter === 'unread' ? 'active' : ''} onClick={() => setFilter('unread')}>Non lues {unreadTotal}</button>
          </div>

          <div className="chat-conversation-list">
            {loading ? <Spinner label="Chargement des discussions..." /> : conversations.map((conversation) => (
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
                    <span>{messagePreview(conversation.lastMessage) || conversation.contact?.role || 'Nouveau contact'}</span>
                    {conversation.unread > 0 && <b>{conversation.unread}</b>}
                  </div>
                </div>
              </button>
            ))}
            {!loading && conversations.length === 0 && <div className="chat-empty-side">Aucune discussion trouvée.</div>}
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
                    <span>{selectedContact.role || 'Utilisateur SIS ENSET'}</span>
                  </div>
                </div>
                <div className="chat-room-actions">
                  <button
                    type="button"
                    className="chat-room-sidebar-toggle"
                    onClick={() => setSidebarCollapsed((value) => !value)}
                    title={sidebarCollapsed ? 'Afficher la liste' : 'Réduire la liste'}
                    aria-label={sidebarCollapsed ? 'Afficher la liste' : 'Réduire la liste'}
                  >
                    {sidebarCollapsed ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}
                  </button>
                  <MessageCircle size={22} />
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

              <form className="chat-composer" onSubmit={sendMessage}>
                <input ref={documentInputRef} className="d-none" type="file" multiple accept={ACCEPTS.documents} onChange={(event) => { addFiles(event.target.files, 'documents'); event.target.value = ''; }} />
                <input ref={imageInputRef} className="d-none" type="file" multiple accept={ACCEPTS.images} onChange={(event) => { addFiles(event.target.files, 'images'); event.target.value = ''; }} />
                <input ref={audioInputRef} className="d-none" type="file" multiple accept={ACCEPTS.audios} onChange={(event) => { addFiles(event.target.files, 'audios'); event.target.value = ''; }} />
                <input ref={archiveInputRef} className="d-none" type="file" multiple accept={ACCEPTS.archives} onChange={(event) => { addFiles(event.target.files, 'archives'); event.target.value = ''; }} />

                <div className="chat-menu-anchor">
                  <button type="button" onClick={() => setShowAttachMenu((value) => !value)} title="Joindre"><Paperclip size={22} /></button>
                  {showAttachMenu && (
                    <div className="chat-popover attachment-popover">
                      <button type="button" onClick={() => documentInputRef.current?.click()}><FileText size={18} /> Document</button>
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
                <button className="send" type="submit" disabled={sending} title="Envoyer"><Send size={21} /></button>
              </form>
            </>
          ) : (
            <div className="chat-no-selection">
              <MessageCircle size={64} />
              <h2>Messagerie SIS ENSET</h2>
              <p>Sélectionne une discussion à gauche pour envoyer un texte, un fichier ou un vocal.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

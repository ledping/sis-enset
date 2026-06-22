import { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, MessageCircle, Phone, PhoneCall, Volume2, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../api';

const PENDING_CALL_KEY = 'sis_pending_call_signal';

function displayName(user) {
  if (!user) return 'Utilisateur';
  return user.nom_complet || user.username || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Utilisateur';
}

function createAudioContext() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  if (!window.__sisAudioContext) window.__sisAudioContext = new AudioCtx();
  return window.__sisAudioContext;
}

async function playTone(frequency = 880, duration = 0.12, volume = 0.05) {
  const ctx = createAudioContext();
  if (!ctx) return false;
  if (ctx.state === 'suspended') await ctx.resume();
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.frequency.value = frequency;
  oscillator.type = 'sine';
  gain.gain.value = volume;
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start();
  oscillator.stop(ctx.currentTime + duration);
  return true;
}

function playMessageSound() {
  void playTone(880, 0.08, 0.04).then(() => setTimeout(() => { void playTone(1175, 0.08, 0.035); }, 110));
}

async function warmMediaPermission(typeAppel = 'audio') {
  if (!navigator.mediaDevices?.getUserMedia) return;
  try {
    const constraints = typeAppel === 'video'
      ? { audio: { echoCancellation: true, noiseSuppression: true }, video: true }
      : { audio: { echoCancellation: true, noiseSuppression: true }, video: false };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    stream.getTracks().forEach((track) => track.stop());
  } catch {
    // La page Messages affichera l'erreur si le micro/camera est refuse.
  }
}

export default function GlobalRealtimeCenter() {
  const navigate = useNavigate();
  const location = useLocation();
  const [toast, setToast] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [soundReady, setSoundReady] = useState(false);
  const lastUnreadRef = useRef(null);
  const ringtoneRef = useRef(null);
  const hiddenTimeoutRef = useRef(null);

  const enableSound = async () => {
    try {
      await playTone(660, 0.07, 0.035);
      setSoundReady(true);
      setToast({ type: 'success', title: 'Sons activés', body: 'Les messages et appels pourront signaler même hors messagerie.' });
    } catch {
      setToast({ type: 'warning', title: 'Son bloqué', body: 'Touchez encore le bouton après interaction avec la page.' });
    }
  };

  const stopRingtone = useCallback(() => {
    if (ringtoneRef.current) {
      window.clearInterval(ringtoneRef.current);
      ringtoneRef.current = null;
    }
  }, []);

  const startRingtone = useCallback(() => {
    stopRingtone();
    const ring = () => {
      void playTone(760, 0.16, 0.05);
      setTimeout(() => { void playTone(980, 0.16, 0.045); }, 230);
    };
    ring();
    ringtoneRef.current = window.setInterval(ring, 1600);
  }, [stopRingtone]);

  useEffect(() => () => {
    stopRingtone();
    if (hiddenTimeoutRef.current) window.clearTimeout(hiddenTimeoutRef.current);
  }, [stopRingtone]);

  useEffect(() => {
    const unlockByInteraction = () => {
      void enableSound();
      window.removeEventListener('click', unlockByInteraction);
      window.removeEventListener('touchstart', unlockByInteraction);
    };
    window.addEventListener('click', unlockByInteraction, { once: true });
    window.addEventListener('touchstart', unlockByInteraction, { once: true });
    return () => {
      window.removeEventListener('click', unlockByInteraction);
      window.removeEventListener('touchstart', unlockByInteraction);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;
    const pollMessages = async () => {
      try {
        const response = await api.get('/messages/unread/');
        const unread = Number(response.data?.unread || 0);
        if (lastUnreadRef.current === null) {
          lastUnreadRef.current = unread;
          return;
        }
        if (unread > lastUnreadRef.current && !location.pathname.startsWith('/messages')) {
          playMessageSound();
          setToast({ type: 'message', title: 'Nouveau message', body: 'Vous avez reçu un nouveau message interne.' });
          window.dispatchEvent(new Event('sis:messages-updated'));
        }
        lastUnreadRef.current = unread;
      } catch {
        // silence : le centre global ne doit pas perturber l'application.
      }
    };
    const first = window.setTimeout(() => { if (!cancelled) void pollMessages(); }, 1200);
    const timer = window.setInterval(() => { if (!cancelled) void pollMessages(); }, 4500);
    return () => {
      cancelled = true;
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, [location.pathname]);

  useEffect(() => {
    let cancelled = false;
    const pollCalls = async () => {
      if (location.pathname.startsWith('/messages')) return;
      try {
        const response = await api.get('/appels/poll/');
        const signals = response.data?.signals || [];
        signals.forEach((signal) => {
          if (signal.type_signal === 'incoming') {
            sessionStorage.setItem(PENDING_CALL_KEY, JSON.stringify(signal));
            setIncomingCall(signal);
            startRingtone();
            const caller = signal.appel_detail?.appelant_detail;
            setToast({ type: 'call', title: 'Appel entrant', body: `${displayName(caller)} vous appelle.` });
          } else {
            window.dispatchEvent(new CustomEvent('sis:call-signal', { detail: signal }));
          }
        });
      } catch {
        // silence : appels indisponibles hors réseau ou backend non lancé.
      }
    };
    const first = window.setTimeout(() => { if (!cancelled) void pollCalls(); }, 1300);
    const timer = window.setInterval(() => { if (!cancelled) void pollCalls(); }, 1800);
    return () => {
      cancelled = true;
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, [location.pathname, startRingtone]);

  const openMessagesForCall = async () => {
    const signal = incomingCall;
    if (!signal) return;
    stopRingtone();
    setIncomingCall(null);

    const payload = { signal, autoAccept: true, requestedAt: Date.now() };
    sessionStorage.setItem(PENDING_CALL_KEY, JSON.stringify(payload));

    // Important sur mobile : ce clic utilisateur debloque les permissions audio/camera
    // avant l'ouverture de la page Messagerie.
    await warmMediaPermission(signal.appel_detail?.type_appel || 'audio');

    navigate('/messages', { state: { autoAnswerCall: true } });
    hiddenTimeoutRef.current = window.setTimeout(() => {
      try {
        window.dispatchEvent(new CustomEvent('sis:call-signal', { detail: payload }));
      } catch {
        // ignore
      }
    }, 250);
  };

  const dismissCall = async () => {
    const appelId = incomingCall?.appel_detail?.id;
    stopRingtone();
    setIncomingCall(null);
    sessionStorage.removeItem(PENDING_CALL_KEY);
    if (appelId) {
      try { await api.post(`/appels/${appelId}/respond/`, { action: 'refuse' }); } catch { /* ignore */ }
    }
  };

  return (
    <>
      {!soundReady && (
        <button type="button" className="global-sound-unlock" onClick={() => { void enableSound(); }}>
          <Volume2 size={16} /> Activer les sons
        </button>
      )}

      {toast && (
        <div className={`global-realtime-toast ${toast.type || ''}`}>
          <button type="button" onClick={() => setToast(null)} aria-label="Fermer"><X size={14} /></button>
          <div className="global-realtime-icon">{toast.type === 'call' ? <PhoneCall size={19} /> : toast.type === 'message' ? <MessageCircle size={19} /> : <Bell size={19} />}</div>
          <div>
            <strong>{toast.title}</strong>
            <span>{toast.body}</span>
          </div>
        </div>
      )}

      {incomingCall && (
        <div className="global-call-overlay" role="dialog" aria-modal="true">
          <div className="global-call-card">
            <div className="global-call-pulse"><Phone size={26} /></div>
            <span>Appel entrant</span>
            <h3>{displayName(incomingCall.appel_detail?.appelant_detail)}</h3>
            <p>{incomingCall.appel_detail?.type_appel === 'video' ? 'Appel vidéo' : 'Appel audio'} — réponse directe en cours.</p>
            <div className="global-call-actions">
              <button type="button" className="btn btn-outline-danger" onClick={() => { void dismissCall(); }}>Refuser</button>
              <button type="button" className="btn btn-primary" onClick={() => { void openMessagesForCall(); }}>Répondre</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

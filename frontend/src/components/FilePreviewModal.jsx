import { useEffect, useRef, useState } from 'react';
import { Download, ExternalLink, FileText, LockKeyhole, X } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

function isPdf(mimeType = '', filename = '') {
  return mimeType.includes('pdf') || filename.toLowerCase().endsWith('.pdf');
}

function isImage(mimeType = '', filename = '') {
  const lower = filename.toLowerCase();
  return mimeType.startsWith('image/') || ['.png', '.jpg', '.jpeg', '.webp', '.gif'].some((ext) => lower.endsWith(ext));
}

function isText(mimeType = '', filename = '') {
  return mimeType.startsWith('text/') || filename.toLowerCase().endsWith('.txt');
}

function PdfJsViewer({ url }) {
  const containerRef = useRef(null);
  const renderTokenRef = useRef(0);
  const [status, setStatus] = useState('Chargement du PDF...');

  useEffect(() => {
    let cancelled = false;
    const token = renderTokenRef.current + 1;
    renderTokenRef.current = token;

    const renderPdf = async () => {
      const container = containerRef.current;
      if (!container) return;
      container.innerHTML = '';
      setStatus('Chargement du PDF...');
      try {
        const pdf = await pdfjsLib.getDocument(url).promise;
        if (cancelled || renderTokenRef.current !== token) return;
        setStatus(`${pdf.numPages} page${pdf.numPages > 1 ? 's' : ''} chargée${pdf.numPages > 1 ? 's' : ''}`);
        const maxWidth = Math.max(container.clientWidth - 18, 280);
        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          if (cancelled || renderTokenRef.current !== token) return;
          const page = await pdf.getPage(pageNumber);
          const baseViewport = page.getViewport({ scale: 1 });
          const scale = Math.min(maxWidth / baseViewport.width, 1.65);
          const viewport = page.getViewport({ scale });
          const pageWrap = document.createElement('div');
          pageWrap.className = 'pdfjs-page-wrap';
          const label = document.createElement('div');
          label.className = 'pdfjs-page-label';
          label.textContent = `Page ${pageNumber} / ${pdf.numPages}`;
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          canvas.style.width = `${Math.floor(viewport.width)}px`;
          canvas.style.height = `${Math.floor(viewport.height)}px`;
          pageWrap.appendChild(label);
          pageWrap.appendChild(canvas);
          container.appendChild(pageWrap);
          await page.render({ canvasContext: context, viewport }).promise;
        }
      } catch {
        if (!cancelled) setStatus('Aperçu PDF indisponible. Utilisez le bouton ouvrir.');
      }
    };

    void renderPdf();
    return () => {
      cancelled = true;
    };
  }, [url]);

  return (
    <div className="pdfjs-preview-shell">
      <div className="pdfjs-status">{status}</div>
      <div className="pdfjs-pages" ref={containerRef} />
    </div>
  );
}

export default function FilePreviewModal({ preview, downloading, unlocking, onClose, onUnlock, onDownload }) {
  if (!preview) return null;
  const locked = preview.locked;
  const pdf = preview.url && isPdf(preview.mimeType, preview.filename || preview.title);
  const image = preview.url && isImage(preview.mimeType, preview.filename || preview.title);
  const text = preview.url && isText(preview.mimeType, preview.filename || preview.title);

  return (
    <div className="file-preview-overlay" role="dialog" aria-modal="true" aria-label="Aperçu du fichier">
      <div className="file-preview-modal premium-preview-modal">
        <div className="file-preview-header">
          <div>
            <span className="file-preview-eyebrow">Aperçu sécurisé avant téléchargement</span>
            <h3>{preview.title || 'Document'}</h3>
            <p>
              {locked
                ? 'Le fichier complet est protégé. Déverrouillez-le avec un crédit pour le consulter entièrement et le télécharger.'
                : 'Document déverrouillé : vous pouvez le consulter dans le navigateur puis le télécharger sans payer une deuxième fois.'}
            </p>
          </div>
          <button type="button" className="file-preview-close" onClick={onClose} aria-label="Fermer l’aperçu">
            <X size={20} />
          </button>
        </div>

        <div className="file-preview-body">
          {locked ? (
            <div className="file-preview-locked">
              <LockKeyhole size={46} />
              <strong>Accès complet verrouillé</strong>
              <span>Un crédit débloque ce fichier. Après déverrouillage, tu peux le prévisualiser avec PDF.js et le télécharger.</span>
              <span className="file-preview-lock-hint">Utilise le bouton en bas pour déverrouiller puis afficher le document complet.</span>
              <small>Cette étape protège le système premium : personne ne peut lire tout le fichier gratuitement.</small>
            </div>
          ) : pdf ? (
            <PdfJsViewer url={preview.url} />
          ) : image ? (
            <div className="file-preview-image-wrap"><img src={preview.url} alt={preview.title || 'Aperçu'} /></div>
          ) : text ? (
            <iframe src={preview.url} title={preview.title || 'Aperçu du fichier'} />
          ) : (
            <div className="file-preview-unavailable">
              <FileText size={42} />
              <strong>Aperçu direct non disponible pour ce format</strong>
              <span>Le fichier est déverrouillé. Vous pouvez l’ouvrir dans un nouvel onglet ou le télécharger.</span>
              {preview.url && <a href={preview.url} target="_blank" rel="noreferrer" className="btn btn-outline-primary"><ExternalLink size={16} /> Ouvrir</a>}
            </div>
          )}
        </div>

        <div className={`file-preview-footer ${locked ? 'is-locked' : 'is-unlocked'}`}>
          <button type="button" className="btn btn-outline-secondary preview-secondary-action" onClick={onClose}>
            {locked ? 'Fermer' : 'Fermer'}
          </button>

          {locked ? (
            <button type="button" className="btn btn-primary preview-main-action" onClick={onUnlock} disabled={unlocking}>
              <LockKeyhole size={17} /> {unlocking ? 'Déverrouillage...' : 'Déverrouiller avec 1 crédit'}
            </button>
          ) : (
            <>
              {preview.url && (
                <a href={preview.url} target="_blank" rel="noreferrer" className="btn btn-outline-primary preview-open-action">
                  <ExternalLink size={16} /> Ouvrir
                </a>
              )}
              <button type="button" className="btn btn-primary preview-main-action" onClick={onDownload} disabled={downloading}>
                <Download size={17} /> {downloading ? 'Téléchargement...' : 'Télécharger maintenant'}
              </button>
            </>
          )}
        </div>

        {!locked && (
          <button type="button" className="preview-floating-download" onClick={onDownload} disabled={downloading}>
            <Download size={18} /> {downloading ? 'Téléchargement...' : 'Télécharger'}
          </button>
        )}
      </div>
    </div>
  );
}

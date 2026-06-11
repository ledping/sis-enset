from datetime import datetime
from decimal import Decimal
import textwrap


def _pdf_escape(value):
    text = str(value or '')
    return text.replace('\\', '\\\\').replace('(', '\\(').replace(')', '\\)')


def _money(value):
    try:
        amount = int(Decimal(str(value or 0)))
    except Exception:
        amount = 0
    return f"{amount:,}".replace(',', ' ') + ' FCFA'


def _safe_display(value, fallback='-'):
    value = str(value or '').strip()
    return value if value else fallback


def _wrap(text, width=82):
    text = str(text or '')
    if not text:
        return ['']
    return textwrap.wrap(text, width=width, break_long_words=False) or ['']


def build_receipt_pdf(paiement, settings=None):
    """Generate a dependency-free PDF receipt for a validated premium payment.

    Important fix v9.3.2:
    The previous version used the PDF `Td` operator cumulatively with absolute
    coordinates. Some readers could extract all the text, but visually most
    lines were pushed outside the page. This version uses `Tm` for absolute
    positioning on every line and resets the text fill color to black before
    each text object, so the receipt renders clearly in all readers.
    """
    settings = settings or None
    user = paiement.utilisateur
    plan = paiement.plan
    receipt_no = f"SIS-REC-{paiement.id:06d}"
    validated_at = paiement.date_validation or paiement.created_at
    user_name = user.get_full_name() or user.username

    beneficiary = settings.beneficiaire if settings else 'Departement ENSET Douala'
    orange_number = getattr(settings, 'numero_orange_money', '') if settings else ''
    mtn_number = getattr(settings, 'numero_mtn_money', '') if settings else ''

    rows = [
        ('Numero du recu', receipt_no),
        ('Date de validation', validated_at.strftime('%d/%m/%Y %H:%M') if validated_at else datetime.now().strftime('%d/%m/%Y %H:%M')),
        ('Contributeur', user_name),
        ('Identifiant', user.username),
        ('Pack', plan.nom if plan else 'Pack premium'),
        ('Montant valide', _money(paiement.montant)),
        ('Moyen de paiement', paiement.get_moyen_display()),
        ('Numero payeur', _safe_display(paiement.numero_payeur)),
        ('Reference transaction', _safe_display(paiement.reference)),
        ('Credits documents accordes', plan.credits_documents if plan else 0),
        ('Credits memoires accordes', plan.credits_memoires if plan else 0),
    ]

    content = []

    def text_line(x, y, text, size=10, bold=False):
        font = '/F2' if bold else '/F1'
        content.append('BT')
        content.append('0 0 0 rg')
        content.append('0 0 0 RG')
        content.append(f'{font} {size} Tf')
        content.append(f'1 0 0 1 {x} {y} Tm')
        content.append(f'({_pdf_escape(text)}) Tj')
        content.append('ET')

    def rect(x, y, w, h, stroke='0.82 0.88 0.96 RG', fill=None, width=1):
        content.append(f'{width} w')
        content.append(stroke)
        if fill:
            content.append(fill)
            content.append(f'{x} {y} {w} {h} re B')
        else:
            content.append(f'{x} {y} {w} {h} re S')

    # Header
    rect(36, 760, 523, 48, stroke='0.10 0.34 0.65 RG', fill='0.93 0.97 1 rg', width=1)
    text_line(55, 789, 'RECU DE PAIEMENT PREMIUM', 18, True)
    text_line(55, 772, 'SIS ENSET - Gestion documentaire et portail captif', 10, False)
    text_line(405, 789, 'VALIDÉ', 12, True)

    # Main receipt card
    rect(36, 285, 523, 450, stroke='0.82 0.88 0.96 RG', width=1)
    y = 710
    text_line(55, y, 'Informations du paiement', 13, True)
    y -= 26

    for label, value in rows:
        value_text = str(value)
        text_line(60, y, f'{label} :', 10, True)
        wrapped = _wrap(value_text, width=56)
        text_line(225, y, wrapped[0], 10, False)
        y -= 17
        for extra in wrapped[1:]:
            text_line(225, y, extra, 10, False)
            y -= 17
        if y < 330:
            break

    # Notice section
    rect(55, 180, 485, 78, stroke='0.72 0.82 0.95 RG', fill='0.98 0.99 1 rg', width=1)
    y = 235
    notice = (
        'Ce recu confirme la validation administrative du paiement et '
        'l activation des credits numeriques correspondants. Les credits '
        'sont utilisables uniquement dans le cadre de la plateforme SIS ENSET.'
    )
    for line in _wrap(notice, width=95):
        text_line(70, y, line, 9, False)
        y -= 14

    # Beneficiary and deposit numbers
    y = 145
    text_line(55, y, f'Beneficiaire officiel : {beneficiary}', 10, True)
    y -= 16
    if orange_number or mtn_number:
        text_line(55, y, f'Numeros de depot : Orange Money {orange_number or "-"} | MTN Mobile Money {mtn_number or "-"}', 9, False)
        y -= 15
    text_line(55, y, 'Signature numerique : paiement valide dans le systeme SIS ENSET.', 9, False)

    # Footer
    text_line(55, 70, 'Document genere automatiquement par SIS ENSET. Toute verification se fait dans le module Acces premium.', 8, False)
    text_line(430, 48, receipt_no, 8, False)

    stream = '\n'.join(content).encode('latin-1', errors='replace')

    objects = []
    objects.append(b'<< /Type /Catalog /Pages 2 0 R >>')
    objects.append(b'<< /Type /Pages /Kids [3 0 R] /Count 1 >>')
    objects.append(b'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>')
    objects.append(b'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')
    objects.append(b'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>')
    objects.append(b'<< /Length ' + str(len(stream)).encode() + b' >>\nstream\n' + stream + b'\nendstream')

    pdf = bytearray(b'%PDF-1.4\n')
    offsets = [0]
    for i, obj in enumerate(objects, start=1):
        offsets.append(len(pdf))
        pdf.extend(f'{i} 0 obj\n'.encode())
        pdf.extend(obj)
        pdf.extend(b'\nendobj\n')
    xref = len(pdf)
    pdf.extend(f'xref\n0 {len(objects)+1}\n'.encode())
    pdf.extend(b'0000000000 65535 f \n')
    for offset in offsets[1:]:
        pdf.extend(f'{offset:010d} 00000 n \n'.encode())
    pdf.extend(b'trailer\n')
    pdf.extend(f'<< /Size {len(objects)+1} /Root 1 0 R >>\n'.encode())
    pdf.extend(b'startxref\n')
    pdf.extend(str(xref).encode())
    pdf.extend(b'\n%%EOF')
    return bytes(pdf), receipt_no

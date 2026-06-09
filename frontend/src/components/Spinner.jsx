export default function Spinner({ label = 'Chargement...' }) {
  return (
    <div className="spinner-page">
      <div className="spinner-border text-primary" role="status" aria-hidden="true" />
      <p>{label}</p>
    </div>
  );
}

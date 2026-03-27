import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="notfound-page">
      {/* Background photo */}
      <div className="notfound-bg" />

      {/* Content */}
      <div className="notfound-content">
        {/* Logo mark */}
        <Link href="/" className="notfound-logo" aria-label="HOMMM — strona główna">
          <span className="notfound-logo__mark" />
        </Link>

        <p className="notfound-code">404</p>

        <h1 className="notfound-heading">Zabłądziłeś w lesie</h1>

        <p className="notfound-text">
          Ta ścieżka prowadzi donikąd.<br />
          Ale spokojnie — droga do HOMMM jest prosta.
        </p>

        <Link href="/" className="notfound-btn">
          Wróć na stronę główną
        </Link>
      </div>
    </div>
  );
}

import { TopMenu } from "../components/TopMenu";

export default function Home() {
  return (
    <>
      <TopMenu />

      {/* SEKCJA HERO */}
      <section
        className="section h-90vh bg-slider"
        id="hero-start"
        data-menu-font="#ffffff"
        data-menu-logo="#ffffff"
      >
        <div className="container">
          <h2>STARTOWY HERO - Sekcja 1</h2>
          <p>Wszystkie zbędne widoki zostały usunięte.</p>
        </div>
      </section>

      {/* STALE SEKCJE */}
      <section
        className="section h-90vh bg-secondary"
        id="sec2-wrapper"
        data-menu-font="#ffffff"
        data-menu-logo="#ffffff"
      >
        <div className="container">
          <h2>Sekcja 2</h2>
          <p>Wszystkie sekcje są teraz statyczne i uproszczone.</p>
        </div>
      </section>

      <section
        className="section h-90vh bg-dark"
        id="sec3-wrapper"
        data-menu-font="#ffffff"
        data-menu-logo="#ffffff"
      >
        <div className="container">
          <h2>Sekcja 3</h2>
          <p>Treść rozszerzona została usunięta.</p>
        </div>
      </section>

      <section
        className="section h-35vh bg-light"
        id="sec4-wrapper"
        data-menu-font="#1c1c1c"
        data-menu-logo="#1c1c1c"
      >
        <div className="container">
          <h2>Stopka - Sekcja 4</h2>
          <p>Zawsze na samym dole.</p>
        </div>
      </section>
    </>
  );
}

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CircleHelp,
  Leaf,
  ShieldCheck,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../../app/hooks";
import {
  fetchBestSellers,
  fetchProducts,
  fetchSpotlight,
  fetchTrending,
} from "../state/catalogSlice";
import BestSellers, { BestSellerCard } from "../components/BestSellers";
import Spotlight from "../components/Spotlight";
import Trending from "../components/Trending";

function Benefit({ icon: Icon, title, copy }) {
  return (
    <div className="benefit">
      <span className="benefit__icon"><Icon size={24} strokeWidth={1.8} /></span>
      <span><strong>{title}</strong><small>{copy}</small></span>
    </div>
  );
}

export default function HomePage() {
  const dispatch = useAppDispatch();
  const {
    products,
    bestSellers,
    bestSellersFallback,
    bestSellersStatus,
    bestSellersError,
    trending,
    trendingFallback,
    trendingStatus,
    trendingError,
    spotlight,
    spotlightStatus,
    spotlightError,
    query,
    productsStatus,
    productsError,
  } = useAppSelector((state) => state.catalog);
  const [activeHeroSlide, setActiveHeroSlide] = useState(0);
  const heroSlides = [
    { src: "/heroImage.jpeg", alt: "A range of refurbished laptops" },
    ...products.flatMap((product) => {
      const image = product.images?.find((item) => (typeof item === "string" ? item : item?.url));
      const src = typeof image === "string" ? image : image?.url;
      return src ? [{ src, alt: image?.altText || product.title }] : [];
    }),
  ]
    .filter((slide, index, slides) => slides.findIndex((item) => item.src === slide.src) === index)
    .slice(0, 5);
  const activeHeroSlideIndex = activeHeroSlide % heroSlides.length;
  const currentHeroSlide = heroSlides[activeHeroSlideIndex];

  useEffect(() => {
    if (heroSlides.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    const timer = window.setInterval(() => {
      setActiveHeroSlide((current) => (current + 1) % heroSlides.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [heroSlides.length]);

  useEffect(() => {
    const controller = new AbortController();
    dispatch(fetchBestSellers(undefined, { signal: controller.signal }));
    return () => controller.abort();
  }, [dispatch]);

  useEffect(() => {
    const controller = new AbortController();
    dispatch(fetchTrending(undefined, { signal: controller.signal }));
    return () => controller.abort();
  }, [dispatch]);

  useEffect(() => {
    const controller = new AbortController();
    dispatch(fetchSpotlight(undefined, { signal: controller.signal }));
    return () => controller.abort();
  }, [dispatch]);

  useEffect(() => {
    const controller = new AbortController();
    dispatch(fetchProducts({ ...query, page: 1, pageSize: 5 }, { signal: controller.signal }));
    return () => controller.abort();
  }, [dispatch, query]);

  return (
    <main>
      <section className="hero">
        <img
          key={currentHeroSlide.src}
          className="hero__image"
          src={currentHeroSlide.src}
          alt=""
          aria-hidden="true"
        />
        <div className="hero__inner">
          <div className="hero-copy">
            <p className="eyebrow"><span />A BETTER WAY TO BUY TECH</p>
            <h1>Good tech.<br /><em>Less baggage.</em></h1>
            <p className="hero-copy__description">
              Shop quality-checked refurbished laptops that work hard, cost less, and deserve another life.
            </p>
            <div className="hero-copy__actions">
              <a className="button button--primary" href="#featured">Shop all laptops <ArrowRight size={17} /></a>
              <a className="text-link" href="#our-promise">Why refurbished <ArrowRight size={15} /></a>
            </div>
          </div>
        </div>
        {heroSlides.length > 1 && (
          <>
            <div className="hero__controls" role="group" aria-label="Hero image controls">
              <button
                className="hero__arrow"
                type="button"
                aria-label="Show previous image"
                onClick={() => setActiveHeroSlide((current) => (current % heroSlides.length - 1 + heroSlides.length) % heroSlides.length)}
              >
                <ArrowLeft size={20} />
              </button>
              <button
                className="hero__arrow"
                type="button"
                aria-label="Show next image"
                onClick={() => setActiveHeroSlide((current) => (current % heroSlides.length + 1) % heroSlides.length)}
              >
                <ArrowRight size={20} />
              </button>
            </div>
            <div className="hero__indicators" role="group" aria-label="Choose a hero image">
              {heroSlides.map((slide, index) => (
                <button
                  key={slide.src}
                  className={`hero__indicator${index === activeHeroSlideIndex ? " is-active" : ""}`}
                  type="button"
                  aria-label={`Show image ${index + 1} of ${heroSlides.length}`}
                  aria-current={index === activeHeroSlideIndex ? "true" : undefined}
                  onClick={() => setActiveHeroSlide(index)}
                />
              ))}
            </div>
          </>
        )}
      </section>

      <section className="benefits" id="why-zohntronics" aria-label="Our shopping promise">
        <Benefit icon={BadgeCheck} title="Checked, not guessed" copy="Every laptop gets a quality check" />
        <Benefit icon={ShieldCheck} title="Warranty included" copy="Extra peace of mind in the box" />
        <Benefit icon={Leaf} title="A lighter footprint" copy="Give great technology another life" />
        <Benefit icon={CircleHelp} title="Here to help" copy="Real support when you need it" />
      </section>

      <BestSellers
        products={bestSellers}
        fallback={bestSellersFallback}
        status={bestSellersStatus}
        error={bestSellersError}
      />
      <Trending
        products={trending}
        fallback={trendingFallback}
        status={trendingStatus}
        error={trendingError}
        onRetry={() => dispatch(fetchTrending())}
      />

      <Spotlight
        product={spotlight}
        status={spotlightStatus}
        error={spotlightError}
        onRetry={() => dispatch(fetchSpotlight())}
      />

      <section className="catalog-section all-products-section" id="featured">
        <div className="best-sellers__heading">
          <div>
            <p className="eyebrow"><span />THE COMPLETE COLLECTION</p>
            <h2>All <em>Products</em></h2>
            <p className="section-heading__copy">Browse a few of our available refurbished laptops.</p>
          </div>
          <Link className="best-sellers__view-all" to="/products">
            View all <ArrowRight size={16} />
          </Link>
        </div>

        {productsError ? (
          <div className="state-card state-card--error" role="alert">
            <h3>We couldn’t load the collection.</h3>
            <p>{productsError}</p>
            <button
              className="button button--outline"
              type="button"
              onClick={() => dispatch(fetchProducts({ ...query, page: 1, pageSize: 5 }))}
            >
              Try again
            </button>
          </div>
        ) : productsStatus === "loading" ? (
          <div className="best-sellers__grid all-products-grid" aria-label="Loading products">
            {Array.from({ length: 5 }, (_, index) => <div className="best-seller-skeleton" key={index} />)}
          </div>
        ) : products.length ? (
          <div className="best-sellers__grid all-products-grid">
            {products.map((product) => (
              <BestSellerCard
                key={product.id}
                product={product}
                fallback
                fallbackLabel={product.featured ? "Featured pick" : "Available now"}
              />
            ))}
          </div>
        ) : (
          <div className="state-card">
            <h3>No laptops available just yet.</h3>
            <p>New refurbished laptops will appear here when they are in stock.</p>
          </div>
        )}
      </section>

      <section className="promise" id="our-promise">
        <div className="promise__mark"><ShieldCheck size={29} strokeWidth={1.5} /></div>
        <div>
          <p className="eyebrow">A LITTLE MORE CERTAINTY</p>
          <h2>Pre-loved. <em>Professionally prepared.</em></h2>
          <p>Every listing shows you the details that matter, from condition and specs to warranty coverage—so you know exactly what’s coming home.</p>
        </div>
        <Link className="text-link" to="/products">Explore the collection <ArrowRight size={16} /></Link>
      </section>

      <section className="product-faq home-faq" aria-labelledby="home-faq-title">
        <div className="product-faq__heading">
          <p className="eyebrow">NEED TO KNOW?</p>
          <h2 id="home-faq-title">Frequently asked <em>questions</em></h2>
        </div>
        <div className="product-faq__list">
          <details>
            <summary>What does refurbished mean?</summary>
            <p>Our refurbished laptops are checked and graded. Each listing includes the condition notes and specifications for that device.</p>
          </details>
          <details>
            <summary>What warranty comes with a laptop?</summary>
            <p>Warranty coverage is included. Check each laptop’s listing for its specific warranty period.</p>
          </details>
          <details>
            <summary>Do laptop prices include GST?</summary>
            <p>Yes. Displayed laptop prices include 18% GST. Shipping options are shown at checkout.</p>
          </details>
          <details>
            <summary>How can I compare laptop specifications?</summary>
            <p>Open any laptop listing to review its processor generation, memory, storage, display, condition, and other specifications.</p>
          </details>
        </div>
      </section>
    </main>
  );
}

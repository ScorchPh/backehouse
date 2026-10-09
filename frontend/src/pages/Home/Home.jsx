import { useState } from "react";
import { Link } from "react-router-dom";
import "./Home.css";

import heroBg from "../../assets/images/bakesmart_hero.jpg";
import bakerIllustration from "../../assets/images/baker_process.jpg";
import catSourdough from "../../assets/images/cat_sourdough.jpg";
import catPastries from "../../assets/images/cat_pastries.jpg";
import catCakes from "../../assets/images/cat_cakes.jpg";

import FeaturedProducts from "../../components/FeaturedProducts/FeaturedProducts";
import Location from "../../components/Location/Location";

function Home() {
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [isSubscribed, setIsSubscribed] = useState(false);

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (newsletterEmail.trim()) {
      setIsSubscribed(true);
      setNewsletterEmail("");
      setTimeout(() => setIsSubscribed(false), 4000);
    }
  };

  return (
    <div className="home-page-container">
      <section className="bakesmart-hero">
        <div className="hero-bg-wrap">
          <img src={heroBg} alt="Artisanal Sourdough" className="hero-bg-img" />
          <div className="hero-gradient-overlay" />
        </div>

        <div className="hero-inner-container">
          <div className="hero-frosted-card">
            <h1>BAKE HOUSE: Artisanal Delights, Smartly Delivered.</h1>
            <p>
              Experience the perfect blend of traditional baking techniques and
              modern ordering precision. Fresh from the oven to your table.
            </p>

            <div className="hero-actions-row">
              <Link to="/menu" className="hero-btn-gold">
                Explore Menu
              </Link>
              <Link to="/personalize" className="hero-btn-dark">
                Custom Cake
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="categories-section">
        <div className="section-heading-center">
          <span className="section-label-gold">SELECTION</span>
          <h2>Featured Categories</h2>
          <div className="golden-divider-dash" />
        </div>

        <div className="category-cards-grid">
          <Link to="/menu?category=Bread" className="category-card">
            <div className="cat-img-wrapper">
              <img src={catSourdough} alt="Artisanal Sourdough" />
              <div className="cat-card-overlay" />
            </div>
            <div className="cat-card-content">
              <h3>Sourdough</h3>
              <p>Natural fermentation. 48-hour process.</p>
            </div>
          </Link>

          <Link to="/menu?category=Pastry" className="category-card">
            <div className="cat-img-wrapper">
              <span className="cat-badge-top">HAND-LAMINATED</span>
              <img src={catPastries} alt="Buttery Pastries" />
              <div className="cat-card-overlay" />
            </div>
            <div className="cat-card-content">
              <h3>Pastries</h3>
              <p>Hand-laminated layers of buttery delight.</p>
            </div>
          </Link>

          <Link to="/personalize" className="category-card">
            <div className="cat-img-wrapper">
              <img src={catCakes} alt="Artisanal Custom Cakes" />
              <div className="cat-card-overlay" />
            </div>
            <div className="cat-card-content">
              <h3>Custom Cakes</h3>
              <p>Personalized masterpieces for every occasion.</p>
            </div>
          </Link>
        </div>
      </section>

      <section className="home-featured-wrapper">
        <FeaturedProducts />
      </section>

      <section className="process-section">
        <div className="process-container">
          <div className="process-illustration-col">
            <div className="illustration-frame">
              <img src={bakerIllustration} alt="Master Baker at Work" />
            </div>
          </div>

          <div className="process-info-col">
            <span className="section-label-gold">OUR PROCESS</span>
            <h2>How it Works</h2>

            <div className="process-steps-list">
              <div className="process-step-item">
                <div className="step-icon-badge">
                  <span>📅</span>
                </div>
                <div className="step-text">
                  <h3>Advanced Booking</h3>
                  <p>
                    Schedule your orders up to a week in advance. Our fermentation
                    timers ensure your bread is ready exactly when you need it.
                  </p>
                </div>
              </div>

              <div className="process-step-item">
                <div className="step-icon-badge">
                  <span>👨‍🍳</span>
                </div>
                <div className="step-text">
                  <h3>Artisanal Preparation</h3>
                  <p>
                    Our master bakers begin the preparation of your order using
                    premium, locally sourced organic ingredients.
                  </p>
                </div>
              </div>

              <div className="process-step-item">
                <div className="step-icon-badge">
                  <span>🚚</span>
                </div>
                <div className="step-text">
                  <h3>Smart Delivery</h3>
                  <p>
                    Choose between precise delivery windows or quick-lane pickup
                    from our artisan hubs across the city.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="stay-in-dough-section">
        <div className="stay-in-dough-card">
          <h2>Stay in the Dough</h2>
          <p>
            Get notified about seasonal specials, limited-edition bakes, and fresh
            baking tips from our master chef.
          </p>

          <form onSubmit={handleSubscribe} className="dough-form">
            <input
              type="email"
              placeholder="Enter your email"
              value={newsletterEmail}
              onChange={(e) => setNewsletterEmail(e.target.value)}
              required
            />
            <button type="submit" className="dough-btn">
              Subscribe
            </button>
          </form>

          {isSubscribed && (
            <div className="subscribed-feedback-pill">
              🎉 Thank you for subscribing! Check your inbox soon.
            </div>
          )}
        </div>
      </section>

      <Location />
    </div>
  );
}

export default Home;
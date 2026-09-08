import { Link } from "react-router-dom";
import "./Home.css";
import heroImage from "../../assets/images/hero.jfif";

import FeaturedProducts from "../../components/FeaturedProducts/FeaturedProducts";
import WhyChooseUs from "../../components/WhyChooseUs/WhyChooseUs";
import Testimonials from "../../components/Testimonials/Testimonials";
import Location from "../../components/Location/Location";

function Home() {
  return (
    <>
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <h1>Freshly Baked Happiness Every Day</h1>

          <p>
            Discover handcrafted breads, delicious cakes, pastries, and
            cookies baked fresh every day with premium ingredients.
          </p>

          <button>Shop Now</button>
        </div>

        <div className="hero-image">
          <img src={heroImage} alt="Fresh bakery products" />
        </div>
      </section>

      {/* Featured Products */}
      <FeaturedProducts />

      {/* Why Choose Us */}
      <WhyChooseUs />

      {/* Customer Testimonials */}
      <Testimonials />

      {/* Visit Our Bakery */}
      <Location />
    </>
  );
}

export default Home;
import "./WhyChooseUs.css";
import {
  FaBreadSlice,
  FaBirthdayCake,
  FaTruck,
  FaLeaf,
} from "react-icons/fa";

const features = [
  {
    id: 1,
    icon: <FaBreadSlice />,
    title: "Freshly Baked Daily",
    description:
      "Every loaf, pastry, and cake is baked fresh each day for the best taste and quality.",
  },
  {
    id: 2,
    icon: <FaBirthdayCake />,
    title: "Custom Cake Designs",
    description:
      "Celebrate every occasion with personalized cakes made just for you.",
  },
  {
    id: 3,
    icon: <FaTruck />,
    title: "Fast Delivery",
    description:
      "Enjoy your favorite baked goods delivered safely and on time.",
  },
  {
    id: 4,
    icon: <FaLeaf />,
    title: "Premium Ingredients",
    description:
      "We use carefully selected ingredients to ensure delicious and consistent quality.",
  },
];

function WhyChooseUs() {
  return (
    <section className="why-choose">
      <div className="why-header">
        <h2>Why Choose BAKE HOUSE?</h2>
        <p>
          We combine quality ingredients, skilled craftsmanship, and excellent
          service to make every order memorable.
        </p>
      </div>

      <div className="why-grid">
        {features.map((feature) => (
          <div className="why-card" key={feature.id}>
            <div className="why-icon">{feature.icon}</div>

            <h3>{feature.title}</h3>

            <p>{feature.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default WhyChooseUs;
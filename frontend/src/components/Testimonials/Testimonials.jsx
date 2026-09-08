import "./Testimonials.css";

const testimonials = [
  {
    id: 1,
    name: "Maria Santos",
    review:
      "The cakes are always fresh and beautifully decorated. I ordered for my daughter's birthday and everyone loved it!",
    rating: "★★★★★",
  },
  {
    id: 2,
    name: "John Cruz",
    review:
      "Best bakery in town! Their breads are soft, delicious, and always freshly baked every morning.",
    rating: "★★★★★",
  },
  {
    id: 3,
    name: "Angela Reyes",
    review:
      "Excellent customer service and amazing pastries. I'll definitely order again for future celebrations.",
    rating: "★★★★★",
  },
];

function Testimonials() {
  return (
    <section className="testimonials">
      <div className="testimonials-header">
        <h2>What Our Customers Say</h2>
        <p>
          We take pride in creating baked goods that bring smiles to every
          celebration.
        </p>
      </div>

      <div className="testimonial-grid">
        {testimonials.map((customer) => (
          <div className="testimonial-card" key={customer.id}>
            <div className="stars">{customer.rating}</div>

            <p className="review">"{customer.review}"</p>

            <h4>{customer.name}</h4>
          </div>
        ))}
      </div>
    </section>
  );
}

export default Testimonials;
import "./About.css";
import teamImage from "../../assets/images/teampandecoco.jfif";

function About() {
  return (
    <section className="about">
      <h1>ABOUT BAKE HOUSE</h1>

      <p className="subtitle">
        Freshly Baked with Love
      </p>

      <div className="story">
        <p>
          Every great bakery begins with a simple passion—bringing people
          together through freshly baked treats.
        </p>

        <p>
          BAKE HOUSE was created with the belief that every loaf of bread,
          every cake, and every pastry should be made with care, using
          premium ingredients and traditional baking techniques. We believe
          baking is more than creating delicious food; it is about creating
          moments that families and friends will always remember.
        </p>

        <p>
          Whether you're celebrating a birthday, enjoying breakfast with loved
          ones, or simply treating yourself after a long day, our goal is to
          make every visit feel warm, welcoming, and memorable.
        </p>

        <p>
          Thank you for being part of our journey. We look forward to serving
          you with freshly baked happiness every single day.
        </p>

        <div className="signature">
          ❤️
          <h3>The BAKE HOUSE Team</h3>
        </div>
      </div>

      {/* Mission & Vision */}
      <section className="mission-vision">

        <div className="mission-card">
          <h2>🎯 Our Mission</h2>
          <p>
            To provide freshly baked breads, pastries, and customized cakes
            made with premium ingredients, creativity, and exceptional
            customer service, making every celebration sweeter and more
            memorable.
          </p>
        </div>

        <div className="vision-card">
          <h2>🌟 Our Vision</h2>
          <p>
            To become the most trusted local bakery by delivering
            high-quality baked products, embracing innovation, and creating
            joyful experiences for every customer.
          </p>
        </div>

      </section>


        {/* Meet Our Team */}
      <section className="our-team">
        <h2>👨‍🍳 Meet Our Team</h2>

        <p className="team-subtitle">
          Behind every freshly baked bread, delicious pastry, and customized
          cake is a passionate team dedicated to bringing joy to every
          customer. We work together to ensure every order is crafted with
          quality, creativity, and care.
        </p>

        <img
          src={teamImage}
          alt="Bake House Team"
          className="team-image"
        />
      </section>


    </section>
  );
}

export default About;
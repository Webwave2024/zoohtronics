import { ArrowRight, ArrowUpRight, Mail } from "lucide-react";
import Brand from "./Brand";

const currentYear = new Date().getFullYear();

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer__main">
        <div className="site-footer__brand">
          <Brand footer />
          <span className="site-footer__eyebrow">QUALITY-CHECKED REFURBISHED TECH</span>
          <p>Better tech, with a little more life in it.</p>
        </div>
        <nav className="site-footer__links" aria-label="Footer navigation">
          <div>
            <strong>Explore</strong>
            <a href="/products">Shop all laptops <ArrowRight size={13} /></a>
            <a href="/#our-promise">Why refurbished</a>
          </div>
          <div>
            <strong>Help</strong>
            <a href="/#home-faq-title">Frequently asked questions</a>
            <a href="mailto:hello@zohntronics.com">Contact us</a>
          </div>
        </nav>
        <div className="site-footer__contact">
          <span>Have a question?</span>
          <a href="mailto:hello@zohntronics.com"><Mail size={16} /> hello@zohntronics.com <ArrowUpRight size={14} /></a>
        </div>
      </div>
      <div className="site-footer__bottom">
        <span>© {currentYear} Zohntronics</span>
        <span>Thoughtfully renewed. Ready for what’s next.</span>
      </div>
    </footer>
  );
}

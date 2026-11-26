import { Link } from "react-router-dom";

export default function Brand({ footer = false }) {
  return (
    <Link
      className={`brand${footer ? " brand--footer" : ""}`}
      to="/"
      aria-label="Zohntronics home"
    >
      <img src="/zohaantronics.jpeg" alt="logo" />
      <span>ZOHNTRONICS</span>
    </Link>
  );
}

export default function BrandMark({ className = "" }) {
  return <img src={`${import.meta.env.BASE_URL}unicheck-logo.png`} alt="UniCheck" className={`brand-logo ${className}`} />;
}

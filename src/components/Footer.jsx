import './Footer.css'

function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-bottom">
          <p className="footer-copyright">
            © {currentYear} <span className="brand-quran">Quran</span><span className="brand-nerds">Nerds</span>. All rights reserved.
          </p>
          <p className="footer-developed">
            Developed by <a href="https://abdussamiakanda.com" target="_blank" rel="noopener noreferrer" className="footer-developed-link">Md Abdus Sami Akanda</a>
          </p>
        </div>
      </div>
    </footer>
  )
}

export default Footer


import React from "react";
import { Github, Instagram, Linkedin, Heart, Twitter } from "lucide-react";

// CSS variables injected via a style tag to simulate the theme
const theme = `
  /* Footer */
  footer {
    position: relative;
    background-color: #0f172a; /* Slate 900 */
    color: #94a3b8; /* Slate 400 */
    padding: 64px 24px 48px;
    font-family: 'Inter', sans-serif;
  }

  .footer-inner {
    max-width: 1200px;
    margin: 0 auto;
  }

  /* Top section */
  .footer-top {
    display: grid;
    grid-template-columns: 1fr 2fr;
    gap: 64px;
    margin-bottom: 64px;
  }

  /* Brand block */
  .brand .logo {
    font-size: 48px;
    font-weight: 700;
    color: #f8fafc; /* Slate 50 */
    letter-spacing: -0.02em;
    margin-bottom: 8px;
    display: flex;
    align-items: center;
  }
  .brand .logo span {
    color: #3b82f6; /* Blue 500 */
  }
  .brand .tagline {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.25em;
    text-transform: uppercase;
    color: #94a3b8;
    margin-bottom: 24px;
  }
  .brand .description {
    font-size: 15px;
    line-height: 1.6;
    color: #94a3b8;
    max-width: 360px;
    margin-bottom: 32px;
  }

  /* Social icons */
  .socials {
    display: flex;
    gap: 12px;
  }
  .social-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    border: 1px solid #1e293b; /* Slate 800 */
    background: #1e293b;
    color: #94a3b8;
    transition: all 0.2s ease;
  }
  .social-btn:hover {
    border-color: #334155;
    background: #334155;
    color: #f8fafc;
  }
  .social-btn svg {
    width: 18px;
    height: 18px;
  }

  /* Nav columns */
  .nav-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 32px;
  }
  .nav-col h4 {
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #f8fafc;
    margin-bottom: 24px;
  }
  .nav-col ul {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .nav-col ul li a {
    font-size: 14px;
    color: #94a3b8;
    text-decoration: none;
    transition: color 0.2s ease;
  }
  .nav-col ul li a:hover {
    color: #f8fafc;
  }

  /* Divider */
  .footer-divider {
    height: 1px;
    background-color: #1e293b;
    margin-bottom: 32px;
  }

  /* Bottom bar */
  .footer-bottom {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 24px;
  }
  .bottom-left {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .copyright {
    font-size: 12px;
    font-weight: 500;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: #64748b; /* Slate 500 */
  }
  .legal-links {
    display: flex;
    gap: 24px;
  }
  .legal-links a {
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: #64748b;
    text-decoration: underline;
    text-underline-offset: 4px;
    text-decoration-color: #334155;
    transition: all 0.2s ease;
  }
  .legal-links a:hover {
    color: #94a3b8;
    text-decoration-color: #475569;
  }
  .bottom-right .made-with {
    font-size: 13px;
    color: #94a3b8;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .heart {
    color: #ef4444;
    fill: #ef4444;
    width: 14px;
    height: 14px;
  }

  @media (max-width: 968px) {
    .footer-top {
      grid-template-columns: 1fr;
      gap: 48px;
    }
    .nav-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
  @media (max-width: 640px) {
    .nav-grid {
      grid-template-columns: 1fr;
    }
    .footer-bottom {
      flex-direction: column;
    }
    .bottom-right {
      order: -1;
    }
  }
`;

const SocialLink = ({ href, label, children }) => (
  <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className="social-btn">
    {children}
  </a>
);

const Footer = () => {
  const navColumns = [
    {
      title: "Product",
      links: ["Browse", "New Releases", "Top Rated", "Watchlist"],
    },
    {
      title: "Resources",
      links: ["Documentation", "Tutorials", "Blog", "Support"],
    },
    {
      title: "Company",
      links: ["About", "Careers", "Contact", "Partners"],
    },
  ];

  return (
    <>
      <style>{theme}</style>
      <footer>
        <div className="footer-inner">
          <div className="footer-top">
            {/* Brand + Description + Socials */}
            <div className="brand">
              <div className="logo">Film<span>Flix</span></div>
              <p className="tagline">Cinema, Curated.</p>
              <p className="description">
                FilmFlix empowers cinephiles to discover compelling films — making
                great cinema easier to find, explore, and enjoy.
              </p>
              <div className="socials">
                <SocialLink href="https://twitter.com" label="X (Twitter)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4l11.733 16H20L8.267 4z" />
                    <path d="M4 20l6.768-6.768m2.46-2.46L20 4" />
                  </svg>
                </SocialLink>
                <SocialLink href="https://instagram.com" label="Instagram">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                    <circle cx="12" cy="12" r="4"/>
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                  </svg>
                </SocialLink>
                <SocialLink href="https://linkedin.com" label="LinkedIn">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6z"/>
                    <rect x="2" y="9" width="4" height="12"/>
                    <circle cx="4" cy="4" r="2"/>
                  </svg>
                </SocialLink>
                <SocialLink href="https://github.com" label="GitHub">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 00-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0020 4.77 5.07 5.07 0 0019.91 1S18.73.65 16 2.48a13.38 13.38 0 00-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 005 4.77a5.44 5.44 0 00-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 009 18.13V22"/>
                  </svg>
                </SocialLink>
              </div>
            </div>

            {/* Nav columns */}
            <div className="nav-grid">
              {navColumns.map((col) => (
                <div key={col.title} className="nav-col">
                  <h4>{col.title}</h4>
                  <ul>
                    {col.links.map((link) => (
                      <li key={link}><a href="#">{link}</a></li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div className="footer-divider" />

          {/* Bottom bar */}
          <div className="footer-bottom">
            <div className="bottom-left">
              <p className="copyright">© {new Date().getFullYear()} FILMFLIX. ALL RIGHTS RESERVED.</p>
              <div className="legal-links">
                <a href="#">Privacy Policy</a>
                <a href="#">Terms of Service</a>
                <a href="#">Cookies Settings</a>
              </div>
            </div>
            
            <div className="bottom-right">
              <p className="made-with">
                Built with{" "}
                <svg viewBox="0 0 24 24" className="heart">
                  <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
                </svg>
                {" "}by arshiya
              </p>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
};

export default Footer;
"use client";

import { useState, useEffect } from "react";
import { List } from "lucide-react";

const chapters = [
  { href: "#plan", label: "平面圖" },
  { href: "#ceiling-elevation", label: "天花與立面" },
  { href: "#perspective", label: "透視圖" },
  { href: "#detail", label: "大樣圖" },
];

export function FloatingTOC() {
  const [visible, setVisible] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 280);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div
      className={`floating-toc ${visible ? "floating-toc--visible" : ""}`}
      aria-label="快速導覽"
    >
      <button
        className="floating-toc__trigger"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="開啟導覽選單"
        type="button"
      >
        <List size={16} aria-hidden="true" />
        <span>導覽</span>
      </button>

      {open && (
        <nav className="floating-toc__menu" aria-label="章節導覽">
          <ul>
            {chapters.map((c) => (
              <li key={c.href}>
                <a
                  href={c.href}
                  className="floating-toc__link"
                  onClick={() => setOpen(false)}
                >
                  {c.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}

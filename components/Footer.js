"use client";

<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 148a7889b85a493e51b548db69afb7482d0d305d
import React, { useState } from "react";
import Link from "next/link";
import { 
  BookOpen, 
  Mail, 
  Phone, 
  ArrowUpRight, 
  Github, 
  Twitter, 
  Linkedin, 
  Youtube, 
  Heart, 
  Sparkles, 
  ExternalLink,
  Keyboard 
<<<<<<< HEAD
=======
import { useState } from "react";
=======
import { useState, useEffect } from "react";
>>>>>>> 148a7889b85a493e51b548db69afb7482d0d305d
import Link from "next/link";
import { 
  BookOpen, ArrowUpRight, Github, Twitter, 
  Linkedin, Youtube, Heart, Sparkles, Keyboard, ExternalLink 
<<<<<<< HEAD
>>>>>>> upstream/master
=======
>>>>>>> 148a7889b85a493e51b548db69afb7482d0d305d
} from "lucide-react";
import { motion } from "framer-motion";
import { CONTACT_INFO } from "../constants/contact";

// Animated link component
function FooterLink({ href, children, external = false }) {
  const LinkComponent = external ? "a" : Link;
  const externalProps = external ? { target: "_blank", rel: "noopener noreferrer" } : {};

  return (
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 148a7889b85a493e51b548db69afb7482d0d305d
    <motion.li
      whileHover={{ x: 4 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="list-none"
    >
      <LinkComponent
        href={href}
        {...externalProps}
        className="group flex items-center gap-2 text-sm text-slate-300 transition-colors duration-300 hover:text-purple-400"
      >
<<<<<<< HEAD
=======
    <motion.li whileHover={{ x: 4 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
      <LinkComponent href={href} {...externalProps} className="group flex items-center gap-2 text-sm text-slate-300 transition-colors duration-300 hover:text-white">
>>>>>>> upstream/master
=======
    <motion.li whileHover={{ x: 4 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
      <LinkComponent href={href} {...externalProps} className="group flex items-center gap-2 text-sm text-slate-300 transition-colors duration-300 hover:text-white">
>>>>>>> 148a7889b85a493e51b548db69afb7482d0d305d
        <span className="relative">
          {children}
          <span className="absolute -bottom-0.5 left-0 h-px w-0 bg-gradient-to-r from-purple-400 to-blue-400 transition-all duration-300 group-hover:w-full" />
        </span>
        <ArrowUpRight size={12} className="opacity-0 transition-all duration-300 group-hover:opacity-100" />
      </LinkComponent>
    </motion.li>
  );
}

// Social icon button
function SocialIcon({ href, icon: Icon, label, glowColor = "purple" }) {
  const glowMap = {
    purple: "hover:shadow-purple-500/30 hover:border-purple-500/50 hover:text-purple-400",
    blue: "hover:shadow-blue-500/30 hover:border-blue-500/50 hover:text-blue-400",
    red: "hover:shadow-red-500/30 hover:border-red-500/50 hover:text-red-400",
  };

  return (
    <motion.a href={href} target="_blank" rel="noopener noreferrer" aria-label={label}
      whileHover={{ scale: 1.15, y: -3 }} whileTap={{ scale: 0.95 }}
      className={`flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-200 backdrop-blur-sm transition-all duration-300 hover:shadow-lg ${glowMap[glowColor]}`}
    >
      <Icon size={18} />
    </motion.a>
  );
}

<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 148a7889b85a493e51b548db69afb7482d0d305d
// Stagger animation wrappers
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};
<<<<<<< HEAD

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" },
  },
};
=======
const itemVariants = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } };
>>>>>>> upstream/master
=======
const itemVariants = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } };

export default function Footer() {
  const [currentYear, setCurrentYear] = useState(2026);
>>>>>>> 148a7889b85a493e51b548db69afb7482d0d305d

export default function Footer() {
  const currentYear = new Date().getFullYear();
  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  const [hoveredBrandLetter, setHoveredBrandLetter] = useState(null);

  const quickLinks = [
    { label: "Home", href: "/" },
    { label: "Productivity", href: "/productivity" },
    { label: "Activities", href: "/activity" },
    { label: "Contact", href: "/contact" },
    { label: "Register", href: "/register" },
    { label: "Contributors", href: "/contributors" },
    { label: "Terms & Conditions", href: "/terms" },
    { label: "Streaks", href: "/streaks" },
  ];

  const sectionLinks = [
    { label: "Mission", href: "/mission" },
    { label: "Values", href: "/values" },
    { label: "Productivity", href: "/#productivity" },
    { label: "Impact", href: "/#impact" },
  ];

  const socialLinks = [
    { icon: Github, href: "https://github.com/Premshaw23/Learnova", label: "GitHub", glow: "purple" },
    { icon: Twitter, href: "https://twitter.com/learnova", label: "Twitter", glow: "blue" },
    { icon: Linkedin, href: "https://linkedin.com/company/learnova", label: "LinkedIn", glow: "blue" },
    { icon: Youtube, href: "https://youtube.com/@learnova", label: "YouTube", glow: "red" },
  ];

  const brandLetters = "LEARNOVA".split("");

  return (
    <footer className="relative overflow-hidden border-t border-border/70 bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.16),transparent_38%),linear-gradient(180deg,rgba(9,9,11,0.94),rgba(3,7,18,1))] text-foreground transition-colors duration-300">
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 148a7889b85a493e51b548db69afb7482d0d305d
      {/* ── Decorative background effects ── */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -top-20 left-6 h-48 w-48 rounded-full bg-fuchsia-500/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-56 w-56 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute -top-32 left-1/4 h-64 w-64 rounded-full bg-purple-500/8 blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 h-72 w-72 rounded-full bg-blue-500/8 blur-[100px]" />
      </div>

      {/* ── Main footer content ── */}
      <motion.div
        className="relative mx-auto max-w-7xl px-6 pt-16 pb-10"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-50px" }}
      >
        <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-4">
          
          {/* ── Brand Column ── */}
          <motion.div className="space-y-6" variants={itemVariants}>
<<<<<<< HEAD
=======
=======
>>>>>>> 148a7889b85a493e51b548db69afb7482d0d305d
      <div className="relative mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-8 rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl lg:grid-cols-[1.3fr_0.9fr_0.9fr_1fr]">
          
          {/* Brand Column */}
          <div className="space-y-6">
<<<<<<< HEAD
>>>>>>> upstream/master
=======
>>>>>>> 148a7889b85a493e51b548db69afb7482d0d305d
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500/20 to-cyan-500/20 ring-1 ring-white/10">
                <BookOpen className="h-5 w-5 text-fuchsia-200" />
              </span>
              <div>
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 148a7889b85a493e51b548db69afb7482d0d305d
                <p className="text-xl font-semibold tracking-tight text-white">Learnova</p>
                <p className="text-xs uppercase tracking-[0.32em] text-fuchsia-200/80 font-medium">
                  Smart Learning
                </p>
              </div>
            </div>
            
            <p className="max-w-md text-sm leading-6 text-slate-300">
              AI-powered engagement and smart attendance for modern campuses.
              Build consistent learning outcomes with real-time insights and a calmer, more connected workflow.
            </p>

            {/* Social Icons */}
            <div className="flex items-center gap-3 pt-2">
              {socialLinks.map((social) => (
                <SocialIcon
                  key={social.label}
                  href={social.href}
                  icon={social.icon}
                  label={social.label}
                  glowColor={social.glow}
                />
              ))}
            </div>
          </motion.div>

          {/* ── Quick Links Column ── */}
          <motion.div className="space-y-4" variants={itemVariants}>
            <h3 className="text-sm font-semibold uppercase tracking-[0.28em] text-white/90 flex items-center gap-2">
              <span className="h-px w-4 bg-gradient-to-r from-purple-500 to-transparent" />
              Quick Links
            </h3>
            <ul className="space-y-3">
              {quickLinks.map((link) => (
                <FooterLink key={link.href} href={link.href}>
                  {link.label}
                </FooterLink>
              ))}
              <li>
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent("learnova:open-shortcuts"))}
                  className="group inline-flex items-center gap-2 text-left text-sm text-slate-300 transition-colors hover:text-white"
                >
                  <Keyboard className="h-4 w-4 text-fuchsia-200" />
                  <span>Keyboard Shortcuts</span>
                </button>
<<<<<<< HEAD
=======
=======
>>>>>>> 148a7889b85a493e51b548db69afb7482d0d305d
                <p className="text-xl font-semibold text-white">Learnova</p>
                <p className="text-xs uppercase tracking-[0.32em] text-fuchsia-200/80">Smart Learning</p>
              </div>
            </div>
            <p className="text-sm text-slate-300 leading-6 max-w-xs">AI-powered engagement and smart attendance for modern campuses.</p>
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/register" className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition-transform duration-200 hover:-translate-y-0.5">
                Get Started <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="flex items-center gap-3">
              {socialLinks.map((s) => <SocialIcon key={s.label} {...s} />)}
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-5">
            <h3 className="text-sm font-semibold uppercase tracking-[0.28em] text-white/90">Quick Links</h3>
            <ul className="space-y-3">
              {quickLinks.map((link) => <FooterLink key={link.href} href={link.href}>{link.label}</FooterLink>)}
              <li onClick={() => window.dispatchEvent(new CustomEvent("learnova:open-shortcuts"))} className="cursor-pointer group flex items-center gap-2 text-sm text-slate-300 hover:text-white">
                <Keyboard className="h-4 w-4 text-fuchsia-200" /> Keyboard Shortcuts
<<<<<<< HEAD
>>>>>>> upstream/master
=======
>>>>>>> 148a7889b85a493e51b548db69afb7482d0d305d
              </li>
            </ul>
          </div>

<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 148a7889b85a493e51b548db69afb7482d0d305d
          {/* ── Sections Column ── */}
          <motion.div className="space-y-4" variants={itemVariants}>
            <h3 className="text-sm font-semibold uppercase tracking-[0.28em] text-white/90 flex items-center gap-2">
              <span className="h-px w-4 bg-gradient-to-r from-blue-500 to-transparent" />
              Sections
            </h3>
            <ul className="space-y-3">
              {sectionLinks.map((link) => (
                <FooterLink key={link.href} href={link.href}>
                  {link.label}
                </FooterLink>
              ))}
            </ul>
          </motion.div>

          {/* ── Contact Column ── */}
          <motion.div className="space-y-4" variants={itemVariants}>
            <h3 className="text-sm font-semibold uppercase tracking-[0.28em] text-white/90 flex items-center gap-2">
              <span className="h-px w-4 bg-gradient-to-r from-indigo-500 to-transparent" />
              Contact
            </h3>
            <ul className="space-y-3">
              <li>
                <motion.a
                  href="mailto:shawprem217@gmail.com"
                  className="group flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 text-sm text-slate-300 transition-all duration-300 hover:border-purple-500/30 hover:bg-purple-500/5 hover:text-purple-400"
                  whileHover={{ scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <Mail className="h-4 w-4 text-purple-400/70 transition-colors group-hover:text-purple-400" />
                  <span className="truncate">shawprem217@gmail.com</span>
                </motion.a>
              </li>
              <li>
                <motion.a
                  href={`tel:${CONTACT_INFO?.phone?.replace(/\s+/g, "") || ""}`}
                  className="group flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 text-sm text-slate-300 transition-all duration-300 hover:border-blue-500/30 hover:bg-blue-500/5 hover:text-blue-400"
                  whileHover={{ scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <Phone className="h-4 w-4 text-blue-400/70 transition-colors group-hover:text-blue-400" />
                  <span>{CONTACT_INFO?.phoneDisplay || CONTACT_INFO?.phone || "N/A"}</span>
                </motion.a>
              </li>
            </ul>

            {/* Premium Interactive Context Widget */}
            <motion.div
              className="mt-4 rounded-2xl border border-white/10 bg-gradient-to-br from-purple-500/5 via-transparent to-blue-500/5 p-4 backdrop-blur-sm"
              whileHover={{ borderColor: "rgba(168,85,247,0.3)" }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-purple-400" />
                <span className="text-xs font-semibold text-white">Stay Updated</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Get the latest updates on features and improvements.
              </p>
              <Link
                href="/contact"
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-purple-400 transition-colors hover:text-purple-300"
              >
                Get in touch
                <ExternalLink size={11} />
              </Link>
            </motion.div>
          </motion.div>
        </div>

        {/* ── Bottom Bar ── */}
        <motion.div
          className="mt-14 flex flex-col gap-4 border-t border-white/10 pt-8 sm:flex-row sm:items-center sm:justify-between"
          variants={itemVariants}
        >
          <p className="text-sm text-slate-400">
            © {currentYear} Learnova. All rights reserved.
          </p>
          <div className="flex flex-wrap items-center gap-4 text-xs uppercase tracking-[0.2em] text-slate-400">
            <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-fuchsia-200/90">
              <Heart size={10} className="fill-fuchsia-400/80 text-fuchsia-400" />
              Trusted by educators
<<<<<<< HEAD
=======
=======
>>>>>>> 148a7889b85a493e51b548db69afb7482d0d305d
          {/* Sections */}
          <div className="space-y-5">
            <h3 className="text-sm font-semibold uppercase tracking-[0.28em] text-white/90">Sections</h3>
            <ul className="space-y-3">
              {sectionLinks.map((link) => <FooterLink key={link.href} href={link.href}>{link.label}</FooterLink>)}
            </ul>
          </div>

          {/* Contact Column with Integrated Modern Campus Card */}
          <div className="space-y-6">
            <h3 className="text-sm font-semibold uppercase tracking-[0.28em] text-white/90">Contact</h3>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-slate-300 space-y-2">
              <p>Email: {CONTACT_INFO.email}</p>
              <p>Phone: {CONTACT_INFO.phone}</p>
              <Link href="/contact" className="flex items-center gap-1 text-purple-400">Get in touch <ExternalLink size={11}/></Link>
            </div>
            
            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-fuchsia-500/10 via-transparent to-cyan-500/10 p-4">
              <div className="flex items-start gap-3">
                <Sparkles className="h-4 w-4 text-fuchsia-200 mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-white">Built for modern campuses</p>
                  <p className="text-[10px] leading-5 text-slate-300">Track attendance, reduce admin load, and keep every stakeholder aligned.</p>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Bar with Pill Elements */}
        <motion.div className="mt-12 flex flex-col gap-4 border-t border-white/10 pt-8 sm:flex-row sm:items-center sm:justify-between" variants={itemVariants}>
          <p className="text-sm text-slate-400">© {currentYear} Learnova. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-3 text-[10px] uppercase tracking-[0.24em] text-slate-400">
            <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-purple-200">
              <Heart size={10} className="fill-purple-400/80" /> Trusted by educators
<<<<<<< HEAD
>>>>>>> upstream/master
=======
>>>>>>> 148a7889b85a493e51b548db69afb7482d0d305d
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-slate-200">
              Built for modern classrooms
            </span>
          </div>
        </motion.div>

<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 148a7889b85a493e51b548db69afb7482d0d305d
      {/* ── Large Backdrop Interactive Branding text ── */}
      <div className="relative overflow-hidden border-t border-white/5">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <div
            className="flex items-center justify-center select-none"
            aria-hidden="true"
          >
            {brandLetters.map((letter, i) => (
              <motion.span
                key={i}
                className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-black tracking-tight cursor-default"
                style={{
                  WebkitTextStroke: hoveredBrandLetter === i ? "1px rgba(168,85,247,0.5)" : "1px rgba(255,255,255,0.06)",
                  color: hoveredBrandLetter === i ? "rgba(168,85,247,0.15)" : "transparent",
                  transition: "all 0.3s ease",
                }}
                onMouseEnter={() => setHoveredBrandLetter(i)}
                onMouseLeave={() => setHoveredBrandLetter(null)}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{
                  delay: i * 0.06,
                  duration: 0.5,
                  ease: "easeOut",
                }}
                whileHover={{
                  scale: 1.1,
                  transition: { duration: 0.2 },
                }}
              >
                {letter}
              </motion.span>
            ))}
          </div>
<<<<<<< HEAD
=======
=======
>>>>>>> 148a7889b85a493e51b548db69afb7482d0d305d
        {/* Brand Animation */}
        <div className="mt-16 flex justify-center select-none overflow-hidden">
          {brandLetters.map((letter, i) => (
            <span key={i} className="text-[10vw] font-black text-white/5 cursor-default hover:text-purple-400/30 transition-all"
                  onMouseEnter={() => setHoveredBrandLetter(i)} onMouseLeave={() => setHoveredBrandLetter(null)}>
              {letter}
            </span>
          ))}
<<<<<<< HEAD
>>>>>>> upstream/master
=======
>>>>>>> 148a7889b85a493e51b548db69afb7482d0d305d
        </div>
      </div>
    </footer>
  );
}
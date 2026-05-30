'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import Dropdown from '../ui/Dropdown';
import { 
  Mail, 
  Phone, 
  MapPin, 
  Facebook, 
  Twitter, 
  Linkedin, 
  Instagram,
  Github,
  Shield,
  Award,
  Users,
  CreditCard,
  Wallet,
  TrendingUp,
  Target,
  Building2,
  Heart,
  Lock,
  Globe
} from 'lucide-react';
import AnimatedLogo from '../ui/AnimatedLogo';

export const Footer: React.FC = () => {
  const [selectedLanguage, setSelectedLanguage] = useState('en-US');
  const currentYear = new Date().getFullYear();

  const handleLinkClick = (_section: string, _link: string) => {
  };

  const footerSections = {
    product: {
      title: 'Product',
      links: [
        { name: 'Dashboard', href: '/dashboard', icon: <Wallet size={16} /> },
        { name: 'Accounts', href: '/accounts', icon: <CreditCard size={16} /> },
        { name: 'Cards', href: '/cards', icon: <CreditCard size={16} /> },
        { name: 'Business', href: '/business', icon: <Building2 size={16} /> },
      ],
    },
    services: {
      title: 'Services',
      links: [
        { name: 'Transfers', href: '/transfer', icon: <TrendingUp size={16} /> },
        { name: 'P2P Payments', href: '/p2p', icon: <Users size={16} /> },
        { name: 'Budgeting', href: '/budget', icon: <Target size={16} /> },
        { name: 'Goals', href: '/goals', icon: <Award size={16} /> },
      ],
    },
    insights: {
      title: 'Insights',
      links: [
        { name: 'Analytics', href: '/analytics', icon: <TrendingUp size={16} /> },
        { name: 'Transactions', href: '/transactions', icon: <Heart size={16} /> },
        { name: 'Subscriptions', href: '/subscriptions', icon: <Building2 size={16} /> },
      ],
    },
    account: {
      title: 'Account',
      links: [
        { name: 'Settings', href: '/settings', icon: <Lock size={16} /> },
        { name: 'Security', href: '/security', icon: <Shield size={16} /> },
      ],
    },
  };

  const socialLinks = [
    { name: 'Facebook', icon: <Facebook size={20} />, href: 'https://facebook.com' },
    { name: 'Twitter', icon: <Twitter size={20} />, href: 'https://twitter.com' },
    { name: 'LinkedIn', icon: <Linkedin size={20} />, href: 'https://linkedin.com' },
    { name: 'Instagram', icon: <Instagram size={20} />, href: 'https://instagram.com' },
    { name: 'GitHub', icon: <Github size={20} />, href: 'https://github.com' },
  ];

  return (
    <footer className="glass-header relative border-t border-[var(--border-1)]">
      <div className="container mx-auto px-4 py-12">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8 mb-12">
          {/* Company Info */}
          <div className="lg:col-span-2">
            <div className="mb-6">
              <AnimatedLogo size="sm" showText={true} />
            </div>
            <p className="text-sm text-[var(--text-2)] mb-6 max-w-sm">
              Your trusted partner in digital banking. Secure, fast, and reliable financial services 
              for individuals and businesses worldwide.
            </p>
            <div className="space-y-3">
              <a 
                href="mailto:support@financehub.com" 
                className="flex items-center gap-2 text-sm text-[var(--text-2)] hover:text-[var(--text-1)] transition-colors"
                onClick={() => handleLinkClick('contact', 'email')}
              >
                <Mail size={16} />
                support@financehub.com
              </a>
              <a 
                href="tel:+1-800-123-4567" 
                className="flex items-center gap-2 text-sm text-[var(--text-2)] hover:text-[var(--text-1)] transition-colors"
                onClick={() => handleLinkClick('contact', 'phone')}
              >
                <Phone size={16} />
                +1 (800) 123-4567
              </a>
              <div className="flex items-center gap-2 text-sm text-[var(--text-2)]">
                <MapPin size={16} />
                123 Finance Street, NY 10001
              </div>
            </div>
          </div>

          {/* Footer Sections */}
          {Object.entries(footerSections).map(([key, section]) => (
            <div key={key}>
              <h3 className="font-semibold text-[var(--text-1)] mb-4">{section.title}</h3>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.name}>
                    <Link 
                      href={link.href}
                      className="flex items-center gap-2 text-sm text-[var(--text-2)] hover:text-[var(--text-1)] transition-colors group"
                      onClick={() => handleLinkClick(key, link.name)}
                    >
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                        {link.icon}
                      </span>
                      <span className="group-hover:translate-x-1 transition-transform">
                        {link.name}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Certifications and Trust Badges */}
        <div className="py-8 border-t border-[var(--border-1)] mb-8">
          <div className="flex flex-wrap items-center justify-center gap-8">
            <div className="flex items-center gap-2 text-sm text-[var(--text-2)]">
              <Shield className="text-[var(--primary-emerald)]" size={20} />
              <span>Bank-level Security</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-[var(--text-2)]">
              <Award className="text-[var(--primary-blue)]" size={20} />
              <span>FDIC Insured</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-[var(--text-2)]">
              <Lock className="text-[var(--primary-indigo)]" size={20} />
              <span>256-bit Encryption</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-[var(--text-2)]">
              <Users className="text-[var(--primary-teal)]" size={20} />
              <span>10M+ Users</span>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Copyright */}
          <div className="text-sm text-[var(--text-2)]">
            © {currentYear} FinanceHub. All rights reserved.
          </div>

          {/* Social Links */}
          <div className="flex items-center gap-4">
            {socialLinks.map((social) => (
              <motion.a
                key={social.name}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-[rgba(var(--glass-rgb),0.3)] backdrop-blur-sm 
                         border border-[var(--border-1)] text-[var(--text-2)] 
                         hover:text-[var(--text-1)] hover:border-[var(--primary-blue)] 
                         transition-all duration-300"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleLinkClick('social', social.name)}
                aria-label={social.name}
              >
                {social.icon}
              </motion.a>
            ))}
          </div>

          {/* Language/Region Selector */}
          <div className="flex items-center gap-2 text-sm text-[var(--text-2)]">
            <Globe className="w-4 h-4" />
            <Dropdown
              value={selectedLanguage}
              onChange={(value) => {
                setSelectedLanguage(value);
                handleLinkClick('language', value);
              }}
              items={[
                { value: 'en-US', label: 'English (US)' },
                { value: 'es-ES', label: 'Español' },
                { value: 'fr-FR', label: 'Français' },
                { value: 'de-DE', label: 'Deutsch' },
                { value: 'zh-CN', label: '中文' },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Decorative gradient line */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r 
                   from-[var(--primary-blue)] via-[var(--primary-indigo)] to-[var(--primary-emerald)]"
        style={{ opacity: 0.5 }}
      />
    </footer>
  );
};

export default Footer;

import React from 'react';

interface BrandIconProps {
  name: string;
  className?: string;
  size?: number;
}

export const BrandIcon: React.FC<BrandIconProps> = ({ name, className = 'w-5 h-5', size = 20 }) => {
  const norm = (name || '').toLowerCase().trim();

  // Google
  if (norm.includes('google') || norm.includes('gmail')) {
    return (
      <svg className={className} width={size} height={size} viewBox="0 0 24 24">
        <path
          fill="#4285F4"
          d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
        />
        <path
          fill="#34A853"
          d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.15C3.26 21.36 7.33 24 12 24z"
        />
        <path
          fill="#FBBC05"
          d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.58H1.24C.45 8.16 0 9.97 0 12c0 2.03.45 3.84 1.24 5.42l4.04-3.15z"
        />
        <path
          fill="#EA4335"
          d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.24 6.58l4.04 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
        />
      </svg>
    );
  }

  // GitHub
  if (norm.includes('github')) {
    return (
      <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
        />
      </svg>
    );
  }

  // Facebook / Meta
  if (norm.includes('facebook') || norm.includes('meta')) {
    return (
      <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="#1877F2">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    );
  }

  // Microsoft / Azure / Outlook
  if (norm.includes('microsoft') || norm.includes('azure') || norm.includes('outlook') || norm.includes('office')) {
    return (
      <svg className={className} width={size} height={size} viewBox="0 0 24 24">
        <path fill="#F25022" d="M1 1h10v10H1z" />
        <path fill="#00A4EF" d="M1 13h10v10H1z" />
        <path fill="#7FBA00" d="M13 1h10v10H13z" />
        <path fill="#FFB900" d="M13 13h10v10H13z" />
      </svg>
    );
  }

  // Discord
  if (norm.includes('discord')) {
    return (
      <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="#5865F2">
        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
      </svg>
    );
  }

  // Amazon / AWS
  if (norm.includes('amazon') || norm.includes('aws')) {
    return (
      <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="#FF9900">
        <path d="M13.882 17.514c-4.471 3.297-10.963 1.761-13.882 0-.256-.164-.047-.534.254-.367 2.923 1.583 8.877 2.483 12.753-.559.421-.334.908.435.875.926zm1.261-2.404c-.389-.5-2.583-.243-3.574-.131-.3-.028-.347-.282-.078-.484 1.745-1.309 4.606-.931 4.938-.515.332.416-.089 3.298-1.74 4.708-.255.217-.5.101-.387-.184.372-.942 1.23-2.894.841-3.394zM16.96 4.755c-1.942-1.36-4.577-1.638-6.938-1.282-2.361.356-4.53 1.579-5.992 3.407-.225.281.045.568.324.385 1.599-1.046 3.473-1.674 5.419-1.815 1.946-.141 3.91.22 5.641 1.037.288.136.634-.144.472-.416-.252-.423-.578-.888-.926-1.316z" />
      </svg>
    );
  }

  // Twitter / X
  if (norm.includes('twitter') || norm.includes('x.com') || norm === 'x') {
    return (
      <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    );
  }

  // Steam
  if (norm.includes('steam')) {
    return (
      <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="#171A21">
        <path
          fill="#1A9FFF"
          d="M12 2C6.477 2 2 6.477 2 12c0 4.237 2.636 7.855 6.356 9.312l2.673-3.878A4.975 4.975 0 0 1 11 16c0-2.757 2.243-5 5-5 .421 0 .827.054 1.215.155l3.477-5.045C18.665 3.705 15.539 2 12 2z"
        />
        <circle cx="16" cy="16" r="3" fill="#FFFFFF" />
      </svg>
    );
  }

  // Apple
  if (norm.includes('apple') || norm.includes('icloud')) {
    return (
      <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.54c.64-.78 1.08-1.87.96-2.96-.93.04-2.07.62-2.73 1.4-.58.67-1.1 1.77-.96 2.83 1.04.08 2.09-.49 2.73-1.27z" />
      </svg>
    );
  }

  // Binance / Crypto
  if (norm.includes('binance') || norm.includes('crypto')) {
    return (
      <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="#F3BA2F">
        <path d="M16.624 13.92l2.715 2.715-7.34 7.34-7.34-7.34 2.715-2.715 4.625 4.625 4.626-4.625zm-4.624-9.3L7.375 9.245l4.625 4.625 4.626-4.625L12 4.62zm7.34 7.34l2.715 2.715-2.715 2.715-2.715-2.715 2.715-2.715zM4.66 11.96l2.715 2.715-2.715 2.715-2.715-2.715 2.715-2.715z" />
      </svg>
    );
  }

  // Cloudflare
  if (norm.includes('cloudflare')) {
    return (
      <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="#F38020">
        <path d="M18.3 11.1c-.2-.9-.8-1.7-1.6-2.2-.8-.5-1.8-.7-2.7-.4-.8-1.5-2.2-2.5-3.9-2.7-1.6-.2-3.3.4-4.3 1.7-.8-.4-1.7-.5-2.6-.3-.9.2-1.7.8-2.2 1.5-.7 1-1 2.3-.7 3.5.3 1.2 1.1 2.2 2.2 2.8h15c1-.1 1.9-.7 2.4-1.5.5-.9.6-2 .2-3-.3-.9-.9-1.6-1.8-1.9z" />
      </svg>
    );
  }

  // OpenAI
  if (norm.includes('openai') || norm.includes('chatgpt')) {
    return (
      <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="#10A37F">
        <path d="M22.28 9.68a5.55 5.55 0 0 0-.48-4.62 5.67 5.67 0 0 0-4.04-2.83 5.68 5.68 0 0 0-5.74 1.78A5.63 5.63 0 0 0 7.4 2.8a5.67 5.67 0 0 0-4.04 2.83 5.66 5.66 0 0 0 .52 6.07 5.63 5.63 0 0 0-.48 4.62 5.67 5.67 0 0 0 4.04 2.83 5.69 5.69 0 0 0 5.74-1.78 5.64 5.64 0 0 0 4.62 1.21 5.67 5.67 0 0 0 4.04-2.83 5.66 5.66 0 0 0-.56-6.07zM12 15a3 3 0 1 1 3-3 3 3 0 0 1-3 3z" />
      </svg>
    );
  }

  // Reddit
  if (norm.includes('reddit')) {
    return (
      <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="#FF4500">
        <circle cx="12" cy="12" r="10" />
        <path
          fill="#FFF"
          d="M19.1 11.2c-.3-.3-.7-.5-1.1-.5-.4 0-.8.1-1.1.4-1.2-.8-2.8-1.3-4.5-1.4l.8-3.6 2.5.6c0 .6.5 1.1 1.1 1.1.6 0 1.1-.5 1.1-1.1s-.5-1.1-1.1-1.1c-.4 0-.8.2-1 .6l-2.8-.6c-.2 0-.4.1-.5.3l-.9 4.2c-1.8.1-3.4.6-4.6 1.4-.3-.3-.7-.4-1.1-.4-.9 0-1.6.7-1.6 1.6 0 .5.2 1 .6 1.3-.1.4-.1.8-.1 1.2 0 3 3.5 5.4 7.8 5.4s7.8-2.4 7.8-5.4c0-.4 0-.8-.1-1.2.4-.3.6-.8.6-1.3 0-.9-.7-1.6-1.6-1.6zM9.3 12.8c.6 0 1.1.5 1.1 1.1s-.5 1.1-1.1 1.1-1.1-.5-1.1-1.1.5-1.1 1.1-1.1zm5.4 4c-.7.7-2 .7-2.7.7s-2 0-2.7-.7c-.1-.1-.1-.3 0-.4.1-.1.3-.1.4 0 .5.5 1.5.5 2.3.5s1.8 0 2.3-.5c.1-.1.3-.1.4 0 .1.1.1.3 0 .4zm0-1.8c-.6 0-1.1-.5-1.1-1.1s.5-1.1 1.1-1.1 1.1.5 1.1 1.1-.5 1.1-1.1 1.1z"
        />
      </svg>
    );
  }

  // Twitch
  if (norm.includes('twitch')) {
    return (
      <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="#9146FF">
        <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z" />
      </svg>
    );
  }

  // Dropbox
  if (norm.includes('dropbox')) {
    return (
      <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="#0061FF">
        <path d="M6 2L0 6.5l6 4.5 6-4.5L6 2zm12 0l-6 4.5 6 4.5 6-4.5L18 2zM0 15.5l6 4.5 6-4.5-6-4.5-6 4.5zm18-4.5l-6 4.5 6 4.5 6-4.5-6-4.5zM6 21.5l6 4.5 6-4.5-6-4-6 4z" />
      </svg>
    );
  }

  // Default Fallback: First letter badge with cyber green styling
  const initial = name ? name.trim().charAt(0).toUpperCase() : '?';
  return (
    <span className="font-bold text-sm tracking-wider text-[#00FF88]">
      {initial}
    </span>
  );
};

// Preset catalog for quick selection
export interface ServicePreset {
  id: string;
  name: string;
  defaultLabel: string;
  algorithm: 'SHA1' | 'SHA256' | 'SHA512';
  digits: number;
  period: number;
  color: string;
}

export const POPULAR_PRESETS: ServicePreset[] = [
  { id: 'google', name: 'Google', defaultLabel: 'user@gmail.com', algorithm: 'SHA1', digits: 6, period: 30, color: '#4285F4' },
  { id: 'github', name: 'GitHub', defaultLabel: 'username', algorithm: 'SHA1', digits: 6, period: 30, color: '#FFFFFF' },
  { id: 'microsoft', name: 'Microsoft', defaultLabel: 'user@outlook.com', algorithm: 'SHA1', digits: 6, period: 30, color: '#00A4EF' },
  { id: 'facebook', name: 'Facebook', defaultLabel: 'user@facebook.com', algorithm: 'SHA1', digits: 6, period: 30, color: '#1877F2' },
  { id: 'discord', name: 'Discord', defaultLabel: 'username', algorithm: 'SHA1', digits: 6, period: 30, color: '#5865F2' },
  { id: 'amazon', name: 'Amazon / AWS', defaultLabel: 'user@amazon.com', algorithm: 'SHA1', digits: 6, period: 30, color: '#FF9900' },
  { id: 'x', name: 'Twitter / X', defaultLabel: '@handle', algorithm: 'SHA1', digits: 6, period: 30, color: '#FFFFFF' },
  { id: 'steam', name: 'Steam', defaultLabel: 'steam_login', algorithm: 'SHA1', digits: 5, period: 30, color: '#1A9FFF' },
  { id: 'binance', name: 'Binance', defaultLabel: 'crypto_account', algorithm: 'SHA1', digits: 6, period: 30, color: '#F3BA2F' },
  { id: 'openai', name: 'OpenAI', defaultLabel: 'user@openai.com', algorithm: 'SHA1', digits: 6, period: 30, color: '#10A37F' },
  { id: 'cloudflare', name: 'Cloudflare', defaultLabel: 'admin@domain.com', algorithm: 'SHA1', digits: 6, period: 30, color: '#F38020' },
  { id: 'apple', name: 'Apple', defaultLabel: 'apple_id@icloud.com', algorithm: 'SHA1', digits: 6, period: 30, color: '#A2AAAD' },
];

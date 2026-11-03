import React from 'react';

interface BrandIconProps {
  name: string;
  className?: string;
  size?: number;
}

export const BrandIcon: React.FC<BrandIconProps> = ({ name, className = 'w-5 h-5', size = 20 }) => {
  const norm = (name || '').toLowerCase().trim();

  // Rockstar Games / GTA V / Social Club (Iconic Golden R* Badge)
  if (
    norm.includes('rockstar') ||
    norm.includes('rock') ||
    norm.includes('gta') ||
    norm.includes('socialclub') ||
    norm.includes('social club') ||
    norm === 'r*'
  ) {
    return (
      <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none">
        {/* Rockstar Games Golden Yellow Rounded Square Badge */}
        <rect x="1.5" y="1.5" width="21" height="21" rx="4.5" fill="#F5A623" stroke="#111111" strokeWidth="1.2" />
        {/* Bold slanted 'R' */}
        <path
          d="M5.2 17.5L7.4 6.2h5.3c2.2 0 3.5 1.1 3.2 2.9-.2 1.3-1.1 2.2-2.5 2.5l1.6 5.9h-2.9l-1.3-5.3H8.8l-1 5.3H5.2zm4.1-7.4h2.2c1 0 1.6-.4 1.8-1.1.1-.7-.3-1.1-1.3-1.1H9.8l-.5 2.2z"
          fill="#000000"
        />
        {/* Iconic Rockstar 5-pointed Star overlapping bottom-right */}
        <path
          d="M16.8 11.2l1.05 2.45 2.65.22-2.01 1.74.61 2.59-2.3-1.38-2.3 1.38.61-2.59-2.01-1.74 2.65-.22 1.05-2.45z"
          fill="#FFFFFF"
          stroke="#000000"
          strokeWidth="1.1"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  // Google / Gmail / YouTube
  if (norm.includes('google') || norm.includes('gmail') || norm.includes('youtube')) {
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

  // Telegram
  if (norm.includes('telegram') || norm === 'tg') {
    return (
      <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="#26A5E4">
        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
      </svg>
    );
  }

  // Facebook / Meta
  if (norm.includes('facebook') || norm.includes('meta') || norm.includes('fb')) {
    return (
      <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="#1877F2">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    );
  }

  // Instagram
  if (norm.includes('instagram') || norm.includes('insta')) {
    return (
      <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="#E4405F">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
      </svg>
    );
  }

  // WhatsApp
  if (norm.includes('whatsapp')) {
    return (
      <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="#25D366">
        <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.274.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.1.824z" />
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

  // Apple / iCloud
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

  // Coinbase / Bitcoin
  if (norm.includes('coinbase') || norm.includes('bitcoin') || norm.includes('btc')) {
    return (
      <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="#0052FF">
        <circle cx="12" cy="12" r="10" />
        <path
          fill="#FFF"
          d="M12.1 15.6c-2 0-3.6-1.6-3.6-3.6s1.6-3.6 3.6-3.6c1.4 0 2.6.8 3.2 2h2.2c-.7-2.4-2.9-4.1-5.4-4.1-3.1 0-5.7 2.5-5.7 5.7s2.6 5.7 5.7 5.7c2.5 0 4.7-1.7 5.4-4.1h-2.2c-.6 1.2-1.8 2-3.2 2z"
        />
      </svg>
    );
  }

  // PayPal
  if (norm.includes('paypal')) {
    return (
      <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="#00457C">
        <path
          fill="#0079C1"
          d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 3.72a.77.77 0 0 1 .757-.642h6.89c2.81 0 4.828 1.565 4.354 4.658-.534 3.49-2.88 5.21-6.112 5.21H8.46l-1.384 8.391z"
        />
        <path
          fill="#00457C"
          d="M19.44 7.752c-.525 3.438-2.852 5.188-6.06 5.188h-2.35l-1.15 7.06a.56.56 0 0 0 .553.648h3.38c.455 0 .842-.33.913-.78l.72-4.38h2.14c2.78 0 4.89-1.45 5.36-4.49.27-1.74-.41-2.93-1.506-3.246z"
        />
      </svg>
    );
  }

  // RYZ PAY / Wallet / Payment / Bank
  if (norm.includes('ryz') || norm.includes('wallet') || norm.includes('pay') || norm.includes('bank')) {
    return (
      <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none">
        <rect x="2" y="5" width="20" height="14" rx="3" stroke="#00FF88" strokeWidth="2" fill="#00FF88" fillOpacity="0.12" />
        <path d="M2 10h20" stroke="#00FF88" strokeWidth="2" />
        <circle cx="17" cy="14.5" r="1.5" fill="#00FF88" />
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

  // OpenAI / ChatGPT
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

  // Spotify
  if (norm.includes('spotify')) {
    return (
      <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="#1DB954">
        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
      </svg>
    );
  }

  // Netflix
  if (norm.includes('netflix')) {
    return (
      <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="#E50914">
        <path d="M5.398 0v.006c3.028 8.556 5.37 15.175 8.348 23.596 2.344.058 4.85.398 4.854.398-2.8-7.924-5.923-16.747-8.487-24zm8.489 0v9.63L18.6 22.951c-.043-7.86-.004-15.913.002-22.95zM5.398 1.05V24c1.873-.225 2.81-.312 4.715-.398v-9.22z" />
      </svg>
    );
  }

  // Epic Games / Gaming / Gamepad
  if (norm.includes('epic') || norm.includes('gaming') || norm.includes('game') || norm.includes('playstation') || norm.includes('xbox') || norm.includes('riot')) {
    return (
      <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none">
        <rect x="2" y="6" width="20" height="12" rx="6" fill="#00FF88" fillOpacity="0.15" stroke="#00FF88" strokeWidth="1.8" />
        <path d="M6 12h4M8 10v4" stroke="#00FF88" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="15.5" cy="11" r="1.2" fill="#00FF88" />
        <circle cx="17.5" cy="13" r="1.2" fill="#00FF88" />
      </svg>
    );
  }

  // Crown / VIP / King
  if (norm.includes('crown') || norm.includes('vip') || norm.includes('king')) {
    return (
      <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="#FFB800">
        <path d="M2.5 19h19v2h-19v-2zm19.57-9.36c-.21-.8-1.04-1.28-1.84-1.06l-3.73 1-3.22-5.36c-.56-.93-1.99-.93-2.55 0L7.5 9.58l-3.73-1c-.8-.21-1.63.26-1.84 1.06-.05.21-.06.43-.02.64L4 17h16l2.09-6.72c.04-.21.03-.43-.02-.64z" />
      </svg>
    );
  }

  // Server / Hosting / Amarhoster / VPS / Cloud
  if (norm.includes('host') || norm.includes('server') || norm.includes('vps') || norm.includes('cpanel') || norm.includes('digitalocean')) {
    return (
      <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none">
        <rect x="2" y="3" width="20" height="7" rx="2" stroke="#00E5FF" strokeWidth="1.8" fill="#00E5FF" fillOpacity="0.1" />
        <rect x="2" y="14" width="20" height="7" rx="2" stroke="#00FF88" strokeWidth="1.8" fill="#00FF88" fillOpacity="0.1" />
        <circle cx="6" cy="6.5" r="1.2" fill="#00E5FF" />
        <circle cx="6" cy="17.5" r="1.2" fill="#00FF88" />
        <path d="M11 6.5h7M11 17.5h7" stroke="#9CA3AF" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }

  // Shield / Security / Vault / Proton / Bitwarden
  if (norm.includes('shield') || norm.includes('security') || norm.includes('vault') || norm.includes('proton') || norm.includes('bitwarden')) {
    return (
      <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path
          d="M12 2L4 5.5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5.5L12 2z"
          fill="#00FF88"
          fillOpacity="0.18"
          stroke="#00FF88"
          strokeWidth="1.8"
        />
        <path d="M9 12l2 2 4-4" stroke="#00FF88" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  // Bolt / Lightning / Fast / Energy
  if (norm.includes('bolt') || norm.includes('lightning') || norm.includes('flash') || norm.includes('zap')) {
    return (
      <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="#FACC15">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    );
  }

  // Fire / Flame / Hot
  if (norm.includes('fire') || norm.includes('flame') || norm.includes('hot')) {
    return (
      <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="#FF5722">
        <path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z" />
      </svg>
    );
  }

  // Diamond / Gem / Premium
  if (norm.includes('diamond') || norm.includes('gem') || norm.includes('vip')) {
    return (
      <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="#38BDF8">
        <path d="M6 2l-6 7 12 13L24 9l-6-7H6zm3.5 2h5l2.5 4h-10l2.5-4z" />
      </svg>
    );
  }

  // Terminal / Code / Developer / GitLab
  if (norm.includes('terminal') || norm.includes('code') || norm.includes('dev') || norm.includes('gitlab') || norm.includes('ssh')) {
    return (
      <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none">
        <rect x="2" y="3" width="20" height="18" rx="3" stroke="#00FF88" strokeWidth="1.8" fill="#00FF88" fillOpacity="0.1" />
        <path d="M7 9l3 3-3 3M12 15h5" stroke="#00FF88" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
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

// Preset catalog for quick selection (Services + Custom Icons)
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
  { id: 'rockstar', name: 'Rockstar Games', defaultLabel: 'socialclub@rockstargames.com', algorithm: 'SHA1', digits: 6, period: 30, color: '#F5A623' },
  { id: 'google', name: 'Google', defaultLabel: 'user@gmail.com', algorithm: 'SHA1', digits: 6, period: 30, color: '#4285F4' },
  { id: 'github', name: 'GitHub', defaultLabel: 'username', algorithm: 'SHA1', digits: 6, period: 30, color: '#FFFFFF' },
  { id: 'discord', name: 'Discord', defaultLabel: 'username', algorithm: 'SHA1', digits: 6, period: 30, color: '#5865F2' },
  { id: 'telegram', name: 'Telegram', defaultLabel: '@username', algorithm: 'SHA1', digits: 6, period: 30, color: '#26A5E4' },
  { id: 'microsoft', name: 'Microsoft', defaultLabel: 'user@outlook.com', algorithm: 'SHA1', digits: 6, period: 30, color: '#00A4EF' },
  { id: 'facebook', name: 'Facebook', defaultLabel: 'user@facebook.com', algorithm: 'SHA1', digits: 6, period: 30, color: '#1877F2' },
  { id: 'instagram', name: 'Instagram', defaultLabel: '@handle', algorithm: 'SHA1', digits: 6, period: 30, color: '#E4405F' },
  { id: 'whatsapp', name: 'WhatsApp', defaultLabel: '+1234567890', algorithm: 'SHA1', digits: 6, period: 30, color: '#25D366' },
  { id: 'x', name: 'Twitter / X', defaultLabel: '@handle', algorithm: 'SHA1', digits: 6, period: 30, color: '#FFFFFF' },
  { id: 'binance', name: 'Binance', defaultLabel: 'crypto_account', algorithm: 'SHA1', digits: 6, period: 30, color: '#F3BA2F' },
  { id: 'coinbase', name: 'Coinbase', defaultLabel: 'wallet@domain.com', algorithm: 'SHA1', digits: 6, period: 30, color: '#0052FF' },
  { id: 'paypal', name: 'PayPal', defaultLabel: 'user@paypal.com', algorithm: 'SHA1', digits: 6, period: 30, color: '#0079C1' },
  { id: 'ryzpay', name: 'RYZ PAY', defaultLabel: 'operator@ryz.io', algorithm: 'SHA1', digits: 6, period: 30, color: '#00FF88' },
  { id: 'steam', name: 'Steam', defaultLabel: 'steam_login', algorithm: 'SHA1', digits: 5, period: 30, color: '#1A9FFF' },
  { id: 'epic', name: 'Epic Games', defaultLabel: 'gamer@epic.com', algorithm: 'SHA1', digits: 6, period: 30, color: '#00FF88' },
  { id: 'amazon', name: 'Amazon / AWS', defaultLabel: 'user@amazon.com', algorithm: 'SHA1', digits: 6, period: 30, color: '#FF9900' },
  { id: 'openai', name: 'OpenAI', defaultLabel: 'user@openai.com', algorithm: 'SHA1', digits: 6, period: 30, color: '#10A37F' },
  { id: 'cloudflare', name: 'Cloudflare', defaultLabel: 'admin@domain.com', algorithm: 'SHA1', digits: 6, period: 30, color: '#F38020' },
  { id: 'apple', name: 'Apple', defaultLabel: 'apple_id@icloud.com', algorithm: 'SHA1', digits: 6, period: 30, color: '#A2AAAD' },
  { id: 'spotify', name: 'Spotify', defaultLabel: 'user@spotify.com', algorithm: 'SHA1', digits: 6, period: 30, color: '#1DB954' },
  { id: 'netflix', name: 'Netflix', defaultLabel: 'user@netflix.com', algorithm: 'SHA1', digits: 6, period: 30, color: '#E50914' },
  { id: 'twitch', name: 'Twitch', defaultLabel: 'streamer', algorithm: 'SHA1', digits: 6, period: 30, color: '#9146FF' },
  { id: 'reddit', name: 'Reddit', defaultLabel: 'u/username', algorithm: 'SHA1', digits: 6, period: 30, color: '#FF4500' },
  { id: 'dropbox', name: 'Dropbox', defaultLabel: 'user@dropbox.com', algorithm: 'SHA1', digits: 6, period: 30, color: '#0061FF' },
  { id: 'server', name: 'Server / VPS', defaultLabel: 'root@server', algorithm: 'SHA1', digits: 6, period: 30, color: '#00E5FF' },
  { id: 'shield', name: 'Shield Vault', defaultLabel: 'secure_vault', algorithm: 'SHA1', digits: 6, period: 30, color: '#00FF88' },
  { id: 'crown', name: 'VIP Crown', defaultLabel: 'vip_account', algorithm: 'SHA1', digits: 6, period: 30, color: '#FFB800' },
  { id: 'bolt', name: 'Lightning', defaultLabel: 'fast_auth', algorithm: 'SHA1', digits: 6, period: 30, color: '#FACC15' },
  { id: 'fire', name: 'Flame', defaultLabel: 'hot_wallet', algorithm: 'SHA1', digits: 6, period: 30, color: '#FF5722' },
  { id: 'diamond', name: 'Diamond', defaultLabel: 'prime_account', algorithm: 'SHA1', digits: 6, period: 30, color: '#38BDF8' },
  { id: 'terminal', name: 'Developer', defaultLabel: 'ssh_deploy', algorithm: 'SHA1', digits: 6, period: 30, color: '#00FF88' },
];

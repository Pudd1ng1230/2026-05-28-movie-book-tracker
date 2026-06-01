import { useState } from 'react';

/**
 * Poster 组件 — 自动代理豆瓣图片 + 加载失败占位
 * @param {string} src — 原始图片 URL（来自豆瓣等外站）
 * @param {string} alt — 替代文本
 * @param {object} style — 额外样式
 * @param {string} className — 额外 class
 */
export default function Poster({ src, alt = '', style, className = '' }) {
  const [failed, setFailed] = useState(false);

  // 通过后端代理绕过防盗链
  const proxyUrl = src
    ? `/api/proxy-image?url=${encodeURIComponent(src)}`
    : null;

  if (!src || failed) {
    return (
      <div className="no-poster" style={style}>
        🎬
      </div>
    );
  }

  return (
    <img
      src={proxyUrl}
      alt={alt}
      loading="lazy"
      style={style}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}

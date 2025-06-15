
import React from 'react';

interface VideoPlayerProps {
  url: string;
  title: string;
}

const getEmbedUrl = (url: string): string | null => {
  if (!url) return null;
  let videoId: string | null = null;
  
  try {
    // This will handle full URLs with protocols
    const urlObject = new URL(url);

    if (urlObject.hostname.includes("youtube.com")) {
      if (urlObject.pathname === "/watch") {
        videoId = urlObject.searchParams.get("v");
      } else if (urlObject.pathname.startsWith("/embed/")) {
        return url; // Already an embed link
      }
    } else if (urlObject.hostname.includes("youtu.be")) {
      videoId = urlObject.pathname.substring(1).split('?')[0];
    } else if (urlObject.hostname.includes("vimeo.com")) {
      // Basic Vimeo support
      const vimeoId = urlObject.pathname.substring(1).split('/')[0];
      if (vimeoId) return `https://player.vimeo.com/video/${vimeoId}`;
    }
  } catch (error) {
    // Fallback for URLs without a protocol like 'www.youtube.com/...'
    if (url.includes("youtube.com/watch?v=")) {
      videoId = url.split("v=")[1].split('&')[0];
    } else if (url.includes("youtu.be/")) {
      videoId = url.split("youtu.be/")[1].split('?')[0];
    }
  }

  if (videoId) {
    return `https://www.youtube.com/embed/${videoId}`;
  }

  // Return original URL as a fallback, it might be a valid embed URL from another service.
  if (url.startsWith('http')) return url;

  return null;
};


const VideoPlayer: React.FC<VideoPlayerProps> = ({ url, title }) => {
  const embedUrl = getEmbedUrl(url);

  if (!embedUrl) {
    return <p className="text-muted-foreground">Invalid or unsupported video URL provided.</p>;
  }

  return (
    <div className="not-prose relative w-full" style={{ paddingTop: '56.25%' }}>
      <iframe
        src={embedUrl}
        title={title}
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        className="absolute top-0 left-0 w-full h-full rounded-md"
      ></iframe>
    </div>
  );
};

export default VideoPlayer;

import React, { useEffect, useState, useRef } from 'react';

interface VideoPlayerProps {
  file: File;
  onEnded: () => void;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ file, onEnded }) => {
  const [videoUrl, setVideoUrl] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setVideoUrl(url);

      return () => {
        URL.revokeObjectURL(url);
        setVideoUrl('');
      };
    }
  }, [file]);

  useEffect(() => {
    const video = videoRef.current;
    const playerContainer = playerContainerRef.current;
    if (!video || !playerContainer) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if (event.key === ' ' && target.tagName !== 'BUTTON') {
        event.preventDefault();
      } else if (['ArrowLeft', 'ArrowRight', 'f', 'F'].includes(event.key)) {
        event.preventDefault();
      }

      switch (event.key) {
        case ' ':
          if (target.tagName !== 'BUTTON') {
            if (video.paused) {
              video.play();
            } else {
              video.pause();
            }
          }
          break;
        case 'ArrowLeft':
          video.currentTime = Math.max(0, video.currentTime - 5);
          break;
        case 'ArrowRight':
          video.currentTime = Math.min(video.duration || 0, video.currentTime + 5);
          break;
        case 'f':
        case 'F':
          if (!document.fullscreenElement) {
            playerContainer.requestFullscreen().catch(err => {
              console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
            });
          } else {
            document.exitFullscreen();
          }
          break;
        default:
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [videoUrl]);

  if (!videoUrl) return null;

  return (
    <div ref={playerContainerRef} className="absolute inset-0 w-full h-full bg-black">
      <video
        ref={videoRef}
        key={videoUrl}
        className="w-full h-full"
        controls
        autoPlay
        src={videoUrl}
        onEnded={onEnded}
      >
        Your browser does not support the video tag.
      </video>
    </div>
  );
};

export default VideoPlayer;
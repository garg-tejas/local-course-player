import React, { useEffect, useState, useRef } from 'react';

interface VideoPlayerProps {
  file: File;
  onEnded: () => void;
  playbackRate: number;
  onPlaybackRateChange: (rate: number) => void;
}

const playbackRates = [0.5, 0.75, 1, 1.25, 1.5, 2];

const VideoPlayer: React.FC<VideoPlayerProps> = ({ file, onEnded, playbackRate, onPlaybackRateChange }) => {
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
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate, videoUrl]);

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
      <div className="absolute bottom-14 right-4 z-10 group">
        <label htmlFor="playback-speed-select" className="sr-only">Playback Speed</label>
        <select
          id="playback-speed-select"
          value={playbackRate}
          onChange={(e) => onPlaybackRateChange(Number(e.target.value))}
          className="bg-gray-900 bg-opacity-60 text-white rounded-md pl-2 pr-7 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand-secondary opacity-50 hover:opacity-100 focus:opacity-100 transition-opacity"
          aria-label="Playback speed"
        >
          {playbackRates.map(rate => (
            <option key={rate} value={rate}>
              {rate}x
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default VideoPlayer;
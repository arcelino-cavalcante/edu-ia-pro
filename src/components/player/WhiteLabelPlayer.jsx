import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Maximize, Loader2, Video } from 'lucide-react';
import { Button } from '../common/Button';
import { extractVideoID } from '../../utils/video';
import { getProgressSummary, persistLessonProgress, shouldPersistCheckpoint } from '../../services/progressService';

export const WhiteLabelPlayer = ({ videoId: rawVideoId, lessonId, userId, onComplete }) => {
    const playerRef = useRef(null);
    const intervalRef = useRef(null);
    const containerRef = useRef(null);
    const isTickingRef = useRef(false);
    const completionTriggeredRef = useRef(false);
    const lastSavedPositionRef = useRef(0);

    const videoId = extractVideoID(rawVideoId);

    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [showControls, setShowControls] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const [showResumePrompt, setShowResumePrompt] = useState(false);
    const [savedPosition, setSavedPosition] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [hasStarted, setHasStarted] = useState(false);

    const getPlayerValue = async (methodName) => {
        if (!playerRef.current || typeof playerRef.current[methodName] !== 'function') return 0;
        const value = playerRef.current[methodName]();
        return (value && typeof value.then === 'function') ? await value : value;
    };

    const getCurrentTimeSafe = async () => {
        const value = await getPlayerValue('getCurrentTime');
        const numeric = Number(value);
        return Number.isFinite(numeric) ? numeric : 0;
    };

    const getDurationSafe = async () => {
        const value = await getPlayerValue('getDuration');
        const numeric = Number(value);
        return Number.isFinite(numeric) ? numeric : 0;
    };

    const saveProgress = async (time, completed) => {
        if (!userId || !lessonId) return false;
        const safeTime = Number(time) || 0;
        try {
            await persistLessonProgress({
                userId,
                lessonId,
                lastPosition: safeTime,
                completed: !!completed
            });
            lastSavedPositionRef.current = safeTime;
            return true;
        } catch (error) {
            console.error("Erro ao salvar progresso", error);
            return false;
        }
    };

    const completeLesson = async (finalTime = null) => {
        if (completionTriggeredRef.current) return;
        completionTriggeredRef.current = true;

        const durationValue = finalTime ?? await getDurationSafe();
        setProgress(100);
        setIsPlaying(false);
        await saveProgress(durationValue, true);
        if (onComplete) onComplete();
    };

    useEffect(() => {
        const fetchProgress = async () => {
            if (!userId || !lessonId) return;
            try {
                const data = await getProgressSummary(userId);
                if (data && Object.keys(data).length > 0) {
                    const lessonData = data[lessonId];

                    if (lessonData && lessonData.lastPosition > 10 && !lessonData.completed) {
                        setSavedPosition(lessonData.lastPosition);
                        lastSavedPositionRef.current = lessonData.lastPosition;
                        setShowResumePrompt(true);
                    } else {
                        setShowResumePrompt(false);
                    }
                }
            } catch (error) {
                console.error("Erro ao carregar progresso:", error);
            }
        };

        fetchProgress();
    }, [lessonId, userId]);

    useEffect(() => {
        let isMounted = true;
        let vimeoInstance = null;

        setIsLoading(true);
        setIsReady(false);
        setIsPlaying(false);
        setHasStarted(false);
        setProgress(0);
        setDuration(0);
        completionTriggeredRef.current = false;
        lastSavedPositionRef.current = 0;

        const isVimeo = videoId && videoId.startsWith('vimeo-');
        const cleanVideoId = isVimeo ? videoId.replace('vimeo-', '') : videoId;

        if (!cleanVideoId || typeof cleanVideoId !== 'string') {
            setIsLoading(false);
            return undefined;
        }

        const targetId = `video-player-${videoId}`;
        const container = document.getElementById(targetId);
        if (!container) return undefined;
        container.innerHTML = '';

        const setupYouTube = () => {
            const div = document.createElement('div');
            div.id = `yt-inner-${cleanVideoId}`;
            div.className = "w-full h-full";
            container.appendChild(div);

            playerRef.current = new window.YT.Player(div.id, {
                videoId: cleanVideoId,
                height: '100%',
                width: '100%',
                playerVars: {
                    controls: 0,
                    modestbranding: 1,
                    rel: 0,
                    showinfo: 0,
                    disablekb: 1,
                    fs: 0,
                    iv_load_policy: 3,
                    autohide: 1,
                    playsinline: 1,
                    origin: window.location.origin
                },
                events: {
                    onReady: async (event) => {
                        if (!isMounted) return;
                        const total = Number(event.target.getDuration()) || 0;
                        setDuration(total);
                        setIsReady(true);
                        setIsLoading(false);
                    },
                    onStateChange: async (event) => {
                        if (!isMounted) return;
                        if (event.data === window.YT.PlayerState.PLAYING) {
                            setIsPlaying(true);
                            setHasStarted(true);
                        } else if (event.data === window.YT.PlayerState.PAUSED) {
                            setIsPlaying(false);
                        } else if (event.data === window.YT.PlayerState.ENDED) {
                            await completeLesson();
                        }
                    },
                    onError: (error) => {
                        console.error("Erro no player do YouTube", error);
                        setIsLoading(false);
                    }
                }
            });
        };

        const setupVimeo = async () => {
            if (!window.Vimeo) {
                await new Promise((resolve) => {
                    const script = document.createElement('script');
                    script.src = 'https://player.vimeo.com/api/player.js';
                    script.onload = resolve;
                    document.body.appendChild(script);
                });
            }

            if (!isMounted) return;

            vimeoInstance = new window.Vimeo.Player(container, {
                id: cleanVideoId,
                controls: false,
                responsive: true,
                dnt: true,
                title: false,
                byline: false,
                portrait: false,
                keyboard: false
            });

            playerRef.current = {
                playVideo: () => vimeoInstance.play(),
                pauseVideo: () => vimeoInstance.pause(),
                seekTo: (seconds) => vimeoInstance.setCurrentTime(seconds),
                mute: () => vimeoInstance.setVolume(0),
                unMute: () => vimeoInstance.setVolume(1),
                getCurrentTime: () => vimeoInstance.getCurrentTime(),
                getDuration: () => vimeoInstance.getDuration(),
                destroy: () => vimeoInstance.destroy()
            };

            vimeoInstance.ready().then(async () => {
                if (!isMounted) return;
                const total = await getDurationSafe();
                setDuration(total);
                setIsReady(true);
                setIsLoading(false);
            });

            vimeoInstance.on('play', () => {
                if (!isMounted) return;
                setIsPlaying(true);
                setHasStarted(true);
            });

            vimeoInstance.on('pause', () => {
                if (!isMounted) return;
                setIsPlaying(false);
            });

            vimeoInstance.on('ended', async () => {
                if (!isMounted) return;
                await completeLesson();
            });
        };

        if (isVimeo) {
            setupVimeo();
        } else if (window.YT && window.YT.Player) {
            setupYouTube();
        } else {
            if (!document.getElementById('yt-api-script')) {
                const tag = document.createElement('script');
                tag.id = 'yt-api-script';
                tag.src = "https://www.youtube.com/iframe_api";
                const firstScriptTag = document.getElementsByTagName('script')[0];
                firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
            }

            const previousCallback = window.onYouTubeIframeAPIReady;
            window.onYouTubeIframeAPIReady = () => {
                if (typeof previousCallback === 'function') previousCallback();
                setupYouTube();
            };
        }

        return () => {
            isMounted = false;
            if (playerRef.current && typeof playerRef.current.destroy === 'function') {
                try {
                    playerRef.current.destroy();
                } catch (error) {
                    console.error("Erro ao destruir player", error);
                }
            }
            playerRef.current = null;
        };
    }, [videoId, lessonId]);

    useEffect(() => {
        const tick = async () => {
            if (!isPlaying || !isReady || !playerRef.current || isTickingRef.current) return;
            isTickingRef.current = true;

            try {
                const currentTime = await getCurrentTimeSafe();
                const totalTime = await getDurationSafe();
                if (totalTime <= 0) return;

                const percentage = (currentTime / totalTime) * 100;
                setProgress(percentage);

                if (shouldPersistCheckpoint(currentTime, lastSavedPositionRef.current)) {
                    await saveProgress(currentTime, false);
                }

                if (currentTime >= totalTime - 5) {
                    if (playerRef.current?.pauseVideo) playerRef.current.pauseVideo();
                    if (playerRef.current?.seekTo) playerRef.current.seekTo(0);
                    await completeLesson(totalTime);

                    if (document.fullscreenElement) {
                        document.exitFullscreen().catch(() => { });
                    }
                }
            } finally {
                isTickingRef.current = false;
            }
        };

        intervalRef.current = setInterval(() => {
            tick();
        }, 1000);

        return () => clearInterval(intervalRef.current);
    }, [isPlaying, isReady, lessonId, userId]);

    useEffect(() => {
        if (!isReady || !hasStarted || isPlaying) return;

        const persistPause = async () => {
            const currentTime = await getCurrentTimeSafe();
            if (currentTime > 0 && !completionTriggeredRef.current) {
                saveProgress(currentTime, false);
            }
        };
        persistPause();
    }, [isPlaying, isReady, hasStarted]);

    useEffect(() => {
        return () => {
            const persistOnExit = async () => {
                const currentTime = await getCurrentTimeSafe();
                if (currentTime > 5 && !completionTriggeredRef.current) {
                    saveProgress(currentTime, false);
                }
            };
            persistOnExit();
        };
    }, []);

    const togglePlay = async () => {
        if (!isReady || !playerRef.current) return;
        try {
            if (isPlaying) await playerRef.current.pauseVideo();
            else await playerRef.current.playVideo();
        } catch (error) {
            console.error("Erro ao alternar play/pause:", error);
        }
    };

    const toggleMute = async () => {
        if (!isReady || !playerRef.current) return;
        try {
            if (isMuted) {
                await playerRef.current.unMute();
                setIsMuted(false);
            } else {
                await playerRef.current.mute();
                setIsMuted(true);
            }
        } catch (error) {
            console.error("Erro ao alternar mute:", error);
        }
    };

    const handleSeek = async (e) => {
        if (!isReady || !playerRef.current) return;
        const nextProgress = Number(e.target.value);
        const newTime = (nextProgress / 100) * duration;
        setProgress(nextProgress);
        try {
            await playerRef.current.seekTo(newTime);
        } catch (error) {
            console.error("Erro ao alterar ponto do video:", error);
        }
    };

    const handleResume = async () => {
        if (!playerRef.current || !isReady) return;
        try {
            await playerRef.current.seekTo(savedPosition);
            await playerRef.current.playVideo();
            setShowResumePrompt(false);
        } catch (error) {
            console.error("Erro ao retomar video:", error);
        }
    };

    const handleRestart = async () => {
        if (!playerRef.current || !isReady) return;
        try {
            await playerRef.current.seekTo(0);
            await playerRef.current.playVideo();
            setShowResumePrompt(false);
        } catch (error) {
            console.error("Erro ao reiniciar video:", error);
        }
    };

    const formatTime = (seconds) => {
        const safeSeconds = Number(seconds);
        if (!Number.isFinite(safeSeconds)) return "00:00";
        const date = new Date(safeSeconds * 1000);
        const hh = date.getUTCHours();
        const mm = date.getUTCMinutes();
        const ss = date.getUTCSeconds().toString().padStart(2, "0");
        if (hh) return `${hh}:${mm.toString().padStart(2, "0")}:${ss}`;
        return `${mm}:${ss}`;
    };

    return (
        <div
            ref={containerRef}
            className="group relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10"
            onMouseEnter={() => setShowControls(true)}
            onMouseLeave={() => isPlaying && setShowControls(false)}
        >
            <div className="absolute inset-0 pointer-events-none rounded-2xl overflow-hidden">
                <div className="absolute w-full" style={{ height: 'calc(100% + 300px)', top: '-150px' }}>
                    <div id={`video-player-${videoId}`} className="w-full h-full" />
                </div>
            </div>

            {!hasStarted && !isPlaying && (
                <div
                    className="absolute inset-0 z-10 bg-contain bg-center bg-no-repeat bg-black transition-opacity duration-500"
                    style={{
                        backgroundImage: videoId?.startsWith('vimeo-')
                            ? 'none'
                            : `url(https://img.youtube.com/vi/${videoId}/maxresdefault.jpg)`
                    }}
                >
                    {videoId?.startsWith('vimeo-') && (
                        <div className="absolute inset-0 flex items-center justify-center bg-indigo-900/20">
                            <Video className="w-16 h-16 text-white/50" />
                        </div>
                    )}
                </div>
            )}

            <div className="absolute inset-0 z-20" onClick={togglePlay} />

            {isLoading && (
                <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/20 backdrop-blur-sm">
                    <Loader2 className="w-10 h-10 text-white animate-spin" />
                </div>
            )}

            {showResumePrompt && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in">
                    <div className="text-center p-6 max-w-sm">
                        <h3 className="text-white font-bold text-xl mb-2">Continuar de onde parou?</h3>
                        <p className="text-gray-400 mb-6 text-sm">Voce assistiu ate {formatTime(savedPosition)}</p>
                        <div className="flex gap-3 justify-center">
                            <Button onClick={(e) => { e.stopPropagation(); handleResume(); }} className="bg-[#0a0a0a] hover:bg-black dark:bg-white dark:text-[#0a0a0a] dark:hover:bg-gray-200 border-none">
                                Continuar
                            </Button>
                            <Button variant="ghost" onClick={(e) => { e.stopPropagation(); handleRestart(); }} className="text-white hover:bg-white/10">
                                Reiniciar
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {!isPlaying && !isLoading && !showResumePrompt && (
                <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none">
                    <div className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                        <Play size={36} className="text-white ml-1" fill="currentColor" />
                    </div>
                </div>
            )}

            <div className={`absolute bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-black/90 via-black/60 to-transparent pt-20 pb-4 px-6 transition-all duration-300 ${showControls || !isPlaying ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                <div className="relative w-full h-1.5 bg-white/20 rounded-full mb-4 cursor-pointer group/slider" onClick={(e) => e.stopPropagation()}>
                    <div className="absolute top-0 left-0 h-full bg-indigo-500 rounded-full" style={{ width: `${progress}%` }} />
                    <input
                        type="range"
                        min="0"
                        max="100"
                        value={progress}
                        onChange={handleSeek}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="absolute h-3 w-3 bg-white rounded-full -top-0.5 shadow-md transform scale-0 group-hover/slider:scale-100 transition-transform" style={{ left: `${progress}%`, marginLeft: '-6px' }} />
                </div>

                <div className="flex items-center justify-between pointer-events-auto">
                    <div className="flex items-center gap-4">
                        <button onClick={togglePlay} className="text-white hover:text-indigo-400 transition-colors">
                            {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
                        </button>

                        <div className="flex items-center gap-2 group/volume">
                            <button onClick={toggleMute} className="text-white hover:text-indigo-400 transition-colors">
                                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                            </button>
                        </div>

                        <span className="text-sm font-medium text-gray-300 font-mono">
                            {formatTime((progress * duration) / 100)} / {formatTime(duration)}
                        </span>
                    </div>

                    <div className="flex items-center gap-4">
                        <button onClick={handleRestart} className="text-white hover:text-indigo-400 transition-colors" title="Reiniciar">
                            <RotateCcw size={20} />
                        </button>
                        <button onClick={() => containerRef.current?.requestFullscreen?.()} className="text-white hover:text-indigo-400 transition-colors">
                            <Maximize size={20} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

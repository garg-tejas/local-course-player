const courseState = {
    currentVideo: null,
    progress: {},
    settings: {
        playbackSpeed: 1,
        volume: 1,
        theme: 'dark',
        miniPlayerEnabled: false,
        pipEnabled: false
    },
    folderHandle: null,
    coursePath: null,
    courseName: null
};

const DB_NAME = 'coursePlayerDB';
const STORE_NAME = 'folderHandle';
const COURSE_PATH_STORE = 'coursePath';

let videoPlayer;
let playPauseBtn;
let skipBackwardBtn;
let skipForwardBtn;
let volumeBtn;
let volumeSlider;
let speedBtn;
let speedMenu;
let fullscreenBtn;
let themeToggle;
let selectFolderBtn;
let courseNavigation;
let videoTitle;
let coursePathText;
let clearCourseBtn;
let resetDbBtn;
let videoSeekbar;
let seekbarProgress;
let seekbarBuffer;
let timeDisplay;

let autoPlayTimeout = null;
let autoPlayOverlay = null;
let autoPlaySeconds = 5;

let lastPlaybackSpeed = 1;

function initializeDOMElements() {
    videoPlayer = document.getElementById('video-player');
    playPauseBtn = document.getElementById('play-pause');
    skipBackwardBtn = document.getElementById('skip-backward');
    skipForwardBtn = document.getElementById('skip-forward');
    volumeBtn = document.getElementById('volume-btn');
    volumeSlider = document.getElementById('volume-slider');
    speedBtn = document.getElementById('speed-btn');
    speedMenu = document.getElementById('speed-menu');
    fullscreenBtn = document.getElementById('fullscreen');
    themeToggle = document.getElementById('theme-toggle');
    selectFolderBtn = document.getElementById('select-folder');
    courseNavigation = document.querySelector('.course-navigation');
    videoTitle = document.getElementById('video-title');
    coursePathText = document.getElementById('course-path-text');
    clearCourseBtn = document.getElementById('clear-course');
    resetDbBtn = document.getElementById('reset-db');

    videoSeekbar = document.getElementById('video-seekbar');
    seekbarProgress = document.getElementById('seekbar-progress');
    seekbarBuffer = document.getElementById('seekbar-buffer');
    timeDisplay = document.getElementById('time-display');

    const elements = {
        videoPlayer,
        playPauseBtn,
        skipBackwardBtn,
        skipForwardBtn,
        volumeBtn,
        volumeSlider,
        speedBtn,
        speedMenu,
        fullscreenBtn,
        themeToggle,
        selectFolderBtn,
        courseNavigation,
        videoTitle,
        coursePathText,
        clearCourseBtn,
        resetDbBtn
    };

    for (const [name, element] of Object.entries(elements)) {
        if (!element) {
            console.error(`Element not found: ${name}`);
        }
    }
}

async function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 2);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
            if (!db.objectStoreNames.contains(COURSE_PATH_STORE)) {
                db.createObjectStore(COURSE_PATH_STORE);
            }
        };
    });
}

async function storeFolderHandle(handle) {
    try {
        const db = await initDB();
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        await store.put(handle, 'folderHandle');

        await new Promise((resolve, reject) => {
            transaction.oncomplete = resolve;
            transaction.onerror = reject;
        });

        console.log('Folder handle stored successfully');
    } catch (error) {
        console.error('Error storing folder handle:', error);
        throw error;
    }
}

async function restoreFolderHandle() {
    try {
        const db = await initDB();
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);

        const handle = await store.get('folderHandle');

        await new Promise((resolve, reject) => {
            transaction.oncomplete = resolve;
            transaction.onerror = reject;
        });

        return handle;
    } catch (error) {
        console.error('Error restoring folder handle:', error);
        return null;
    }
}

async function storeCoursePath(path, name) {
    try {
        const db = await initDB();
        const transaction = db.transaction(COURSE_PATH_STORE, 'readwrite');
        const store = transaction.objectStore(COURSE_PATH_STORE);

        const courseInfo = { path, name, timestamp: Date.now() };
        await store.put(courseInfo, 'courseInfo');

        await new Promise((resolve, reject) => {
            transaction.oncomplete = resolve;
            transaction.onerror = reject;
        });

        console.log('Course path stored successfully');
    } catch (error) {
        console.error('Error storing course path:', error);
        throw error;
    }
}

async function restoreCoursePath() {
    try {
        const db = await initDB();

        if (!db.objectStoreNames.contains(COURSE_PATH_STORE)) {
            console.log('Course path store does not exist, skipping restoration');
            return null;
        }

        const transaction = db.transaction(COURSE_PATH_STORE, 'readonly');
        const store = transaction.objectStore(COURSE_PATH_STORE);

        const courseInfo = await store.get('courseInfo');

        await new Promise((resolve, reject) => {
            transaction.oncomplete = resolve;
            transaction.onerror = reject;
        });

        return courseInfo;
    } catch (error) {
        console.error('Error restoring course path:', error);
        return null;
    }
}

function updateCoursePathDisplay(path, name) {
    if (coursePathText) {
        if (path && name) {
            coursePathText.textContent = name;
            coursePathText.title = path;
            if (clearCourseBtn) {
                clearCourseBtn.style.display = 'flex';
            }
            if (resetDbBtn) {
                resetDbBtn.style.display = 'none';
            }
        } else {
            coursePathText.textContent = 'No course selected';
            coursePathText.title = '';
            if (clearCourseBtn) {
                clearCourseBtn.style.display = 'none';
            }
            if (resetDbBtn && (courseState.coursePath || courseState.courseName)) {
                resetDbBtn.style.display = 'flex';
            }
        }
    }
}

async function clearCourse() {
    try {
        const db = await initDB();
        const transaction = db.transaction([STORE_NAME, COURSE_PATH_STORE], 'readwrite');

        const folderStore = transaction.objectStore(STORE_NAME);
        const pathStore = transaction.objectStore(COURSE_PATH_STORE);

        await folderStore.delete('folderHandle');
        await pathStore.delete('courseInfo');

        await new Promise((resolve, reject) => {
            transaction.oncomplete = resolve;
            transaction.onerror = reject;
        });

        courseState.folderHandle = null;
        courseState.coursePath = null;
        courseState.courseName = null;

        if (courseNavigation) {
            courseNavigation.innerHTML = '';
        }

        updateCoursePathDisplay(null, null);

        if (videoTitle) {
            videoTitle.textContent = 'Select a video to start';
        }

        console.log('Course cleared successfully');
    } catch (error) {
        console.error('Error clearing course:', error);
    }
}

async function resetDatabase() {
    try {
        const db = await initDB();
        db.close();

        const deleteRequest = indexedDB.deleteDatabase(DB_NAME);
        await new Promise((resolve, reject) => {
            deleteRequest.onsuccess = resolve;
            deleteRequest.onerror = reject;
        });

        console.log('Database reset successfully');
        location.reload();
    } catch (error) {
        console.error('Error resetting database:', error);
    }
}

async function init() {
    console.log('Initializing application...');

    initializeDOMElements();

    if (!window.isSecureContext) {
        console.error('Not running in a secure context');
        const errorMessage = 'This application requires a secure context (HTTPS or localhost).\n\n' +
            'Please use a local development server:\n\n' +
            '1. Open terminal/command prompt\n' +
            '2. Navigate to this folder\n' +
            '3. Run: python -m http.server 8000\n' +
            '4. Open http://localhost:8000 in your browser';
        alert(errorMessage);
        return;
    }

    if (!window.showDirectoryPicker) {
        console.error('File System Access API not supported');
        alert('Your browser does not support the required features. Please use Chrome, Edge, or another Chromium-based browser.');
        return;
    }

    await loadState();
    setupEventListeners();
    applySettings();

    try {
        const handle = await restoreFolderHandle();
        console.log('Folder handle restored:', handle ? 'Yes' : 'No');

        if (handle) {
            try {
                const permission = await handle.requestPermission({ mode: 'read' });
                console.log('Permission status:', permission);

                if (permission === 'granted') {
                    courseState.folderHandle = handle;

                    if (!courseState.coursePath || !courseState.courseName) {
                        courseState.coursePath = handle.name;
                        courseState.courseName = handle.name;
                        updateCoursePathDisplay(handle.name, handle.name);
                        console.log('Course path set from handle:', handle.name);
                    }

                    console.log('Building course navigation...');
                    await buildCourseNavigation();

                    if (selectFolderBtn) {
                        selectFolderBtn.innerHTML = '<i class="fas fa-check"></i> Course Loaded';
                        setTimeout(() => {
                            if (selectFolderBtn) {
                                selectFolderBtn.innerHTML = '<i class="fas fa-folder-open"></i> Select Course';
                            }
                        }, 2000);
                    }

                    console.log('Course successfully restored and loaded');
                } else {
                    console.log('Permission denied, clearing course data');
                    await clearCourse();
                }
            } catch (error) {
                console.error('Permission denied or handle invalid:', error);
                console.log('Clearing course data due to permission error');
                await clearCourse();
            }
        } else {
            console.log('No folder handle found in database');
        }

        if (courseState.folderHandle && (!courseState.coursePath || !courseState.courseName)) {
            courseState.coursePath = courseState.folderHandle.name;
            courseState.courseName = courseState.folderHandle.name;
            updateCoursePathDisplay(courseState.folderHandle.name, courseState.folderHandle.name);
            console.log('Course path updated from folder handle:', courseState.folderHandle.name);
        }
    } catch (error) {
        console.error('Error restoring folder handle:', error);
        courseState.folderHandle = null;
    }
}

async function loadState() {
    const savedState = localStorage.getItem('courseState');
    if (savedState) {
        const parsed = JSON.parse(savedState);
        courseState.progress = parsed.progress || {};
        courseState.settings = parsed.settings || courseState.settings;
    }

    try {
        const courseInfo = await restoreCoursePath();
        if (courseInfo) {
            courseState.coursePath = courseInfo.path;
            courseState.courseName = courseInfo.name;
            updateCoursePathDisplay(courseInfo.path, courseInfo.name);
            console.log('Course path restored:', courseInfo.name);
        }
    } catch (error) {
        console.error('Error restoring course path:', error);
    }
}

function saveState() {
    localStorage.setItem('courseState', JSON.stringify({
        progress: courseState.progress,
        settings: courseState.settings,
    }));
}

function setupEventListeners() {
    console.log('Setting up event listeners...');


    if (themeToggle) {
        console.log('Setting up theme toggle...');
        themeToggle.addEventListener('click', () => {
            console.log('Theme toggle clicked');
            toggleTheme();
        });
    }

    if (selectFolderBtn) {
        console.log('Setting up folder selection...');
        selectFolderBtn.addEventListener('click', () => {
            console.log('Select folder clicked');
            selectCourseFolder();
        });
    }

    if (clearCourseBtn) {
        console.log('Setting up clear course...');
        clearCourseBtn.addEventListener('click', () => {
            console.log('Clear course clicked');
            clearCourse();
        });
    }

    if (resetDbBtn) {
        console.log('Setting up reset database...');
        resetDbBtn.addEventListener('click', () => {
            console.log('Reset database clicked');
            if (confirm('This will reset all course data and progress. Are you sure?')) {
                resetDatabase();
            }
        });
    }

    if (videoPlayer) {
        videoPlayer.addEventListener('timeupdate', () => {
            updateProgress();
            updateSeekbarProgress();
            updateTimeDisplay();
        });
        videoPlayer.addEventListener('ended', handleVideoEnd);
        videoPlayer.addEventListener('loadedmetadata', updateVideoInfo);
        videoPlayer.addEventListener('progress', updateBufferDisplay);
        videoPlayer.addEventListener('ratechange', () => {
            lastPlaybackSpeed = videoPlayer.playbackRate;
            courseState.settings.playbackSpeed = lastPlaybackSpeed;
            saveState();
        });

        videoPlayer.addEventListener('dblclick', toggleFullscreen);

        const videoSeekbar = document.getElementById('video-seekbar');
        if (videoSeekbar) {
            videoSeekbar.addEventListener('click', (e) => {
                if (!courseState.currentVideo) return;
                const rect = videoSeekbar.getBoundingClientRect();
                const pos = (e.clientX - rect.left) / rect.width;
                videoPlayer.currentTime = pos * videoPlayer.duration;
            });
        }
    }

    if (playPauseBtn) playPauseBtn.addEventListener('click', togglePlayPause);
    if (skipBackwardBtn) skipBackwardBtn.addEventListener('click', () => skipVideo(-10));
    if (skipForwardBtn) skipForwardBtn.addEventListener('click', () => skipVideo(10));
    if (volumeBtn) volumeBtn.addEventListener('click', toggleMute);
    if (volumeSlider) volumeSlider.addEventListener('input', handleVolumeChange);
    if (speedBtn) speedBtn.addEventListener('click', toggleSpeedMenu);
    if (fullscreenBtn) fullscreenBtn.addEventListener('click', toggleFullscreen);

    document.addEventListener('keydown', handleKeyboardShortcuts);

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.playback-speed-control') && speedMenu) {
            speedMenu.classList.remove('show');
        }

        if (e.target.classList.contains('speed-option')) {
            const speed = parseFloat(e.target.dataset.speed);
            setPlaybackSpeed(speed);
        }
    });

    const customSpeedInput = document.getElementById('custom-speed');
    const applyCustomSpeedBtn = document.getElementById('apply-custom-speed');

    if (customSpeedInput && applyCustomSpeedBtn) {
        applyCustomSpeedBtn.addEventListener('click', () => {
            const customSpeed = parseFloat(customSpeedInput.value);
            if (customSpeed >= 0.1 && customSpeed <= 4) {
                setPlaybackSpeed(customSpeed);
                customSpeedInput.value = '';
            } else {
                alert('Please enter a speed between 0.1x and 4.0x');
            }
        });

        customSpeedInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                applyCustomSpeedBtn.click();
            }
        });
    }
}

async function selectCourseFolder() {
    console.log('Selecting course folder...');
    try {
        if (!window.showDirectoryPicker) {
            throw new Error('Your browser does not support folder selection. Please use Chrome, Edge, or another Chromium-based browser.');
        }

        if (selectFolderBtn) {
            selectFolderBtn.disabled = true;
            selectFolderBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
        }

        const handle = await window.showDirectoryPicker();
        courseState.folderHandle = handle;

        await storeFolderHandle(handle);

        const coursePath = handle.name;
        const courseName = handle.name;
        courseState.coursePath = coursePath;
        courseState.courseName = courseName;
        await storeCoursePath(coursePath, courseName);
        updateCoursePathDisplay(coursePath, courseName);

        if (selectFolderBtn) {
            selectFolderBtn.innerHTML = '<i class="fas fa-check"></i> Course Loaded';
        }

        await buildCourseNavigation();

        setTimeout(() => {
            if (selectFolderBtn) {
                selectFolderBtn.disabled = false;
                selectFolderBtn.innerHTML = '<i class="fas fa-folder-open"></i> Select Course';
            }
        }, 2000);
    } catch (error) {
        console.error('Error selecting folder:', error);

        if (selectFolderBtn) {
            selectFolderBtn.disabled = false;
            selectFolderBtn.innerHTML = '<i class="fas fa-exclamation-circle"></i> Error';
        }

        alert(error.message || 'Error selecting folder. Please try again.');

        setTimeout(() => {
            if (selectFolderBtn) {
                selectFolderBtn.innerHTML = '<i class="fas fa-folder-open"></i> Select Course';
            }
        }, 2000);
    }
}

async function buildCourseNavigation() {
    document.getElementById('welcome-message')?.classList.add('welcome-hidden');

    if (!courseState.folderHandle) return;

    try {
        courseNavigation.innerHTML = '';

        const sections = [];
        for await (const [name, handle] of courseState.folderHandle.entries()) {
            if (handle.kind === 'directory') {
                const section = {
                    title: name,
                    videos: []
                };

                for await (const [fileName, fileHandle] of handle.entries()) {
                    if (fileHandle.kind === 'file' && fileName.endsWith('.mp4')) {
                        section.videos.push({
                            title: fileName.replace(/^[0-9]+\s+/, '').replace('.mp4', ''),
                            handle: fileHandle,
                            path: `${name}/${fileName}`
                        });
                    }
                }

                section.videos.sort((a, b) => a.path.localeCompare(b.path));
                sections.push(section);
            }
        }

        sections.sort((a, b) => a.title.localeCompare(b.title));

        sections.forEach(section => {
            const sectionElement = createSectionElement(section);
            courseNavigation.appendChild(sectionElement);
        });
    } catch (error) {
        console.error('Error building course navigation:', error);
        alert('Error loading course structure. Please try again.');
    }
}

function createSectionElement(section) {
    const sectionDiv = document.createElement('div');
    sectionDiv.className = 'course-section';
    const sectionHeader = document.createElement('div');
    sectionHeader.className = 'section-header';
    sectionHeader.innerHTML = `
        <h3>${section.title}</h3>
        <button class="toggle-section"><i class="fas fa-chevron-down"></i></button>
    `;
    const videoList = document.createElement('div');
    videoList.className = 'video-list';
    section.videos.forEach(video => {
        const videoElement = createVideoElement(video);
        videoList.appendChild(videoElement);
    });
    sectionDiv.appendChild(sectionHeader);
    sectionDiv.appendChild(videoList);
    sectionHeader.querySelector('.toggle-section').addEventListener('click', () => {
        videoList.classList.toggle('collapsed');
        sectionHeader.querySelector('i').classList.toggle('fa-chevron-down');
        sectionHeader.querySelector('i').classList.toggle('fa-chevron-right');
    });
    return sectionDiv;
}

function createVideoElement(video) {
    const videoDiv = document.createElement('div');
    videoDiv.className = 'video-item';
    videoDiv.setAttribute('data-path', video.path);
    videoDiv.innerHTML = `
        <span class="video-title" title="${video.title}">${video.title}</span>
        <span class="video-status"></span>
    `;

    videoDiv.addEventListener('click', () => loadVideo(video));

    updateVideoStatus(videoDiv, video.path);

    return videoDiv;
}

async function loadVideo(video) {
    try {
        if (!video.handle && video.path) {
            const sections = Array.from(document.querySelectorAll('.course-section'));
            for (const section of sections) {
                const videos = Array.from(section.querySelectorAll('.video-item'));
                const foundVideo = videos.find(v => v.getAttribute('data-path') === video.path);
                if (foundVideo) {
                    const sectionName = video.path.split('/')[0];
                    const sectionHandle = await courseState.folderHandle.getDirectoryHandle(sectionName);
                    const videoFileName = video.path.split('/')[1];
                    video.handle = await sectionHandle.getFileHandle(videoFileName);
                    break;
                }
            }
        }

        if (!video.handle) {
            throw new Error('Could not find video handle');
        }

        const file = await video.handle.getFile();
        const url = URL.createObjectURL(file);

        if (videoPlayer.src) {
            URL.revokeObjectURL(videoPlayer.src);
        }

        courseState.currentVideo = video;
        videoPlayer.src = url;
        videoTitle.textContent = video.title;

        if (courseState.progress[video.path]) {
            videoPlayer.currentTime = courseState.progress[video.path].time;
        }

        updateCurrentSectionHeading();

        videoPlayer.playbackRate = courseState.settings.playbackSpeed || lastPlaybackSpeed || 1;
        videoPlayer.play();
    } catch (error) {
        console.error('Error loading video:', error);
        alert('Error loading video. Please try again.');
    }
}

function updateProgress() {
    if (!courseState.currentVideo) return;
    const progress = {
        time: videoPlayer.currentTime,
        duration: videoPlayer.duration,
        percentage: (videoPlayer.currentTime / videoPlayer.duration) * 100
    };
    courseState.progress[courseState.currentVideo.path] = progress;
    if (progress.percentage >= 90 && !courseState.progress[courseState.currentVideo.path].completed) {
        courseState.progress[courseState.currentVideo.path].completed = true;
        saveState();
        updateVideoStatus(document.querySelector(`[data-path="${courseState.currentVideo.path}"]`), courseState.currentVideo.path);
    }
    saveState();
}

function handleVideoEnd() {
    if (!courseState.currentVideo) return;
    courseState.progress[courseState.currentVideo.path].completed = true;
    saveState();
    updateVideoStatus(document.querySelector(`[data-path="${courseState.currentVideo.path}"]`), courseState.currentVideo.path);
    showAutoPlayOverlay();
}

function updateVideoStatus(videoElement, path) {
    const progress = courseState.progress[path];
    const statusElement = videoElement.querySelector('.video-status');

    if (progress?.completed) {
        statusElement.innerHTML = '<i class="fas fa-check-circle"></i>';
    } else if (progress?.time > 0) {
        statusElement.innerHTML = '<i class="fas fa-play-circle"></i>';
    } else {
        statusElement.innerHTML = '<i class="far fa-circle"></i>';
    }
}

function togglePlayPause() {
    if (videoPlayer.paused) {
        videoPlayer.play();
        playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
    } else {
        videoPlayer.pause();
        playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
    }
}

function skipVideo(seconds) {
    videoPlayer.currentTime += seconds;
}

function toggleMute() {
    videoPlayer.muted = !videoPlayer.muted;
    volumeBtn.innerHTML = videoPlayer.muted ?
        '<i class="fas fa-volume-mute"></i>' :
        '<i class="fas fa-volume-up"></i>';
}

function handleVolumeChange(e) {
    const volume = e.target.value;
    videoPlayer.volume = volume;
    courseState.settings.volume = volume;
    saveState();
}

function toggleSpeedMenu() {
    if (speedMenu) {
        speedMenu.classList.toggle('show');
        updateSpeedMenuSelection();
    }
}

function updateSpeedMenuSelection() {
    const currentSpeed = videoPlayer.playbackRate;
    const speedOptions = document.querySelectorAll('.speed-option');

    speedOptions.forEach(option => {
        option.classList.remove('active');
        if (parseFloat(option.dataset.speed) === currentSpeed) {
            option.classList.add('active');
        }
    });

    const speedText = document.querySelector('.speed-text');
    if (speedText) {
        speedText.textContent = `${currentSpeed}x`;
    }
}

function setPlaybackSpeed(speed) {
    videoPlayer.playbackRate = speed;
    courseState.settings.playbackSpeed = speed;
    lastPlaybackSpeed = speed;
    saveState();
    updateSpeedMenuSelection();

    if (speedMenu) {
        speedMenu.classList.remove('show');
    }
}

function handlePlaybackSpeedChange(e) {
    const speed = parseFloat(e.target.value);
    setPlaybackSpeed(speed);
}

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        videoPlayer.requestFullscreen();
    } else {
        document.exitFullscreen();
    }
}

function toggleTheme() {
    console.log('Toggling theme...');
    document.body.classList.toggle('dark-mode');
    courseState.settings.theme = document.body.classList.contains('dark-mode') ? 'dark' : 'light';
    saveState();

    if (themeToggle) {
        themeToggle.innerHTML = document.body.classList.contains('dark-mode')
            ? '<i class="fas fa-sun"></i>'
            : '<i class="fas fa-moon"></i>';
    }
}

function handleKeyboardShortcuts(e) {
    switch (e.code) {
        case 'Space':
            e.preventDefault();
            togglePlayPause();
            break;
        case 'ArrowLeft':
            skipVideo(-10);
            break;
        case 'ArrowRight':
            skipVideo(10);
            break;
        case 'ArrowUp':
            volumeSlider.value = Math.min(1, parseFloat(volumeSlider.value) + 0.1);
            handleVolumeChange({ target: volumeSlider });
            break;
        case 'ArrowDown':
            volumeSlider.value = Math.max(0, parseFloat(volumeSlider.value) - 0.1);
            handleVolumeChange({ target: volumeSlider });
            break;
        case 'Period':
            const newSpeedUp = Math.min(4, videoPlayer.playbackRate + 0.25);
            setPlaybackSpeed(newSpeedUp);
            break;
        case 'Comma':
            const newSpeedDown = Math.max(0.25, videoPlayer.playbackRate - 0.25);
            setPlaybackSpeed(newSpeedDown);
            break;
        case 'KeyR':
            setPlaybackSpeed(1);
            break;
        case 'KeyF':
            e.preventDefault();
            toggleFullscreen();
            break;
    }
}

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    seconds = Math.floor(seconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function applySettings() {
    videoPlayer.playbackRate = courseState.settings.playbackSpeed;
    videoPlayer.volume = courseState.settings.volume;
    volumeSlider.value = courseState.settings.volume;


    updateSpeedMenuSelection();

    if (courseState.settings.theme === 'dark') {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
}

function updateVideoInfo() {
    if (!courseState.currentVideo) return;
    if (courseState.progress[courseState.currentVideo.path]) {
        videoPlayer.currentTime = courseState.progress[courseState.currentVideo.path].time;
    }
    videoPlayer.playbackRate = courseState.settings.playbackSpeed || lastPlaybackSpeed || 1;
}

function getCurrentVideoIndexAndSection() {
    if (!courseState.currentVideo) {
        return { currentSectionIdx: -1, currentVideoIdx: -1, sectionVideos: [], navSections: [] };
    }

    const navSections = Array.from(document.querySelectorAll('.course-section'));
    let currentSectionIdx = -1;
    let currentVideoIdx = -1;
    let sectionVideos = [];

    navSections.forEach((section, sIdx) => {
        const videos = Array.from(section.querySelectorAll('.video-item'));
        const videoIndex = videos.findIndex(video =>
            video.getAttribute('data-path') === courseState.currentVideo.path
        );

        if (videoIndex !== -1) {
            currentSectionIdx = sIdx;
            currentVideoIdx = videoIndex;
            sectionVideos = videos;
        }
    });

    return { currentSectionIdx, currentVideoIdx, sectionVideos, navSections };
}

function playPrevVideo() {
    const { currentSectionIdx, currentVideoIdx, sectionVideos, navSections } = getCurrentVideoIndexAndSection();

    if (currentVideoIdx > 0) {
        const prevVideo = sectionVideos[currentVideoIdx - 1];
        if (prevVideo) {
            const videoPath = prevVideo.getAttribute('data-path');
            const videoTitle = prevVideo.querySelector('.video-title').textContent;
            loadVideo({ path: videoPath, title: videoTitle });
        }
    } else if (currentSectionIdx > 0) {
        const prevSectionVideos = Array.from(navSections[currentSectionIdx - 1].querySelectorAll('.video-item'));
        if (prevSectionVideos.length > 0) {
            const lastVideo = prevSectionVideos[prevSectionVideos.length - 1];
            const videoPath = lastVideo.getAttribute('data-path');
            const videoTitle = lastVideo.querySelector('.video-title').textContent;
            loadVideo({ path: videoPath, title: videoTitle });
        }
    }
}

function playNextVideo() {
    const { currentSectionIdx, currentVideoIdx, sectionVideos, navSections } = getCurrentVideoIndexAndSection();

    if (currentVideoIdx < sectionVideos.length - 1) {
        const nextVideo = sectionVideos[currentVideoIdx + 1];
        if (nextVideo) {
            const videoPath = nextVideo.getAttribute('data-path');
            const videoTitle = nextVideo.querySelector('.video-title').textContent;
            loadVideo({ path: videoPath, title: videoTitle });
        }
    } else if (currentSectionIdx < navSections.length - 1) {
        const nextSectionVideos = Array.from(navSections[currentSectionIdx + 1].querySelectorAll('.video-item'));
        if (nextSectionVideos.length > 0) {
            const firstVideo = nextSectionVideos[0];
            const videoPath = firstVideo.getAttribute('data-path');
            const videoTitle = firstVideo.querySelector('.video-title').textContent;
            loadVideo({ path: videoPath, title: videoTitle });
        }
    }
}

function showAutoPlayOverlay() {
    removeAutoPlayOverlay();
    autoPlayOverlay = document.createElement('div');
    autoPlayOverlay.className = 'auto-play-overlay';
    autoPlayOverlay.innerHTML = `
        <div style="font-size:1.1rem;margin-bottom:0.7rem;">
            Next video will start playing in <span id="auto-play-timer">${autoPlaySeconds}</span> seconds
        </div>
        <div style="display:flex;gap:1rem;">
            <button id="auto-play-cancel" class="btn" style="background:#ef4444;">Cancel</button>
            <button id="auto-play-now" class="btn" style="background:#2563eb;">Play Now</button>
        </div>
    `;
    if (videoPlayer && videoPlayer.parentNode) {
        videoPlayer.parentNode.appendChild(autoPlayOverlay);
    } else {
        document.body.appendChild(autoPlayOverlay);
    }
    let seconds = autoPlaySeconds;
    autoPlayTimeout = setInterval(() => {
        seconds--;
        const timerSpan = document.getElementById('auto-play-timer');
        if (timerSpan) timerSpan.textContent = seconds;
        if (seconds === 0) {
            clearInterval(autoPlayTimeout);
            removeAutoPlayOverlay();
            playNextVideo();
        }
    }, 1000);
    document.getElementById('auto-play-cancel').onclick = () => {
        clearInterval(autoPlayTimeout);
        removeAutoPlayOverlay();
    };
    document.getElementById('auto-play-now').onclick = () => {
        clearInterval(autoPlayTimeout);
        removeAutoPlayOverlay();
        playNextVideo();
    };
}

function removeAutoPlayOverlay() {
    if (autoPlayOverlay) {
        autoPlayOverlay.remove();
        autoPlayOverlay = null;
    }
}

function updateCurrentSectionHeading() {
    const navSections = document.querySelectorAll('.course-section');
    let found = false;

    if (courseState.currentVideo) {
        navSections.forEach(section => {
            const videoItems = section.querySelectorAll('.video-item');
            videoItems.forEach(item => {
                if (item.getAttribute('data-path') === courseState.currentVideo.path) {
                    const heading = section.querySelector('h3');
                    const mainHeading = document.getElementById('current-section-heading');
                    if (heading && mainHeading) {
                        mainHeading.textContent = heading.textContent;
                    }
                    found = true;
                }
            });
        });
    }

    if (!found) {
        const mainHeading = document.getElementById('current-section-heading');
        if (mainHeading) {
            mainHeading.textContent = courseState.folderHandle ? 'Course Navigation' : 'Select a Course';
        }
    }
}

function toggleMiniPlayer() {
    const miniPlayer = document.getElementById('mini-player');
    if (!miniPlayer) {
        createMiniPlayer();
    } else {
        miniPlayer.remove();
        courseState.settings.miniPlayerEnabled = false;
    }
    saveState();
}

function createMiniPlayer() {
    const miniPlayer = document.createElement('div');
    miniPlayer.id = 'mini-player';
    miniPlayer.className = 'mini-player';

    const videoClone = videoPlayer.cloneNode(true);
    videoClone.controls = true;
    videoClone.className = 'mini-video';

    const controls = document.createElement('div');
    controls.className = 'mini-controls';
    controls.innerHTML = `
        <button class="mini-close"><i class="fas fa-times"></i></button>
        <button class="mini-fullscreen"><i class="fas fa-expand"></i></button>
    `;

    miniPlayer.appendChild(videoClone);
    miniPlayer.appendChild(controls);
    document.body.appendChild(miniPlayer);

    controls.querySelector('.mini-close').onclick = () => {
        miniPlayer.remove();
        courseState.settings.miniPlayerEnabled = false;
        saveState();
    };

    controls.querySelector('.mini-fullscreen').onclick = () => {
        miniPlayer.classList.toggle('expanded');
    };

    makeDraggable(miniPlayer, controls);

    courseState.settings.miniPlayerEnabled = true;
    saveState();
}

function makeDraggable(element, handle) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    handle.onmousedown = dragMouseDown;

    function dragMouseDown(e) {
        e.preventDefault();
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        element.style.top = (element.offsetTop - pos2) + "px";
        element.style.left = (element.offsetLeft - pos1) + "px";
    }

    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
    }
}

function updateSeekbarProgress() {
    if (!videoPlayer || !videoPlayer.duration || !seekbarProgress) return;

    const progress = (videoPlayer.currentTime / videoPlayer.duration) * 100;
    seekbarProgress.style.width = `${progress}%`;
}

function updateBufferDisplay() {
    if (!videoPlayer || !videoPlayer.duration || !seekbarBuffer) return;

    if (videoPlayer.buffered.length > 0) {
        const buffered = videoPlayer.buffered.end(videoPlayer.buffered.length - 1);
        const progress = (buffered / videoPlayer.duration) * 100;
        seekbarBuffer.style.width = `${progress}%`;
    }
}

function updateTimeDisplay() {
    if (!videoPlayer || !timeDisplay) return;

    const current = formatTime(videoPlayer.currentTime || 0);
    const total = formatTime(videoPlayer.duration || 0);
    timeDisplay.textContent = `${current} / ${total}`;
}

function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

document.addEventListener('DOMContentLoaded', init); 
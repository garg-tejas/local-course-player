// Course structure and state management
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
    courseName: null,
    watchStats: {
        totalWatchTime: 0,
        dailyWatchTime: {},
        sectionWatchTime: {}
    }
};

// IndexedDB database name and store names
const DB_NAME = 'coursePlayerDB';
const STORE_NAME = 'folderHandle';
const COURSE_PATH_STORE = 'coursePath';

// DOM Elements
let videoPlayer;
let playPauseBtn;
let skipBackwardBtn;
let skipForwardBtn;
let volumeBtn;
let volumeSlider;
let playbackSpeedSelect;
let fullscreenBtn;
let themeToggle;
let selectFolderBtn;
let courseNavigation;
let progressFill;
let progressText;
let videoTitle;
let globalProgressFill;
let globalProgressText;
let coursePathText;
let clearCourseBtn;
let resetDbBtn;

// Add prev/next button logic and autoplay-next feature
let autoPlayTimeout = null;
let autoPlayOverlay = null;
let autoPlaySeconds = 5;

// Add prev/next video navigation and playback speed memory
let lastPlaybackSpeed = 1;

// Initialize DOM elements
function initializeDOMElements() {
    videoPlayer = document.getElementById('video-player');
    playPauseBtn = document.getElementById('play-pause');
    skipBackwardBtn = document.getElementById('skip-backward');
    skipForwardBtn = document.getElementById('skip-forward');
    volumeBtn = document.getElementById('volume-btn');
    volumeSlider = document.getElementById('volume-slider');
    playbackSpeedSelect = document.getElementById('playback-speed');
    fullscreenBtn = document.getElementById('fullscreen');
    themeToggle = document.getElementById('theme-toggle');
    selectFolderBtn = document.getElementById('select-folder');
    courseNavigation = document.querySelector('.course-navigation');
    progressFill = document.querySelector('.progress-fill');
    progressText = document.querySelector('.progress-text');
    videoTitle = document.getElementById('video-title');
    globalProgressFill = document.getElementById('global-progress-fill');
    globalProgressText = document.getElementById('global-progress-text');
    coursePathText = document.getElementById('course-path-text');
    clearCourseBtn = document.getElementById('clear-course');
    resetDbBtn = document.getElementById('reset-db');

    // Initialize prev/next buttons
    const prevBtn = document.getElementById('prev-video');
    const nextBtn = document.getElementById('next-video');

    if (prevBtn) {
        prevBtn.onclick = playPrevVideo;
    }

    if (nextBtn) {
        nextBtn.onclick = playNextVideo;
    }

    // Verify elements were found
    const elements = {
        videoPlayer,
        playPauseBtn,
        skipBackwardBtn,
        skipForwardBtn,
        volumeBtn,
        volumeSlider,
        playbackSpeedSelect,
        fullscreenBtn,
        themeToggle,
        selectFolderBtn,
        courseNavigation,
        progressFill,
        progressText,
        videoTitle,
        globalProgressFill,
        globalProgressText,
        coursePathText,
        clearCourseBtn,
        resetDbBtn,
        prevBtn,
        nextBtn
    };

    for (const [name, element] of Object.entries(elements)) {
        if (!element) {
            console.error(`Element not found: ${name}`);
        }
    }
}

// Initialize IndexedDB
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

// Store folder handle in IndexedDB
async function storeFolderHandle(handle) {
    try {
        const db = await initDB();
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        // Store the handle with its key
        await store.put(handle, 'folderHandle');

        // Wait for the transaction to complete
        await new Promise((resolve, reject) => {
            transaction.oncomplete = resolve;
            transaction.onerror = reject;
        });

        console.log('Folder handle stored successfully');
    } catch (error) {
        console.error('Error storing folder handle:', error);
        throw error; // Re-throw to handle in the calling function
    }
}

// Restore folder handle from IndexedDB
async function restoreFolderHandle() {
    try {
        const db = await initDB();
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);

        // Get the handle
        const handle = await store.get('folderHandle');

        // Wait for the transaction to complete
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

// Store course path information in IndexedDB
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

// Restore course path information from IndexedDB
async function restoreCoursePath() {
    try {
        const db = await initDB();

        // Check if the store exists
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

// Update course path display
function updateCoursePathDisplay(path, name) {
    if (coursePathText) {
        if (path && name) {
            coursePathText.textContent = name;
            coursePathText.title = path; // Show full path on hover
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
            // Show reset button if we had a course before but lost it
            if (resetDbBtn && (courseState.coursePath || courseState.courseName)) {
                resetDbBtn.style.display = 'flex';
            }
        }
    }
}

// Clear course and reset display
async function clearCourse() {
    try {
        // Clear from IndexedDB
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

        // Reset state
        courseState.folderHandle = null;
        courseState.coursePath = null;
        courseState.courseName = null;

        // Clear navigation
        if (courseNavigation) {
            courseNavigation.innerHTML = '';
        }

        // Update display
        updateCoursePathDisplay(null, null);

        // Update video title
        if (videoTitle) {
            videoTitle.textContent = 'Select a video to start';
        }

        console.log('Course cleared successfully');
    } catch (error) {
        console.error('Error clearing course:', error);
    }
}

// Reset database (for development/debugging)
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
        location.reload(); // Reload the page to reinitialize
    } catch (error) {
        console.error('Error resetting database:', error);
    }
}

// Initialize the application
async function init() {
    console.log('Initializing application...');

    // Initialize DOM elements first
    initializeDOMElements();

    // Check if running in a secure context
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

    // Check if File System Access API is supported
    if (!window.showDirectoryPicker) {
        console.error('File System Access API not supported');
        alert('Your browser does not support the required features. Please use Chrome, Edge, or another Chromium-based browser.');
        return;
    }

    await loadState();
    setupEventListeners();
    applySettings();
    displayWatchStats();

    // Try to restore folder handle from IndexedDB
    try {
        const handle = await restoreFolderHandle();
        console.log('Folder handle restored:', handle ? 'Yes' : 'No');

        if (handle) {
            try {
                // Verify if we still have permission
                const permission = await handle.requestPermission({ mode: 'read' });
                console.log('Permission status:', permission);

                if (permission === 'granted') {
                    courseState.folderHandle = handle;

                    // Update course path display if not already set
                    if (!courseState.coursePath || !courseState.courseName) {
                        courseState.coursePath = handle.name;
                        courseState.courseName = handle.name;
                        updateCoursePathDisplay(handle.name, handle.name);
                        console.log('Course path set from handle:', handle.name);
                    }

                    // Build navigation
                    console.log('Building course navigation...');
                    await buildCourseNavigation();

                    // Update button state
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

        // Final check: if we have a folder handle but no course path display, update it
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

// Load saved state from localStorage
async function loadState() {
    const savedState = localStorage.getItem('courseState');
    if (savedState) {
        const parsed = JSON.parse(savedState);
        courseState.progress = parsed.progress || {};
        courseState.settings = parsed.settings || courseState.settings;
    }

    // Restore course path information
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

// Save state to localStorage
function saveState() {
    localStorage.setItem('courseState', JSON.stringify({
        progress: courseState.progress,
        settings: courseState.settings,
    }));
}

// Setup event listeners
function setupEventListeners() {
    console.log('Setting up event listeners...');

    // Theme toggle
    if (themeToggle) {
        console.log('Setting up theme toggle...');
        themeToggle.addEventListener('click', () => {
            console.log('Theme toggle clicked');
            toggleTheme();
        });
    }

    // Select folder
    if (selectFolderBtn) {
        console.log('Setting up folder selection...');
        selectFolderBtn.addEventListener('click', () => {
            console.log('Select folder clicked');
            selectCourseFolder();
        });
    }

    // Clear course
    if (clearCourseBtn) {
        console.log('Setting up clear course...');
        clearCourseBtn.addEventListener('click', () => {
            console.log('Clear course clicked');
            clearCourse();
        });
    }

    // Reset database
    if (resetDbBtn) {
        console.log('Setting up reset database...');
        resetDbBtn.addEventListener('click', () => {
            console.log('Reset database clicked');
            if (confirm('This will reset all course data and progress. Are you sure?')) {
                resetDatabase();
            }
        });
    }

    // Video player events
    if (videoPlayer) {
        videoPlayer.addEventListener('timeupdate', () => {
            updateProgress();
            updateWatchStats();
        });
        videoPlayer.addEventListener('ended', handleVideoEnd);
        videoPlayer.addEventListener('loadedmetadata', updateVideoInfo);
        videoPlayer.addEventListener('ratechange', () => {
            lastPlaybackSpeed = videoPlayer.playbackRate;
            courseState.settings.playbackSpeed = lastPlaybackSpeed;
            saveState();
        });

        // Add mini player support
        const miniPlayerBtn = document.createElement('button');
        miniPlayerBtn.id = 'mini-player-btn';
        miniPlayerBtn.className = 'control-btn';
        miniPlayerBtn.innerHTML = '<i class="fas fa-compress"></i>';
        miniPlayerBtn.title = 'Mini Player';
        miniPlayerBtn.onclick = toggleMiniPlayer;
        document.querySelector('.video-controls').appendChild(miniPlayerBtn);

        // Add double-click to fullscreen
        videoPlayer.addEventListener('dblclick', toggleFullscreen);

        // Add click handler only for the video seekbar
        const videoSeekbar = document.querySelector('.video-seekbar');
        if (videoSeekbar) {
            videoSeekbar.addEventListener('click', (e) => {
                if (!courseState.currentVideo) return;
                const rect = videoSeekbar.getBoundingClientRect();
                const pos = (e.clientX - rect.left) / rect.width;
                videoPlayer.currentTime = pos * videoPlayer.duration;
            });
        }
    }

    // Control buttons
    if (playPauseBtn) playPauseBtn.addEventListener('click', togglePlayPause);
    if (skipBackwardBtn) skipBackwardBtn.addEventListener('click', () => skipVideo(-10));
    if (skipForwardBtn) skipForwardBtn.addEventListener('click', () => skipVideo(10));
    if (volumeBtn) volumeBtn.addEventListener('click', toggleMute);
    if (volumeSlider) volumeSlider.addEventListener('input', handleVolumeChange);
    if (playbackSpeedSelect) playbackSpeedSelect.addEventListener('change', handlePlaybackSpeedChange);
    if (fullscreenBtn) fullscreenBtn.addEventListener('click', toggleFullscreen);

    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
}

// Select course folder
async function selectCourseFolder() {
    console.log('Selecting course folder...');
    try {
        // Check if the API is supported
        if (!window.showDirectoryPicker) {
            throw new Error('Your browser does not support folder selection. Please use Chrome, Edge, or another Chromium-based browser.');
        }

        // Show loading state
        if (selectFolderBtn) {
            selectFolderBtn.disabled = true;
            selectFolderBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
        }

        const handle = await window.showDirectoryPicker();
        courseState.folderHandle = handle;

        // Store the handle in IndexedDB
        await storeFolderHandle(handle);

        // Store course path information
        const coursePath = handle.name;
        const courseName = handle.name;
        courseState.coursePath = coursePath;
        courseState.courseName = courseName;
        await storeCoursePath(coursePath, courseName);
        updateCoursePathDisplay(coursePath, courseName);

        // Update button state
        if (selectFolderBtn) {
            selectFolderBtn.innerHTML = '<i class="fas fa-check"></i> Course Loaded';
        }

        // Build navigation
        await buildCourseNavigation();

        // Reset button after 2 seconds
        setTimeout(() => {
            if (selectFolderBtn) {
                selectFolderBtn.disabled = false;
                selectFolderBtn.innerHTML = '<i class="fas fa-folder-open"></i> Select Course';
            }
        }, 2000);
    } catch (error) {
        console.error('Error selecting folder:', error);

        // Show error state
        if (selectFolderBtn) {
            selectFolderBtn.disabled = false;
            selectFolderBtn.innerHTML = '<i class="fas fa-exclamation-circle"></i> Error';
        }

        // Show error message
        alert(error.message || 'Error selecting folder. Please try again.');

        // Reset button after 2 seconds
        setTimeout(() => {
            if (selectFolderBtn) {
                selectFolderBtn.innerHTML = '<i class="fas fa-folder-open"></i> Select Course';
            }
        }, 2000);
    }
}

// Build course navigation from folder structure
async function buildCourseNavigation() {
    document.getElementById('welcome-message')?.classList.add('welcome-hidden');

    if (!courseState.folderHandle) return;

    try {
        // Clear existing navigation
        courseNavigation.innerHTML = '';

        // Get all entries in the folder
        const sections = [];
        for await (const [name, handle] of courseState.folderHandle.entries()) {
            if (handle.kind === 'directory') {
                const section = {
                    title: name,
                    videos: []
                };

                // Get all video files in the section
                for await (const [fileName, fileHandle] of handle.entries()) {
                    if (fileHandle.kind === 'file' && fileName.endsWith('.mp4')) {
                        section.videos.push({
                            title: fileName.replace(/^[0-9]+\s+/, '').replace('.mp4', ''),
                            handle: fileHandle,
                            path: `${name}/${fileName}`
                        });
                    }
                }

                // Sort videos by filename
                section.videos.sort((a, b) => a.path.localeCompare(b.path));
                sections.push(section);
            }
        }

        // Sort sections by name
        sections.sort((a, b) => a.title.localeCompare(b.title));

        // Create navigation elements
        sections.forEach(section => {
            const sectionElement = createSectionElement(section);
            courseNavigation.appendChild(sectionElement);
        });
        updateAllProgressBars();
    } catch (error) {
        console.error('Error building course navigation:', error);
        alert('Error loading course structure. Please try again.');
    }
}

// Create section element with progress bar
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

// Create video element
function createVideoElement(video) {
    const videoDiv = document.createElement('div');
    videoDiv.className = 'video-item';
    videoDiv.setAttribute('data-path', video.path);
    videoDiv.innerHTML = `
        <span class="video-title">${video.title}</span>
        <span class="video-status"></span>
    `;

    videoDiv.addEventListener('click', () => loadVideo(video));

    // Update video status
    updateVideoStatus(videoDiv, video.path);

    return videoDiv;
}

// Load video
async function loadVideo(video) {
    try {
        // If we're navigating and only have path/title, find the actual video handle
        if (!video.handle && video.path) {
            const sections = Array.from(document.querySelectorAll('.course-section'));
            for (const section of sections) {
                const videos = Array.from(section.querySelectorAll('.video-item'));
                const foundVideo = videos.find(v => v.getAttribute('data-path') === video.path);
                if (foundVideo) {
                    // Get the section name from the path
                    const sectionName = video.path.split('/')[0];
                    // Get the section handle
                    const sectionHandle = await courseState.folderHandle.getDirectoryHandle(sectionName);
                    // Get the video handle
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

        // Clean up previous video URL if exists
        if (videoPlayer.src) {
            URL.revokeObjectURL(videoPlayer.src);
        }

        courseState.currentVideo = video;
        videoPlayer.src = url;
        videoTitle.textContent = video.title;

        // Load saved progress
        if (courseState.progress[video.path]) {
            videoPlayer.currentTime = courseState.progress[video.path].time;
        }

        // Update current section heading
        updateCurrentSectionHeading();

        videoPlayer.playbackRate = courseState.settings.playbackSpeed || lastPlaybackSpeed || 1;
        videoPlayer.play();
    } catch (error) {
        console.error('Error loading video:', error);
        alert('Error loading video. Please try again.');
    }
}

// Update video progress and mark as watched at 90%
function updateProgress() {
    if (!courseState.currentVideo) return;
    const progress = {
        time: videoPlayer.currentTime,
        duration: videoPlayer.duration,
        percentage: (videoPlayer.currentTime / videoPlayer.duration) * 100
    };
    courseState.progress[courseState.currentVideo.path] = progress;
    // Mark as completed if 90% watched
    if (progress.percentage >= 90 && !courseState.progress[courseState.currentVideo.path].completed) {
        courseState.progress[courseState.currentVideo.path].completed = true;
        saveState();
        updateVideoStatus(document.querySelector(`[data-path="${courseState.currentVideo.path}"]`), courseState.currentVideo.path);
        updateAllProgressBars();
    }
    saveState();
}

function handleVideoEnd() {
    if (!courseState.currentVideo) return;
    courseState.progress[courseState.currentVideo.path].completed = true;
    saveState();
    updateVideoStatus(document.querySelector(`[data-path="${courseState.currentVideo.path}"]`), courseState.currentVideo.path);
    updateAllProgressBars();
    showAutoPlayOverlay();
}

// Update video status in navigation
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

// Video controls
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

function handlePlaybackSpeedChange(e) {
    const speed = parseFloat(e.target.value);
    videoPlayer.playbackRate = speed;
    courseState.settings.playbackSpeed = speed;
    saveState();
}

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        videoPlayer.requestFullscreen();
    } else {
        document.exitFullscreen();
    }
}

// Theme toggle
function toggleTheme() {
    console.log('Toggling theme...');
    document.body.classList.toggle('dark-mode');
    courseState.settings.theme = document.body.classList.contains('dark-mode') ? 'dark' : 'light';
    saveState();

    // Update theme toggle icon
    if (themeToggle) {
        themeToggle.innerHTML = document.body.classList.contains('dark-mode')
            ? '<i class="fas fa-sun"></i>'
            : '<i class="fas fa-moon"></i>';
    }
}

// Keyboard shortcuts
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
    }
}

// Utility functions
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    seconds = Math.floor(seconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function applySettings() {
    // Apply saved settings
    videoPlayer.playbackRate = courseState.settings.playbackSpeed;
    videoPlayer.volume = courseState.settings.volume;
    playbackSpeedSelect.value = courseState.settings.playbackSpeed;
    volumeSlider.value = courseState.settings.volume;

    if (courseState.settings.theme === 'dark') {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
}

// Update video info when metadata is loaded
function updateVideoInfo() {
    if (!courseState.currentVideo) return;
    // Load saved progress
    if (courseState.progress[courseState.currentVideo.path]) {
        videoPlayer.currentTime = courseState.progress[courseState.currentVideo.path].time;
    }
    // Set playback speed
    videoPlayer.playbackRate = courseState.settings.playbackSpeed || lastPlaybackSpeed || 1;
}

// Get current video index and section
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

// Play previous video
function playPrevVideo() {
    const { currentSectionIdx, currentVideoIdx, sectionVideos, navSections } = getCurrentVideoIndexAndSection();

    if (currentVideoIdx > 0) {
        // Play previous video in current section
        const prevVideo = sectionVideos[currentVideoIdx - 1];
        if (prevVideo) {
            const videoPath = prevVideo.getAttribute('data-path');
            const videoTitle = prevVideo.querySelector('.video-title').textContent;
            loadVideo({ path: videoPath, title: videoTitle });
        }
    } else if (currentSectionIdx > 0) {
        // Play last video of previous section
        const prevSectionVideos = Array.from(navSections[currentSectionIdx - 1].querySelectorAll('.video-item'));
        if (prevSectionVideos.length > 0) {
            const lastVideo = prevSectionVideos[prevSectionVideos.length - 1];
            const videoPath = lastVideo.getAttribute('data-path');
            const videoTitle = lastVideo.querySelector('.video-title').textContent;
            loadVideo({ path: videoPath, title: videoTitle });
        }
    }
}

// Play next video
function playNextVideo() {
    const { currentSectionIdx, currentVideoIdx, sectionVideos, navSections } = getCurrentVideoIndexAndSection();

    if (currentVideoIdx < sectionVideos.length - 1) {
        // Play next video in current section
        const nextVideo = sectionVideos[currentVideoIdx + 1];
        if (nextVideo) {
            const videoPath = nextVideo.getAttribute('data-path');
            const videoTitle = nextVideo.querySelector('.video-title').textContent;
            loadVideo({ path: videoPath, title: videoTitle });
        }
    } else if (currentSectionIdx < navSections.length - 1) {
        // Play first video of next section
        const nextSectionVideos = Array.from(navSections[currentSectionIdx + 1].querySelectorAll('.video-item'));
        if (nextSectionVideos.length > 0) {
            const firstVideo = nextSectionVideos[0];
            const videoPath = firstVideo.getAttribute('data-path');
            const videoTitle = firstVideo.querySelector('.video-title').textContent;
            loadVideo({ path: videoPath, title: videoTitle });
        }
    }
}

// Show auto play overlay
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
    // Append to video's parent for perfect centering
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

// Update all progress bars (section and global)
function updateAllProgressBars() {
    const sectionDivs = document.querySelectorAll('.course-section');
    let totalVideos = 0, totalWatched = 0;
    sectionDivs.forEach(sectionDiv => {
        const videoItems = sectionDiv.querySelectorAll('.video-item');
        let watched = 0;
        videoItems.forEach(item => {
            const path = item.getAttribute('data-path');
            if (courseState.progress[path]?.completed) watched++;
        });
        const sectionProgressBar = sectionDiv.querySelector('.progress-fill');
        const percent = videoItems.length ? (watched / videoItems.length) * 100 : 0;
        if (sectionProgressBar) sectionProgressBar.style.width = percent + '%';
        totalVideos += videoItems.length;
        totalWatched += watched;
    });
    // Global progress
    const globalPercent = totalVideos ? (totalWatched / totalVideos) * 100 : 0;
    if (globalProgressFill) globalProgressFill.style.width = globalPercent + '%';
    if (globalProgressText) globalProgressText.textContent = `${Math.round(globalPercent)}% Complete`;
}

// Update current section heading when loading a video
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

// Toggle Mini Player
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

// Create Mini Player
function createMiniPlayer() {
    const miniPlayer = document.createElement('div');
    miniPlayer.id = 'mini-player';
    miniPlayer.className = 'mini-player';

    // Clone video player
    const videoClone = videoPlayer.cloneNode(true);
    videoClone.controls = true;
    videoClone.className = 'mini-video';

    // Add controls
    const controls = document.createElement('div');
    controls.className = 'mini-controls';
    controls.innerHTML = `
        <button class="mini-close"><i class="fas fa-times"></i></button>
        <button class="mini-fullscreen"><i class="fas fa-expand"></i></button>
    `;

    miniPlayer.appendChild(videoClone);
    miniPlayer.appendChild(controls);
    document.body.appendChild(miniPlayer);

    // Setup controls
    controls.querySelector('.mini-close').onclick = () => {
        miniPlayer.remove();
        courseState.settings.miniPlayerEnabled = false;
        saveState();
    };

    controls.querySelector('.mini-fullscreen').onclick = () => {
        miniPlayer.classList.toggle('expanded');
    };

    // Make mini player draggable
    makeDraggable(miniPlayer, controls);

    courseState.settings.miniPlayerEnabled = true;
    saveState();
}

// Make element draggable
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

// Update watch statistics
function updateWatchStats() {
    if (!courseState.currentVideo) return;

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const section = courseState.currentVideo.path.split('/')[0];

    // Update total watch time
    courseState.watchStats.totalWatchTime += 1; // Add 1 second

    // Update daily watch time
    if (!courseState.watchStats.dailyWatchTime[today]) {
        courseState.watchStats.dailyWatchTime[today] = 0;
    }
    courseState.watchStats.dailyWatchTime[today] += 1;

    // Update section watch time
    if (!courseState.watchStats.sectionWatchTime[section]) {
        courseState.watchStats.sectionWatchTime[section] = 0;
    }
    courseState.watchStats.sectionWatchTime[section] += 1;

    // Save stats every 30 seconds
    if (courseState.watchStats.totalWatchTime % 30 === 0) {
        saveState();
    }
}

// Format time duration
function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
        return `${hours}h ${minutes}m ${remainingSeconds}s`;
    } else if (minutes > 0) {
        return `${minutes}m ${remainingSeconds}s`;
    } else {
        return `${remainingSeconds}s`;
    }
}

// Display watch statistics
function displayWatchStats() {
    const statsContainer = document.createElement('div');
    statsContainer.className = 'watch-stats';

    // Calculate section progress
    const sectionProgress = {};
    const navSections = document.querySelectorAll('.course-section');
    navSections.forEach(section => {
        const sectionName = section.querySelector('h3').textContent;
        const videos = section.querySelectorAll('.video-item');
        let completed = 0;
        videos.forEach(video => {
            const path = video.getAttribute('data-path');
            if (courseState.progress[path]?.completed) {
                completed++;
            }
        });
        sectionProgress[sectionName] = {
            total: videos.length,
            completed: completed,
            percentage: videos.length ? Math.round((completed / videos.length) * 100) : 0
        };
    });

    // Calculate total progress
    let totalVideos = 0;
    let totalCompleted = 0;
    Object.values(sectionProgress).forEach(section => {
        totalVideos += section.total;
        totalCompleted += section.completed;
    });
    const totalPercentage = totalVideos ? Math.round((totalCompleted / totalVideos) * 100) : 0;

    statsContainer.innerHTML = `
        <h3>Progress Statistics</h3>
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-value">${totalPercentage}%</div>
                <div class="stat-label">Overall Progress</div>
                <div class="stat-detail">${totalCompleted} of ${totalVideos} videos completed</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${formatDuration(courseState.watchStats.totalWatchTime)}</div>
                <div class="stat-label">Total Watch Time</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${formatDuration(getTodayWatchTime())}</div>
                <div class="stat-label">Today's Watch Time</div>
            </div>
        </div>
        <div class="section-stats">
            <h4>Section Progress</h4>
            ${Object.entries(sectionProgress).map(([section, stats]) => `
                <div class="section-stat">
                    <div class="section-name">${section}</div>
                    <div class="section-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${stats.percentage}%"></div>
                        </div>
                        <div class="section-percentage">${stats.percentage}%</div>
                    </div>
                    <div class="section-detail">${stats.completed} of ${stats.total} videos completed</div>
                </div>
            `).join('')}
        </div>
    `;

    // Insert after the video player
    const videoContainer = document.querySelector('.video-container');
    if (videoContainer) {
        videoContainer.parentNode.insertBefore(statsContainer, videoContainer.nextSibling);
    }
}

// Get today's watch time
function getTodayWatchTime() {
    const today = new Date().toISOString().split('T')[0];
    return courseState.watchStats.dailyWatchTime[today] || 0;
}

// Get most watched section
function getMostWatchedSection() {
    let maxTime = 0;
    let maxSection = '';

    for (const [section, time] of Object.entries(courseState.watchStats.sectionWatchTime)) {
        if (time > maxTime) {
            maxTime = time;
            maxSection = section;
        }
    }

    return maxSection || 'None';
}

// Initialize the application when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', init); 
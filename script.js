let ytb;
let timestamps = [];
let students = [];

function onYouTubeIframeAPIReady() {
    document.getElementById('load-button').addEventListener('click', loadVideo);
    document.getElementById('save-button').addEventListener('click', saveToExcel);
    document.getElementById('add-student').addEventListener('click', addStudent);
}

function loadVideo() {
    const url = document.getElementById('youtube-url').value;
    const videoId = getYouTubeVideoId(url);

    if (videoId) {
        loadYouTubePlayer(videoId);
    } else {
        alert('유효한 YouTube URL을 입력하세요.');
    }
}

function getYouTubeVideoId(url) {
    const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
}

function loadYouTubePlayer(videoId) {
    const iframe = document.getElementById('youtube-player');
    iframe.src = `https://www.youtube.com/embed/${videoId}?enablejsapi=1`;

    ytb = new YT.Player(iframe, {
        events: {
            onReady: (event) => {
                event.target.playVideo();
                setTimeout(() => {
                    const totalDuration = Math.floor(ytb.getDuration());
                    document.getElementById('ytb_tot').value = formatTime(totalDuration);
                    generateTimestamps(totalDuration);
                }, 1000);
            }
        }
    });

    setInterval(updateCurrentTime, 1000);
}

function updateCurrentTime() {
    if (ytb && ytb.getCurrentTime && ytb.getDuration) {
        document.getElementById('ytb_cur').value = formatTime(Math.floor(ytb.getCurrentTime()));
        document.getElementById('ytb_tot').value = formatTime(Math.floor(ytb.getDuration()));
    }
}

function generateTimestamps(totalDuration) {
    timestamps = [];
    for (let i = 0; i <= totalDuration; i += 2) {
        const time = formatTime(i);
        timestamps.push([time, '공부']);
    }
}

function formatTime(seconds) {
    const minutes = String(Math.floor(seconds / 60)).padStart(2, '0');
    const remainingSeconds = String(seconds % 60).padStart(2, '0');
    return `${minutes}:${seconds}`;
}

function addStudent() {
    const name = document.getElementById('student-name').value.trim();
    if (name) {
        const student = { name, distractions: [] };
        students.push(student);
        renderStudentList();
        document.getElementById('student-name').value = '';
    }
}

function renderStudentList() {
    const studentList = document.getElementById('student-list');
    studentList.innerHTML = ''; // 기존 리스트를 비웁니다
    students.forEach((student, index) => {
        const studentContainer = document.createElement('div');
        studentContainer.className = 'student-container';
        studentContainer.innerHTML = `
            <h3>${student.name}</h3>
            <div class="button-container">
                <button onclick="startDistraction(${index})">딴짓 시작</button>
                <button onclick="endDistraction(${index})">딴짓 끝</button>
            </div>
            <ul class="distraction-list" id="distraction-list-${index}"></ul>
        `;
        studentList.appendChild(studentContainer);
        renderDistractions(index);
    });
}

function startDistraction(studentIndex) {
    if (!ytb || !ytb.getCurrentTime) {
        alert('먼저 YouTube 영상을 불러와주세요.');
        return;
    }
    const currentTime = Math.floor(ytb.getCurrentTime());
    students[studentIndex].distractions.push({ start: currentTime, end: null });
    renderDistractions(studentIndex);
}

function endDistraction(studentIndex) {
    if (!ytb || !ytb.getCurrentTime) {
        alert('먼저 YouTube 영상을 불러와주세요.');
        return;
    }
    const currentTime = Math.floor(ytb.getCurrentTime());
    const lastDistraction = students[studentIndex].distractions[students[studentIndex].distractions.length - 1];
    if (lastDistraction && lastDistraction.end === null) {
        lastDistraction.end = currentTime;
        markDistractionPeriod(studentIndex, lastDistraction.start, lastDistraction.end);
    }
    renderDistractions(studentIndex);
}

function renderDistractions(studentIndex) {
    const distractionList = document.getElementById(`distraction-list-${studentIndex}`);
    distractionList.innerHTML = '';
    students[studentIndex].distractions.forEach(distraction => {
        const li = document.createElement('li');
        li.textContent = `${formatTime(distraction.start)} ~ ${distraction.end ? formatTime(distraction.end) : '진행 중'}`;
        distractionList.appendChild(li);
    });
}

function markDistractionPeriod(studentIndex, start, end) {
    const startIndex = Math.floor(start / 2);
    const endIndex = Math.floor(end / 2);

    for (let i = startIndex; i <= endIndex && i < timestamps.length; i++) {
        if (!timestamps[i][studentIndex + 2]) {
            timestamps[i][studentIndex + 2] = '딴짓';
        }
    }
}

function saveToExcel() {
    const headers = ['시간', '기본 상태', ...students.map(s => s.name)];
    const data = [headers, ...timestamps];
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Study Timer");
    XLSX.writeFile(workbook, 'study_timer.xlsx');
}
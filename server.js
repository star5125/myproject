const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('.'));

const DATA_DIR = './data';
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const RESERVATIONS_FILE = path.join(DATA_DIR, 'reservations.json');

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR);
}

function loadData(filename, defaultData) {
    // Vercel에서는 파일 시스템이 read-only이므로 메모리 저장 방식 사용
    if (process.env.VERCEL) {
        return defaultData;
    }

    try {
        if (fs.existsSync(filename)) {
            const data = fs.readFileSync(filename, 'utf8');
            return JSON.parse(data);
        }
        return defaultData;
    } catch (error) {
        console.error(`Error loading ${filename}:`, error);
        return defaultData;
    }
}

function saveData(filename, data) {
    // Vercel에서는 파일 저장하지 않고 메모리에만 유지
    if (process.env.VERCEL) {
        return true;
    }

    try {
        fs.writeFileSync(filename, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error(`Error saving ${filename}:`, error);
        return false;
    }
}

const defaultUsers = [
    { username: 'admin', password: 'admin123', role: 'admin', name: '관리자' },
    { username: 'user1', password: 'user123', role: 'user', name: '사용자1' },
    { username: 'user2', password: 'user123', role: 'user', name: '사용자2' },
    { username: 'user3', password: 'user123', role: 'user', name: '김철수' },
    { username: 'user4', password: 'user123', role: 'user', name: '이영희' }
];

let users = loadData(USERS_FILE, defaultUsers);
let reservations = loadData(RESERVATIONS_FILE, []);

saveData(USERS_FILE, users);

const facilities = {
    library: { name: '도서관', capacity: 50 },
    multimedia: { name: '멀티미디어실', capacity: 30 },
    club1: { name: '동아리실1', capacity: 20 },
    club2: { name: '동아리실2', capacity: 20 }
};

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    const user = users.find(u => u.username === username && u.password === password);

    if (user) {
        const { password, ...userInfo } = user;
        res.json({ success: true, user: userInfo });
    } else {
        res.status(401).json({ success: false, message: '아이디 또는 비밀번호가 올바르지 않습니다.' });
    }
});

app.post('/api/register', (req, res) => {
    const { username, name, password } = req.body;

    if (!username || !name || !password) {
        return res.status(400).json({ success: false, message: '모든 필드를 입력해주세요.' });
    }

    if (users.find(u => u.username === username)) {
        return res.status(409).json({ success: false, message: '이미 존재하는 사용자명입니다.' });
    }

    const newUser = {
        username,
        name,
        password,
        role: 'user',
        createdAt: new Date().toISOString()
    };

    users.push(newUser);

    if (saveData(USERS_FILE, users)) {
        const { password, ...userInfo } = newUser;
        res.json({ success: true, user: userInfo, message: '회원가입이 완료되었습니다.' });
    } else {
        res.status(500).json({ success: false, message: '회원가입 중 오류가 발생했습니다.' });
    }
});

app.get('/api/facilities', (req, res) => {
    res.json(facilities);
});

app.get('/api/reservations', (req, res) => {
    const { facility, date, userOnly, username } = req.query;

    let filteredReservations = reservations;

    if (facility) {
        filteredReservations = filteredReservations.filter(r => r.facility === facility);
    }

    if (date) {
        filteredReservations = filteredReservations.filter(r => r.date === date);
    }

    if (userOnly === 'true' && username) {
        filteredReservations = filteredReservations.filter(r => r.user === username);
    }

    res.json(filteredReservations);
});

app.post('/api/reservations', (req, res) => {
    const { user, userName, facility, facilityName, date, timeSlots, description } = req.body;

    if (!user || !facility || !date || !timeSlots || timeSlots.length === 0) {
        return res.status(400).json({ success: false, message: '필수 정보가 누락되었습니다.' });
    }

    const conflictSlots = timeSlots.filter(slot => {
        return reservations.some(r =>
            r.facility === facility &&
            r.date === date &&
            r.timeSlots.includes(slot)
        );
    });

    if (conflictSlots.length > 0) {
        return res.status(409).json({
            success: false,
            message: '이미 예약된 시간대가 포함되어 있습니다.',
            conflictSlots
        });
    }

    const reservation = {
        id: Date.now(),
        user,
        userName,
        facility,
        facilityName,
        date,
        timeSlots,
        description: description || '',
        createdAt: new Date().toISOString()
    };

    reservations.push(reservation);

    if (saveData(RESERVATIONS_FILE, reservations)) {
        res.json({ success: true, reservation });
    } else {
        res.status(500).json({ success: false, message: '예약 저장 중 오류가 발생했습니다.' });
    }
});

app.delete('/api/reservations/:id', (req, res) => {
    const reservationId = parseInt(req.params.id);
    const { username, role } = req.query;

    const reservationIndex = reservations.findIndex(r => r.id === reservationId);

    if (reservationIndex === -1) {
        return res.status(404).json({ success: false, message: '예약을 찾을 수 없습니다.' });
    }

    const reservation = reservations[reservationIndex];

    if (role !== 'admin' && reservation.user !== username) {
        return res.status(403).json({ success: false, message: '본인의 예약만 취소할 수 있습니다.' });
    }

    reservations.splice(reservationIndex, 1);

    if (saveData(RESERVATIONS_FILE, reservations)) {
        res.json({ success: true, message: '예약이 취소되었습니다.' });
    } else {
        res.status(500).json({ success: false, message: '예약 취소 중 오류가 발생했습니다.' });
    }
});

app.get('/api/users', (req, res) => {
    const publicUsers = users.map(({ password, ...user }) => user);
    res.json(publicUsers);
});

app.get('/api/admin/stats', (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    const upcomingReservations = reservations.filter(r => r.date >= today);

    const userStats = users.filter(u => u.role !== 'admin').map(user => {
        const userReservations = reservations.filter(r => r.user === user.username);
        return {
            ...user,
            totalReservations: userReservations.length,
            upcomingReservations: userReservations.filter(r => r.date >= today).length
        };
    });

    const facilityStats = Object.keys(facilities).map(key => {
        const facilityReservations = upcomingReservations.filter(r => r.facility === key);
        return {
            facility: key,
            name: facilities[key].name,
            reservations: facilityReservations.length,
            totalSlots: facilityReservations.reduce((acc, r) => acc + r.timeSlots.length, 0)
        };
    });

    res.json({
        totalUsers: users.filter(u => u.role !== 'admin').length,
        totalReservations: reservations.length,
        upcomingReservations: upcomingReservations.length,
        userStats,
        facilityStats
    });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
    console.log('예약 시스템에 접속하세요!');
});
const express = require('express');
const cors = require('cors');

// 메모리 저장소
let users = [
    { username: 'admin', password: 'admin123', role: 'admin', name: '관리자' },
    { username: 'user1', password: 'user123', role: 'user', name: '사용자1' },
    { username: 'user2', password: 'user123', role: 'user', name: '사용자2' },
    { username: 'user3', password: 'user123', role: 'user', name: '김철수' },
    { username: 'user4', password: 'user123', role: 'user', name: '이영희' }
];

let reservations = [];

const facilities = {
    library: { name: '도서관', capacity: 50 },
    multimedia: { name: '멀티미디어실', capacity: 30 },
    club1: { name: '동아리실1', capacity: 20 },
    club2: { name: '동아리실2', capacity: 20 }
};

const app = express();

app.use(cors());
app.use(express.json());

// 로그인 API
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username && u.password === password);

    if (user) {
        const { password, ...userInfo } = user;
        res.json({ success: true, user: userInfo });
    } else {
        res.status(401).json({ success: false, message: '아이디 또는 비밀번호가 올바르지 않습니다.' });
    }
});

// 회원가입 API
app.post('/register', (req, res) => {
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
    const { password: _, ...userInfo } = newUser;
    res.json({ success: true, user: userInfo, message: '회원가입이 완료되었습니다.' });
});

// 시설 정보 API
app.get('/facilities', (req, res) => {
    res.json(facilities);
});

// 예약 조회 API
app.get('/reservations', (req, res) => {
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

// 예약 생성 API
app.post('/reservations', (req, res) => {
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
    res.json({ success: true, reservation });
});

// 예약 삭제 API
app.delete('/reservations/:id', (req, res) => {
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
    res.json({ success: true, message: '예약이 취소되었습니다.' });
});

// 사용자 목록 API
app.get('/users', (req, res) => {
    const publicUsers = users.map(({ password, ...user }) => user);
    res.json(publicUsers);
});

// 관리자 통계 API
app.get('/admin/stats', (req, res) => {
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

// 404 처리
app.use((req, res) => {
    res.status(404).json({ success: false, message: 'API endpoint not found' });
});

module.exports = app;
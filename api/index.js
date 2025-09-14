// 메모리 저장소 (전역 변수로 유지)
if (!global.users) {
    global.users = [
        { username: 'admin', password: 'admin123', role: 'admin', name: '관리자' },
        { username: 'user1', password: 'user123', role: 'user', name: '사용자1' },
        { username: 'user2', password: 'user123', role: 'user', name: '사용자2' },
        { username: 'user3', password: 'user123', role: 'user', name: '김철수' },
        { username: 'user4', password: 'user123', role: 'user', name: '이영희' }
    ];
}

if (!global.reservations) {
    global.reservations = [];
}

const facilities = {
    library: { name: '도서관', capacity: 50 },
    multimedia: { name: '멀티미디어실', capacity: 30 },
    club1: { name: '동아리실1', capacity: 20 },
    club2: { name: '동아리실2', capacity: 20 }
};

// CORS 헤더 설정 함수
function setCorsHeaders(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// 메인 핸들러 함수
module.exports = async (req, res) => {
    setCorsHeaders(res);

    // OPTIONS 요청 처리 (CORS preflight)
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { method, url } = req;
    const urlPath = url.replace('/api', '');

    try {
        // 로그인 API
        if (method === 'POST' && urlPath === '/login') {
            const { username, password } = req.body;
            const user = global.users.find(u => u.username === username && u.password === password);

            if (user) {
                const { password: _, ...userInfo } = user;
                return res.json({ success: true, user: userInfo });
            } else {
                return res.status(401).json({ success: false, message: '아이디 또는 비밀번호가 올바르지 않습니다.' });
            }
        }

        // 회원가입 API
        if (method === 'POST' && urlPath === '/register') {
            const { username, name, password } = req.body;

            if (!username || !name || !password) {
                return res.status(400).json({ success: false, message: '모든 필드를 입력해주세요.' });
            }

            if (global.users.find(u => u.username === username)) {
                return res.status(409).json({ success: false, message: '이미 존재하는 사용자명입니다.' });
            }

            const newUser = {
                username,
                name,
                password,
                role: 'user',
                createdAt: new Date().toISOString()
            };

            global.users.push(newUser);
            const { password: _, ...userInfo } = newUser;
            return res.json({ success: true, user: userInfo, message: '회원가입이 완료되었습니다.' });
        }

        // 시설 정보 API
        if (method === 'GET' && urlPath === '/facilities') {
            return res.json(facilities);
        }

        // 예약 조회 API
        if (method === 'GET' && urlPath === '/reservations') {
            const query = new URL(req.url, 'http://localhost').searchParams;
            const facility = query.get('facility');
            const date = query.get('date');
            const userOnly = query.get('userOnly');
            const username = query.get('username');

            let filteredReservations = global.reservations;

            if (facility) {
                filteredReservations = filteredReservations.filter(r => r.facility === facility);
            }

            if (date) {
                filteredReservations = filteredReservations.filter(r => r.date === date);
            }

            if (userOnly === 'true' && username) {
                filteredReservations = filteredReservations.filter(r => r.user === username);
            }

            return res.json(filteredReservations);
        }

        // 예약 생성 API
        if (method === 'POST' && urlPath === '/reservations') {
            const { user, userName, facility, facilityName, date, timeSlots, description } = req.body;

            if (!user || !facility || !date || !timeSlots || timeSlots.length === 0) {
                return res.status(400).json({ success: false, message: '필수 정보가 누락되었습니다.' });
            }

            const conflictSlots = timeSlots.filter(slot => {
                return global.reservations.some(r =>
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

            global.reservations.push(reservation);
            return res.json({ success: true, reservation });
        }

        // 예약 삭제 API
        if (method === 'DELETE' && urlPath.startsWith('/reservations/')) {
            const reservationId = parseInt(urlPath.split('/')[2]);
            const query = new URL(req.url, 'http://localhost').searchParams;
            const username = query.get('username');
            const role = query.get('role');

            const reservationIndex = global.reservations.findIndex(r => r.id === reservationId);

            if (reservationIndex === -1) {
                return res.status(404).json({ success: false, message: '예약을 찾을 수 없습니다.' });
            }

            const reservation = global.reservations[reservationIndex];

            if (role !== 'admin' && reservation.user !== username) {
                return res.status(403).json({ success: false, message: '본인의 예약만 취소할 수 있습니다.' });
            }

            global.reservations.splice(reservationIndex, 1);
            return res.json({ success: true, message: '예약이 취소되었습니다.' });
        }

        // 사용자 목록 API
        if (method === 'GET' && urlPath === '/users') {
            const publicUsers = global.users.map(({ password, ...user }) => user);
            return res.json(publicUsers);
        }

        // 관리자 통계 API
        if (method === 'GET' && urlPath === '/admin/stats') {
            const today = new Date().toISOString().split('T')[0];
            const upcomingReservations = global.reservations.filter(r => r.date >= today);

            const userStats = global.users.filter(u => u.role !== 'admin').map(user => {
                const userReservations = global.reservations.filter(r => r.user === user.username);
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

            return res.json({
                totalUsers: global.users.filter(u => u.role !== 'admin').length,
                totalReservations: global.reservations.length,
                upcomingReservations: upcomingReservations.length,
                userStats,
                facilityStats
            });
        }

        // 404 처리
        return res.status(404).json({ success: false, message: 'API endpoint not found' });

    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
};
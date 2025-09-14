class ReservationSystem {
    constructor() {
        this.currentUser = null;
        this.facilities = {};
        this.reservations = [];
        this.timeSlots = ['09:00-10:00', '10:00-11:00', '11:00-12:00', '12:00-13:00',
                         '13:00-14:00', '14:00-15:00', '15:00-16:00', '16:00-17:00', '17:00-18:00'];
        this.selectedSlots = [];
        this.currentFacility = null;
        this.currentDate = null;
        this.baseURL = window.location.hostname === 'localhost'
            ? 'http://localhost:3001/api'
            : '/api';

        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.loadFacilities();
        this.checkLogin();
        this.setMinDate();
    }

    async loadFacilities() {
        try {
            const response = await fetch(`${this.baseURL}/facilities`);
            this.facilities = await response.json();
        } catch (error) {
            console.error('시설 정보 로드 실패:', error);
            this.showMessage('시설 정보를 불러오는데 실패했습니다.', 'error');
        }
    }

    setupEventListeners() {
        const loginBtn = document.getElementById('login-btn');
        const registerBtn = document.getElementById('register-btn');
        const logoutBtn = document.getElementById('logout-btn');
        const myReservationsBtn = document.getElementById('my-reservations-btn');
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');
        const reservationDetailForm = document.getElementById('reservation-detail-form');

        if (loginBtn) {
            loginBtn.addEventListener('click', () => this.showLoginModal());
        }

        if (registerBtn) {
            registerBtn.addEventListener('click', () => this.showRegisterModal());
        }

        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }

        if (myReservationsBtn) {
            myReservationsBtn.addEventListener('click', () => this.showMyReservations());
        }

        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        if (registerForm) {
            registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        }

        if (reservationDetailForm) {
            reservationDetailForm.addEventListener('submit', (e) => this.handleReservationWithDetail(e));
        }

        // Close buttons
        const closeButtons = document.querySelectorAll('.close, .close-register, .close-detail, .close-my-reservations');
        closeButtons.forEach(btn => {
            btn.addEventListener('click', () => this.hideAllModals());
        });

        document.querySelectorAll('.facility-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.selectFacility(e.target.dataset.facility));
        });

        const backBtn = document.getElementById('back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', () => this.showFacilitySelection());
        }

        const reservationDate = document.getElementById('reservation-date');
        if (reservationDate) {
            reservationDate.addEventListener('change', (e) => this.loadTimeSlots(e.target.value));
        }

        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchAdminTab(e.target.dataset.tab));
        });

        window.addEventListener('click', (e) => {
            const modals = ['login-modal', 'register-modal', 'reservation-detail-modal', 'my-reservations-modal'];
            modals.forEach(modalId => {
                const modal = document.getElementById(modalId);
                if (e.target === modal) {
                    this.hideAllModals();
                }
            });
        });
    }

    setMinDate() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('reservation-date').min = today;
        document.getElementById('reservation-date').value = today;
    }

    showLoginModal() {
        this.hideAllModals();
        document.getElementById('login-modal').style.display = 'block';
    }

    showRegisterModal() {
        this.hideAllModals();
        document.getElementById('register-modal').style.display = 'block';
    }

    showReservationDetailModal(facility, date, timeSlots) {
        this.hideAllModals();
        document.getElementById('detail-facility').textContent = this.facilities[facility].name;
        document.getElementById('detail-date').textContent = date;
        document.getElementById('detail-time').textContent = timeSlots.join(', ');
        document.getElementById('reservation-detail-modal').style.display = 'block';
    }

    showMyReservations() {
        this.hideAllModals();
        document.getElementById('my-reservations-modal').style.display = 'block';
        this.loadUserReservations();
    }

    hideAllModals() {
        const modals = ['login-modal', 'register-modal', 'reservation-detail-modal', 'my-reservations-modal'];
        modals.forEach(modalId => {
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.style.display = 'none';
            }
        });

        // Reset forms
        const forms = ['login-form', 'register-form', 'reservation-detail-form'];
        forms.forEach(formId => {
            const form = document.getElementById(formId);
            if (form) {
                form.reset();
            }
        });
    }

    async handleLogin(e) {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch(`${this.baseURL}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const result = await response.json();

            if (result.success) {
                this.currentUser = result.user;
                this.updateUI();
                this.hideAllModals();
                this.showMessage('로그인 성공!', 'success');
            } else {
                this.showMessage(result.message, 'error');
            }
        } catch (error) {
            console.error('로그인 실패:', error);
            this.showMessage('로그인 중 오류가 발생했습니다.', 'error');
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        const username = document.getElementById('reg-username').value;
        const name = document.getElementById('reg-name').value;
        const password = document.getElementById('reg-password').value;
        const passwordConfirm = document.getElementById('reg-password-confirm').value;

        if (password !== passwordConfirm) {
            this.showMessage('비밀번호가 일치하지 않습니다.', 'error');
            return;
        }

        try {
            const response = await fetch(`${this.baseURL}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, name, password })
            });

            const result = await response.json();

            if (result.success) {
                this.currentUser = result.user;
                this.updateUI();
                this.hideAllModals();
                this.showMessage(result.message, 'success');
            } else {
                this.showMessage(result.message, 'error');
            }
        } catch (error) {
            console.error('회원가입 실패:', error);
            this.showMessage('회원가입 중 오류가 발생했습니다.', 'error');
        }
    }

    logout() {
        this.currentUser = null;
        this.updateUI();
        this.hideAllModals();
        this.showFacilitySelection();
        this.showMessage('로그아웃되었습니다.', 'success');
    }

    updateUI() {
        const loginBtn = document.getElementById('login-btn');
        const logoutBtn = document.getElementById('logout-btn');
        const userInfo = document.getElementById('user-info');
        const adminPanel = document.getElementById('admin-panel');

        const registerBtn = document.getElementById('register-btn');
        const myReservationsBtn = document.getElementById('my-reservations-btn');

        if (this.currentUser) {
            loginBtn.style.display = 'none';
            registerBtn.style.display = 'none';
            logoutBtn.style.display = 'inline-block';
            myReservationsBtn.style.display = 'inline-block';
            userInfo.style.display = 'inline-block';
            userInfo.textContent = `${this.currentUser.name} (${this.currentUser.role === 'admin' ? '관리자' : '사용자'})`;

            if (this.currentUser.role === 'admin') {
                adminPanel.style.display = 'block';
                this.loadAdminContent();
            } else {
                adminPanel.style.display = 'none';
            }
        } else {
            loginBtn.style.display = 'inline-block';
            registerBtn.style.display = 'inline-block';
            logoutBtn.style.display = 'none';
            myReservationsBtn.style.display = 'none';
            userInfo.style.display = 'none';
            adminPanel.style.display = 'none';
        }
    }

    checkLogin() {
        this.updateUI();
    }

    selectFacility(facility) {
        if (!this.currentUser) {
            this.showMessage('로그인이 필요합니다.', 'error');
            this.showLoginModal();
            return;
        }

        this.currentFacility = facility;
        this.showReservationSection();
        this.loadTimeSlots(document.getElementById('reservation-date').value);
    }

    showFacilitySelection() {
        document.getElementById('facility-selection').style.display = 'block';
        document.getElementById('reservation-section').style.display = 'none';
        this.selectedSlots = [];
    }

    showReservationSection() {
        document.getElementById('facility-selection').style.display = 'none';
        document.getElementById('reservation-section').style.display = 'block';
        document.getElementById('facility-name').textContent = this.facilities[this.currentFacility].name;
    }

    async loadTimeSlots(date) {
        if (!date) return;

        this.currentDate = date;
        const timeSlotsContainer = document.getElementById('time-slots');
        timeSlotsContainer.innerHTML = '';

        try {
            const response = await fetch(`${this.baseURL}/reservations?facility=${this.currentFacility}&date=${date}`);
            const dayReservations = await response.json();

            this.timeSlots.forEach(slot => {
                const slotElement = document.createElement('div');
                slotElement.className = 'time-slot';
                slotElement.dataset.slot = slot;

                const reservation = this.findSlotReservation(dayReservations, slot);
                const isSelected = this.selectedSlots.includes(slot);

                if (reservation) {
                    slotElement.classList.add('reserved');
                    slotElement.innerHTML = `
                        <div class="time">${slot}</div>
                        <div class="reserver">${reservation.userName}</div>
                    `;

                    let tooltip = `예약자: ${reservation.userName}`;
                    if (reservation.description) {
                        tooltip += `\n내용: ${reservation.description}`;
                    }
                    slotElement.title = tooltip;
                } else {
                    slotElement.classList.add('available');
                    slotElement.textContent = slot;
                    slotElement.addEventListener('click', () => this.toggleSlotSelection(slot, slotElement));
                    if (isSelected) {
                        slotElement.classList.add('selected');
                    }
                }

                timeSlotsContainer.appendChild(slotElement);
            });

            if (this.selectedSlots.length > 0) {
                this.showReserveButton();
            }
        } catch (error) {
            console.error('예약 정보 로드 실패:', error);
            this.showMessage('예약 정보를 불러오는데 실패했습니다.', 'error');
        }
    }

    findSlotReservation(reservations, slot) {
        return reservations.find(r => r.timeSlots.includes(slot));
    }

    toggleSlotSelection(slot, element) {
        if (this.selectedSlots.includes(slot)) {
            this.selectedSlots = this.selectedSlots.filter(s => s !== slot);
            element.classList.remove('selected');
        } else {
            this.selectedSlots.push(slot);
            element.classList.add('selected');
        }

        this.updateReserveButton();
    }

    updateReserveButton() {
        let reserveBtn = document.getElementById('reserve-btn');

        if (this.selectedSlots.length > 0) {
            if (!reserveBtn) {
                reserveBtn = document.createElement('button');
                reserveBtn.id = 'reserve-btn';
                reserveBtn.textContent = '예약하기';
                reserveBtn.addEventListener('click', () => this.makeReservation());
                document.getElementById('calendar-container').appendChild(reserveBtn);
            }
            reserveBtn.textContent = `예약하기 (${this.selectedSlots.length}개 시간대)`;
        } else {
            if (reserveBtn) {
                reserveBtn.remove();
            }
        }
    }

    showReserveButton() {
        this.updateReserveButton();
    }

    async makeReservation() {
        if (this.selectedSlots.length === 0) {
            this.showMessage('시간대를 선택해주세요.', 'error');
            return;
        }

        // 예약 상세 정보 입력 모달 표시
        this.showReservationDetailModal(this.currentFacility, this.currentDate, this.selectedSlots);
    }

    async handleReservationWithDetail(e) {
        e.preventDefault();
        const description = document.getElementById('reservation-description').value;

        try {
            const reservationData = {
                user: this.currentUser.username,
                userName: this.currentUser.name,
                facility: this.currentFacility,
                facilityName: this.facilities[this.currentFacility].name,
                date: this.currentDate,
                timeSlots: [...this.selectedSlots],
                description: description
            };

            const response = await fetch(`${this.baseURL}/reservations`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(reservationData)
            });

            const result = await response.json();

            if (result.success) {
                this.showMessage(`예약이 완료되었습니다. (${this.selectedSlots.length}개 시간대)`, 'success');
                this.selectedSlots = [];
                this.hideAllModals();
                await this.loadTimeSlots(this.currentDate);
            } else {
                this.showMessage(result.message, 'error');
            }
        } catch (error) {
            console.error('예약 실패:', error);
            this.showMessage('예약 중 오류가 발생했습니다.', 'error');
        }
    }

    async cancelReservation(reservationId) {
        try {
            const response = await fetch(`${this.baseURL}/reservations/${reservationId}?username=${this.currentUser.username}&role=${this.currentUser.role}`, {
                method: 'DELETE'
            });

            const result = await response.json();

            if (result.success) {
                this.showMessage(result.message, 'success');

                if (this.currentUser.role === 'admin') {
                    this.loadAdminContent();
                }

                if (this.currentDate) {
                    await this.loadTimeSlots(this.currentDate);
                }
            } else {
                this.showMessage(result.message, 'error');
            }
        } catch (error) {
            console.error('예약 취소 실패:', error);
            this.showMessage('예약 취소 중 오류가 발생했습니다.', 'error');
        }
    }

    switchAdminTab(tab) {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-tab="${tab}"]`).classList.add('active');

        const content = document.getElementById('admin-content');

        if (tab === 'reservations') {
            this.showReservationManagement(content);
        } else if (tab === 'users') {
            this.showUserManagement(content);
        }
    }

    async showReservationManagement(container) {
        try {
            const response = await fetch(`${this.baseURL}/reservations`);
            const allReservations = await response.json();

            const today = new Date().toISOString().split('T')[0];
            const upcomingReservations = allReservations
                .filter(r => r.date >= today)
                .sort((a, b) => new Date(a.date) - new Date(b.date));

            container.innerHTML = `
                <h3>예약 현황 (${upcomingReservations.length}건)</h3>
                <div id="reservations-list"></div>
            `;

            const listContainer = container.querySelector('#reservations-list');

            if (upcomingReservations.length === 0) {
                listContainer.innerHTML = '<p>예정된 예약이 없습니다.</p>';
                return;
            }

            upcomingReservations.forEach(reservation => {
                const card = document.createElement('div');
                card.className = 'reservation-card';
                card.innerHTML = `
                    <div class="reservation-info">
                        <strong>${reservation.facilityName}</strong><br>
                        ${reservation.date} ${reservation.timeSlots.join(', ')}<br>
                        예약자: ${reservation.userName} (${reservation.user})<br>
                        ${reservation.description ? `<div class="reservation-description">내용: ${reservation.description}</div>` : ''}
                        <small>예약일: ${new Date(reservation.createdAt).toLocaleDateString()}</small>
                    </div>
                    <div class="reservation-actions">
                        <button class="btn-danger" onclick="app.cancelReservation(${reservation.id})">
                            취소
                        </button>
                    </div>
                `;
                listContainer.appendChild(card);
            });
        } catch (error) {
            console.error('예약 현황 로드 실패:', error);
            container.innerHTML = '<p>예약 현황을 불러오는데 실패했습니다.</p>';
        }
    }

    async showUserManagement(container) {
        try {
            const [usersResponse, reservationsResponse] = await Promise.all([
                fetch(`${this.baseURL}/users`),
                fetch(`${this.baseURL}/reservations`)
            ]);

            const users = await usersResponse.json();
            const reservations = await reservationsResponse.json();

            container.innerHTML = `
                <h3>사용자 관리</h3>
                <div id="users-list"></div>
            `;

            const listContainer = container.querySelector('#users-list');

            users.filter(u => u.role !== 'admin').forEach(user => {
                const userReservations = reservations.filter(r => r.user === user.username);
                const card = document.createElement('div');
                card.className = 'reservation-card';
                card.innerHTML = `
                    <div class="reservation-info">
                        <strong>${user.name}</strong> (${user.username})<br>
                        총 예약 수: ${userReservations.length}건
                    </div>
                `;
                listContainer.appendChild(card);
            });
        } catch (error) {
            console.error('사용자 정보 로드 실패:', error);
            container.innerHTML = '<p>사용자 정보를 불러오는데 실패했습니다.</p>';
        }
    }

    loadAdminContent() {
        if (this.currentUser && this.currentUser.role === 'admin') {
            this.switchAdminTab('reservations');
        }
    }

    async loadUserReservations() {
        try {
            const response = await fetch(`${this.baseURL}/reservations?userOnly=true&username=${this.currentUser.username}`);
            const userReservations = await response.json();

            const today = new Date().toISOString().split('T')[0];
            const upcomingReservations = userReservations.filter(r => r.date >= today).sort((a, b) => new Date(a.date) - new Date(b.date));
            const pastReservations = userReservations.filter(r => r.date < today).sort((a, b) => new Date(b.date) - new Date(a.date));

            const container = document.getElementById('user-reservations-list');
            container.innerHTML = '';

            if (upcomingReservations.length === 0 && pastReservations.length === 0) {
                container.innerHTML = '<p>예약 내역이 없습니다.</p>';
                return;
            }

            if (upcomingReservations.length > 0) {
                const upcomingTitle = document.createElement('h3');
                upcomingTitle.textContent = `예정된 예약 (${upcomingReservations.length}건)`;
                container.appendChild(upcomingTitle);

                upcomingReservations.forEach(reservation => {
                    const card = document.createElement('div');
                    card.className = 'user-reservation-card';
                    card.innerHTML = `
                        <div style="display: flex; justify-content: between; align-items: center;">
                            <div>
                                <strong>${reservation.facilityName}</strong>
                                <span class="reservation-status status-upcoming">예정</span><br>
                                <strong>날짜:</strong> ${reservation.date}<br>
                                <strong>시간:</strong> ${reservation.timeSlots.join(', ')}<br>
                                ${reservation.description ? `<strong>내용:</strong> ${reservation.description}<br>` : ''}
                                <small>예약일: ${new Date(reservation.createdAt).toLocaleDateString()}</small>
                            </div>
                            <div>
                                <button class="btn-danger" onclick="app.cancelReservation(${reservation.id})">
                                    취소
                                </button>
                            </div>
                        </div>
                    `;
                    container.appendChild(card);
                });
            }

            if (pastReservations.length > 0) {
                const pastTitle = document.createElement('h3');
                pastTitle.textContent = `이전 예약 (${pastReservations.length}건)`;
                pastTitle.style.marginTop = '2rem';
                container.appendChild(pastTitle);

                pastReservations.slice(0, 10).forEach(reservation => {
                    const card = document.createElement('div');
                    card.className = 'user-reservation-card past';
                    card.innerHTML = `
                        <div>
                            <strong>${reservation.facilityName}</strong>
                            <span class="reservation-status status-past">완료</span><br>
                            <strong>날짜:</strong> ${reservation.date}<br>
                            <strong>시간:</strong> ${reservation.timeSlots.join(', ')}<br>
                            ${reservation.description ? `<strong>내용:</strong> ${reservation.description}<br>` : ''}
                            <small>예약일: ${new Date(reservation.createdAt).toLocaleDateString()}</small>
                        </div>
                    `;
                    container.appendChild(card);
                });
            }
        } catch (error) {
            console.error('사용자 예약 내역 로드 실패:', error);
            document.getElementById('user-reservations-list').innerHTML = '<p>예약 내역을 불러오는데 실패했습니다.</p>';
        }
    }


    showMessage(message, type) {
        const existingMessage = document.querySelector('.success-message, .error-message');
        if (existingMessage) {
            existingMessage.remove();
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = type === 'success' ? 'success-message' : 'error-message';
        messageDiv.textContent = message;

        document.querySelector('main').insertBefore(messageDiv, document.querySelector('main').firstChild);

        setTimeout(() => {
            messageDiv.remove();
        }, 3000);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const app = new ReservationSystem();
    window.app = app;
});
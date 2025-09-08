// TimeTetris - 세션 스케줄링 웹앱
// 전역 상태 관리
class TimeTetrisApp {
    constructor() {
        this.users = [];
        this.sessions = [];
        this.timeSlots = this.generateDefaultTimeSlots();
        this.currentEditingUser = null;
        this.currentEditingSession = null;
        
        this.initializeEventHandlers();
        this.renderTimeSlots();
        this.loadFromLocalStorage();
        this.renderAll();
    }

    // 기본 시간 슬롯 생성 (월/수/금 15-20시)
    generateDefaultTimeSlots() {
        const slots = [];
        const days = ['월요일', '수요일', '금요일'];
        const hours = [15, 16, 17, 18, 19];
        
        let slotId = 1;
        for (const day of days) {
            for (const hour of hours) {
                slots.push({
                    id: slotId++,
                    label: `${day} ${hour}:00-${hour + 1}:00`,
                    day: day,
                    hour: hour,
                    datetime: null
                });
            }
        }
        return slots;
    }

    // 이벤트 핸들러 초기화
    initializeEventHandlers() {
        // 탭 네비게이션
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // 사용자 관리
        document.getElementById('add-user-btn').addEventListener('click', () => {
            this.showUserForm();
        });
        
        document.getElementById('save-user-btn').addEventListener('click', () => {
            this.saveUser();
        });
        
        document.getElementById('cancel-user-btn').addEventListener('click', () => {
            this.hideUserForm();
        });

        // 세션 관리
        document.getElementById('add-session-btn').addEventListener('click', () => {
            this.showSessionForm();
        });
        
        document.getElementById('save-session-btn').addEventListener('click', () => {
            this.saveSession();
        });
        
        document.getElementById('cancel-session-btn').addEventListener('click', () => {
            this.hideSessionForm();
        });

        // 자동 배치
        document.getElementById('auto-assign-btn').addEventListener('click', () => {
            this.executeAutoAssignment();
        });
        
        document.getElementById('clear-assignments-btn').addEventListener('click', () => {
            this.clearAllAssignments();
        });

        // 파일 저장/불러오기
        document.getElementById('save-btn').addEventListener('click', () => {
            this.exportData();
        });
        
        document.getElementById('load-btn').addEventListener('click', () => {
            document.getElementById('file-input').click();
        });
        
        document.getElementById('file-input').addEventListener('change', (e) => {
            this.importData(e.target.files[0]);
        });

        // 결과 내보내기
        document.getElementById('export-csv-btn').addEventListener('click', () => {
            this.exportCSV();
        });
        
        document.getElementById('export-json-btn').addEventListener('click', () => {
            this.exportData();
        });
    }

    // 탭 전환
    switchTab(tabName) {
        // 네비게이션 활성화 상태 변경
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // 탭 컨텐츠 표시/숨김
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.style.display = 'none';
        });
        document.getElementById(`${tabName}-tab`).style.display = 'block';

        // 탭별 추가 렌더링
        if (tabName === 'sessions') {
            this.renderSessionTimeSlots();
        } else if (tabName === 'results') {
            this.renderResults();
        }
    }

    // 시간 슬롯 렌더링
    renderTimeSlots() {
        const container = document.getElementById('user-time-slots');
        container.innerHTML = '';

        this.timeSlots.forEach(slot => {
            const slotEl = document.createElement('div');
            slotEl.className = 'time-slot';
            slotEl.textContent = slot.label;
            slotEl.dataset.slotId = slot.id;
            
            slotEl.addEventListener('click', () => {
                slotEl.classList.toggle('selected');
            });
            
            container.appendChild(slotEl);
        });
    }

    // 세션 시간 슬롯 옵션 렌더링
    renderSessionTimeSlots() {
        const select = document.getElementById('session-time-slot');
        select.innerHTML = '<option value="">시간 선택</option>';

        this.timeSlots.forEach(slot => {
            const option = document.createElement('option');
            option.value = slot.id;
            option.textContent = slot.label;
            select.appendChild(option);
        });
    }

    // 사용자 폼 표시
    showUserForm(user = null) {
        this.currentEditingUser = user;
        const form = document.getElementById('user-form');
        
        if (user) {
            document.getElementById('user-name').value = user.name;
            document.getElementById('user-email').value = user.email || '';
            document.getElementById('user-mobile').value = user.mobile || '';
            document.getElementById('user-max-sessions').value = user.maxSessions || 1;
            
            // 시간 슬롯 선택 상태 복원
            document.querySelectorAll('.time-slot').forEach(slot => {
                const slotId = parseInt(slot.dataset.slotId);
                if (user.availableSlots && user.availableSlots.some(s => s.value === slotId)) {
                    slot.classList.add('selected');
                } else {
                    slot.classList.remove('selected');
                }
            });
        } else {
            document.getElementById('user-name').value = '';
            document.getElementById('user-email').value = '';
            document.getElementById('user-mobile').value = '';
            document.getElementById('user-max-sessions').value = '1';
            
            document.querySelectorAll('.time-slot').forEach(slot => {
                slot.classList.remove('selected');
            });
        }
        
        form.classList.add('show');
    }

    // 사용자 폼 숨김
    hideUserForm() {
        document.getElementById('user-form').classList.remove('show');
        this.currentEditingUser = null;
    }

    // 사용자 저장
    saveUser() {
        const name = document.getElementById('user-name').value.trim();
        const email = document.getElementById('user-email').value.trim();
        const mobile = document.getElementById('user-mobile').value.trim();
        const maxSessions = parseInt(document.getElementById('user-max-sessions').value) || 1;

        if (!name) {
            alert('이름을 입력해주세요.');
            return;
        }

        // 선택된 시간 슬롯 수집
        const selectedSlots = [];
        document.querySelectorAll('.time-slot.selected').forEach(slot => {
            selectedSlots.push({
                type: 'slot_number',
                value: parseInt(slot.dataset.slotId)
            });
        });

        const userData = {
            id: this.currentEditingUser ? this.currentEditingUser.id : this.generateId(),
            name,
            email,
            mobile,
            availableSlots: selectedSlots,
            maxSessions,
            assignedSessions: this.currentEditingUser ? this.currentEditingUser.assignedSessions : [],
            priority: 1
        };

        if (this.currentEditingUser) {
            // 기존 사용자 수정
            const index = this.users.findIndex(u => u.id === this.currentEditingUser.id);
            this.users[index] = userData;
        } else {
            // 새 사용자 추가
            this.users.push(userData);
        }

        this.hideUserForm();
        this.renderUsers();
        this.saveToLocalStorage();
    }

    // 사용자 목록 렌더링
    renderUsers() {
        const container = document.getElementById('users-list');
        container.innerHTML = '';

        if (this.users.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #657786; padding: 2rem;">등록된 사용자가 없습니다.</p>';
            return;
        }

        this.users.forEach(user => {
            const userCard = document.createElement('div');
            userCard.className = 'user-card';
            
            const availableSlotLabels = user.availableSlots.map(slot => {
                const timeSlot = this.timeSlots.find(ts => ts.id === slot.value);
                return timeSlot ? timeSlot.label : '';
            }).filter(label => label);

            userCard.innerHTML = `
                <h3>${user.name}</h3>
                <div class="user-info">
                    ${user.email ? `이메일: ${user.email}<br>` : ''}
                    ${user.mobile ? `전화: ${user.mobile}<br>` : ''}
                    최대 세션 수: ${user.maxSessions}
                </div>
                <div class="user-slots">
                    ${availableSlotLabels.map(label => `<span class="slot-tag">${label}</span>`).join('')}
                </div>
                <div class="card-actions">
                    <button class="btn btn-primary btn-small" onclick="app.editUser('${user.id}')">수정</button>
                    <button class="btn btn-secondary btn-small" onclick="app.deleteUser('${user.id}')">삭제</button>
                </div>
            `;
            
            container.appendChild(userCard);
        });
    }

    // 사용자 수정
    editUser(userId) {
        const user = this.users.find(u => u.id === userId);
        if (user) {
            this.showUserForm(user);
        }
    }

    // 사용자 삭제
    deleteUser(userId) {
        if (confirm('정말로 이 사용자를 삭제하시겠습니까?')) {
            this.users = this.users.filter(u => u.id !== userId);
            this.renderUsers();
            this.saveToLocalStorage();
        }
    }

    // 세션 폼 표시
    showSessionForm(session = null) {
        this.currentEditingSession = session;
        const form = document.getElementById('session-form');
        
        if (session) {
            document.getElementById('session-name').value = session.name;
            document.getElementById('session-type').value = session.type;
            document.getElementById('session-max-participants').value = session.maxParticipants;
            document.getElementById('session-duration').value = session.timeSlot.duration || 60;
            document.getElementById('session-time-slot').value = session.timeSlot.value;
        } else {
            document.getElementById('session-name').value = '';
            document.getElementById('session-type').value = 'individual';
            document.getElementById('session-max-participants').value = '1';
            document.getElementById('session-duration').value = '60';
            document.getElementById('session-time-slot').value = '';
        }
        
        form.classList.add('show');
    }

    // 세션 폼 숨김
    hideSessionForm() {
        document.getElementById('session-form').classList.remove('show');
        this.currentEditingSession = null;
    }

    // 세션 저장
    saveSession() {
        const name = document.getElementById('session-name').value.trim();
        const type = document.getElementById('session-type').value;
        const maxParticipants = parseInt(document.getElementById('session-max-participants').value) || 1;
        const duration = parseInt(document.getElementById('session-duration').value) || 60;
        const timeSlotId = parseInt(document.getElementById('session-time-slot').value);

        if (!name || !timeSlotId) {
            alert('세션명과 시간을 모두 입력해주세요.');
            return;
        }

        const sessionData = {
            id: this.currentEditingSession ? this.currentEditingSession.id : this.generateId(),
            name,
            type,
            maxParticipants,
            timeSlot: {
                type: 'slot_number',
                value: timeSlotId,
                duration
            },
            assignedUsers: this.currentEditingSession ? this.currentEditingSession.assignedUsers : [],
            requirements: {}
        };

        if (this.currentEditingSession) {
            // 기존 세션 수정
            const index = this.sessions.findIndex(s => s.id === this.currentEditingSession.id);
            this.sessions[index] = sessionData;
        } else {
            // 새 세션 추가
            this.sessions.push(sessionData);
        }

        this.hideSessionForm();
        this.renderSessions();
        this.saveToLocalStorage();
    }

    // 세션 목록 렌더링
    renderSessions() {
        const container = document.getElementById('sessions-list');
        container.innerHTML = '';

        if (this.sessions.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #657786; padding: 2rem;">등록된 세션이 없습니다.</p>';
            return;
        }

        this.sessions.forEach(session => {
            const sessionCard = document.createElement('div');
            sessionCard.className = 'session-card';
            
            const timeSlot = this.timeSlots.find(ts => ts.id === session.timeSlot.value);
            const timeLabel = timeSlot ? timeSlot.label : '시간 미정';

            sessionCard.innerHTML = `
                <h3>${session.name}</h3>
                <div class="session-info">
                    유형: ${session.type === 'individual' ? '개인 세션' : '그룹 세션'}<br>
                    최대 참가자: ${session.maxParticipants}명<br>
                    시간: ${timeLabel} (${session.timeSlot.duration}분)<br>
                    현재 배정: ${session.assignedUsers.length}명
                </div>
                <div class="card-actions">
                    <button class="btn btn-primary btn-small" onclick="app.editSession('${session.id}')">수정</button>
                    <button class="btn btn-secondary btn-small" onclick="app.deleteSession('${session.id}')">삭제</button>
                </div>
            `;
            
            container.appendChild(sessionCard);
        });
    }

    // 세션 수정
    editSession(sessionId) {
        const session = this.sessions.find(s => s.id === sessionId);
        if (session) {
            this.showSessionForm(session);
        }
    }

    // 세션 삭제
    deleteSession(sessionId) {
        if (confirm('정말로 이 세션을 삭제하시겠습니까?')) {
            this.sessions = this.sessions.filter(s => s.id !== sessionId);
            this.renderSessions();
            this.saveToLocalStorage();
        }
    }

    // 자동 배치 실행
    executeAutoAssignment() {
        if (this.users.length === 0 || this.sessions.length === 0) {
            alert('사용자와 세션을 먼저 등록해주세요.');
            return;
        }

        const statusEl = document.getElementById('scheduler-status');
        statusEl.innerHTML = '<div style="text-align: center;">배치 중...</div>';

        // 설정 읽기
        const allowMultiple = document.getElementById('allow-multiple-sessions').checked;
        const prioritizeFullSessions = document.getElementById('prioritize-full-sessions').checked;
        const randomSeed = parseInt(document.getElementById('random-seed').value) || null;

        // 자동 배치 알고리즘 실행
        setTimeout(() => {
            const result = this.autoAssignAlgorithm({
                allowMultipleSessions: allowMultiple,
                prioritizeFullSessions,
                randomSeed
            });

            statusEl.innerHTML = `
                <div style="text-align: center;">
                    <h3>배치 완료!</h3>
                    <p>배치된 사용자: ${result.assignedUsers}명</p>
                    <p>미배치 사용자: ${result.unassignedUsers}명</p>
                    <p>완전히 채워진 세션: ${result.fullSessions}개</p>
                </div>
            `;

            // 결과 탭으로 자동 전환
            this.switchTab('results');
        }, 1000);
    }

    // 자동 배치 알고리즘
    autoAssignAlgorithm(options = {}) {
        // 기존 배치 초기화
        this.users.forEach(user => user.assignedSessions = []);
        this.sessions.forEach(session => session.assignedUsers = []);

        // 시드 설정
        if (options.randomSeed) {
            Math.seedrandom = this.seededRandom(options.randomSeed);
        }

        // 가능한 매칭 생성
        const possibleMatches = [];
        
        this.sessions.forEach(session => {
            this.users.forEach(user => {
                // 사용자가 해당 시간대에 가능한지 확인
                const hasAvailableSlot = user.availableSlots.some(slot => slot.value === session.timeSlot.value);
                if (hasAvailableSlot) {
                    possibleMatches.push({
                        userId: user.id,
                        sessionId: session.id,
                        priority: user.priority || 1
                    });
                }
            });
        });

        // Fisher-Yates 셔플
        for (let i = possibleMatches.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [possibleMatches[i], possibleMatches[j]] = [possibleMatches[j], possibleMatches[i]];
        }

        // 매칭 실행
        for (const match of possibleMatches) {
            const user = this.users.find(u => u.id === match.userId);
            const session = this.sessions.find(s => s.id === match.sessionId);

            if (!user || !session) continue;

            // 제약 조건 확인
            const canAssign = this.canAssignUserToSession(user, session, options);
            
            if (canAssign) {
                user.assignedSessions.push(session.id);
                session.assignedUsers.push(user.id);
            }
        }

        // 결과 통계 계산
        const assignedUsers = this.users.filter(u => u.assignedSessions.length > 0).length;
        const unassignedUsers = this.users.length - assignedUsers;
        const fullSessions = this.sessions.filter(s => s.assignedUsers.length === s.maxParticipants).length;

        this.saveToLocalStorage();

        return {
            assignedUsers,
            unassignedUsers,
            fullSessions
        };
    }

    // 사용자를 세션에 배정할 수 있는지 확인
    canAssignUserToSession(user, session, options) {
        // 세션이 이미 가득 참
        if (session.assignedUsers.length >= session.maxParticipants) {
            return false;
        }

        // 사용자가 이미 해당 세션에 배정됨
        if (session.assignedUsers.includes(user.id)) {
            return false;
        }

        // 여러 세션 참여 허용하지 않는 경우
        if (!options.allowMultipleSessions && user.assignedSessions.length >= (user.maxSessions || 1)) {
            return false;
        }

        // 사용자의 최대 세션 수 초과
        if (user.assignedSessions.length >= (user.maxSessions || 1)) {
            return false;
        }

        return true;
    }

    // 배치 초기화
    clearAllAssignments() {
        if (confirm('모든 배치를 초기화하시겠습니까?')) {
            this.users.forEach(user => user.assignedSessions = []);
            this.sessions.forEach(session => session.assignedUsers = []);
            
            document.getElementById('scheduler-status').innerHTML = 
                '<div style="text-align: center; color: #657786;">자동 배치 버튼을 클릭하여 시작하세요.</div>';
            
            this.saveToLocalStorage();
        }
    }

    // 결과 렌더링
    renderResults() {
        this.renderResultsSummary();
        this.renderResultsTable();
        this.renderUnassignedUsers();
    }

    // 결과 요약 렌더링
    renderResultsSummary() {
        const container = document.getElementById('results-summary');
        
        const totalUsers = this.users.length;
        const assignedUsers = this.users.filter(u => u.assignedSessions.length > 0).length;
        const totalSessions = this.sessions.length;
        const activeSessions = this.sessions.filter(s => s.assignedUsers.length > 0).length;
        const fullSessions = this.sessions.filter(s => s.assignedUsers.length === s.maxParticipants).length;

        container.innerHTML = `
            <div class="summary-grid">
                <div class="summary-item">
                    <div class="summary-number">${totalUsers}</div>
                    <div class="summary-label">총 사용자</div>
                </div>
                <div class="summary-item">
                    <div class="summary-number">${assignedUsers}</div>
                    <div class="summary-label">배치된 사용자</div>
                </div>
                <div class="summary-item">
                    <div class="summary-number">${totalSessions}</div>
                    <div class="summary-label">총 세션</div>
                </div>
                <div class="summary-item">
                    <div class="summary-number">${activeSessions}</div>
                    <div class="summary-label">활성 세션</div>
                </div>
                <div class="summary-item">
                    <div class="summary-number">${fullSessions}</div>
                    <div class="summary-label">완전한 세션</div>
                </div>
            </div>
        `;
    }

    // 결과 테이블 렌더링
    renderResultsTable() {
        const container = document.getElementById('results-table');
        
        if (this.sessions.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #657786; padding: 2rem;">세션이 없습니다.</p>';
            return;
        }

        let tableHTML = `
            <table class="table">
                <thead>
                    <tr>
                        <th>세션명</th>
                        <th>시간</th>
                        <th>참가자</th>
                        <th>상태</th>
                    </tr>
                </thead>
                <tbody>
        `;

        this.sessions.forEach(session => {
            const timeSlot = this.timeSlots.find(ts => ts.id === session.timeSlot.value);
            const timeLabel = timeSlot ? timeSlot.label : '시간 미정';
            
            const assignedUserNames = session.assignedUsers.map(userId => {
                const user = this.users.find(u => u.id === userId);
                return user ? user.name : '알 수 없음';
            });

            let statusClass = 'status-unassigned';
            let statusText = '미배치';
            
            if (session.assignedUsers.length === session.maxParticipants) {
                statusClass = 'status-assigned';
                statusText = '완료';
            } else if (session.assignedUsers.length > 0) {
                statusClass = 'status-partial';
                statusText = '부분 배치';
            }

            tableHTML += `
                <tr>
                    <td><strong>${session.name}</strong></td>
                    <td>${timeLabel}</td>
                    <td>${assignedUserNames.join(', ') || '없음'} (${session.assignedUsers.length}/${session.maxParticipants})</td>
                    <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                </tr>
            `;
        });

        tableHTML += `
                </tbody>
            </table>
        `;

        container.innerHTML = tableHTML;
    }

    // 미배치 사용자 렌더링
    renderUnassignedUsers() {
        const container = document.getElementById('unassigned-users');
        const unassignedUsers = this.users.filter(u => u.assignedSessions.length === 0);

        if (unassignedUsers.length === 0) {
            container.innerHTML = `
                <h3 style="color: #155724;">🎉 모든 사용자가 배치되었습니다!</h3>
            `;
            return;
        }

        let html = `
            <h3>미배치 사용자 (${unassignedUsers.length}명)</h3>
            <div class="unassigned-list">
        `;

        unassignedUsers.forEach(user => {
            const availableSlotLabels = user.availableSlots.map(slot => {
                const timeSlot = this.timeSlots.find(ts => ts.id === slot.value);
                return timeSlot ? timeSlot.label : '';
            }).filter(label => label);

            html += `
                <div class="unassigned-user">
                    ${user.name} (${availableSlotLabels.join(', ')})
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;
    }

    // CSV 내보내기
    exportCSV() {
        let csvContent = "세션명,시간,참가자,상태\n";
        
        this.sessions.forEach(session => {
            const timeSlot = this.timeSlots.find(ts => ts.id === session.timeSlot.value);
            const timeLabel = timeSlot ? timeSlot.label : '시간 미정';
            
            const assignedUserNames = session.assignedUsers.map(userId => {
                const user = this.users.find(u => u.id === userId);
                return user ? user.name : '알 수 없음';
            }).join('; ');

            let status = '미배치';
            if (session.assignedUsers.length === session.maxParticipants) {
                status = '완료';
            } else if (session.assignedUsers.length > 0) {
                status = '부분 배치';
            }

            csvContent += `"${session.name}","${timeLabel}","${assignedUserNames}","${status}"\n`;
        });

        this.downloadFile(csvContent, 'timetetris-results.csv', 'text/csv');
    }

    // JSON 데이터 내보내기
    exportData() {
        const data = {
            users: this.users,
            sessions: this.sessions,
            timeSlots: this.timeSlots,
            exportDate: new Date().toISOString()
        };

        const jsonString = JSON.stringify(data, null, 2);
        this.downloadFile(jsonString, 'timetetris-data.json', 'application/json');
    }

    // 데이터 불러오기
    importData(file) {
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                if (data.users && data.sessions && data.timeSlots) {
                    this.users = data.users;
                    this.sessions = data.sessions;
                    this.timeSlots = data.timeSlots;
                    
                    this.renderAll();
                    this.saveToLocalStorage();
                    alert('데이터를 성공적으로 불러왔습니다.');
                } else {
                    alert('올바르지 않은 파일 형식입니다.');
                }
            } catch (error) {
                alert('파일을 읽는 중 오류가 발생했습니다.');
                console.error('Import error:', error);
            }
        };
        reader.readAsText(file);
    }

    // 모든 화면 렌더링
    renderAll() {
        this.renderTimeSlots();
        this.renderUsers();
        this.renderSessions();
        this.renderSessionTimeSlots();
        this.renderResults();
    }

    // 로컬 스토리지 저장
    saveToLocalStorage() {
        const data = {
            users: this.users,
            sessions: this.sessions,
            timeSlots: this.timeSlots
        };
        localStorage.setItem('timetetris-data', JSON.stringify(data));
    }

    // 로컬 스토리지 불러오기
    loadFromLocalStorage() {
        const stored = localStorage.getItem('timetetris-data');
        if (stored) {
            try {
                const data = JSON.parse(stored);
                if (data.users) this.users = data.users;
                if (data.sessions) this.sessions = data.sessions;
                if (data.timeSlots) this.timeSlots = data.timeSlots;
            } catch (error) {
                console.error('Failed to load from localStorage:', error);
            }
        }
    }

    // 파일 다운로드
    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    // 고유 ID 생성
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // 시드 기반 랜덤 함수
    seededRandom(seed) {
        let m = 2147483647;
        let a = 16807;
        let s = seed % m;
        return function() {
            s = (s * a) % m;
            return (s - 1) / (m - 1);
        };
    }
}

// 앱 초기화
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new TimeTetrisApp();
});
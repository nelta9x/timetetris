/**
 * TimeTetrisApp 클래스
 * 
 * TimeTetris 애플리케이션의 메인 컨트롤러 클래스입니다.
 * 사용자 인터페이스와 비즈니스 로직을 연결하며, 모든 화면과 기능을 관리합니다.
 * 
 * 주요 책임:
 * - 애플리케이션 초기화 및 전역 상태 관리
 * - 사용자 인터페이스 이벤트 처리
 * - 다양한 뷰(일정관리, 세션관리, 자동배치, 캘린더) 간 전환 관리
 * - 모달 다이얼로그 관리 (일정/세션 추가/편집)
 * - 데이터 가져오기/내보내기 기능
 * - FullCalendar 통합 및 캘린더 뷰 관리
 * - 자동 배치 알고리즘과의 연동
 * - 알림 및 사용자 피드백 관리
 * 
 * 아키텍처:
 * - MVC 패턴의 Controller 역할
 * - DataStore를 통한 데이터 관리
 * - Scheduler를 통한 자동 배치 로직
 * - FullCalendar 라이브러리 활용
 * 
 * 상태 관리:
 * - currentView: 현재 활성 뷰
 * - editingScheduleId/editingSessionId: 편집 중인 항목 추적
 * - calendar: FullCalendar 인스턴스
 * - scheduler: 자동 배치 알고리즘 인스턴스
 */
class TimeTetrisApp {
    /**
     * TimeTetrisApp 생성자
     * 애플리케이션의 핵심 컴포넌트들을 초기화하고 앱을 시작합니다.
     */
    constructor() {
        /** @type {DataStore} 모든 데이터를 관리하는 중앙 저장소 */
        this.dataStore = new DataStore();
        
        /** @type {CustomCalendar|null} 커스텀 캘린더 인스턴스 */
        this.calendar = null;
        
        /** @type {string} 현재 활성화된 뷰 ('schedules'|'sessions'|'assignment'|'calendar') */
        this.currentView = 'schedules';
        
        /** @type {string|null} 현재 편집 중인 일정의 ID */
        this.editingScheduleId = null;
        
        /** @type {string|null} 현재 편집 중인 세션의 ID */
        this.editingSessionId = null;
        
        /** @type {Scheduler|null} 자동 배치 알고리즘 인스턴스 */
        this.scheduler = null;
        
        // 애플리케이션 초기화
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateAllViews();
        this.showNotification('앱이 성공적으로 로드되었습니다', 'success');
        
        // Lucide 아이콘 초기화
        if (window.lucide) {
            lucide.createIcons();
        }
    }

    setupEventListeners() {
        // 네비게이션 이벤트
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const view = e.currentTarget.dataset.view;
                this.switchView(view);
            });
        });

        // 검색 이벤트
        const searchInput = document.getElementById('scheduleSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterSchedules(e.target.value);
            });
        }

        // 파일 임포트 이벤트
        const importFile = document.getElementById('importFile');
        if (importFile) {
            importFile.addEventListener('change', (e) => {
                this.handleFileImport(e.target.files[0]);
            });
        }

        // ESC 키로 모달 닫기
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });
    }

    switchView(view) {
        // 이전 뷰 비활성화
        document.querySelectorAll('.view-panel').forEach(panel => {
            panel.classList.remove('active');
        });
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });

        // 새 뷰 활성화
        const viewPanel = document.getElementById(view + 'View');
        if (viewPanel) {
            viewPanel.classList.add('active');
        }
        
        const navItem = document.querySelector(`.nav-item[data-view="${view}"]`);
        if (navItem) {
            navItem.classList.add('active');
        }

        this.currentView = view;

        // 뷰별 업데이트
        if (view === 'calendar') {
            this.initializeCalendarView();
        }
    }

    updateAllViews() {
        this.updateHeader();
        this.updateSchedulesList();
        this.updateSessionsList();
        this.updateAssignmentView();
        // 캘린더는 뷰 전환 시에만 업데이트
    }

    updateHeader() {
        const stats = this.dataStore.getStatistics();
        document.getElementById('scheduleCount').textContent = `일정: ${stats.totalSchedules}개`;
        document.getElementById('sessionCount').textContent = `세션: ${stats.totalSessions}개`;
        document.getElementById('assignedCount').textContent = `배치완료: ${stats.assignedSchedules}개`;
    }

    updateSchedulesList() {
        const container = document.getElementById('schedulesList');
        const schedules = this.dataStore.getAllSchedules();

        if (schedules.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-calendar-plus"></i>
                    <h3>일정이 없습니다</h3>
                    <p>새 일정을 추가하여 시작하세요</p>
                </div>
            `;
            return;
        }

        container.innerHTML = schedules.map(schedule => {
            const isAssigned = !!schedule.assignedSession;
            const session = isAssigned ? this.dataStore.getSession(schedule.assignedSession) : null;
            
            // 가능 시간 목록 생성 (최대 5개까지만 표시)
            const availableSlotLabels = schedule.availableSlots.map(slot => {
                const start = new Date(slot.datetime);
                const end = new Date(start.getTime() + slot.duration * 60000);
                return `${this.formatDate(start)} ${this.formatTime(start)}-${this.formatTime(end)}`;
            });
            
            const maxDisplaySlots = 5;
            const displaySlots = availableSlotLabels.slice(0, maxDisplaySlots);
            const hasMoreSlots = availableSlotLabels.length > maxDisplaySlots;
            
            return `
                <div class="item-card ${isAssigned ? 'assigned' : ''}" data-id="${schedule.id}">
                    <div class="item-header">
                        <div class="item-title">${this.escapeHtml(schedule.name)}</div>
                        <div class="item-badge ${isAssigned ? 'success' : 'warning'}">
                            ${isAssigned ? '배치됨' : '미배치'}
                        </div>
                    </div>
                    ${schedule.note ? `<div class="item-note">${this.escapeHtml(schedule.note)}</div>` : ''}
                    <div class="item-meta">
                        <span><i class="fas fa-star"></i> 우선순위: ${schedule.priority}</span>
                        <span><i class="fas fa-clock"></i> 가능 시간: ${schedule.availableSlots.length}개</span>
                        ${session ? `<span><i class="fas fa-link"></i> ${this.escapeHtml(session.name)}</span>` : ''}
                    </div>
                    ${schedule.availableSlots.length > 0 ? `
                        <div class="available-slots">
                            <div class="slot-list">
                                ${displaySlots.map(slot => `<span class="slot-tag">${slot}</span>`).join('')}
                                ${hasMoreSlots ? '<span class="slot-more">...</span>' : ''}
                            </div>
                        </div>
                    ` : ''}
                    <div class="item-actions">
                        <button class="btn btn-sm btn-secondary" onclick="app.editSchedule('${schedule.id}')">
                            <i class="fas fa-edit"></i> 편집
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="app.deleteSchedule('${schedule.id}')">
                            <i class="fas fa-trash"></i> 삭제
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    updateSessionsList() {
        const container = document.getElementById('sessionsList');
        const sessions = this.dataStore.getAllSessions();

        if (sessions.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-clock"></i>
                    <h3>세션이 없습니다</h3>
                    <p>새 세션을 추가하여 시작하세요</p>
                </div>
            `;
            return;
        }

        container.innerHTML = sessions.map(session => {
            const datetime = new Date(session.timeSlot.datetime);
            const endTime = new Date(datetime.getTime() + session.timeSlot.duration * 60000);
            
            return `
                <div class="item-card ${!session.enabled ? 'disabled' : ''}" data-id="${session.id}">
                    <div class="item-header">
                        <div class="item-title">${this.escapeHtml(session.name)}</div>
                        <div class="item-badge ${session.enabled ? 'success' : 'danger'}">
                            ${session.enabled ? '활성' : '비활성'}
                        </div>
                    </div>
                    <div class="item-meta">
                        <span><i class="fas fa-calendar"></i> ${this.formatDate(datetime)}</span>
                        <span><i class="fas fa-clock"></i> ${this.formatTime(datetime)} - ${this.formatTime(endTime)}</span>
                        <span><i class="fas fa-hourglass"></i> ${session.timeSlot.duration}분</span>
                    </div>
                    <div class="item-meta">
                        <span><i class="fas fa-users"></i> 배치된 일정: ${session.assignedSchedules.length}개</span>
                    </div>
                    ${session.assignedSchedules.length > 0 ? this.renderAssignedSchedulesInSession(session) : ''}
                    <div class="item-actions">
                        <button class="btn btn-sm btn-secondary" onclick="app.editSession('${session.id}')">
                            <i class="fas fa-edit"></i> 편집
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="app.deleteSession('${session.id}')">
                            <i class="fas fa-trash"></i> 삭제
                        </button>
                        <button class="btn btn-sm ${session.enabled ? 'btn-warning' : 'btn-success'}" 
                                onclick="app.toggleSession('${session.id}')">
                            <i class="fas fa-${session.enabled ? 'pause' : 'play'}"></i> 
                            ${session.enabled ? '비활성화' : '활성화'}
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    renderAssignedSchedulesInSession(session) {
        const scheduleNames = session.assignedSchedules.map(id => {
            const schedule = this.dataStore.getSchedule(id);
            return schedule ? this.escapeHtml(schedule.name) : 'Unknown';
        }).join(', ');

        return `
            <div class="assigned-in-session">
                <small><strong>배치된 일정:</strong> ${scheduleNames}</small>
            </div>
        `;
    }

    updateAssignmentView() {
        const stats = this.dataStore.getStatistics();
        
        document.getElementById('totalSchedules').textContent = stats.totalSchedules;
        document.getElementById('assignedSchedules').textContent = stats.assignedSchedules;
        document.getElementById('unassignedSchedules').textContent = stats.unassignedSchedules;
        document.getElementById('utilizationRate').textContent = stats.utilizationRate + '%';

        this.updateAssignmentResults();
    }

    updateAssignmentResults() {
        const container = document.getElementById('assignmentResults');
        const sessions = this.dataStore.getAllSessions().filter(s => s.enabled);
        
        if (sessions.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-info-circle"></i>
                    <p>활성화된 세션이 없습니다. 먼저 세션을 추가하세요.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = sessions.map(session => {
            const datetime = new Date(session.timeSlot.datetime);
            const schedules = session.assignedSchedules.map(id => this.dataStore.getSchedule(id)).filter(s => s);
            
            return `
                <div class="session-group">
                    <div class="session-group-header">
                        <div class="session-group-title">${this.escapeHtml(session.name)}</div>
                        <div class="session-group-meta">
                            <span>${this.formatDate(datetime)} ${this.formatTime(datetime)}</span>
                            <span>${session.timeSlot.duration}분</span>
                            <span class="item-badge ${schedules.length > 0 ? 'success' : 'warning'}">
                                ${schedules.length}명 배치
                            </span>
                        </div>
                    </div>
                    <div class="assigned-schedules">
                        ${schedules.length > 0 ? 
                            schedules.map(schedule => `
                                <div class="assigned-schedule">
                                    <div class="assigned-schedule-name">${this.escapeHtml(schedule.name)}</div>
                                    <button class="btn btn-sm btn-danger" onclick="app.unassignSchedule('${schedule.id}')">
                                        <i class="fas fa-unlink"></i> 배치 취소
                                    </button>
                                </div>
                            `).join('') :
                            '<div class="empty-slot">배치된 일정이 없습니다</div>'
                        }
                    </div>
                </div>
            `;
        }).join('');
    }

    // 일정 관리 메서드
    showScheduleModal(scheduleId = null) {
        this.editingScheduleId = scheduleId;
        const modal = document.getElementById('scheduleModal');
        const form = document.getElementById('scheduleForm');
        
        form.reset();
        
        if (scheduleId) {
            const schedule = this.dataStore.getSchedule(scheduleId);
            if (schedule) {
                document.getElementById('scheduleName').value = schedule.name;
                document.getElementById('scheduleNote').value = schedule.note || '';
                document.getElementById('schedulePriority').value = schedule.priority;
                
                // 시간 슬롯 표시
                const slotsContainer = document.getElementById('availableSlots');
                slotsContainer.innerHTML = schedule.availableSlots.map((slot, index) => {
                    const startDate = new Date(slot.datetime);
                    const endDate = new Date(startDate.getTime() + slot.duration * 60000);
                    
                    return `
                        <div class="time-slot">
                            <div class="time-slot-inputs">
                                <div class="time-input-group">
                                    <label class="time-input-label">시작</label>
                                    <input type="datetime-local" class="slot-start-datetime" value="${this.toDateTimeLocal(slot.datetime)}">
                                </div>
                                <div class="time-input-group">
                                    <label class="time-input-label">종료</label>
                                    <input type="datetime-local" class="slot-end-datetime" value="${this.toDateTimeLocal(endDate.toISOString())}">
                                </div>
                            </div>
                            <button type="button" class="btn btn-sm btn-danger" onclick="app.removeTimeSlot(this)">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    `;
                }).join('');
                
                if (schedule.availableSlots.length === 0) {
                    this.addTimeSlot();
                }
            }
        } else {
            this.addTimeSlot();
        }
        
        modal.classList.add('active');
    }

    closeScheduleModal() {
        document.getElementById('scheduleModal').classList.remove('active');
        this.editingScheduleId = null;
    }

    saveSchedule() {
        const form = document.getElementById('scheduleForm');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const name = document.getElementById('scheduleName').value;
        const note = document.getElementById('scheduleNote').value;
        const priority = parseInt(document.getElementById('schedulePriority').value) || 1;
        
        // 시간 슬롯 수집
        const availableSlots = [];
        let hasInvalidSlot = false;
        
        document.querySelectorAll('#availableSlots .time-slot').forEach((slot, index) => {
            const startDatetime = slot.querySelector('.slot-start-datetime').value;
            const endDatetime = slot.querySelector('.slot-end-datetime').value;
            
            if (startDatetime && endDatetime) {
                const start = new Date(startDatetime);
                const end = new Date(endDatetime);
                
                // 종료 시간이 시작 시간보다 늦은지 확인
                if (end > start) {
                    const duration = Math.round((end.getTime() - start.getTime()) / 60000); // 분 단위로 계산
                    availableSlots.push({ 
                        datetime: startDatetime, 
                        duration: duration 
                    });
                } else {
                    hasInvalidSlot = true;
                    this.showNotification(`${index + 1}번째 시간대: 종료 시간이 시작 시간보다 늦어야 합니다.`, 'error');
                }
            } else if (startDatetime || endDatetime) {
                hasInvalidSlot = true;
                this.showNotification(`${index + 1}번째 시간대: 시작 시간과 종료 시간을 모두 입력해주세요.`, 'error');
            }
        });
        
        if (hasInvalidSlot) {
            return;
        }

        const scheduleData = {
            name,
            note,
            priority,
            availableSlots
        };

        if (this.editingScheduleId) {
            this.dataStore.updateSchedule(this.editingScheduleId, scheduleData);
            this.showNotification('일정이 수정되었습니다', 'success');
        } else {
            const schedule = new Schedule(scheduleData);
            this.dataStore.addSchedule(schedule);
            this.showNotification('일정이 추가되었습니다', 'success');
        }

        this.closeScheduleModal();
        this.updateAllViews();
    }

    editSchedule(scheduleId) {
        this.showScheduleModal(scheduleId);
    }

    deleteSchedule(scheduleId) {
        if (confirm('정말로 이 일정을 삭제하시겠습니까?')) {
            this.dataStore.deleteSchedule(scheduleId);
            this.showNotification('일정이 삭제되었습니다', 'info');
            this.updateAllViews();
        }
    }

    addTimeSlot() {
        const container = document.getElementById('availableSlots');
        const slotDiv = document.createElement('div');
        slotDiv.className = 'time-slot';
        slotDiv.innerHTML = `
            <div class="time-slot-inputs">
                <div class="time-input-group">
                    <label class="time-input-label">시작</label>
                    <input type="datetime-local" class="slot-start-datetime">
                </div>
                <div class="time-input-group">
                    <label class="time-input-label">종료</label>
                    <input type="datetime-local" class="slot-end-datetime">
                </div>
            </div>
            <button type="button" class="btn btn-sm btn-danger" onclick="app.removeTimeSlot(this)">
                <i class="fas fa-trash"></i>
            </button>
        `;
        container.appendChild(slotDiv);
    }

    removeTimeSlot(button) {
        button.closest('.time-slot').remove();
    }

    // 세션 관리 메서드
    showSessionModal(sessionId = null) {
        this.editingSessionId = sessionId;
        const modal = document.getElementById('sessionModal');
        const form = document.getElementById('sessionForm');
        
        form.reset();
        
        if (sessionId) {
            const session = this.dataStore.getSession(sessionId);
            if (session) {
                document.getElementById('sessionName').value = session.name;
                document.getElementById('sessionEnabled').checked = session.enabled;
                if (session.timeSlot) {
                    document.getElementById('sessionDateTime').value = this.toDateTimeLocal(session.timeSlot.datetime);
                    document.getElementById('sessionDuration').value = session.timeSlot.duration;
                }
            }
        }
        
        modal.classList.add('active');
    }

    closeSessionModal() {
        document.getElementById('sessionModal').classList.remove('active');
        this.editingSessionId = null;
    }

    saveSession() {
        const form = document.getElementById('sessionForm');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const name = document.getElementById('sessionName').value;
        const enabled = document.getElementById('sessionEnabled').checked;
        const datetime = document.getElementById('sessionDateTime').value;
        const duration = parseInt(document.getElementById('sessionDuration').value);

        const sessionData = {
            name,
            enabled,
            timeSlot: {
                datetime,
                duration
            }
        };

        if (this.editingSessionId) {
            this.dataStore.updateSession(this.editingSessionId, sessionData);
            this.showNotification('세션이 수정되었습니다', 'success');
        } else {
            const session = new Session(sessionData);
            this.dataStore.addSession(session);
            this.showNotification('세션이 추가되었습니다', 'success');
        }

        this.closeSessionModal();
        this.updateAllViews();
    }

    editSession(sessionId) {
        this.showSessionModal(sessionId);
    }

    deleteSession(sessionId) {
        if (confirm('정말로 이 세션을 삭제하시겠습니까? 배치된 일정도 초기화됩니다.')) {
            this.dataStore.deleteSession(sessionId);
            this.showNotification('세션이 삭제되었습니다', 'info');
            this.updateAllViews();
        }
    }

    toggleSession(sessionId) {
        const session = this.dataStore.getSession(sessionId);
        if (session) {
            session.enabled = !session.enabled;
            this.dataStore.saveToLocalStorage();
            this.updateAllViews();
            this.showNotification(`세션이 ${session.enabled ? '활성화' : '비활성화'}되었습니다`, 'info');
        }
    }

    // 배치 관리 메서드
    runAutoAssignment() {
        if (!this.scheduler) {
            this.scheduler = new Scheduler(this.dataStore);
        }

        const result = this.scheduler.autoAssign();

        this.showNotification(
            `배치 완료: ${result.assigned}개 성공, ${result.failed}개 실패`, 
            result.failed > 0 ? 'warning' : 'success'
        );
        
        // 모든 뷰 업데이트
        this.updateAllViews();
        
        // 캘린더가 현재 활성 뷰인 경우 새로 초기화
        if (this.currentView === 'calendar') {
            this.initializeCalendarView();
        }
    }

    clearAssignments() {
        if (confirm('모든 배치를 초기화하시겠습니까?')) {
            this.dataStore.clearAllAssignments();
            this.showNotification('모든 배치가 초기화되었습니다', 'info');
            this.updateAllViews();
        }
    }

    unassignSchedule(scheduleId) {
        const schedule = this.dataStore.getSchedule(scheduleId);
        if (schedule && schedule.assignedSession) {
            const session = this.dataStore.getSession(schedule.assignedSession);
            if (session) {
                session.removeSchedule(scheduleId);
            }
            schedule.assignedSession = null;
            this.dataStore.saveToLocalStorage();
            this.updateAllViews();
            this.showNotification('배치가 취소되었습니다', 'info');
        }
    }

    // ========================
    // 새로운 캘린더 관련 메서드
    // ========================

    /**
     * 캘린더 뷰 초기화 - 뷰 전환 시에만 호출
     */
    initializeCalendarView() {
        // 기존 캘린더가 있으면 제거
        if (this.calendar) {
            this.calendar = null;
        }

        // 캘린더 생성
        this.calendar = new CustomCalendar('customCalendar', {
            view: 'week',
            locale: 'ko-KR',
            onEventClick: (event, e) => {
                if (event.type === 'session') {
                    this.editSession(event.id);
                } else if (event.assignedSchedules) {
                    // 세션 내 일정 클릭
                    const target = e.target.closest('.schedule-in-session');
                    if (target && target.dataset.scheduleId) {
                        this.editSchedule(target.dataset.scheduleId);
                    }
                }
            },
            onEventDrop: (event, oldStart, newStart) => {
                // 세션 시간 변경
                this.handleSessionTimeDrop(event, oldStart, newStart);
            },
            onScheduleDrop: (schedule, fromSession, toSession) => {
                // 일정을 다른 세션으로 이동
                this.handleScheduleSessionDrop(schedule, fromSession, toSession);
            }
        });

        // 이벤트 데이터 설정
        this.updateCalendarEvents();
    }

    /**
     * 캘린더 이벤트 데이터 업데이트
     */
    updateCalendarEvents() {
        if (!this.calendar) {
            return;
        }

        const events = [];
        const sessions = this.dataStore.getAllSessions();
        const schedules = this.dataStore.getAllSchedules();

        // 세션 이벤트 생성
        sessions.forEach(session => {
            if (session.enabled && session.timeSlot) {
                const startTime = new Date(session.timeSlot.datetime);
                const endTime = new Date(startTime.getTime() + session.timeSlot.duration * 60000);

                // 배치된 일정 정보 추가
                const assignedSchedules = session.assignedSchedules.map(scheduleId => {
                    const schedule = this.dataStore.getSchedule(scheduleId);
                    return schedule ? {
                        id: schedule.id,
                        name: schedule.name
                    } : null;
                }).filter(s => s);

                events.push({
                    id: session.id,
                    type: 'session',
                    title: session.name,
                    start: startTime.toISOString(),
                    end: endTime.toISOString(),
                    assignedSchedules: assignedSchedules
                });
            }
        });

        this.calendar.setEvents(events);
    }
    
    /**
     * 세션 시간 변경 처리
     */
    handleSessionTimeDrop(event, oldStart, newStart) {
        const session = this.dataStore.getSession(event.id);
        if (session) {
            const duration = new Date(event.end) - new Date(event.start);
            session.timeSlot.datetime = newStart.toISOString();
            session.timeSlot.duration = duration / 60000; // 분 단위
            
            this.dataStore.updateSession(session.id, session);
            this.updateAllViews();
            this.showNotification('세션 시간이 변경되었습니다', 'success');
        }
    }
    
    /**
     * 일정 세션 이동 처리
     */
    handleScheduleSessionDrop(schedule, fromSession, toSession) {
        // 기존 세션에서 제거
        const oldSession = this.dataStore.getSession(fromSession.id);
        if (oldSession) {
            oldSession.removeSchedule(schedule.id);
        }
        
        // 새 세션에 추가
        const newSession = this.dataStore.getSession(toSession.id);
        if (newSession && newSession.hasCapacity()) {
            newSession.addSchedule(schedule.id);
            
            // 일정 업데이트
            const scheduleObj = this.dataStore.getSchedule(schedule.id);
            if (scheduleObj) {
                scheduleObj.assignedSession = toSession.id;
            }
            
            this.dataStore.saveToLocalStorage();
            this.updateAllViews();
            this.updateCalendarEvents();
            this.showNotification('일정이 다른 세션으로 이동되었습니다', 'success');
        } else {
            this.showNotification('해당 세션에 더 이상 일정을 추가할 수 없습니다', 'error');
            this.updateCalendarEvents();
        }
    }
    
    /**
     * 캘린더 뷰 전환
     */
    switchCalendarView(view) {
        if (this.calendar) {
            this.calendar.changeView(view);
        }
    }
    
    /**
     * 캘린더 날짜 네비게이션
     */
    navigateCalendar(direction) {
        if (this.calendar) {
            this.calendar.navigate(direction);
        }
    }

    // 데이터 입출력 메서드
    exportData() {
        const data = this.dataStore.exportData();
        const dataStr = JSON.stringify(data, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `timetetris_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        this.showNotification('데이터가 내보내기되었습니다', 'success');
    }

    importData() {
        document.getElementById('importFile').click();
    }

    handleFileImport(file) {
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (this.dataStore.importData(data)) {
                    this.updateAllViews();
                    this.showNotification('데이터를 성공적으로 불러왔습니다', 'success');
                } else {
                    this.showNotification('데이터 불러오기에 실패했습니다', 'error');
                }
            } catch (error) {
                console.error('Import error:', error);
                this.showNotification('올바른 JSON 파일이 아닙니다', 'error');
            }
        };
        reader.readAsText(file);
        
        // 파일 입력 초기화
        document.getElementById('importFile').value = '';
    }

    clearAll() {
        if (confirm('모든 데이터를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
            this.dataStore.clearAll();
            this.updateAllViews();
            this.showNotification('모든 데이터가 삭제되었습니다', 'info');
        }
    }

    // 유틸리티 메서드
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatDate(date) {
        const d = new Date(date);
        return `${d.getFullYear()}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getDate().toString().padStart(2, '0')}`;
    }

    formatTime(date) {
        const d = new Date(date);
        return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    }

    toDateTimeLocal(datetime) {
        const d = new Date(datetime);
        const year = d.getFullYear();
        const month = (d.getMonth() + 1).toString().padStart(2, '0');
        const day = d.getDate().toString().padStart(2, '0');
        const hours = d.getHours().toString().padStart(2, '0');
        const minutes = d.getMinutes().toString().padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    }

    filterSchedules(searchTerm) {
        const cards = document.querySelectorAll('#schedulesList .item-card');
        const term = searchTerm.toLowerCase();
        
        cards.forEach(card => {
            const title = card.querySelector('.item-title').textContent.toLowerCase();
            const note = card.querySelector('.item-note')?.textContent.toLowerCase() || '';
            
            if (title.includes(term) || note.includes(term)) {
                card.style.display = '';
            } else {
                card.style.display = 'none';
            }
        });
    }

    showNotification(message, type = 'info') {
        // 간단한 알림 표시 (추후 더 나은 UI로 개선 가능)
        // 임시 알림 표시
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            padding: 12px 20px;
            background: ${type === 'success' ? '#10B981' : type === 'error' ? '#EF4444' : type === 'warning' ? '#F59E0B' : '#3B82F6'};
            color: white;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    closeAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
        });
        this.editingScheduleId = null;
        this.editingSessionId = null;
    }

    showHelp() {
        alert(`TimeTetris 사용 가이드

1. 세션 추가: 사용 가능한 시간대를 세션으로 등록합니다.
2. 일정 추가: 배치할 일정과 가능한 시간대를 등록합니다.
3. 자동 배치: 알고리즘이 최적의 배치를 자동으로 수행합니다.
4. 결과 확인: 캘린더 뷰에서 배치 결과를 시각적으로 확인합니다.

팁:
- 우선순위가 높은 일정이 먼저 배치됩니다.
- 세션은 활성화/비활성화할 수 있습니다.
- 데이터는 자동으로 브라우저에 저장됩니다.
- JSON 파일로 내보내기/불러오기가 가능합니다.`);
    }
}

// 앱 초기화
document.addEventListener('DOMContentLoaded', () => {
    window.app = new TimeTetrisApp();
    
    // 애니메이션 스타일 추가
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
        .assigned-in-session {
            margin-top: 8px;
            padding: 8px;
            background: rgba(16, 185, 129, 0.1);
            border-radius: 4px;
        }
        .empty-slot {
            padding: 12px;
            text-align: center;
            color: #9CA3AF;
            background: #F9FAFB;
            border-radius: 4px;
        }
    `;
    document.head.appendChild(style);
});

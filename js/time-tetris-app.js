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
 * - FullCalendar 라이브러리 활용
 * 
 * 상태 관리:
 * - currentView: 현재 활성 뷰
 * - editingScheduleId/editingSessionId: 편집 중인 항목 추적
 * - calendar: FullCalendar 인스턴스
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
        
        /** @type {string} 현재 활성화된 뷰 ('participants'|'sessions'|'calendar') */
        this.currentView = 'participants';
        
        /** @type {string|null} 현재 편집 중인 참가자의 ID */
        this.editingParticipantId = null;
        
        /** @type {string|null} 현재 편집 중인 세션의 ID */
        this.editingSessionId = null;
        
        
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
        const searchInput = document.getElementById('participantSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterParticipants(e.target.value);
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
        this.updateParticipantsList();
        this.updateSessionsList();
        // 캘린더는 뷰 전환 시에만 업데이트
    }

    updateHeader() {
        const stats = this.dataStore.getStatistics();
        document.getElementById('participantCount').textContent = `참가자: ${stats.totalParticipants} (세션에 배치: ${stats.assignedParticipants})`;
        document.getElementById('sessionCount').textContent = `세션: ${stats.totalSessions}`;
    }

    updateParticipantsList() {
        const container = document.getElementById('participantsList');
        const participants = this.dataStore.getAllParticipants();

        if (participants.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-user-plus"></i>
                    <h3>참가자가 없습니다</h3>
                    <p>새 참가자를 추가하여 시작하세요</p>
                </div>
            `;
            return;
        }

        container.innerHTML = participants.map(participant => {
            const session = this.dataStore.getParticipantSession(participant.id);
            const isAssigned = !!session;
            
            // 가능 시간 목록 생성 (최대 5개까지만 표시)
            const availableSlots = participant.availableSlots || [];
            const availableSlotLabels = availableSlots.map(slot => {
                const start = new Date(slot.datetime);
                const end = new Date(start.getTime() + slot.duration * 60000);
                
                // 시작 날짜와 종료 날짜가 같은지 확인
                const startDateStr = this.formatDate(start);
                const endDateStr = this.formatDate(end);
                
                if (startDateStr === endDateStr) {
                    // 같은 날: "2024.01.15 09:00~11:00"
                    return `${startDateStr} ${this.formatTime(start)}~${this.formatTime(end)}`;
                } else {
                    // 다른 날: "2024.01.15 09:00~2024.01.16 11:00"
                    return `${startDateStr} ${this.formatTime(start)}~${endDateStr} ${this.formatTime(end)}`;
                }
            });
            
            const maxDisplaySlots = 5;
            const displaySlots = availableSlotLabels.slice(0, maxDisplaySlots);
            const hasMoreSlots = availableSlotLabels.length > maxDisplaySlots;
            
            return `
                <div class="item-card ${isAssigned ? 'assigned' : ''}" 
                     data-id="${participant.id}" 
                     draggable="${!isAssigned}"
                     ondragstart="app.handleDragStart(event, '${participant.id}')"
                     ondragend="app.handleDragEnd(event)">
                    <div class="item-header">
                        <div class="drag-handle">
                            <i class="fas fa-grip-vertical"></i>
                        </div>
                        <div class="item-title">${this.escapeHtml(participant.name)}</div>
                        <div class="item-badge ${isAssigned ? 'success' : 'warning'}">
                            ${isAssigned ? '배치됨' : '미배치'}
                        </div>
                    </div>
                    ${participant.note ? `<div class="item-note">${this.escapeHtml(participant.note)}</div>` : ''}
                    <div class="item-meta">
                        <span><i class="fas fa-star"></i> 우선순위: ${participant.priority}</span>
                        <span><i class="fas fa-clock"></i> 가능 시간: ${availableSlots.length}개</span>
                        ${session ? `<span><i class="fas fa-link"></i> ${this.escapeHtml(session.name)}</span>` : ''}
                    </div>
                    ${availableSlots.length > 0 ? `
                        <div class="available-slots">
                            <div class="slot-list">
                                ${displaySlots.map(slot => `<span class="slot-tag">${slot}</span>`).join('')}
                                ${hasMoreSlots ? '<span class="slot-more">...</span>' : ''}
                            </div>
                        </div>
                    ` : ''}
                    <div class="item-actions">
                        <button class="btn btn-sm btn-secondary" onclick="app.editParticipant('${participant.id}')">
                            <i class="fas fa-edit"></i> 편집
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="app.deleteParticipant('${participant.id}')">
                            <i class="fas fa-trash"></i> 삭제
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
        // 드래그&드롭 이벤트 리스너 추가
        this.setupParticipantDragAndDrop();
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
            const assignedIds = session.assignedParticipants || session.assignedSchedules || [];
            
            return `
                <div class="item-card ${!session.enabled ? 'disabled' : ''}" 
                     data-id="${session.id}"
                     ondrop="app.handleDropOnSession(event, '${session.id}')"
                     ondragover="app.handleDragOver(event)"
                     ondragleave="app.handleDragLeave(event)">
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
                        <span><i class="fas fa-users"></i> 배치 현황: ${assignedIds.length}/${session.capacity || 1}명</span>
                        ${assignedIds.length >= (session.capacity || 1) ? '<span class="item-badge warning">정원 초과</span>' : ''}
                    </div>
                    
                    <!-- 배치된 참가자 카드 영역 -->
                    <div class="assigned-participants-area">
                        ${assignedIds.length > 0 ? `
                            <div class="assigned-participants-list">
                                ${assignedIds.map(id => {
                                    const participant = this.dataStore.getParticipant(id);
                                    if (!participant) return '';
                                    return `
                                        <div class="participant-chip" onclick="app.showParticipantModal('${participant.id}')">
                                            <i class="fas fa-user"></i>
                                            <span>${this.escapeHtml(participant.name)}</span>
                                            <button class="chip-remove" onclick="event.stopPropagation(); app.removeParticipantFromSession('${session.id}', '${participant.id}')">
                                                <i class="fas fa-times"></i>
                                            </button>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        ` : `
                            <div class="empty-participants">
                                <small>배치된 참가자가 없습니다</small>
                            </div>
                        `}
                    </div>
                    
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
                        <button class="btn btn-sm btn-primary" onclick="app.showAssignParticipantModal('${session.id}')">
                            <i class="fas fa-user-plus"></i> 참가자 배치
                        </button>
                        <button class="btn btn-sm btn-success" onclick="app.autoAssignToSession('${session.id}')">
                            <i class="fas fa-magic"></i> 이 세션에 자동 배치
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    // 참가자 배치 관련 메서드
    showAssignParticipantModal(sessionId) {
        const session = this.dataStore.getSession(sessionId);
        if (!session) return;
        
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        
        const allParticipants = this.dataStore.getAllParticipants();
        const availableParticipants = allParticipants.filter(p => {
            // 이미 배치된 참가자 제외
            if (this.dataStore.isParticipantAssigned(p.id)) return false;
            
            // 세션 시간과 참가자 가능 시간이 겹치는지 확인
            const sessionStart = new Date(session.timeSlot.datetime);
            const sessionEnd = new Date(sessionStart.getTime() + session.timeSlot.duration * 60000);
            
            return p.availableSlots.some(slot => {
                const slotStart = new Date(slot.datetime);
                const slotEnd = new Date(slotStart.getTime() + slot.duration * 60000);
                
                return slotStart <= sessionStart && slotEnd >= sessionEnd;
            });
        });
        
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>참가자 배치 - ${this.escapeHtml(session.name)}</h3>
                    <button class="close-btn" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    ${availableParticipants.length > 0 ? `
                        <p>배치 가능한 참가자 목록:</p>
                        <div class="participant-selection-list">
                            ${availableParticipants.map(p => `
                                <div class="participant-selection-item">
                                    <div class="participant-info">
                                        <i class="fas fa-user"></i>
                                        <span>${this.escapeHtml(p.name)}</span>
                                        <small>(우선순위: ${p.priority})</small>
                                    </div>
                                    <button class="btn btn-sm btn-primary" 
                                            onclick="app.assignParticipantToSession('${sessionId}', '${p.id}')">
                                        배치
                                    </button>
                                </div>
                            `).join('')}
                        </div>
                    ` : `
                        <p>배치 가능한 참가자가 없습니다.</p>
                        <small>참가자의 가능 시간이 세션 시간과 겹치지 않거나, 모든 참가자가 이미 배치되었습니다.</small>
                    `}
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }
    
    assignParticipantToSession(sessionId, participantId) {
        const session = this.dataStore.getSession(sessionId);
        const participant = this.dataStore.getParticipant(participantId);
        
        if (!session || !participant) return;
        
        // Session 클래스의 메서드 사용
        if (session.addParticipant) {
            session.addParticipant(participantId);
        } else {
            // 하위 호환성을 위한 대체 로직
            if (!session.assignedParticipants) {
                session.assignedParticipants = [];
            }
            if (!session.assignedParticipants.includes(participantId)) {
                session.assignedParticipants.push(participantId);
            }
        }
        
        // participant.assignedSession 제거 - Session이 이미 관리함
        
        this.dataStore.saveToLocalStorage();
        this.showNotification(`${participant.name}님이 ${session.name}에 배치되었습니다`, 'success');
        
        // 모달 닫기
        const modal = document.querySelector('.modal');
        if (modal) modal.remove();
        
        // 뷰 업데이트
        this.updateAllViews();
    }
    
    removeParticipantFromSession(sessionId, participantId) {
        const session = this.dataStore.getSession(sessionId);
        const participant = this.dataStore.getParticipant(participantId);
        
        if (!session || !participant) return;
        
        // Session 클래스의 메서드 사용
        if (session.removeParticipant) {
            session.removeParticipant(participantId);
        } else {
            // 하위 호환성을 위한 대체 로직
            if (session.assignedParticipants) {
                const index = session.assignedParticipants.indexOf(participantId);
                if (index > -1) {
                    session.assignedParticipants.splice(index, 1);
                }
            }
        }
        
        // participant.assignedSession 제거 - Session이 이미 관리함
        
        this.dataStore.saveToLocalStorage();
        this.showNotification(`${participant.name}님이 배치 해제되었습니다`, 'info');
        this.updateAllViews();
    }
    
    // 드래그&드롭 이벤트 핸들러
    handleDragStart(event, participantId) {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('participantId', participantId);
        event.target.classList.add('dragging');
    }
    
    handleDragEnd(event) {
        event.target.classList.remove('dragging');
        // 모든 드롭 타겟의 하이라이트 제거
        document.querySelectorAll('.drag-over').forEach(el => {
            el.classList.remove('drag-over');
        });
    }
    
    handleDragOver(event) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        
        // 세션 카드에 드래그 오버 효과 추가
        const sessionCard = event.currentTarget;
        if (!sessionCard.classList.contains('drag-over')) {
            sessionCard.classList.add('drag-over');
        }
    }
    
    handleDragLeave(event) {
        // 세션 카드에서 드래그 떠날 때 효과 제거
        const sessionCard = event.currentTarget;
        sessionCard.classList.remove('drag-over');
    }
    
    handleDropOnSession(event, sessionId) {
        event.preventDefault();
        event.stopPropagation();
        
        const participantId = event.dataTransfer.getData('participantId');
        const sessionCard = event.currentTarget;
        sessionCard.classList.remove('drag-over');
        
        if (!participantId) return;
        
        const participant = this.dataStore.getParticipant(participantId);
        const session = this.dataStore.getSession(sessionId);
        
        if (!participant || !session) return;
        
        // 이미 배치된 참가자인지 확인
        if (this.dataStore.isParticipantAssigned(participantId)) {
            this.showNotification(`${participant.name}님은 이미 다른 세션에 배치되어 있습니다`, 'warning');
            return;
        }
        
        // 시간이 겹치는지 확인
        const sessionStart = new Date(session.timeSlot.datetime);
        const sessionEnd = new Date(sessionStart.getTime() + session.timeSlot.duration * 60000);
        
        const canFit = participant.availableSlots.some(slot => {
            const slotStart = new Date(slot.datetime);
            const slotEnd = new Date(slotStart.getTime() + slot.duration * 60000);
            return slotStart <= sessionStart && slotEnd >= sessionEnd;
        });
        
        if (!canFit) {
            this.showNotification(`${participant.name}님의 가능 시간이 세션 시간과 맞지 않습니다`, 'error');
            return;
        }
        
        // 세션 용량 확인
        if ((session.assignedParticipants || []).length >= (session.capacity || 1)) {
            this.showNotification(`세션 정원이 초과되었습니다 (최대 ${session.capacity || 1}명)`, 'warning');
            return;
        }
        
        // 배치 실행
        this.assignParticipantToSession(sessionId, participantId);
    }
    
    // 자동 배치 기능
    autoAssignToSession(sessionId) {
        const session = this.dataStore.getSession(sessionId);
        if (!session) return;
        
        const sessionStart = new Date(session.timeSlot.datetime);
        const sessionEnd = new Date(sessionStart.getTime() + session.timeSlot.duration * 60000);
        
        // 현재 세션 용량 확인
        const currentCount = (session.assignedParticipants || []).length;
        const capacity = session.capacity || 1;
        const availableSlots = capacity - currentCount;
        
        if (availableSlots <= 0) {
            this.showNotification('세션이 이미 가득 찼습니다', 'warning');
            return;
        }
        
        // 배치 가능한 참가자 찾기
        const allParticipants = this.dataStore.getAllParticipants();
        const availableParticipants = allParticipants.filter(p => {
            // 이미 배치된 참가자 제외
            if (this.dataStore.isParticipantAssigned(p.id)) return false;
            
            // 시간이 맞는지 확인
            return p.availableSlots.some(slot => {
                const slotStart = new Date(slot.datetime);
                const slotEnd = new Date(slotStart.getTime() + slot.duration * 60000);
                return slotStart <= sessionStart && slotEnd >= sessionEnd;
            });
        });
        
        if (availableParticipants.length === 0) {
            this.showNotification('배치 가능한 참가자가 없습니다', 'info');
            return;
        }
        
        // 우선순위로 정렬
        availableParticipants.sort((a, b) => b.priority - a.priority);
        
        // 자동 배치 실행
        let assignedCount = 0;
        for (let i = 0; i < Math.min(availableSlots, availableParticipants.length); i++) {
            const participant = availableParticipants[i];
            
            // Session 메서드 사용
            if (session.addParticipant) {
                if (session.addParticipant(participant.id)) {
                    assignedCount++;
                }
            } else {
                // 하위 호환성
                if (!session.assignedParticipants) {
                    session.assignedParticipants = [];
                }
                if (!session.assignedParticipants.includes(participant.id)) {
                    session.assignedParticipants.push(participant.id);
                    assignedCount++;
                }
            }
        }
        
        if (assignedCount > 0) {
            this.dataStore.saveToLocalStorage();
            this.showNotification(`${assignedCount}명의 참가자가 자동 배치되었습니다`, 'success');
            this.updateAllViews();
        } else {
            this.showNotification('자동 배치할 수 없습니다', 'warning');
        }
    }
    
    // 전체 자동 배치
    autoAssignAll() {
        const sessions = this.dataStore.getAllSessions().filter(s => s.enabled);
        const participants = this.dataStore.getAllParticipants();
        
        // 모든 배치 초기화 - Session의 assignedParticipants만 초기화
        sessions.forEach(s => s.assignedParticipants = []);
        
        // 세션을 시간순으로 정렬
        sessions.sort((a, b) => new Date(a.timeSlot.datetime) - new Date(b.timeSlot.datetime));
        
        // 참가자를 우선순위로 정렬
        participants.sort((a, b) => b.priority - a.priority);
        
        let totalAssigned = 0;
        
        // 각 참가자를 가능한 첫 번째 세션에 배치
        for (const participant of participants) {
            for (const session of sessions) {
                if (!session.enabled) continue;
                
                // 세션 용량 확인
                if ((session.assignedParticipants || []).length >= (session.capacity || 1)) continue;
                
                // 시간 확인
                const sessionStart = new Date(session.timeSlot.datetime);
                const sessionEnd = new Date(sessionStart.getTime() + session.timeSlot.duration * 60000);
                
                const canFit = participant.availableSlots.some(slot => {
                    const slotStart = new Date(slot.datetime);
                    const slotEnd = new Date(slotStart.getTime() + slot.duration * 60000);
                    return slotStart <= sessionStart && slotEnd >= sessionEnd;
                });
                
                if (canFit) {
                    // 배치 실행
                    if (session.addParticipant) {
                        if (session.addParticipant(participant.id)) {
                            totalAssigned++;
                            break;
                        }
                    } else {
                        // 하위 호환성
                        if (!session.assignedParticipants) {
                            session.assignedParticipants = [];
                        }
                        session.assignedParticipants.push(participant.id);
                        totalAssigned++;
                        break;
                    }
                }
            }
        }
        
        this.dataStore.saveToLocalStorage();
        this.showNotification(
            `전체 자동 배치 완료: ${totalAssigned}/${participants.length}명 배치됨`, 
            totalAssigned > 0 ? 'success' : 'warning'
        );
        this.updateAllViews();
    }


    // 참가자 관리 메서드
    showParticipantModal(participantId = null) {
        this.editingParticipantId = participantId;
        const modal = document.getElementById('participantModal');
        const form = document.getElementById('participantForm');
        
        // 폼이 존재하는 경우에만 reset 호출
        if (form) {
            form.reset();
        }
        
        if (participantId) {
            const participant = this.dataStore.getParticipant(participantId);
            if (participant) {
                const nameInput = document.getElementById('participantName');
                const noteInput = document.getElementById('participantNote');
                const priorityInput = document.getElementById('participantPriority');
                
                if (nameInput) nameInput.value = participant.name;
                if (noteInput) noteInput.value = participant.note || '';
                if (priorityInput) priorityInput.value = participant.priority;
                
                // 시간 슬롯 표시
                const slotsContainer = document.getElementById('availableSlots');
                if (slotsContainer) {
                    slotsContainer.innerHTML = participant.availableSlots.map((slot, index) => {
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
                    
                    if (participant.availableSlots.length === 0) {
                        this.addTimeSlot();
                    }
                }
            }
        } else {
            // 새 참가자의 경우 기본 시간대를 UI에 표시
            const tempParticipant = new Participant();
            const slotsContainer = document.getElementById('availableSlots');
            if (slotsContainer) {
                slotsContainer.innerHTML = tempParticipant.availableSlots.map((slot, index) => {
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
            }
        }
        
        if (modal) {
            modal.classList.add('active');
        }
    }

    closeParticipantModal() {
        const modal = document.getElementById('participantModal');
        if (modal) {
            modal.classList.remove('active');
        }
        this.editingParticipantId = null;
    }

    saveParticipant() {
        const form = document.getElementById('participantForm');
        if (!form || !form.checkValidity()) {
            if (form) form.reportValidity();
            return;
        }

        const nameInput = document.getElementById('participantName');
        const noteInput = document.getElementById('participantNote');
        const priorityInput = document.getElementById('participantPriority');
        
        if (!nameInput || !noteInput || !priorityInput) {
            console.error('Required form elements not found');
            return;
        }

        const name = nameInput.value;
        const note = noteInput.value;
        const priority = parseInt(priorityInput.value) || 1;
        
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

        const participantData = {
            name,
            note,
            priority,
            availableSlots
        };

        if (this.editingParticipantId) {
            this.dataStore.updateParticipant(this.editingParticipantId, participantData);
            this.showNotification('참가자가 수정되었습니다', 'success');
        } else {
            const participant = new Participant(participantData);
            this.dataStore.addParticipant(participant);
            this.showNotification('참가자가 추가되었습니다', 'success');
        }

        this.closeParticipantModal();
        this.updateAllViews();
    }

    editParticipant(participantId) {
        this.showParticipantModal(participantId);
    }

    deleteParticipant(participantId) {
        if (confirm('정말로 이 참가자를 삭제하시겠습니까?')) {
            this.dataStore.deleteParticipant(participantId);
            this.showNotification('참가자가 삭제되었습니다', 'info');
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

    // 참가자 드래그&드롭 설정
    setupParticipantDragAndDrop() {
        const container = document.getElementById('participantsList');
        const cards = container.querySelectorAll('.item-card[draggable="true"]');
        
        cards.forEach(card => {
            card.addEventListener('dragstart', this.handleParticipantDragStart.bind(this));
            card.addEventListener('dragover', this.handleParticipantDragOver.bind(this));
            card.addEventListener('drop', this.handleParticipantDrop.bind(this));
            card.addEventListener('dragend', this.handleParticipantDragEnd.bind(this));
        });
    }

    handleParticipantDragStart(e) {
        e.dataTransfer.setData('text/plain', e.target.dataset.id);
        e.target.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
    }

    handleParticipantDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        
        const container = document.getElementById('participantsList');
        const draggingCard = container.querySelector('.dragging');
        const afterElement = this.getDragAfterElement(container, e.clientY);
        
        if (afterElement == null) {
            container.appendChild(draggingCard);
        } else {
            container.insertBefore(draggingCard, afterElement);
        }
    }

    handleParticipantDrop(e) {
        e.preventDefault();
        const draggedId = e.dataTransfer.getData('text/plain');
        
        // 새로운 순서 계산 및 저장
        this.updateParticipantOrder();
    }

    handleParticipantDragEnd(e) {
        e.target.classList.remove('dragging');
        
        // 모든 드래그 스타일 제거
        const cards = document.querySelectorAll('.item-card');
        cards.forEach(card => card.classList.remove('drag-over'));
    }

    getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.item-card:not(.dragging)')];
        
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    updateParticipantOrder() {
        const container = document.getElementById('participantsList');
        const cards = container.querySelectorAll('.item-card');
        const newOrder = Array.from(cards).map(card => card.dataset.id);
        
        // DataStore에 새로운 순서 저장
        this.dataStore.reorderParticipants(newOrder);
        this.showNotification('참가자 순서가 변경되었습니다', 'success');
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
                document.getElementById('sessionCapacity').value = session.capacity || 1;
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
        const capacity = parseInt(document.getElementById('sessionCapacity').value) || 1;
        const datetime = document.getElementById('sessionDateTime').value;
        const duration = parseInt(document.getElementById('sessionDuration').value);

        const sessionData = {
            name,
            enabled,
            capacity,
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


    unassignSchedule(scheduleId) {
        const participant = this.dataStore.getParticipant(scheduleId);
        if (!participant) return;
        
        const session = this.dataStore.getParticipantSession(scheduleId);
        if (session) {
            if (session.removeParticipant) {
                session.removeParticipant(scheduleId);
            } else if (session.removeSchedule) {
                session.removeSchedule(scheduleId);
            } else {
                // 하위 호환성
                const index = session.assignedParticipants.indexOf(scheduleId);
                if (index > -1) {
                    session.assignedParticipants.splice(index, 1);
                }
            }
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
                } else if (event.assignedParticipants || event.assignedSchedules) {
                    // 세션 내 참가자 클릭
                    const target = e.target.closest('.schedule-in-session');
                    if (target && target.dataset.participantId) {
                        this.editParticipant(target.dataset.participantId);
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
        const participants = this.dataStore.getAllParticipants();

        // 세션 이벤트 생성
        sessions.forEach(session => {
            if (session.enabled && session.timeSlot) {
                const startTime = new Date(session.timeSlot.datetime);
                const endTime = new Date(startTime.getTime() + session.timeSlot.duration * 60000);

                // 배치된 참가자 정보 추가
                const assignedIds = session.assignedParticipants || session.assignedSchedules || [];
                const assignedParticipants = assignedIds.map(participantId => {
                    const participant = this.dataStore.getParticipant(participantId);
                    return participant ? {
                        id: participant.id,
                        name: participant.name
                    } : null;
                }).filter(p => p);

                events.push({
                    id: session.id,
                    type: 'session',
                    title: session.name,
                    start: startTime.toISOString(),
                    end: endTime.toISOString(),
                    assignedParticipants: assignedParticipants,
                    assignedSchedules: assignedParticipants // 하위 호환성
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
            // 참가자 배치는 이미 Session에서 관리됨
            // scheduleObj.assignedSession 제거됨
            
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

    filterParticipants(searchTerm) {
        const cards = document.querySelectorAll('#participantsList .item-card');
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
        this.editingParticipantId = null;
        this.editingSessionId = null;
    }

    // ========================
    // 하위 호환성 메서드들
    // ========================

    /**
     * @deprecated 하위 호환성을 위한 메서드. showParticipantModal을 사용하세요.
     */
    showScheduleModal(scheduleId = null) {
        return this.showParticipantModal(scheduleId);
    }

    /**
     * @deprecated 하위 호환성을 위한 메서드. closeParticipantModal을 사용하세요.
     */
    closeScheduleModal() {
        return this.closeParticipantModal();
    }

    /**
     * @deprecated 하위 호환성을 위한 메서드. saveParticipant를 사용하세요.
     */
    saveSchedule() {
        return this.saveParticipant();
    }

    /**
     * @deprecated 하위 호환성을 위한 메서드. editParticipant를 사용하세요.
     */
    editSchedule(scheduleId) {
        return this.editParticipant(scheduleId);
    }

    /**
     * @deprecated 하위 호환성을 위한 메서드. deleteParticipant를 사용하세요.
     */
    deleteSchedule(scheduleId) {
        return this.deleteParticipant(scheduleId);
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

// 전역 app 변수 선언
let app;

// 앱 초기화
document.addEventListener('DOMContentLoaded', () => {
    app = new TimeTetrisApp();
    window.app = app;
    
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

/**
 * DataStore 클래스
 * 
 * 애플리케이션의 모든 데이터를 관리하는 중앙 저장소입니다.
 * Participant와 Session 객체들을 저장, 관리하며 로컬스토리지와의 동기화를 담당합니다.
 * 
 * 주요 책임:
 * - Participant와 Session 객체들의 CRUD 작업
 * - 데이터의 영속성 관리 (로컬스토리지 저장/로드)
 * - 데이터 간의 관계 관리 (참가자-세션 배치 관계)
 * - 데이터 통계 및 분석 기능 제공
 * - 데이터 가져오기/내보내기 기능
 * - 배치 관련 작업 (배치 초기화 등)
 * 
 * 데이터 구조:
 * - participants: Map<string, Participant> - 모든 참가자 객체
 * - sessions: Map<string, Session> - 모든 세션 객체
 */
class DataStore {
    /**
     * DataStore 생성자
     * 내부 데이터 구조를 초기화하고 로컬스토리지에서 데이터를 로드합니다.
     */
    constructor() {
        /** @type {Map<string, Participant>} 참가자 객체들을 저장하는 Map */
        this.participants = new Map();
        
        /** @type {Map<string, Session>} 세션 객체들을 저장하는 Map */
        this.sessions = new Map();
        
        // 로컬스토리지에서 기존 데이터 로드
        this.loadFromLocalStorage();
    }

    // ========================
    // Participant 관련 메서드들
    // ========================

    /**
     * 새로운 참가자 추가
     * @param {Participant} participant - 추가할 참가자 객체
     * @returns {Participant} 추가된 참가자 객체
     */
    addParticipant(participant) {
        this.participants.set(participant.id, participant);
        this.saveToLocalStorage();
        return participant;
    }

    /**
     * 기존 참가자 업데이트
     * @param {string} id - 업데이트할 참가자의 ID
     * @param {Object} data - 업데이트할 데이터
     * @returns {Participant|null} 업데이트된 참가자 객체 또는 null
     */
    updateParticipant(id, data) {
        const participant = this.participants.get(id);
        if (participant) {
            Object.assign(participant, data);
            this.saveToLocalStorage();
            return participant;
        }
        return null;
    }

    /**
     * 참가자 삭제
     * @param {string} id - 삭제할 참가자의 ID
     * @returns {boolean} 삭제 성공 여부
     */
    deleteParticipant(id) {
        const deleted = this.participants.delete(id);
        if (deleted) {
            // 관련 세션에서도 해당 참가자 제거
            this.sessions.forEach(session => {
                session.removeParticipant(id);
            });
            this.saveToLocalStorage();
        }
        return deleted;
    }

    /**
     * ID로 참가자 조회
     * @param {string} id - 조회할 참가자의 ID
     * @returns {Participant|undefined} 참가자 객체 또는 undefined
     */
    getParticipant(id) {
        return this.participants.get(id);
    }

    /**
     * 모든 참가자 조회
     * @returns {Participant[]} 모든 참가자 객체 배열
     */
    getAllParticipants() {
        return Array.from(this.participants.values());
    }

    /**
     * 참가자 순서 재정렬
     * @param {string[]} orderedIds - 새로운 순서의 참가자 ID 배열
     */
    reorderParticipants(orderedIds) {
        // 기존 참가자들을 임시 저장
        const participantsArray = orderedIds.map(id => this.participants.get(id)).filter(p => p);
        
        // 순서대로 다시 저장하기 위해 Map을 새로 생성
        const newParticipantsMap = new Map();
        participantsArray.forEach(participant => {
            newParticipantsMap.set(participant.id, participant);
        });
        
        // 순서에 없는 참가자들도 추가 (혹시 누락된 것들)
        this.participants.forEach((participant, id) => {
            if (!newParticipantsMap.has(id)) {
                newParticipantsMap.set(id, participant);
            }
        });
        
        this.participants = newParticipantsMap;
        this.saveToLocalStorage();
    }

    // ========================
    // Session 관련 메서드들
    // ========================

    /**
     * 새로운 세션 추가
     * @param {Session} session - 추가할 세션 객체
     * @returns {Session} 추가된 세션 객체
     */
    addSession(session) {
        this.sessions.set(session.id, session);
        this.saveToLocalStorage();
        return session;
    }

    /**
     * 기존 세션 업데이트
     * @param {string} id - 업데이트할 세션의 ID
     * @param {Object} data - 업데이트할 데이터
     * @returns {Session|null} 업데이트된 세션 객체 또는 null
     */
    updateSession(id, data) {
        const session = this.sessions.get(id);
        if (session) {
            Object.assign(session, data);
            // 시간대가 변경되고 이름이 제공되지 않은 경우 자동으로 이름 재생성
            if (data.timeSlot && !data.name) {
                session.name = session.generateDefaultName(data.timeSlot);
            }
            this.saveToLocalStorage();
            return session;
        }
        return null;
    }

    /**
     * 세션 삭제
     * @param {string} id - 삭제할 세션의 ID
     * @returns {boolean} 삭제 성공 여부
     */
    deleteSession(id) {
        const session = this.sessions.get(id);
        if (session) {
            // 배치된 참가자들의 배치 상태 초기화
            session.assignedParticipants.forEach(participantId => {
                const participant = this.participants.get(participantId);
                if (participant) {
                    participant.assignedSession = null;
                }
            });
            this.sessions.delete(id);
            this.saveToLocalStorage();
            return true;
        }
        return false;
    }

    /**
     * ID로 세션 조회
     * @param {string} id - 조회할 세션의 ID
     * @returns {Session|undefined} 세션 객체 또는 undefined
     */
    getSession(id) {
        return this.sessions.get(id);
    }

    /**
     * 모든 세션 조회
     * @returns {Session[]} 모든 세션 객체 배열
     */
    getAllSessions() {
        return Array.from(this.sessions.values());
    }

    // ========================
    // 배치 관리 메서드들
    // ========================


    // ========================
    // 데이터 영속성 메서드들
    // ========================

    /**
     * 현재 데이터를 로컬스토리지에 저장
     */
    saveToLocalStorage() {
        const data = {
            participants: this.getAllParticipants().map(p => p.toJSON()),
            sessions: this.getAllSessions().map(s => s.toJSON()),
            lastSaved: new Date().toISOString()
        };
        localStorage.setItem('timetetris_data', JSON.stringify(data));
    }

    /**
     * 로컬스토리지에서 데이터 로드
     */
    loadFromLocalStorage() {
        const dataStr = localStorage.getItem('timetetris_data');
        if (dataStr) {
            try {
                const data = JSON.parse(dataStr);
                
                // 참가자 데이터 로드
                if (data.participants && Array.isArray(data.participants)) {
                    data.participants.forEach(participantData => {
                        const participant = new Participant(participantData);
                        this.participants.set(participant.id, participant);
                    });
                } else if (data.schedules && Array.isArray(data.schedules)) {
                    // 하위 호환성을 위해 기존 schedules 데이터도 처리
                    data.schedules.forEach(scheduleData => {
                        const participant = new Participant(scheduleData);
                        this.participants.set(participant.id, participant);
                    });
                }
                
                // 세션 데이터 로드
                if (data.sessions && Array.isArray(data.sessions)) {
                    data.sessions.forEach(sessionData => {
                        const session = new Session(sessionData);
                        this.sessions.set(session.id, session);
                    });
                }
            } catch (error) {
                console.error('Failed to load data from localStorage:', error);
            }
        }
    }

    // ========================
    // 데이터 가져오기/내보내기
    // ========================

    /**
     * 현재 데이터를 내보내기용 객체로 변환
     * @returns {Object} 내보내기용 데이터 객체
     */
    exportData() {
        return {
            participants: this.getAllParticipants().map(p => p.toJSON()),
            sessions: this.getAllSessions().map(s => s.toJSON()),
            exportDate: new Date().toISOString()
        };
    }

    /**
     * 외부 데이터를 가져와서 현재 데이터로 설정
     * @param {Object} data - 가져올 데이터 객체
     * @returns {boolean} 가져오기 성공 여부
     */
    importData(data) {
        try {
            // 기존 데이터 초기화
            this.participants.clear();
            this.sessions.clear();

            // 참가자 데이터 가져오기
            if (data.participants && Array.isArray(data.participants)) {
                data.participants.forEach(participantData => {
                    const participant = new Participant(participantData);
                    this.participants.set(participant.id, participant);
                });
            } else if (data.schedules && Array.isArray(data.schedules)) {
                // 하위 호환성을 위해 기존 schedules 데이터도 처리
                data.schedules.forEach(scheduleData => {
                    const participant = new Participant(scheduleData);
                    this.participants.set(participant.id, participant);
                });
            }

            // 세션 데이터 가져오기
            if (data.sessions && Array.isArray(data.sessions)) {
                data.sessions.forEach(sessionData => {
                    const session = new Session(sessionData);
                    this.sessions.set(session.id, session);
                });
            }

            this.saveToLocalStorage();
            return true;
        } catch (error) {
            console.error('Failed to import data:', error);
            return false;
        }
    }

    /**
     * 모든 데이터 삭제
     */
    clearAll() {
        this.participants.clear();
        this.sessions.clear();
        this.saveToLocalStorage();
    }

    // ========================
    // 통계 및 분석 메서드들
    // ========================

    /**
     * 현재 데이터의 통계 정보 계산
     * @returns {Object} 통계 정보 객체
     */
    getStatistics() {
        const totalParticipants = this.participants.size;
        const totalSessions = this.sessions.size;
        const assignedParticipants = Array.from(this.participants.values()).filter(p => p.assignedSession).length;
        const unassignedParticipants = totalParticipants - assignedParticipants;
        const utilizationRate = totalParticipants > 0 ? Math.round((assignedParticipants / totalParticipants) * 100) : 0;

        return {
            totalParticipants,
            totalSessions,
            assignedParticipants,
            unassignedParticipants,
            utilizationRate
        };
    }

    /**
     * 배치되지 않은 참가자들 조회
     * @returns {Participant[]} 배치되지 않은 참가자 배열
     */
    getUnassignedParticipants() {
        return Array.from(this.participants.values()).filter(participant => !participant.isAssigned());
    }

    /**
     * 활성화된 세션들 조회
     * @returns {Session[]} 활성화된 세션 배열
     */
    getEnabledSessions() {
        return Array.from(this.sessions.values()).filter(session => session.enabled);
    }

    /**
     * 비어있는 세션들 조회
     * @returns {Session[]} 비어있는 세션 배열
     */
    getEmptySessions() {
        return Array.from(this.sessions.values()).filter(session => session.isEmpty());
    }

    /**
     * 완전히 채워진 세션들 조회
     * @returns {Session[]} 완전히 채워진 세션 배열
     */
    getFullSessions() {
        return Array.from(this.sessions.values()).filter(session => session.isFull());
    }
}

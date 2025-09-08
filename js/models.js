// 데이터 모델 정의

class Schedule {
    constructor(data = {}) {
        this.id = data.id || this.generateGUID();
        this.name = data.name || '';
        this.note = data.note || '';
        this.availableSlots = data.availableSlots || [];
        this.assignedSession = data.assignedSession || null;
        this.priority = data.priority || 1;
    }

    generateGUID() {
        return 'schedule-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }

    isAvailableAt(datetime, duration) {
        const requestedStart = new Date(datetime);
        const requestedEnd = new Date(requestedStart.getTime() + duration * 60000);

        return this.availableSlots.some(slot => {
            const slotStart = new Date(slot.datetime);
            const slotEnd = new Date(slotStart.getTime() + slot.duration * 60000);

            return requestedStart >= slotStart && requestedEnd <= slotEnd;
        });
    }

    canFitInSession(session) {
        if (!session || !session.enabled) return false;
        
        const sessionStart = new Date(session.timeSlot.datetime);
        const sessionEnd = new Date(sessionStart.getTime() + session.timeSlot.duration * 60000);

        return this.availableSlots.some(slot => {
            const slotStart = new Date(slot.datetime);
            const slotEnd = new Date(slotStart.getTime() + slot.duration * 60000);

            // 세션 시간이 일정의 가능한 시간 슬롯 내에 포함되는지 확인
            const overlapStart = new Date(Math.max(sessionStart.getTime(), slotStart.getTime()));
            const overlapEnd = new Date(Math.min(sessionEnd.getTime(), slotEnd.getTime()));

            // 세션 전체가 슬롯 내에 포함되는지 확인
            return sessionStart >= slotStart && sessionEnd <= slotEnd;
        });
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            note: this.note,
            availableSlots: this.availableSlots,
            assignedSession: this.assignedSession,
            priority: this.priority
        };
    }
}

class Session {
    constructor(data = {}) {
        this.id = data.id || this.generateGUID();
        this.name = data.name || this.generateDefaultName(data.timeSlot);
        this.enabled = data.enabled !== undefined ? data.enabled : true;
        this.timeSlot = data.timeSlot || null;
        this.assignedSchedules = data.assignedSchedules || [];
    }

    generateGUID() {
        return 'session-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }

    generateDefaultName(timeSlot) {
        if (!timeSlot || !timeSlot.datetime) return '새 세션';
        
        const date = new Date(timeSlot.datetime);
        const days = ['일', '월', '화', '수', '목', '금', '토'];
        const dayName = days[date.getDay()];
        const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;
        const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
        const duration = timeSlot.duration || 60;
        
        return `${dayName}_${dateStr}_${timeStr}_${duration}분`;
    }

    hasCapacity() {
        // 현재는 1:1 세션만 지원 (한 세션에 한 명만)
        return this.assignedSchedules.length < 1;
    }

    addSchedule(scheduleId) {
        if (this.hasCapacity() && !this.assignedSchedules.includes(scheduleId)) {
            this.assignedSchedules.push(scheduleId);
            return true;
        }
        return false;
    }

    removeSchedule(scheduleId) {
        const index = this.assignedSchedules.indexOf(scheduleId);
        if (index > -1) {
            this.assignedSchedules.splice(index, 1);
            return true;
        }
        return false;
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            enabled: this.enabled,
            timeSlot: this.timeSlot,
            assignedSchedules: this.assignedSchedules
        };
    }
}

class DataStore {
    constructor() {
        this.schedules = new Map();
        this.sessions = new Map();
        this.loadFromLocalStorage();
    }

    addSchedule(schedule) {
        this.schedules.set(schedule.id, schedule);
        this.saveToLocalStorage();
        return schedule;
    }

    updateSchedule(id, data) {
        const schedule = this.schedules.get(id);
        if (schedule) {
            Object.assign(schedule, data);
            this.saveToLocalStorage();
            return schedule;
        }
        return null;
    }

    deleteSchedule(id) {
        const deleted = this.schedules.delete(id);
        if (deleted) {
            // 관련 세션에서도 제거
            this.sessions.forEach(session => {
                session.removeSchedule(id);
            });
            this.saveToLocalStorage();
        }
        return deleted;
    }

    getSchedule(id) {
        return this.schedules.get(id);
    }

    getAllSchedules() {
        return Array.from(this.schedules.values());
    }

    addSession(session) {
        this.sessions.set(session.id, session);
        this.saveToLocalStorage();
        return session;
    }

    updateSession(id, data) {
        const session = this.sessions.get(id);
        if (session) {
            Object.assign(session, data);
            if (data.timeSlot && !data.name) {
                session.name = session.generateDefaultName(data.timeSlot);
            }
            this.saveToLocalStorage();
            return session;
        }
        return null;
    }

    deleteSession(id) {
        const session = this.sessions.get(id);
        if (session) {
            // 배치된 일정들 초기화
            session.assignedSchedules.forEach(scheduleId => {
                const schedule = this.schedules.get(scheduleId);
                if (schedule) {
                    schedule.assignedSession = null;
                }
            });
            this.sessions.delete(id);
            this.saveToLocalStorage();
            return true;
        }
        return false;
    }

    getSession(id) {
        return this.sessions.get(id);
    }

    getAllSessions() {
        return Array.from(this.sessions.values());
    }

    clearAllAssignments() {
        this.schedules.forEach(schedule => {
            schedule.assignedSession = null;
        });
        this.sessions.forEach(session => {
            session.assignedSchedules = [];
        });
        this.saveToLocalStorage();
    }

    saveToLocalStorage() {
        const data = {
            schedules: this.getAllSchedules().map(s => s.toJSON()),
            sessions: this.getAllSessions().map(s => s.toJSON()),
            lastSaved: new Date().toISOString()
        };
        localStorage.setItem('timetetris_data', JSON.stringify(data));
    }

    loadFromLocalStorage() {
        const dataStr = localStorage.getItem('timetetris_data');
        if (dataStr) {
            try {
                const data = JSON.parse(dataStr);
                
                // 일정 로드
                if (data.schedules && Array.isArray(data.schedules)) {
                    data.schedules.forEach(scheduleData => {
                        const schedule = new Schedule(scheduleData);
                        this.schedules.set(schedule.id, schedule);
                    });
                }
                
                // 세션 로드
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

    exportData() {
        return {
            schedules: this.getAllSchedules().map(s => s.toJSON()),
            sessions: this.getAllSessions().map(s => s.toJSON()),
            exportDate: new Date().toISOString()
        };
    }

    importData(data) {
        try {
            // 기존 데이터 초기화
            this.schedules.clear();
            this.sessions.clear();

            // 일정 임포트
            if (data.schedules && Array.isArray(data.schedules)) {
                data.schedules.forEach(scheduleData => {
                    const schedule = new Schedule(scheduleData);
                    this.schedules.set(schedule.id, schedule);
                });
            }

            // 세션 임포트
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

    clearAll() {
        this.schedules.clear();
        this.sessions.clear();
        this.saveToLocalStorage();
    }

    getStatistics() {
        const totalSchedules = this.schedules.size;
        const totalSessions = this.sessions.size;
        const assignedSchedules = Array.from(this.schedules.values()).filter(s => s.assignedSession).length;
        const unassignedSchedules = totalSchedules - assignedSchedules;
        const utilizationRate = totalSchedules > 0 ? Math.round((assignedSchedules / totalSchedules) * 100) : 0;

        return {
            totalSchedules,
            totalSessions,
            assignedSchedules,
            unassignedSchedules,
            utilizationRate
        };
    }
}

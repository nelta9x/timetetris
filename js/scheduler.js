// 스케줄 자동 배치 알고리즘

class Scheduler {
    constructor(dataStore) {
        this.dataStore = dataStore;
    }

    /**
     * Fisher-Yates 셔플 알고리즘을 사용한 무작위 배치
     */
    shuffle(array) {
        const arr = [...array];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    /**
     * 자동 배치 실행
     */
    autoAssign() {
        // 기존 배치 초기화
        this.dataStore.clearAllAssignments();

        // 활성화된 세션과 일정 가져오기
        const sessions = this.dataStore.getAllSessions().filter(s => s.enabled);
        const schedules = this.dataStore.getAllSchedules();

        if (sessions.length === 0 || schedules.length === 0) {
            return { assigned: 0, failed: schedules.length };
        }

        // 우선순위로 일정 정렬 (높은 우선순위 먼저)
        const sortedSchedules = [...schedules].sort((a, b) => b.priority - a.priority);

        // 각 일정에 대해 가능한 세션 찾기
        const possibleAssignments = this.findPossibleAssignments(sortedSchedules, sessions);

        // 최대 매칭 알고리즘 실행
        const assignments = this.findMaximumMatching(possibleAssignments, sortedSchedules, sessions);

        // 배치 실행
        let assignedCount = 0;
        let failedCount = 0;

        assignments.forEach((sessionId, scheduleId) => {
            if (sessionId) {
                const schedule = this.dataStore.getSchedule(scheduleId);
                const session = this.dataStore.getSession(sessionId);
                
                if (schedule && session && session.addSchedule(scheduleId)) {
                    schedule.assignedSession = sessionId;
                    assignedCount++;
                } else {
                    failedCount++;
                }
            } else {
                failedCount++;
            }
        });

        // 저장
        this.dataStore.saveToLocalStorage();

        return { assigned: assignedCount, failed: failedCount };
    }

    /**
     * 각 일정에 대해 가능한 세션 찾기
     */
    findPossibleAssignments(schedules, sessions) {
        const possibleAssignments = new Map();

        schedules.forEach(schedule => {
            const possibleSessions = [];

            sessions.forEach(session => {
                if (this.canAssignToSession(schedule, session)) {
                    possibleSessions.push(session.id);
                }
            });

            // 무작위 순서로 섞기
            possibleAssignments.set(schedule.id, this.shuffle(possibleSessions));
        });

        return possibleAssignments;
    }

    /**
     * 일정이 세션에 배치 가능한지 확인
     */
    canAssignToSession(schedule, session) {
        if (!session.enabled || !session.hasCapacity()) {
            return false;
        }

        // 세션 시간이 일정의 가능한 시간 내에 있는지 확인
        return schedule.canFitInSession(session);
    }

    /**
     * 최대 매칭 찾기 (Greedy 알고리즘 사용)
     */
    findMaximumMatching(possibleAssignments, schedules, sessions) {
        const assignments = new Map();
        const usedSessions = new Set();

        // 우선순위 순으로 처리
        schedules.forEach(schedule => {
            const possibleSessions = possibleAssignments.get(schedule.id) || [];
            
            // 사용 가능한 첫 번째 세션 찾기
            for (const sessionId of possibleSessions) {
                if (!usedSessions.has(sessionId)) {
                    assignments.set(schedule.id, sessionId);
                    usedSessions.add(sessionId);
                    break;
                }
            }

            // 배치되지 않은 경우
            if (!assignments.has(schedule.id)) {
                assignments.set(schedule.id, null);
            }
        });

        return assignments;
    }

    /**
     * 더 정교한 배치 알고리즘 (백트래킹 사용)
     * 성능 문제로 작은 데이터셋에서만 사용
     */
    optimizedAssign() {
        const sessions = this.dataStore.getAllSessions().filter(s => s.enabled);
        const schedules = this.dataStore.getAllSchedules();

        if (sessions.length === 0 || schedules.length === 0) {
            return { assigned: 0, failed: schedules.length };
        }

        // 소규모 데이터셋에서는 백트래킹 사용
        if (schedules.length <= 20 && sessions.length <= 10) {
            return this.backtrackingAssign(schedules, sessions);
        }

        // 대규모 데이터셋에서는 Greedy 알고리즘 사용
        return this.autoAssign();
    }

    /**
     * 백트래킹을 사용한 최적 배치 찾기
     */
    backtrackingAssign(schedules, sessions) {
        this.dataStore.clearAllAssignments();

        const sortedSchedules = [...schedules].sort((a, b) => b.priority - a.priority);
        const assignments = new Map();
        const sessionCapacity = new Map();

        // 세션 용량 초기화
        sessions.forEach(session => {
            sessionCapacity.set(session.id, 1); // 1:1 세션
        });

        const bestAssignment = this.backtrack(
            0,
            sortedSchedules,
            sessions,
            assignments,
            sessionCapacity,
            { best: new Map(), count: 0 }
        );

        // 최적 배치 적용
        let assignedCount = 0;
        let failedCount = 0;

        bestAssignment.best.forEach((sessionId, scheduleId) => {
            if (sessionId) {
                const schedule = this.dataStore.getSchedule(scheduleId);
                const session = this.dataStore.getSession(sessionId);
                
                if (schedule && session && session.addSchedule(scheduleId)) {
                    schedule.assignedSession = sessionId;
                    assignedCount++;
                } else {
                    failedCount++;
                }
            } else {
                failedCount++;
            }
        });

        this.dataStore.saveToLocalStorage();
        return { assigned: assignedCount, failed: failedCount };
    }

    /**
     * 백트래킹 재귀 함수
     */
    backtrack(index, schedules, sessions, assignments, sessionCapacity, result) {
        if (index === schedules.length) {
            // 현재 배치가 더 나은지 확인
            const currentCount = Array.from(assignments.values()).filter(v => v !== null).length;
            if (currentCount > result.count) {
                result.best = new Map(assignments);
                result.count = currentCount;
            }
            return result;
        }

        const schedule = schedules[index];

        // 가능한 모든 세션 시도
        for (const session of sessions) {
            if (this.canAssignToSession(schedule, session) && 
                sessionCapacity.get(session.id) > 0) {
                
                // 배치 시도
                assignments.set(schedule.id, session.id);
                sessionCapacity.set(session.id, sessionCapacity.get(session.id) - 1);

                // 재귀 호출
                this.backtrack(index + 1, schedules, sessions, assignments, sessionCapacity, result);

                // 백트래킹
                assignments.delete(schedule.id);
                sessionCapacity.set(session.id, sessionCapacity.get(session.id) + 1);
            }
        }

        // 배치하지 않는 경우도 시도
        assignments.set(schedule.id, null);
        this.backtrack(index + 1, schedules, sessions, assignments, sessionCapacity, result);
        assignments.delete(schedule.id);

        return result;
    }

    /**
     * 시간 충돌 확인
     */
    hasTimeConflict(schedule1, schedule2, session) {
        // 현재 구현에서는 한 세션에 한 명만 배치하므로 충돌 없음
        return false;
    }

    /**
     * 배치 통계 계산
     */
    getAssignmentStatistics() {
        const stats = {
            totalSchedules: 0,
            assignedSchedules: 0,
            totalSessions: 0,
            usedSessions: 0,
            utilizationByPriority: new Map(),
            sessionUtilization: []
        };

        const schedules = this.dataStore.getAllSchedules();
        const sessions = this.dataStore.getAllSessions();

        stats.totalSchedules = schedules.length;
        stats.totalSessions = sessions.filter(s => s.enabled).length;

        // 우선순위별 통계
        schedules.forEach(schedule => {
            const priority = schedule.priority;
            if (!stats.utilizationByPriority.has(priority)) {
                stats.utilizationByPriority.set(priority, { total: 0, assigned: 0 });
            }
            
            const priorityStats = stats.utilizationByPriority.get(priority);
            priorityStats.total++;
            
            if (schedule.assignedSession) {
                stats.assignedSchedules++;
                priorityStats.assigned++;
            }
        });

        // 세션별 통계
        sessions.forEach(session => {
            if (session.enabled) {
                const utilization = {
                    sessionId: session.id,
                    sessionName: session.name,
                    capacity: 1,
                    used: session.assignedSchedules.length,
                    utilization: session.assignedSchedules.length * 100
                };
                
                stats.sessionUtilization.push(utilization);
                
                if (session.assignedSchedules.length > 0) {
                    stats.usedSessions++;
                }
            }
        });

        return stats;
    }

    /**
     * 배치 제안 생성 (사용자에게 대안 제시)
     */
    generateSuggestions() {
        const suggestions = [];
        const unassignedSchedules = this.dataStore.getAllSchedules().filter(s => !s.assignedSession);
        const underutilizedSessions = this.dataStore.getAllSessions().filter(s => 
            s.enabled && s.assignedSchedules.length === 0
        );

        // 미배치 일정에 대한 제안
        unassignedSchedules.forEach(schedule => {
            const possibleSessions = this.dataStore.getAllSessions().filter(session =>
                !this.canAssignToSession(schedule, session) && session.enabled
            );

            if (possibleSessions.length > 0) {
                suggestions.push({
                    type: 'schedule_time_conflict',
                    message: `"${schedule.name}" 일정이 현재 세션 시간과 맞지 않습니다. 일정의 가능 시간을 조정하거나 새 세션을 추가해보세요.`,
                    schedule: schedule,
                    possibleSessions: possibleSessions
                });
            }
        });

        // 미사용 세션에 대한 제안
        underutilizedSessions.forEach(session => {
            suggestions.push({
                type: 'unused_session',
                message: `"${session.name}" 세션이 사용되지 않고 있습니다. 이 시간대에 가능한 일정을 추가하거나 세션을 비활성화하세요.`,
                session: session
            });
        });

        return suggestions;
    }

    /**
     * 배치 최적화 점수 계산
     */
    calculateOptimizationScore() {
        const stats = this.getAssignmentStatistics();
        
        let score = 0;
        let maxScore = 0;

        // 전체 배치율 (40점)
        const assignmentRate = stats.totalSchedules > 0 ? 
            (stats.assignedSchedules / stats.totalSchedules) : 0;
        score += assignmentRate * 40;
        maxScore += 40;

        // 세션 활용률 (30점)
        const sessionUtilization = stats.totalSessions > 0 ?
            (stats.usedSessions / stats.totalSessions) : 0;
        score += sessionUtilization * 30;
        maxScore += 30;

        // 우선순위 준수율 (30점)
        let priorityScore = 0;
        let totalWeightedSchedules = 0;
        let assignedWeightedSchedules = 0;

        stats.utilizationByPriority.forEach((value, priority) => {
            totalWeightedSchedules += value.total * priority;
            assignedWeightedSchedules += value.assigned * priority;
        });

        if (totalWeightedSchedules > 0) {
            priorityScore = (assignedWeightedSchedules / totalWeightedSchedules) * 30;
        }
        score += priorityScore;
        maxScore += 30;

        return {
            score: Math.round(score),
            maxScore: maxScore,
            percentage: Math.round((score / maxScore) * 100),
            details: {
                assignmentRate: Math.round(assignmentRate * 100),
                sessionUtilization: Math.round(sessionUtilization * 100),
                priorityCompliance: Math.round((priorityScore / 30) * 100)
            }
        };
    }
}

// 전역 스케줄러 인스턴스 생성
document.addEventListener('DOMContentLoaded', () => {
    if (window.app && window.app.dataStore) {
        window.app.scheduler = new Scheduler(window.app.dataStore);
    }
});

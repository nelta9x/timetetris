/**
 * NotificationManager 클래스
 * 
 * 앱 전체의 알림 표시를 담당하는 관리자 클래스입니다.
 * 일관된 스타일과 동작으로 사용자에게 피드백을 제공합니다.
 */

class NotificationManager {
    constructor(options = {}) {
        this.options = {
            position: 'bottom-left', // 'top-left', 'top-right', 'bottom-left', 'bottom-right'
            duration: 2000,          // 표시 시간 (ms)
            maxNotifications: 5,     // 동시 표시 최대 개수
            ...options
        };
        
        this.notifications = [];  // 현재 표시 중인 알림들
        this.notificationId = 0;  // 고유 ID 생성용
        
        this.initializeStyles();
    }
    
    /**
     * 알림 표시
     * @param {string} message - 표시할 메시지
     * @param {string} type - 알림 타입 ('success', 'error', 'warning', 'info')
     * @param {Object} options - 추가 옵션
     */
    show(message, type = 'info', options = {}) {
        const notification = this.createNotification(message, type, options);
        this.addNotification(notification);
        
        // 자동 제거 타이머 설정
        const duration = options.duration || this.options.duration;
        if (duration > 0) {
            setTimeout(() => {
                this.remove(notification.id);
            }, duration);
        }
        
        return notification.id;
    }
    
    /**
     * 성공 알림
     */
    success(message, options = {}) {
        return this.show(message, 'success', options);
    }
    
    /**
     * 오류 알림
     */
    error(message, options = {}) {
        return this.show(message, 'error', options);
    }
    
    /**
     * 경고 알림
     */
    warning(message, options = {}) {
        return this.show(message, 'warning', options);
    }
    
    /**
     * 정보 알림
     */
    info(message, options = {}) {
        return this.show(message, 'info', options);
    }
    
    /**
     * 알림 제거
     * @param {number} id - 제거할 알림 ID
     */
    remove(id) {
        const notification = this.notifications.find(n => n.id === id);
        if (!notification) return;
        
        // 제거 애니메이션
        notification.element.style.animation = this.getOutAnimation();
        
        setTimeout(() => {
            if (notification.element.parentNode) {
                notification.element.remove();
            }
            this.notifications = this.notifications.filter(n => n.id !== id);
            this.repositionNotifications();
        }, 300);
    }
    
    /**
     * 모든 알림 제거
     */
    clear() {
        this.notifications.forEach(notification => {
            if (notification.element.parentNode) {
                notification.element.remove();
            }
        });
        this.notifications = [];
    }
    
    /**
     * 알림 생성
     */
    createNotification(message, type, options) {
        const id = ++this.notificationId;
        const element = document.createElement('div');
        
        element.className = `notification notification-${type}`;
        element.textContent = message;
        element.style.cssText = this.getNotificationStyles(type);
        element.dataset.notificationId = id;
        
        // 클릭으로 제거 가능
        element.addEventListener('click', () => {
            this.remove(id);
        });
        
        return {
            id,
            element,
            type,
            message,
            createdAt: Date.now()
        };
    }
    
    /**
     * 알림을 DOM에 추가
     */
    addNotification(notification) {
        // 최대 개수 제한
        if (this.notifications.length >= this.options.maxNotifications) {
            const oldest = this.notifications[0];
            this.remove(oldest.id);
        }
        
        document.body.appendChild(notification.element);
        this.notifications.push(notification);
        
        // 위치 재조정
        this.repositionNotifications();
        
        // 등장 애니메이션
        notification.element.style.animation = this.getInAnimation();
    }
    
    /**
     * 알림들의 위치 재조정
     */
    repositionNotifications() {
        const spacing = 10; // 알림 간 간격
        const baseOffset = 20; // 기본 여백
        
        this.notifications.forEach((notification, index) => {
            const element = notification.element;
            const position = this.getPosition(index, spacing, baseOffset);
            
            Object.assign(element.style, position);
        });
    }
    
    /**
     * 위치별 스타일 계산
     */
    getPosition(index, spacing, baseOffset) {
        const offset = baseOffset + (index * (60 + spacing)); // 60px는 대략적인 알림 높이
        
        switch (this.options.position) {
            case 'top-left':
                return { top: `${offset}px`, left: `${baseOffset}px` };
            case 'top-right':
                return { top: `${offset}px`, right: `${baseOffset}px` };
            case 'bottom-left':
                return { bottom: `${offset}px`, left: `${baseOffset}px` };
            case 'bottom-right':
                return { bottom: `${offset}px`, right: `${baseOffset}px` };
            default:
                return { bottom: `${offset}px`, left: `${baseOffset}px` };
        }
    }
    
    /**
     * 알림 스타일 생성
     */
    getNotificationStyles(type) {
        const colors = {
            success: '#10B981',
            error: '#EF4444',
            warning: '#F59E0B',
            info: '#3B82F6'
        };
        
        return `
            position: fixed;
            padding: 12px 20px;
            background: ${colors[type] || colors.info};
            color: white;
            border-radius: 8px;
            font-size: 14px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            z-index: 10000;
            cursor: pointer;
            transition: all 0.3s ease;
            max-width: 400px;
            word-wrap: break-word;
        `;
    }
    
    /**
     * 등장 애니메이션
     */
    getInAnimation() {
        const isBottom = this.options.position.includes('bottom');
        const isRight = this.options.position.includes('right');
        
        if (isBottom) {
            return 'notificationSlideInUp 0.3s ease';
        } else {
            return 'notificationSlideInDown 0.3s ease';
        }
    }
    
    /**
     * 사라짐 애니메이션
     */
    getOutAnimation() {
        const isBottom = this.options.position.includes('bottom');
        const isRight = this.options.position.includes('right');
        
        if (isBottom) {
            return 'notificationSlideOutDown 0.3s ease';
        } else {
            return 'notificationSlideOutUp 0.3s ease';
        }
    }
    
    /**
     * CSS 애니메이션 스타일 초기화
     */
    initializeStyles() {
        const styleId = 'notification-manager-styles';
        
        // 이미 추가된 스타일이 있으면 제거
        const existingStyle = document.getElementById(styleId);
        if (existingStyle) {
            existingStyle.remove();
        }
        
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            @keyframes notificationSlideInUp {
                from { 
                    transform: translateY(100%); 
                    opacity: 0; 
                }
                to { 
                    transform: translateY(0); 
                    opacity: 1; 
                }
            }
            
            @keyframes notificationSlideOutDown {
                from { 
                    transform: translateY(0); 
                    opacity: 1; 
                }
                to { 
                    transform: translateY(100%); 
                    opacity: 0; 
                }
            }
            
            @keyframes notificationSlideInDown {
                from { 
                    transform: translateY(-100%); 
                    opacity: 0; 
                }
                to { 
                    transform: translateY(0); 
                    opacity: 1; 
                }
            }
            
            @keyframes notificationSlideOutUp {
                from { 
                    transform: translateY(0); 
                    opacity: 1; 
                }
                to { 
                    transform: translateY(-100%); 
                    opacity: 0; 
                }
            }
            
            .notification:hover {
                transform: scale(1.02);
                box-shadow: 0 6px 12px rgba(0,0,0,0.15);
            }
        `;
        
        document.head.appendChild(style);
    }
    
    /**
     * 설정 변경
     */
    configure(options) {
        this.options = { ...this.options, ...options };
        this.repositionNotifications();
    }
    
    /**
     * 현재 알림 개수
     */
    getCount() {
        return this.notifications.length;
    }
    
    /**
     * 특정 타입의 알림 개수
     */
    getCountByType(type) {
        return this.notifications.filter(n => n.type === type).length;
    }
}

// 전역 인스턴스 생성
window.NotificationManager = NotificationManager;

// 기본 인스턴스 생성 (편의를 위해)
window.notifications = new NotificationManager({
    position: 'bottom-left',
    duration: 2000,
    maxNotifications: 5
});

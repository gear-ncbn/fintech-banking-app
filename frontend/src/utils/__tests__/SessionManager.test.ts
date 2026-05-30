import { SessionManager } from '../SessionManager'

describe('SessionManager', () => {
  let sessionManager: SessionManager
  let mockLocalStorage: { [key: string]: string }

  beforeEach(() => {
    // Mock localStorage
    mockLocalStorage = {}
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn((key) => mockLocalStorage[key] || null),
        setItem: jest.fn((key, value) => {
          mockLocalStorage[key] = value
        }),
        removeItem: jest.fn((key) => {
          delete mockLocalStorage[key]
        }),
        clear: jest.fn(() => {
          mockLocalStorage = {}
        }),
      },
      writable: true,
    })

    // Mock timers
    jest.useFakeTimers()

    // Create session manager with short timeouts for testing
    sessionManager = new SessionManager({
      timeout: 5000, // 5 seconds
      warningTime: 2000, // 2 seconds
      checkInterval: 100, // 100ms
    })
  })

  afterEach(() => {
    sessionManager.stop()
    jest.clearAllTimers()
    jest.useRealTimers()
  })

  describe('start', () => {
    it('should start monitoring session activity', () => {
      const startSpy = jest.fn()
      sessionManager.on('start', startSpy)

      sessionManager.start()

      expect(startSpy).toHaveBeenCalled()
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'session_last_activity',
        expect.any(String)
      )
    })

    it('should load last activity from localStorage if available', () => {
      const storedTime = Date.now() - 1000
      mockLocalStorage['session_last_activity'] = storedTime.toString()

      sessionManager.start()

      expect(localStorage.getItem).toHaveBeenCalledWith('session_last_activity')
    })

    it('should add event listeners for activity tracking', () => {
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener')
      
      sessionManager.start()

      expect(addEventListenerSpy).toHaveBeenCalledWith('mousedown', expect.any(Function))
      expect(addEventListenerSpy).toHaveBeenCalledWith('keypress', expect.any(Function))
      expect(addEventListenerSpy).toHaveBeenCalledWith('scroll', expect.any(Function))
      expect(addEventListenerSpy).toHaveBeenCalledWith('touchstart', expect.any(Function))
      expect(addEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function))
    })
  })

  describe('stop', () => {
    it('should stop monitoring and clean up', () => {
      const stopSpy = jest.fn()
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener')
      sessionManager.on('stop', stopSpy)

      sessionManager.start()
      sessionManager.stop()

      expect(stopSpy).toHaveBeenCalled()
      expect(removeEventListenerSpy).toHaveBeenCalledWith('mousedown', expect.any(Function))
      expect(removeEventListenerSpy).toHaveBeenCalledWith('keypress', expect.any(Function))
    })
  })

  describe('updateActivity', () => {
    it('should update last activity on user interaction', () => {
      sessionManager.start()
      
      const initialActivity = Date.now()
      jest.advanceTimersByTime(1000)

      // Simulate user activity
      window.dispatchEvent(new Event('click'))

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'session_last_activity',
        expect.any(String)
      )

      const setItemMock = localStorage.setItem as jest.Mock
      const savedActivity = parseInt(
        setItemMock.mock.calls[setItemMock.mock.calls.length - 1][1]
      )
      expect(savedActivity).toBeGreaterThan(initialActivity)
    })
  })

  describe('timeout behavior', () => {
    it('should emit timeout event when session expires', () => {
      const timeoutSpy = jest.fn()
      sessionManager.on('timeout', timeoutSpy)

      sessionManager.start()

      // Advance time past timeout (5 seconds + buffer)
      jest.advanceTimersByTime(6000)

      expect(timeoutSpy).toHaveBeenCalled()
    })

    it('should emit warning event before timeout', () => {
      const warningSpy = jest.fn()
      sessionManager.on('warning', warningSpy)

      sessionManager.start()

      // Advance to warning time (5s - 2s = 3s)
      jest.advanceTimersByTime(3100)

      expect(warningSpy).toHaveBeenCalled()
    })

    it('should not timeout if there is activity', () => {
      const timeoutSpy = jest.fn()
      sessionManager.on('timeout', timeoutSpy)

      sessionManager.start()

      // Simulate activity every 2 seconds
      for (let i = 0; i < 5; i++) {
        jest.advanceTimersByTime(2000)
        window.dispatchEvent(new Event('click'))
      }

      expect(timeoutSpy).not.toHaveBeenCalled()
    })
  })

  describe('reset', () => {
    it('should reset the session timer', () => {
      const resetSpy = jest.fn()
      const timeoutSpy = jest.fn()
      sessionManager.on('reset', resetSpy)
      sessionManager.on('timeout', timeoutSpy)

      sessionManager.start()

      // Advance close to timeout
      jest.advanceTimersByTime(4000)

      // Reset session
      sessionManager.reset()

      expect(resetSpy).toHaveBeenCalled()

      // Advance another 4 seconds (should not timeout because of reset)
      jest.advanceTimersByTime(4000)
      expect(timeoutSpy).not.toHaveBeenCalled()

      // But should timeout after full duration from reset
      jest.advanceTimersByTime(2000)
      expect(timeoutSpy).toHaveBeenCalled()
    })
  })

  describe('extend', () => {
    it('should extend the session by specified time', () => {
      const timeoutSpy = jest.fn()
      const extendSpy = jest.fn()
      sessionManager.on('timeout', timeoutSpy)
      sessionManager.on('extend', extendSpy)
      
      sessionManager.start()

      // The extend method sets lastActivity to make it appear as if 
      // only (timeout - milliseconds) time has elapsed
      // So extend(3000) with timeout of 5000 makes it act like only 2000ms elapsed
      
      const extendTime = 3000 // 3 seconds
      sessionManager.extend(extendTime)
      
      expect(extendSpy).toHaveBeenCalledWith(extendTime)
      
      // After extend(3000), the session acts like only 2s have elapsed
      // So we need 3s more to reach the 5s timeout
      jest.advanceTimersByTime(2500)
      expect(timeoutSpy).not.toHaveBeenCalled()
      
      // After another 1s should timeout
      jest.advanceTimersByTime(1000)
      expect(timeoutSpy).toHaveBeenCalled()
    })
  })

  describe('getState', () => {
    it('should return current session state', () => {
      sessionManager.start()

      const state = sessionManager.getState()

      expect(state).toHaveProperty('lastActivity')
      expect(state).toHaveProperty('isActive', true)
      expect(state).toHaveProperty('timeRemaining')
      expect(state).toHaveProperty('showWarning', false)
    })

    it('should show warning in state when appropriate', () => {
      sessionManager.start()

      // Advance to warning time
      jest.advanceTimersByTime(3100)

      const state = sessionManager.getState()
      expect(state.showWarning).toBe(true)
    })
  })

  describe('cleanup', () => {
    it('should clean up when stopping', () => {
      const stopSpy = jest.fn()
      sessionManager.on('stop', stopSpy)

      sessionManager.start()
      
      // Count initial listeners
      const _initialTimeoutListeners = sessionManager.listenerCount('timeout')
      const _initialWarningListeners = sessionManager.listenerCount('warning')
      
      sessionManager.stop()

      expect(stopSpy).toHaveBeenCalled()
      
      // Verify timers are cleared by advancing time and checking no events fire
      const afterStopTimeoutSpy = jest.fn()
      const afterStopWarningSpy = jest.fn()
      sessionManager.on('timeout', afterStopTimeoutSpy)
      sessionManager.on('warning', afterStopWarningSpy)
      
      jest.advanceTimersByTime(10000)
      
      expect(afterStopTimeoutSpy).not.toHaveBeenCalled()
      expect(afterStopWarningSpy).not.toHaveBeenCalled()
    })
  })
})
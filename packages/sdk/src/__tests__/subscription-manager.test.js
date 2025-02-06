"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const subscription_manager_1 = require("../core/subscription-manager");
const ws_1 = __importDefault(require("ws"));
jest.mock('ws');
const MockedWebSocket = ws_1.default;
describe('SubscriptionManager', () => {
    let manager;
    let mockWs;
    let eventHandlers;
    beforeEach(() => {
        jest.useFakeTimers({ advanceTimers: true });
        eventHandlers = {
            open: [],
            message: [],
            error: [],
            close: [],
        };
        mockWs = {
            on: jest.fn().mockImplementation((event, handler) => {
                eventHandlers[event].push(handler);
                return mockWs;
            }),
            send: jest.fn(),
            close: jest.fn(),
            readyState: ws_1.default.OPEN,
            removeAllListeners: jest.fn(),
        };
        MockedWebSocket.mockImplementation(() => mockWs);
        manager = new subscription_manager_1.SubscriptionManager('http://localhost:3000', 'test-api-key', 'test-project');
    });
    afterEach(() => {
        jest.clearAllTimers();
        jest.clearAllMocks();
        jest.useRealTimers();
    });
    const flushPromisesAndTimers = () => __awaiter(void 0, void 0, void 0, function* () {
        yield Promise.resolve(); // Flush microtasks
        jest.runAllTimers(); // Run all timers
        yield Promise.resolve(); // Flush microtasks again
    });
    describe('connect', () => {
        it('should establish WebSocket connection', () => __awaiter(void 0, void 0, void 0, function* () {
            var _a, _b;
            const connectPromise = manager.connect();
            yield flushPromisesAndTimers();
            (_b = (_a = eventHandlers.open)[0]) === null || _b === void 0 ? void 0 : _b.call(_a);
            yield connectPromise;
            expect(MockedWebSocket).toHaveBeenCalledWith('ws://localhost:3000/realtime?apiKey=test-api-key&projectId=test-project');
        }));
        it('should handle connection errors', () => __awaiter(void 0, void 0, void 0, function* () {
            var _a, _b;
            const newMockWs = Object.assign(Object.assign({}, mockWs), { readyState: ws_1.default.CLOSED });
            MockedWebSocket.mockImplementation(() => newMockWs);
            const error = new Error('Connection failed');
            const connectPromise = manager.connect();
            yield flushPromisesAndTimers();
            (_b = (_a = eventHandlers.error)[0]) === null || _b === void 0 ? void 0 : _b.call(_a, error);
            yield expect(connectPromise).rejects.toThrow('Connection failed');
        }));
        it('should handle disconnection and attempt reconnect', () => __awaiter(void 0, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f;
            // Initial connection
            const connectPromise = manager.connect();
            yield flushPromisesAndTimers();
            (_b = (_a = eventHandlers.open)[0]) === null || _b === void 0 ? void 0 : _b.call(_a);
            yield connectPromise;
            // Set up subscription
            manager.subscribe('users', { event: ['INSERT'] });
            MockedWebSocket.mockClear();
            // Create new mock for reconnection
            const reconnectWs = Object.assign(Object.assign({}, mockWs), { send: jest.fn() });
            MockedWebSocket.mockImplementation(() => reconnectWs);
            // Trigger disconnection and wait for reconnection attempt
            (_d = (_c = eventHandlers.close)[0]) === null || _d === void 0 ? void 0 : _d.call(_c);
            yield flushPromisesAndTimers();
            // Verify reconnection behavior
            expect(MockedWebSocket).toHaveBeenCalledTimes(1);
            (_f = (_e = eventHandlers.open)[0]) === null || _f === void 0 ? void 0 : _f.call(_e);
            yield flushPromisesAndTimers();
            expect(reconnectWs.send).toHaveBeenCalledWith(JSON.stringify({
                type: 'subscribe',
                table: 'users',
                filter: { event: ['INSERT'] },
            }));
        }), 10000);
    });
    describe('subscribe', () => {
        beforeEach(() => __awaiter(void 0, void 0, void 0, function* () {
            var _a, _b;
            const connectPromise = manager.connect();
            yield flushPromisesAndTimers();
            (_b = (_a = eventHandlers.open)[0]) === null || _b === void 0 ? void 0 : _b.call(_a);
            yield connectPromise;
        }));
        it('should throw error if WebSocket is not connected', () => {
            manager.disconnect();
            expect(() => manager.subscribe('users')).toThrow('WebSocket is not connected');
        });
        it('should send subscription message', () => {
            manager.subscribe('users', { event: ['INSERT'] });
            expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify({
                type: 'subscribe',
                table: 'users',
                filter: { event: ['INSERT'] },
            }));
        });
        it('should emit events when receiving messages', () => __awaiter(void 0, void 0, void 0, function* () {
            var _a, _b;
            const callback = jest.fn();
            manager.on('users', callback);
            const message = {
                type: 'subscription',
                event: 'INSERT',
                table: 'users',
                data: { id: 1, name: 'John' },
                timestamp: '2024-01-28T00:00:00Z',
            };
            (_b = (_a = eventHandlers.message)[0]) === null || _b === void 0 ? void 0 : _b.call(_a, JSON.stringify(message));
            yield flushPromisesAndTimers();
            expect(callback).toHaveBeenCalledWith(message);
        }), 10000);
        it('should handle invalid message format', () => __awaiter(void 0, void 0, void 0, function* () {
            var _a, _b;
            const callback = jest.fn();
            manager.on('users', callback);
            (_b = (_a = eventHandlers.message)[0]) === null || _b === void 0 ? void 0 : _b.call(_a, 'invalid json');
            yield flushPromisesAndTimers();
            expect(callback).not.toHaveBeenCalled();
        }), 10000);
    });
    describe('unsubscribe', () => {
        beforeEach(() => __awaiter(void 0, void 0, void 0, function* () {
            var _a, _b;
            const connectPromise = manager.connect();
            yield flushPromisesAndTimers();
            (_b = (_a = eventHandlers.open)[0]) === null || _b === void 0 ? void 0 : _b.call(_a);
            yield connectPromise;
        }));
        it('should throw error if WebSocket is not connected', () => {
            manager.disconnect();
            expect(() => manager.unsubscribe('users')).toThrow('WebSocket is not connected');
        });
        it('should send unsubscribe message', () => {
            manager.subscribe('users');
            manager.unsubscribe('users');
            expect(mockWs.send).toHaveBeenLastCalledWith(JSON.stringify({
                type: 'unsubscribe',
                table: 'users',
            }));
        });
        it('should remove subscription from internal map', () => __awaiter(void 0, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            // Set up subscription
            manager.subscribe('users');
            manager.unsubscribe('users');
            // Clear previous mock calls
            mockWs.send.mockClear();
            // Simulate disconnection and reconnection
            (_b = (_a = eventHandlers.close)[0]) === null || _b === void 0 ? void 0 : _b.call(_a);
            yield flushPromisesAndTimers();
            // Trigger reconnection
            (_d = (_c = eventHandlers.open)[0]) === null || _d === void 0 ? void 0 : _d.call(_c);
            yield flushPromisesAndTimers();
            // Verify no resubscription occurred
            expect(mockWs.send).not.toHaveBeenCalled();
        }), 10000);
    });
    describe('disconnect', () => {
        beforeEach(() => __awaiter(void 0, void 0, void 0, function* () {
            var _a, _b;
            const connectPromise = manager.connect();
            yield flushPromisesAndTimers();
            (_b = (_a = eventHandlers.open)[0]) === null || _b === void 0 ? void 0 : _b.call(_a);
            yield connectPromise;
        }));
        it('should close WebSocket connection', () => {
            manager.disconnect();
            expect(mockWs.close).toHaveBeenCalled();
        });
        it('should clear subscriptions', () => __awaiter(void 0, void 0, void 0, function* () {
            var _a, _b;
            // Set up subscription
            manager.subscribe('users');
            expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify({
                type: 'subscribe',
                table: 'users',
                filter: {},
            }));
            // Disconnect and verify
            manager.disconnect();
            expect(mockWs.close).toHaveBeenCalled();
            // Clear previous mock calls
            mockWs.send.mockClear();
            // Connect again
            const connectPromise = manager.connect();
            yield flushPromisesAndTimers();
            (_b = (_a = eventHandlers.open)[0]) === null || _b === void 0 ? void 0 : _b.call(_a);
            yield connectPromise;
            // Verify no resubscription occurred
            expect(mockWs.send).not.toHaveBeenCalled();
        }), 10000);
        it('should handle multiple disconnects gracefully', () => {
            manager.disconnect();
            manager.disconnect();
            expect(mockWs.close).toHaveBeenCalledTimes(1);
        });
    });
});

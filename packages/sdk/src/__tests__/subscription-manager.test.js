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
        };
        MockedWebSocket.mockImplementation(() => mockWs);
        manager = new subscription_manager_1.SubscriptionManager('http://localhost:3000', 'test-api-key', 'test-project');
    });
    afterEach(() => {
        jest.clearAllMocks();
    });
    describe('connect', () => {
        it('should establish WebSocket connection', () => __awaiter(void 0, void 0, void 0, function* () {
            var _a, _b;
            const connectPromise = manager.connect();
            // Simulate successful connection
            (_b = (_a = eventHandlers.open)[0]) === null || _b === void 0 ? void 0 : _b.call(_a);
            yield connectPromise;
            expect(MockedWebSocket).toHaveBeenCalledWith('ws://localhost:3000/realtime?apiKey=test-api-key&projectId=test-project');
        }));
        it('should handle connection errors', () => __awaiter(void 0, void 0, void 0, function* () {
            var _a, _b;
            const error = new Error('Connection failed');
            const connectPromise = manager.connect();
            // Simulate connection error
            (_b = (_a = eventHandlers.error)[0]) === null || _b === void 0 ? void 0 : _b.call(_a, error);
            yield expect(connectPromise).rejects.toThrow('Connection failed');
        }));
    });
    describe('subscribe', () => {
        beforeEach(() => __awaiter(void 0, void 0, void 0, function* () {
            var _a, _b;
            const connectPromise = manager.connect();
            (_b = (_a = eventHandlers.open)[0]) === null || _b === void 0 ? void 0 : _b.call(_a);
            yield connectPromise;
        }));
        it('should send subscription message', () => {
            manager.subscribe('users', { event: ['INSERT'] });
            expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify({
                type: 'subscribe',
                table: 'users',
                filter: { event: ['INSERT'] },
            }));
        });
        it('should emit events when receiving messages', () => {
            var _a, _b;
            const callback = jest.fn();
            manager.on('users', callback);
            // Simulate receiving a message
            const message = {
                type: 'subscription',
                event: 'INSERT',
                table: 'users',
                data: { id: 1, name: 'John' },
                timestamp: '2024-01-28T00:00:00Z',
            };
            (_b = (_a = eventHandlers.message)[0]) === null || _b === void 0 ? void 0 : _b.call(_a, JSON.stringify(message));
            expect(callback).toHaveBeenCalledWith(message);
        });
    });
    describe('unsubscribe', () => {
        beforeEach(() => __awaiter(void 0, void 0, void 0, function* () {
            var _a, _b;
            const connectPromise = manager.connect();
            (_b = (_a = eventHandlers.open)[0]) === null || _b === void 0 ? void 0 : _b.call(_a);
            yield connectPromise;
        }));
        it('should send unsubscribe message', () => {
            manager.subscribe('users');
            manager.unsubscribe('users');
            expect(mockWs.send).toHaveBeenLastCalledWith(JSON.stringify({
                type: 'unsubscribe',
                table: 'users',
            }));
        });
    });
    describe('disconnect', () => {
        beforeEach(() => __awaiter(void 0, void 0, void 0, function* () {
            var _a, _b;
            const connectPromise = manager.connect();
            (_b = (_a = eventHandlers.open)[0]) === null || _b === void 0 ? void 0 : _b.call(_a);
            yield connectPromise;
        }));
        it('should close WebSocket connection', () => {
            manager.disconnect();
            expect(mockWs.close).toHaveBeenCalled();
        });
    });
});

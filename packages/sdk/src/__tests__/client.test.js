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
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("../core/client");
const request_1 = require("../utils/request");
const subscription_manager_1 = require("../core/subscription-manager");
// Mock dependencies
jest.mock('../utils/request');
jest.mock('../core/subscription-manager');
describe('LitebaseClient', () => {
    let client;
    let mockRequestClient;
    let mockSubscriptionManager;
    beforeEach(() => {
        // Clear all mocks
        jest.clearAllMocks();
        // Create mock instances
        mockRequestClient = {
            get: jest.fn(),
            post: jest.fn(),
            put: jest.fn(),
            delete: jest.fn(),
        };
        mockSubscriptionManager = {
            connect: jest.fn(),
            subscribe: jest.fn(),
            unsubscribe: jest.fn(),
            on: jest.fn(),
            off: jest.fn(),
        };
        request_1.RequestClient.mockImplementation(() => mockRequestClient);
        subscription_manager_1.SubscriptionManager.mockImplementation(() => mockSubscriptionManager);
        // Create client instance
        client = new client_1.LitebaseClient({
            apiKey: 'test-api-key',
            projectId: 'test-project',
        });
    });
    describe('Project Management', () => {
        it('should get project details', () => __awaiter(void 0, void 0, void 0, function* () {
            const mockProject = {
                id: 'test-project',
                name: 'Test Project',
                created_at: new Date().toISOString(),
            };
            mockRequestClient.get.mockResolvedValue(mockProject);
            const project = yield client.getProject();
            expect(project).toEqual(mockProject);
            expect(mockRequestClient.get).toHaveBeenCalledWith('/api/projects/test-project');
        }));
        it('should list projects', () => __awaiter(void 0, void 0, void 0, function* () {
            const mockProjects = [
                { id: '1', name: 'Project 1' },
                { id: '2', name: 'Project 2' },
            ];
            mockRequestClient.get.mockResolvedValue(mockProjects);
            const projects = yield client.listProjects();
            expect(projects).toEqual(mockProjects);
            expect(mockRequestClient.get).toHaveBeenCalledWith('/api/projects');
        }));
        it('should create project', () => __awaiter(void 0, void 0, void 0, function* () {
            const mockProject = {
                id: 'new-project',
                name: 'New Project',
                created_at: new Date().toISOString(),
            };
            mockRequestClient.post.mockResolvedValue(mockProject);
            const project = yield client.createProject('New Project');
            expect(project).toEqual(mockProject);
            expect(mockRequestClient.post).toHaveBeenCalledWith('/api/projects', {
                name: 'New Project',
            });
        }));
    });
    describe('Table Management', () => {
        it('should create table', () => __awaiter(void 0, void 0, void 0, function* () {
            const mockTable = {
                name: 'users',
                schema: { id: 'uuid', name: 'text' },
            };
            mockRequestClient.post.mockResolvedValue(mockTable);
            const table = yield client.createTable('users', {
                id: 'uuid',
                name: 'text',
            });
            expect(table).toEqual(mockTable);
            expect(mockRequestClient.post).toHaveBeenCalledWith('/api/projects/test-project/tables', {
                name: 'users',
                schema: { id: 'uuid', name: 'text' },
            });
        }));
        it('should list tables', () => __awaiter(void 0, void 0, void 0, function* () {
            const mockTables = [
                { name: 'users', schema: {} },
                { name: 'posts', schema: {} },
            ];
            mockRequestClient.get.mockResolvedValue(mockTables);
            const tables = yield client.listTables();
            expect(tables).toEqual(mockTables);
            expect(mockRequestClient.get).toHaveBeenCalledWith('/api/projects/test-project/tables');
        }));
        it('should get table', () => __awaiter(void 0, void 0, void 0, function* () {
            const mockTable = { name: 'users', schema: {} };
            mockRequestClient.get.mockResolvedValue(mockTable);
            const table = yield client.getTable('users');
            expect(table).toEqual(mockTable);
            expect(mockRequestClient.get).toHaveBeenCalledWith('/api/projects/test-project/tables/users');
        }));
    });
    describe('Data Operations', () => {
        it('should query data', () => __awaiter(void 0, void 0, void 0, function* () {
            const mockData = [{ id: 1, name: 'Test' }];
            const queryOptions = { select: ['id', 'name'], where: { id: 1 } };
            mockRequestClient.post.mockResolvedValue(mockData);
            const result = yield client.query('users', queryOptions);
            expect(result).toEqual(mockData);
            expect(mockRequestClient.post).toHaveBeenCalledWith('/api/projects/test-project/tables/users/query', queryOptions);
        }));
        it('should insert data', () => __awaiter(void 0, void 0, void 0, function* () {
            const mockData = [{ id: 1, name: 'Test' }];
            const insertData = [{ name: 'Test' }];
            mockRequestClient.post.mockResolvedValue(mockData);
            const result = yield client.insert('users', insertData);
            expect(result).toEqual(mockData);
            expect(mockRequestClient.post).toHaveBeenCalledWith('/api/projects/test-project/tables/users/rows', { data: insertData });
        }));
        it('should update data', () => __awaiter(void 0, void 0, void 0, function* () {
            const mockData = [{ id: 1, name: 'Updated' }];
            const updateData = { name: 'Updated' };
            const options = { where: { id: 1 } };
            mockRequestClient.put.mockResolvedValue(mockData);
            const result = yield client.update('users', updateData, options);
            expect(result).toEqual(mockData);
            expect(mockRequestClient.put).toHaveBeenCalledWith('/api/projects/test-project/tables/users/rows', Object.assign({ data: updateData }, options));
        }));
        it('should delete data', () => __awaiter(void 0, void 0, void 0, function* () {
            const mockData = [{ id: 1 }];
            const options = { where: { id: 1 } };
            mockRequestClient.delete.mockResolvedValue(mockData);
            const result = yield client.delete('users', options);
            expect(result).toEqual(mockData);
            expect(mockRequestClient.delete).toHaveBeenCalledWith('/api/projects/test-project/tables/users/rows', { data: options });
        }));
    });
    describe('Real-time Subscriptions', () => {
        it('should connect websocket', () => __awaiter(void 0, void 0, void 0, function* () {
            yield client.connect();
            expect(mockSubscriptionManager.connect).toHaveBeenCalled();
        }));
        it('should subscribe to table changes', () => {
            const callback = jest.fn();
            const filter = {
                event: ['INSERT'],
            };
            const unsubscribe = client.subscribe('users', callback, filter);
            expect(mockSubscriptionManager.subscribe).toHaveBeenCalledWith('users', filter);
            expect(mockSubscriptionManager.on).toHaveBeenCalledWith('users', callback);
            unsubscribe();
            expect(mockSubscriptionManager.unsubscribe).toHaveBeenCalledWith('users');
            expect(mockSubscriptionManager.off).toHaveBeenCalledWith('users', callback);
        });
        it('should handle specific events', () => {
            const callback = jest.fn();
            client.onInsert('users', callback);
            expect(mockSubscriptionManager.subscribe).toHaveBeenCalledWith('users', {
                event: ['INSERT'],
            });
            client.onUpdate('users', callback);
            expect(mockSubscriptionManager.subscribe).toHaveBeenCalledWith('users', {
                event: ['UPDATE'],
            });
            client.onDelete('users', callback);
            expect(mockSubscriptionManager.subscribe).toHaveBeenCalledWith('users', {
                event: ['DELETE'],
            });
        });
    });
    describe('Error Handling', () => {
        it('should throw error when projectId is missing', () => __awaiter(void 0, void 0, void 0, function* () {
            client = new client_1.LitebaseClient({
                apiKey: 'test-api-key',
            });
            yield expect(client.getProject()).rejects.toThrow('Project ID is required');
            yield expect(client.createTable('test', {})).rejects.toThrow('Project ID is required');
            yield expect(client.listTables()).rejects.toThrow('Project ID is required');
            yield expect(client.getTable('test')).rejects.toThrow('Project ID is required');
            yield expect(client.query('test')).rejects.toThrow('Project ID is required');
            yield expect(client.insert('test', [])).rejects.toThrow('Project ID is required');
            yield expect(client.update('test', {})).rejects.toThrow('Project ID is required');
            yield expect(client.delete('test')).rejects.toThrow('Project ID is required');
        }));
        it('should handle request errors', () => __awaiter(void 0, void 0, void 0, function* () {
            const error = new Error('Network error');
            mockRequestClient.get.mockRejectedValue(error);
            yield expect(client.getProject()).rejects.toThrow('Network error');
        }));
    });
});

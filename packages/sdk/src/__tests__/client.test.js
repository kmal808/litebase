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
const client_1 = require("../core/client");
const axios_1 = __importDefault(require("axios"));
jest.mock('axios');
const mockedAxios = axios_1.default;
describe('LitebaseClient', () => {
    let client;
    beforeEach(() => {
        client = new client_1.LitebaseClient({
            apiKey: 'test-api-key',
            projectId: 'test-project',
        });
        jest.clearAllMocks();
    });
    describe('Project Management', () => {
        it('should get project details', () => __awaiter(void 0, void 0, void 0, function* () {
            const mockProject = {
                id: 1,
                name: 'Test Project',
                api_key: 'test-key',
                created_at: '2024-01-28T00:00:00Z',
                updated_at: '2024-01-28T00:00:00Z',
            };
            mockedAxios.create.mockReturnValue({
                get: jest.fn().mockResolvedValue({ data: mockProject }),
                interceptors: {
                    response: {
                        use: jest.fn(),
                    },
                },
            });
            const project = yield client.getProject();
            expect(project).toEqual(mockProject);
        }));
        it('should list projects', () => __awaiter(void 0, void 0, void 0, function* () {
            const mockProjects = [
                {
                    id: 1,
                    name: 'Test Project 1',
                    api_key: 'test-key-1',
                    created_at: '2024-01-28T00:00:00Z',
                    updated_at: '2024-01-28T00:00:00Z',
                },
                {
                    id: 2,
                    name: 'Test Project 2',
                    api_key: 'test-key-2',
                    created_at: '2024-01-28T00:00:00Z',
                    updated_at: '2024-01-28T00:00:00Z',
                },
            ];
            mockedAxios.create.mockReturnValue({
                get: jest.fn().mockResolvedValue({ data: mockProjects }),
                interceptors: {
                    response: {
                        use: jest.fn(),
                    },
                },
            });
            const projects = yield client.listProjects();
            expect(projects).toEqual(mockProjects);
        }));
    });
    describe('Table Management', () => {
        it('should create a table', () => __awaiter(void 0, void 0, void 0, function* () {
            const mockTable = {
                name: 'users',
                schema: {
                    id: 'serial',
                    name: 'text',
                },
                created_at: '2024-01-28T00:00:00Z',
                updated_at: '2024-01-28T00:00:00Z',
            };
            mockedAxios.create.mockReturnValue({
                post: jest.fn().mockResolvedValue({ data: mockTable }),
                interceptors: {
                    response: {
                        use: jest.fn(),
                    },
                },
            });
            const table = yield client.createTable('users', {
                id: 'serial',
                name: 'text',
            });
            expect(table).toEqual(mockTable);
        }));
    });
    describe('Data Operations', () => {
        it('should query data', () => __awaiter(void 0, void 0, void 0, function* () {
            const mockData = [
                { id: 1, name: 'John' },
                { id: 2, name: 'Jane' },
            ];
            mockedAxios.create.mockReturnValue({
                post: jest.fn().mockResolvedValue({ data: mockData }),
                interceptors: {
                    response: {
                        use: jest.fn(),
                    },
                },
            });
            const result = yield client.query('users', {
                select: ['id', 'name'],
                where: { id: 1 },
            });
            expect(result).toEqual(mockData);
        }));
        it('should insert data', () => __awaiter(void 0, void 0, void 0, function* () {
            const mockData = [{ id: 1, name: 'John' }];
            mockedAxios.create.mockReturnValue({
                post: jest.fn().mockResolvedValue({ data: mockData }),
                interceptors: {
                    response: {
                        use: jest.fn(),
                    },
                },
            });
            const result = yield client.insert('users', [{ name: 'John' }]);
            expect(result).toEqual(mockData);
        }));
    });
    describe('Error Handling', () => {
        it('should throw error when projectId is missing', () => __awaiter(void 0, void 0, void 0, function* () {
            client = new client_1.LitebaseClient({
                apiKey: 'test-api-key',
            });
            yield expect(client.getProject()).rejects.toThrow('Project ID is required');
        }));
    });
});

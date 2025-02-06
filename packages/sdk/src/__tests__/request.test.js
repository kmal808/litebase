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
const axios_1 = __importDefault(require("axios"));
const request_1 = require("../utils/request");
jest.mock('axios');
const mockedAxios = axios_1.default;
describe('RequestClient', () => {
    let client;
    let mockAxiosInstance;
    beforeEach(() => {
        mockAxiosInstance = {
            get: jest.fn(),
            post: jest.fn(),
            put: jest.fn(),
            delete: jest.fn(),
            interceptors: {
                response: {
                    use: jest.fn(),
                },
            },
        };
        mockedAxios.create.mockReturnValue(mockAxiosInstance);
        const config = {
            baseUrl: 'http://test.com',
            apiKey: 'test-api-key',
            projectId: 'test-project',
        };
        client = new request_1.RequestClient(config);
    });
    afterEach(() => {
        jest.clearAllMocks();
    });
    describe('constructor', () => {
        it('should create axios instance with correct config', () => {
            expect(mockedAxios.create).toHaveBeenCalledWith({
                baseURL: 'http://test.com',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer test-api-key',
                },
            });
        });
        it('should use default baseUrl if not provided', () => {
            const configWithoutBaseUrl = {
                apiKey: 'test-api-key',
                projectId: 'test-project',
            };
            new request_1.RequestClient(configWithoutBaseUrl);
            expect(mockedAxios.create).toHaveBeenCalledWith({
                baseURL: 'http://localhost:3000',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer test-api-key',
                },
            });
        });
    });
    describe('HTTP methods', () => {
        const testPath = '/test';
        const testData = { key: 'value' };
        const testConfig = { timeout: 5000 };
        it('should make GET request', () => __awaiter(void 0, void 0, void 0, function* () {
            mockAxiosInstance.get.mockResolvedValue({ data: testData });
            yield client.get(testPath, testConfig);
            expect(mockAxiosInstance.get).toHaveBeenCalledWith(testPath, testConfig);
        }));
        it('should make POST request', () => __awaiter(void 0, void 0, void 0, function* () {
            mockAxiosInstance.post.mockResolvedValue({ data: testData });
            yield client.post(testPath, testData, testConfig);
            expect(mockAxiosInstance.post).toHaveBeenCalledWith(testPath, testData, testConfig);
        }));
        it('should make PUT request', () => __awaiter(void 0, void 0, void 0, function* () {
            mockAxiosInstance.put.mockResolvedValue({ data: testData });
            yield client.put(testPath, testData, testConfig);
            expect(mockAxiosInstance.put).toHaveBeenCalledWith(testPath, testData, testConfig);
        }));
        it('should make DELETE request', () => __awaiter(void 0, void 0, void 0, function* () {
            mockAxiosInstance.delete.mockResolvedValue({ data: testData });
            yield client.delete(testPath, testConfig);
            expect(mockAxiosInstance.delete).toHaveBeenCalledWith(testPath, testConfig);
        }));
    });
    describe('error handling', () => {
        let successHandler;
        let errorHandler;
        beforeEach(() => {
            // Get the success and error handlers from the interceptor
            ;
            [successHandler, errorHandler] =
                mockAxiosInstance.interceptors.response.use.mock.calls[0];
        });
        it('should handle response error with message', () => {
            const errorMessage = 'Test error message';
            const error = {
                response: {
                    data: {
                        message: errorMessage,
                    },
                },
            };
            expect(() => errorHandler(error)).toThrow(errorMessage);
        });
        it('should handle response error without message', () => {
            const error = {
                response: {
                    data: {},
                },
            };
            expect(() => errorHandler(error)).toThrow('An error occurred');
        });
        it('should handle network error', () => {
            const networkError = new Error('Network error');
            expect(() => errorHandler(networkError)).toThrow('Network error');
        });
        it('should return response data on success', () => {
            const responseData = { data: { key: 'value' } };
            expect(successHandler(responseData)).toEqual({ key: 'value' });
        });
    });
});

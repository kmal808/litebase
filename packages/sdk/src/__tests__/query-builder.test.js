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
const query_builder_1 = require("../core/query-builder");
describe('QueryBuilder', () => {
    let mockClient;
    let builder;
    beforeEach(() => {
        mockClient = {
            query: jest.fn(),
            insert: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        };
        builder = new query_builder_1.QueryBuilder(mockClient, 'users');
    });
    describe('select', () => {
        it('should build select query', () => __awaiter(void 0, void 0, void 0, function* () {
            const mockData = [{ id: 1, name: 'John' }];
            mockClient.query.mockResolvedValue(mockData);
            const result = yield builder
                .select('id', 'name')
                .where({ age: { gt: 18 } })
                .orderBy('name', 'desc')
                .limit(10)
                .offset(0)
                .execute();
            expect(mockClient.query).toHaveBeenCalledWith('users', {
                select: ['id', 'name'],
                where: { age: { gt: 18 } },
                orderBy: 'name desc',
                limit: 10,
                offset: 0,
            });
            expect(result).toEqual(mockData);
        }));
    });
    describe('insert', () => {
        it('should insert single record', () => __awaiter(void 0, void 0, void 0, function* () {
            const mockData = [{ id: 1, name: 'John' }];
            mockClient.insert.mockResolvedValue(mockData);
            const result = yield builder.returning('id').insert({ name: 'John' });
            expect(mockClient.insert).toHaveBeenCalledWith('users', [{ name: 'John' }], {
                returning: ['id'],
            });
            expect(result).toEqual(mockData);
        }));
        it('should insert multiple records', () => __awaiter(void 0, void 0, void 0, function* () {
            const mockData = [
                { id: 1, name: 'John' },
                { id: 2, name: 'Jane' },
            ];
            mockClient.insert.mockResolvedValue(mockData);
            const result = yield builder
                .returning('id')
                .insert([{ name: 'John' }, { name: 'Jane' }]);
            expect(mockClient.insert).toHaveBeenCalledWith('users', [{ name: 'John' }, { name: 'Jane' }], { returning: ['id'] });
            expect(result).toEqual(mockData);
        }));
    });
    describe('update', () => {
        it('should update records with where clause', () => __awaiter(void 0, void 0, void 0, function* () {
            const mockData = [{ id: 1, name: 'John Updated' }];
            mockClient.update.mockResolvedValue(mockData);
            const result = yield builder
                .where({ id: 1 })
                .returning('id', 'name')
                .update({ name: 'John Updated' });
            expect(mockClient.update).toHaveBeenCalledWith('users', { name: 'John Updated' }, {
                where: { id: 1 },
                returning: ['id', 'name'],
            });
            expect(result).toEqual(mockData);
        }));
    });
    describe('delete', () => {
        it('should delete records with where clause', () => __awaiter(void 0, void 0, void 0, function* () {
            const mockData = [{ id: 1 }];
            mockClient.delete.mockResolvedValue(mockData);
            const result = yield builder.where({ id: 1 }).returning('id').delete();
            expect(mockClient.delete).toHaveBeenCalledWith('users', {
                where: { id: 1 },
                returning: ['id'],
            });
            expect(result).toEqual(mockData);
        }));
    });
});

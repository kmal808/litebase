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
exports.QueryBuilder = void 0;
class QueryBuilder {
    constructor(client, tableName) {
        this.client = client;
        this.tableName = tableName;
        this._select = ['*'];
        this._where = {};
        this._returning = [];
    }
    /**
     * Select specific columns
     * @example
     * query.select('id', 'name', 'email')
     */
    select(...fields) {
        this._select = fields;
        return this;
    }
    /**
     * Add where conditions
     * @example
     * query.where({ name: 'John', age: { gt: 18 } })
     */
    where(conditions) {
        this._where = Object.assign(Object.assign({}, this._where), conditions);
        return this;
    }
    /**
     * Add order by clause
     * @example
     * query.orderBy('created_at', 'desc')
     */
    orderBy(field, direction = 'asc') {
        this._orderBy = `${field} ${direction}`;
        return this;
    }
    /**
     * Set limit
     * @example
     * query.limit(10)
     */
    limit(limit) {
        this._limit = limit;
        return this;
    }
    /**
     * Set offset
     * @example
     * query.offset(10)
     */
    offset(offset) {
        this._offset = offset;
        return this;
    }
    /**
     * Specify returning fields for mutations
     * @example
     * query.returning('id', 'created_at')
     */
    returning(...fields) {
        this._returning = fields;
        return this;
    }
    /**
     * Execute the query
     */
    execute() {
        return __awaiter(this, void 0, void 0, function* () {
            const options = {
                select: this._select,
                where: this._where,
                orderBy: this._orderBy,
                limit: this._limit,
                offset: this._offset,
            };
            return this.client.query(this.tableName, options);
        });
    }
    /**
     * Insert records
     * @example
     * query.insert({ name: 'John', email: 'john@example.com' })
     */
    insert(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const records = Array.isArray(data) ? data : [data];
            return this.client.insert(this.tableName, records, {
                returning: this._returning,
            });
        });
    }
    /**
     * Update records
     * @example
     * query.where({ id: 1 }).update({ name: 'John' })
     */
    update(data) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.client.update(this.tableName, data, {
                where: this._where,
                returning: this._returning,
            });
        });
    }
    /**
     * Delete records
     * @example
     * query.where({ id: 1 }).delete()
     */
    delete() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.client.delete(this.tableName, {
                where: this._where,
                returning: this._returning,
            });
        });
    }
}
exports.QueryBuilder = QueryBuilder;

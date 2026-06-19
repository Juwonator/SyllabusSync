// Pure Node.js test - works without jest or proxyquire
const assert = require('assert');

// --- First, import the service (it will use the real db) ---
const { AuditLoggingService } = require('./AuditLoggingService');

// --- Now get the db module and override its query ---
const db = require('../db');

// In-memory log storage for the mock
let mockLogs = [];

// Custom mock query function
const mockQuery = async (text, params) => {
    // INSERT
    if (text.includes('INSERT INTO admin_audit_logs')) {
        const log = {
            id: `mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            user_id: params[0],
            user_email: params[1],
            action: params[2],
            entity_type: params[3],
            entity_id: params[4],
            ip_address: params[5],
            user_agent: params[6],
            metadata: params[7] || {},
            request_id: params[8],
            correlation_id: params[9],
            created_at: new Date().toISOString()
        };
        mockLogs.push(log);
        return { rows: [{ id: log.id }] };
    }

    // COUNT
    if (text.includes('SELECT COUNT(*) AS total')) {
        let filtered = [...mockLogs];
        // Apply user_id filter if present
        const userMatch = text.match(/user_id = \$(\d+)/);
        if (userMatch) {
            const idx = parseInt(userMatch[1], 10) - 1;
            const userId = params[idx];
            if (userId) {
                filtered = filtered.filter(log => log.user_id === userId);
            }
        }
        // Apply action filter if present
        const actionMatch = text.match(/action = \$(\d+)/);
        if (actionMatch) {
            const idx = parseInt(actionMatch[1], 10) - 1;
            const action = params[idx];
            if (action) {
                filtered = filtered.filter(log => log.action === action);
            }
        }
        return { rows: [{ total: filtered.length }] };
    }

    // SELECT (data)
    if (text.includes('SELECT') && !text.includes('COUNT')) {
        let filtered = [...mockLogs];
        // Apply user_id filter
        const userMatch = text.match(/user_id = \$(\d+)/);
        if (userMatch) {
            const idx = parseInt(userMatch[1], 10) - 1;
            const userId = params[idx];
            if (userId) {
                filtered = filtered.filter(log => log.user_id === userId);
            }
        }
        // Apply action filter
        const actionMatch = text.match(/action = \$(\d+)/);
        if (actionMatch) {
            const idx = parseInt(actionMatch[1], 10) - 1;
            const action = params[idx];
            if (action) {
                filtered = filtered.filter(log => log.action === action);
            }
        }
        // Pagination
        const limit = params[params.length - 2] || 50;
        const offset = params[params.length - 1] || 0;
        const paged = filtered.slice(offset, offset + limit);
        return { rows: paged };
    }

    // DELETE (cleanup)
    if (text.includes('DELETE FROM admin_audit_logs')) {
        const cutoff = params[0];
        const before = mockLogs.length;
        const remaining = mockLogs.filter(log => log.created_at >= cutoff);
        const deleted = before - remaining.length;
        mockLogs = remaining;
        return { rowCount: deleted };
    }

    return { rows: [] };
};

// Override the db.query method with our mock
db.query = mockQuery;

// --- Now run the tests ---

async function runTests() {
    console.log('=== Audit Logging Service Tests (Mock DB) ===\n');
    let passed = 0, failed = 0;

    async function test(name, fn) {
        mockLogs = []; // reset logs before each test
        try {
            await fn();
            console.log(`✅ PASS: ${name}`);
            passed++;
        } catch (err) {
            console.error(`❌ FAIL: ${name}`);
            console.error(`   ${err.message}`);
            if (err.stack) {
                const lines = err.stack.split('\n');
                console.error(`   ${lines[1]}`);
            }
            failed++;
        }
    }

    // Test 1: logAction writes a log entry
    await test('logAction writes a log entry', async () => {
        const result = await AuditLoggingService.logAction({
            userId: 'user-123',
            userEmail: 'admin@test.com',
            action: 'LOGIN',
            ipAddress: '127.0.0.1',
            userAgent: 'test-agent',
            metadata: { key: 'value' },
            requestId: 'req-1',
            correlationId: 'corr-1'
        });
        assert.strictEqual(result.success, true);
        await new Promise(resolve => setTimeout(resolve, 100));
        assert.strictEqual(mockLogs.length, 1);
        const log = mockLogs[0];
        assert.strictEqual(log.user_id, 'user-123');
        assert.strictEqual(log.action, 'LOGIN');
        assert.deepStrictEqual(log.metadata, { key: 'value' });
    });

    // Test 2: logAction validates action type
    await test('logAction throws on invalid action', async () => {
        let errorThrown = false;
        try {
            await AuditLoggingService.logAction({
                userId: 'user-123',
                userEmail: 'admin@test.com',
                action: 'INVALID_ACTION'
            });
        } catch (err) {
            errorThrown = true;
            assert.ok(err.message.includes('Invalid action type'));
        }
        assert.ok(errorThrown, 'Should have thrown an error');
    });

    // Test 3: logAction extracts IP from request
    await test('logAction extracts IP from request object', async () => {
        const mockReq = {
            headers: {
                'x-forwarded-for': '192.168.1.1, 10.0.0.1',
                'user-agent': 'test-agent-from-req'
            },
            ip: '1.2.3.4',
            connection: { remoteAddress: '5.6.7.8' }
        };

        await AuditLoggingService.logAction({
            userId: 'user-456',
            userEmail: 'admin2@test.com',
            action: 'LOGOUT',
            req: mockReq
        });

        await new Promise(resolve => setTimeout(resolve, 100));

        assert.strictEqual(mockLogs.length, 1);
        const log = mockLogs[0];
        assert.strictEqual(log.ip_address, '192.168.1.1');
        assert.strictEqual(log.user_agent, 'test-agent-from-req');
    });

    // Test 4: getAuditLogs returns logs with pagination
    await test('getAuditLogs returns logs with pagination', async () => {
        for (let i = 0; i < 5; i++) {
            await AuditLoggingService.logAction({
                userId: `user-${i}`,
                userEmail: `user${i}@test.com`,
                action: 'LOGIN',
                ipAddress: '127.0.0.1'
            });
        }
        await new Promise(resolve => setTimeout(resolve, 100));

        const result = await AuditLoggingService.getAuditLogs({ limit: 2, offset: 0 });
        assert.strictEqual(result.logs.length, 2);
        assert.strictEqual(result.total, 5);
        assert.strictEqual(result.limit, 2);
        assert.strictEqual(result.offset, 0);
    });

    // Test 5: getAuditLogs clamps limit to 1000
    await test('getAuditLogs clamps limit to MAX_LIMIT (1000)', async () => {
        for (let i = 0; i < 10; i++) {
            await AuditLoggingService.logAction({
                userId: `user-${i}`,
                userEmail: `user${i}@test.com`,
                action: 'LOGIN',
                ipAddress: '127.0.0.1'
            });
        }
        await new Promise(resolve => setTimeout(resolve, 100));

        const result = await AuditLoggingService.getAuditLogs({ limit: 9999, offset: 0 });
        assert.strictEqual(result.limit, 1000);
        assert.strictEqual(result.logs.length, 10);
    });

    // Test 6: getAuditTrail returns logs for specific user
    await test('getAuditTrail returns logs for specific user', async () => {
        await AuditLoggingService.logAction({
            userId: 'specific-user-123',
            userEmail: 'specific@test.com',
            action: 'LOGIN',
            ipAddress: '127.0.0.1'
        });
        await AuditLoggingService.logAction({
            userId: 'other-user-456',
            userEmail: 'other@test.com',
            action: 'LOGIN',
            ipAddress: '127.0.0.1'
        });
        await new Promise(resolve => setTimeout(resolve, 100));

        const result = await AuditLoggingService.getAuditTrail('specific-user-123');
        // The mock filters by user_id, so we should get 1 log
        assert.strictEqual(result.logs.length, 1);
        assert.strictEqual(result.logs[0].user_id, 'specific-user-123');
        assert.strictEqual(result.total, 1);
    });

    // Test 7: cleanExpiredLogs removes logs older than daysToKeep
    await test('cleanExpiredLogs removes logs older than daysToKeep', async () => {
        // Insert an old log directly into mockLogs
        const oldLog = {
            id: 'old-log',
            user_id: 'user-old',
            user_email: 'old@test.com',
            action: 'LOGIN',
            ip_address: '127.0.0.1',
            user_agent: 'test',
            metadata: {},
            request_id: null,
            correlation_id: null,
            created_at: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString()
        };
        mockLogs.push(oldLog);

        // Insert a recent log via the service
        await AuditLoggingService.logAction({
            userId: 'user-recent',
            userEmail: 'recent@test.com',
            action: 'LOGIN',
            ipAddress: '127.0.0.1'
        });
        await new Promise(resolve => setTimeout(resolve, 100));

        const deleted = await AuditLoggingService.cleanExpiredLogs(30);
        assert.strictEqual(deleted, 1); // only old one deleted
        assert.strictEqual(mockLogs.length, 1);
        assert.strictEqual(mockLogs[0].user_id, 'user-recent');
    });

    // Test 8: getAdminAuditTrail returns logs for admin
    await test('getAdminAuditTrail returns logs for admin', async () => {
        await AuditLoggingService.logAction({
            userId: 'admin-789',
            userEmail: 'admin@test.com',
            action: 'PERMISSION_CHANGE',
            ipAddress: '127.0.0.1'
        });
        await new Promise(resolve => setTimeout(resolve, 100));

        const result = await AuditLoggingService.getAdminAuditTrail('admin-789');
        assert.strictEqual(result.logs.length, 1);
        assert.strictEqual(result.logs[0].user_id, 'admin-789');
        assert.strictEqual(result.logs[0].action, 'PERMISSION_CHANGE');
        assert.strictEqual(result.total, 1);
    });

    // Summary
    console.log('\n=== Test Summary ===');
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`Total: ${passed + failed}`);

    if (failed > 0) {
        console.error('❌ Some tests failed!');
        process.exit(1);
    } else {
        console.log('✅ All tests passed!');
        process.exit(0);
    }
}

runTests().catch(err => {
    console.error('Test runner crashed:', err);
    process.exit(1);
});